/**
 * 对局状态：创建、克隆、查询
 *
 * 设计原则：
 *  - 状态是**纯数据**（无函数），可 structuredClone、可序列化、可存快照
 *  - 所有变更由 engine 产生新状态（不可变更新）
 */

import { createRng } from './rng.ts';
import { BOARD, COMMAND, DECK, LORD_HP } from './constants.ts';
import { STATUSES, type StatusCap } from './constants.ts';
import type {
  CardDef, Faction, HandCard, LordDef, MatchState, Row, Side, SideState,
  StatusInstance, Unit,
} from './types.ts';

export interface CreateMatchOptions {
  seed?: number;
  lords: Record<Side, LordDef>;
  decks: Record<Side, string[]>;
  cards: Map<string, CardDef>;
  /** 先手方；缺省 'own'（createMatch 是纯构造器，自己不做随机） */
  firstSide?: Side;
  /** 按 GDD 03 §1 第④步掷点定先手（用本对局的确定性 Rng）；优先于 firstSide */
  rollFirst?: boolean;
  /**
   * 后手补偿方式（ADR-053）。
   *   'none'       不补偿
   *   'extra_draw' 后手第 1 回合多抽 1 张（牌差补偿）
   */
  secondCompensation?: SecondCompensation;
}

export type SecondCompensation = 'none' | 'extra_draw';

/** 掷点定先手（GDD 03 §1 第④步）：双方各掷 D6，平局重掷。确定性 Rng */
export function rollFirstSide(rng: ReturnType<typeof createRng>): { side: Side; own: number; enemy: number } {
  for (let i = 0; i < 100; i++) {
    const own = rng.int(6) + 1;
    const enemy = rng.int(6) + 1;
    if (own !== enemy) return { side: own > enemy ? 'own' : 'enemy', own, enemy };
  }
  return { side: 'own', own: 6, enemy: 1 };   // 理论上不可达；兜底保证确定性
}

/**
 * 新建对局（GDD 03 §1 的 ①②④⑤ 步）。
 *
 * ③ 换牌不在这里——它是玩家的独立动作，见 core/src/setup.ts 的 mulligan()。
 * 本函数负责：任命主公 → 洗牌 → 发起手 → 定先手。（后手补偿见 secondCompensation）
 */
export function createMatch(opts: CreateMatchOptions): MatchState {
  const {
    // 后手补偿默认关闭（ADR-087）：起手双方同为 3 张，不再额外多抽
    seed = 1, lords, decks, cards, secondCompensation = 'none',
  } = opts;
  const rng = createRng(seed);

  // 掷点（可选）：只在开局显式要求时消耗 Rng，保证 createMatch 在缺省下是纯构造
  const firstSide: Side = opts.rollFirst ? rollFirstSide(rng).side : (opts.firstSide ?? 'own');

  const makeSide = (side: Side): SideState => {
    const lordCard = lords[side];
    const deck = rng.shuffle([...decks[side]]);

    const handSize = side === firstSide ? DECK.HAND_START_FIRST : DECK.HAND_START_SECOND;
    const hand: HandCard[] = [];
    for (let i = 0; i < handSize && deck.length; i++) {
      const id = deck.pop() as string;
      const c = cards.get(id);
      if (c) hand.push({ card: c, mods: [] });
    }

    return {
      lord: {
        id: lordCard.id,
        name: lordCard.name,
        faction: lordCard.faction as Faction,
        hp: LORD_HP,
        maxHp: LORD_HP,
        armor: 0,
        skill: lordCard.skill ?? '',
        skillDef: lordCard.skillDef,
        skillUsedThisTurn: false,
      },
      rows: {
        // ADR-051：仅 front 一排参与游戏（8 格）；back 保留为空壳以免大改
        front: new Array<Unit | null>(BOARD.COLS).fill(null),
        back: new Array<Unit | null>(BOARD.COLS).fill(null),
      },
      hand,
      deck,
      discard: [],
      fallen: [],          // ADR-160：本局阵亡过的卡 id（has_fallen 条件读它）
      command: { cur: COMMAND.START, max: COMMAND.START },
      fatigue: 0,
      mulliganDone: false,
    };
  };

  return {
    seed,
    uidSeq: 0,
    rngState: rng.getState(),
    turn: 1,          // 完整回合数：开局即第 1 个完整回合
    halfTurn: 0,      // 半回合数：第一次 startTurn 后变 1
    active: firstSide,
    secondCompensation,
    sides: { own: makeSide('own'), enemy: makeSide('enemy') },
    winner: null,
  };
}

export const cloneState = (s: MatchState): MatchState => structuredClone(s);

export const other = (side: Side): Side => (side === 'own' ? 'enemy' : 'own');

export const getUnit = (s: MatchState, side: Side, row: Row, col: number): Unit | null =>
  s.sides[side].rows[row][col] ?? null;

export function setUnit(s: MatchState, side: Side, row: Row, col: number, u: Unit | null): void {
  s.sides[side].rows[row][col] = u;
}

export interface UnitRef { side: Side; row: Row; col: number; unit: Unit }

export function allUnits(s: MatchState, side: Side): UnitRef[] {
  const out: UnitRef[] = [];
  for (const row of BOARD.ROWS) {
    s.sides[side].rows[row].forEach((unit, col) => {
      if (unit) out.push({ side, row, col, unit });
    });
  }
  return out;
}

export function findByUid(s: MatchState, uid: string): UnitRef | null {
  for (const side of ['own', 'enemy'] as Side[]) {
    for (const row of BOARD.ROWS) {
      const arr = s.sides[side].rows[row];
      for (let col = 0; col < arr.length; col++) {
        const u = arr[col];
        if (u && u.uid === uid) return { side, row, col, unit: u };
      }
    }
  }
  return null;
}

export const unitCount = (s: MatchState, side: Side): number => allUnits(s, side).length;

export const hasKeyword = (u: Unit | null, kw: string): boolean => !!u && u.kw.includes(kw);

export const statusStacks = (u: Unit | null, id: string): number => u?.statuses[id]?.stacks ?? 0;

/** 主公身上的某状态层数（ADR-040） */
export const lordStatusStacks = (l: { statuses?: Record<string, StatusInstance> } | null, id: string): number =>
  l?.statuses?.[id]?.stacks ?? 0;

/** 状态剩余回合数；undefined = 永久或不存在 */
export const statusTurns = (u: Unit | null, id: string): number | undefined => u?.statuses[id]?.turns;

/** 该单位是否具备某项状态能力（ADR-034）——引擎只查能力，不认状态 id */
/**
 * 关键词判定（**同时认状态形式**，ADR-066）
 *
 * 项目里同一概念有两套载体：
 *   · 卡的固有关键词 `u.kw`        —— 如盾兵自带 jia_dun
 *   · 效果施加的状态 `<kw>_status` —— 如典韦「古之恶来」给自己架盾
 *
 * 行为判定必须两者都认。此前只有 hasKeyword，于是**用状态施加的那批卡全部静默失效**：
 *   关兴「先攻」/ 夏侯渊「奇袭」/ 典韦·郭淮·曹仁「架盾」都不生效
 *   （曹仁的圣盾走 hasCap 读状态，反而是好的 —— 正好暴露了这个不一致）。
 */
export function hasTrait(u: Unit | null, keyword: string): boolean {
  if (!u) return false;
  if (u.kw.includes(keyword)) return true;
  const st = u.statuses[`${keyword}_status`];
  return !!st && st.stacks > 0;
}

export function hasCap(u: Unit | null, cap: StatusCap): boolean {
  if (!u) return false;
  return hasCapOn(u.statuses, cap);
}

/** 状态集合层面判定能力（ADR-040：主公也可承载状态） */
export function hasCapOn(
  statuses: Record<string, StatusInstance> | undefined, cap: StatusCap,
): boolean {
  for (const [id, inst] of Object.entries(statuses ?? {})) {
    if (inst.stacks <= 0) continue;
    if (STATUSES[id]?.caps?.includes(cap)) return true;
  }
  return false;
}

/** 某项能力在状态集合中的累计层数（如「参谋」加成主公技次数） */
export function capStacks(
  statuses: Record<string, StatusInstance> | undefined, cap: StatusCap,
): number {
  let n = 0;
  for (const [id, inst] of Object.entries(statuses ?? {})) {
    if (inst.stacks > 0 && STATUSES[id]?.caps?.includes(cap)) n += inst.stacks;
  }
  return n;
}

/**
 * 读一个单位身上某项能力的**实际结算值**：先按状态层数算，再套「规则覆盖」（ADR-142）。
 *
 * 为什么需要它：一个状态的多个 cap 共用同一个层数（藤甲的 `reduce_physical` 与
 * `vulnerable_fire` 都等于层数），"加强藤甲"若靠加层数，会把**减伤**和**怕火**一起放大。
 * 规则覆盖让技能能只改其中一个档位：`{ statusId: 'teng_jia', cap: 'reduce_physical', value: 2 }`。
 *
 * 语义（三条，都有测试钉住）：
 *   · **仅当该状态确实存在时生效** —— 被净化 ⇒ 覆盖自动失效（`0` 层 = 没有该状态）；
 *     重新获得状态 ⇒ 覆盖自动恢复（覆盖是挂在实例上、每次结算现读的，不是一次性改写）；
 *   · **绝对值覆盖**，不是增减量（`value: 0` 就是彻底关掉这个档位，如"不再怕火"）；
 *   · 同时有多条时**后写的生效**（`mods` 数组顺序），便于"更强的统领覆盖更弱的"。
 */
/**
 * 该单位在某个档位上**有没有规则覆盖**；没有则 `undefined`。
 *
 * ⚠️ 与 `capValue` 的区别很重要：`capValue` 在**没有覆盖时回落到层数**（多半是 0），
 * 所以"0"既可能是"没有覆盖"也可能是"覆盖成 0"。凡是要区分这两者的地方（如 ADR-150 的
 * `proc_chance`：没有覆盖就该用卡面写死的概率，而不是当成 0%）必须用本函数。
 */
export function capOverride(u: Unit | null, cap: StatusCap): number | undefined {
  let v: number | undefined;
  for (const m of u?.mods ?? []) {
    if (m.kind !== 'rule' || !m.rule || m.rule.cap !== cap) continue;
    // 带状态的覆盖：状态不在了就失效（被净化 → 覆盖自动撤销）。
    // 无状态覆盖（ADR-150）不受此限 —— 它本来就不挂在状态上。
    if (m.rule.statusId !== undefined
        && !((u?.statuses[m.rule.statusId]?.stacks ?? 0) > 0)) continue;
    v = m.rule.value;
  }
  return v;
}

export function capValue(u: Unit, cap: StatusCap): number {
  // 覆盖优先于层数（ADR-142）；两者都没有就是 0
  return capOverride(u, cap) ?? capStacks(u.statuses, cap);
}

/** 该单位身上所有生效状态的 id */
export const activeStatuses = (u: Unit | null): string[] =>
  Object.entries(u?.statuses ?? {}).filter(([, v]) => v.stacks > 0).map(([k]) => k);

/** 「架盾」生效单位（ADR-051：单排后为纯嘲讽，不再限定前军） */
export const shieldUnits = (s: MatchState, side: Side): UnitRef[] =>
  allUnits(s, side).filter(({ unit }) => hasTrait(unit, 'jia_dun') && unit.hp > 0);

export const lordAlive = (s: MatchState, side: Side): boolean => s.sides[side].lord.hp > 0;

/** 空列（两排皆空） */
export function openColumns(s: MatchState, side: Side): number[] {
  const out: number[] = [];
  for (let c = 0; c < BOARD.COLS; c++) {
    if (!s.sides[side].rows.front[c] && !s.sides[side].rows.back[c]) out.push(c);
  }
  return out;
}

/**
 * 由卡牌定义生成战场单位实例
 * uid 由状态内的 uidSeq 决定 —— 保证同一 seed + 同一操作序列产出完全相同的状态（回放可复现）
 */
export function makeUnit(card: CardDef, turn: number, seq: number): Unit {
  return {
    uid: `${card.id}#${seq}`,
    cardId: card.id,
    name: card.name,
    type: card.type,
    faction: card.faction,
    cost: card.cost,
    baseAtk: card.attack ?? 0,
    baseMaxHp: card.health ?? 1,
    mods: [],
    atk: card.attack ?? 0,
    hp: card.health ?? 1,
    maxHp: card.health ?? 1,
    troopKind: card.troopKind,
    upgradeProgress: {
      damage: 0,
      shieldSurvival: 0,
      basicKills: 0,
      characterKills: 0,
      heroHits: 0,
    },
    gender: card.gender,
    kw: [...(card.keywords ?? [])],
    tags: [...(card.tags ?? [])],
    statuses: {},
    skills: card.skills ? structuredClone(card.skills) : undefined,
    attackedThisTurn: 0,
    actedThisTurn: false,
    dealtDamageThisTurn: false,
    enteredTurn: turn,
    skillUsesThisTurn: {},
    skillsUsedOnce: [],
  };
}

/** 保证旧快照/旧测试夹具也能使用 BDSB 升变进度。 */
export function upgradeProgress(u: Unit): NonNullable<Unit['upgradeProgress']> {
  u.upgradeProgress ??= {
    damage: 0,
    shieldSurvival: 0,
    basicKills: 0,
    characterKills: 0,
    heroHits: 0,
  };
  return u.upgradeProgress;
}

/** 只有三种基础兵属于“基础兵击杀”统计，特殊兵不计入。 */
export const isBasicTroop = (u: Pick<Unit, 'cardId' | 'type' | 'troopKind'>): boolean =>
  u.type === 'troop' && (
    u.cardId === 'neutral_infantry' ||
    u.cardId === 'neutral_shieldman' ||
    u.cardId === 'neutral_archer' ||
    u.cardId === 'neutral_cavalry'
  );

/**
 * 重算派生属性（ADR-037）
 *
 * 最终属性 = 基础值 + Σ mods。生命上限变化时当前生命**等量增减**，
 * 并夹在 [1, 上限]——光环失效不会导致单位死亡。
 */
export function applyMods(u: Unit): void {
  const dAtk = u.mods.reduce((s, m) => s + (m.attack ?? 0), 0);
  const dHp = u.mods.reduce((s, m) => s + (m.health ?? 0), 0);
  const newMax = Math.max(1, u.baseMaxHp + dHp);
  const delta = newMax - u.maxHp;
  u.atk = Math.max(0, u.baseAtk + dAtk);
  u.maxHp = newMax;
  if (u.hp > 0) u.hp = Math.max(1, Math.min(newMax, u.hp + delta));
}

/** 取下一个单位序号（由状态驱动，保证可复现） */
export function nextUidSeq(state: MatchState): number {
  state.uidSeq += 1;
  return state.uidSeq;
}
