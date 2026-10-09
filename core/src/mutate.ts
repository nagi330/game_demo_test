/**
 * 状态变更原语（低层）
 *
 * effects.ts 与 engine.ts 都通过这里改动状态，保证：
 *  - 所有伤害/治疗/死亡都走同一套结算顺序（docs/gdd/10-skills-statuses.md §4）
 *  - 所有变更都产生事件（客户端只消费事件）
 */

import { BOARD, DECK, STATUSES, type StatusDef } from './constants.ts';
import { createRng } from './rng.ts';
import { allUnits, applyMods, capValue, getUnit, hasCap, hasCapOn, hasKeyword, hasTrait, isBasicTroop, makeUnit, nextUidSeq, other, setUnit, statusStacks, upgradeProgress } from './state.ts';
import type { CardDef, CardType, DamageType, GameEvent, HandCard, MatchState, Row, Side, SkillDef, Unit } from './types.ts';

export type TargetRef =
  | { kind: 'unit'; side: Side; row: Row; col: number }
  | { kind: 'lord'; side: Side }
  | { kind: 'hand'; side: Side; index: number };   // 手牌（ADR-038）

export const unitRef = (side: Side, row: Row, col: number): TargetRef => ({ kind: 'unit', side, row, col });
export const lordRef = (side: Side): TargetRef => ({ kind: 'lord', side });
export const handRef = (side: Side, index: number): TargetRef => ({ kind: 'hand', side, index });

/** 手牌实际费用 = 卡面费用 + Σ 费用修正（ADR-038），下限 0 */
export function effectiveCost(hc: HandCard, ruleDelta = 0): number {
  const delta = hc.mods.filter((m) => m.kind === 'cost').reduce((s, m) => s + (m.value ?? 0), 0);
  return Math.max(0, (hc.card.cost ?? 0) + ruleDelta + delta);   // 缺 cost 不该算出 NaN
}

/** 该手牌是否被禁止上场 */
export const isBanned = (hc: HandCard): boolean => hc.mods.some((m) => m.kind === 'ban');

/**
 * 查找该单位的守护者（ADR-039）
 *
 * 遍历其身上的守护状态，取出 srcUid 对应的存活单位。
 * 排除「自我守护」与已阵亡的守护者。
 *
 * ADR-071：**跳过 `guard_scope: 'lord'` 的守护状态** —— 那是「护主」
 * （祖茂「替主」），只拦主帅伤害，不该顺手把单位伤害也接管。
 */
export function findGuard(
  state: MatchState, u: Unit,
): { side: Side; row: Row; col: number; unit: Unit } | null {
  for (const [id, inst] of Object.entries(u.statuses)) {
    if (inst.stacks <= 0 || !inst.srcUid) continue;
    const def = STATUSES[id];
    if (!def?.caps?.includes('redirect_damage')) continue;
    if (def.guard_scope === 'lord') continue;
    for (const side of ['own', 'enemy'] as Side[]) {
      for (const row of ['front', 'back'] as Row[]) {
        for (let col = 0; col < BOARD.COLS; col++) {
          const g = state.sides[side].rows[row][col];
          if (g && g.uid === inst.srcUid && g.uid !== u.uid && g.hp > 0) {
            return { side, row, col, unit: g };
          }
        }
      }
    }
  }
  return null;
}

/**
 * 查找该方主帅的守护者（ADR-071，祖茂「替主」）
 *
 * 主帅不是 `Unit`，无法走 `findGuard`。这里反过来扫**主帅身上的守护状态**
 * （`shou_hu` / `hu_zhu`），用 `srcUid` 找出替他挨打的存活单位。
 * 守护者的状态由来源技能的光环维持 —— 守护者一死，光环重算时一并消失。
 */
export function findLordGuard(
  state: MatchState, side: Side,
): { side: Side; row: Row; col: number; unit: Unit } | null {
  const lord = state.sides[side].lord;
  for (const [id, inst] of Object.entries(lord.statuses ?? {})) {
    if (inst.stacks <= 0 || !inst.srcUid) continue;
    if (!STATUSES[id]?.caps?.includes('redirect_damage')) continue;
    for (const s of ['own', 'enemy'] as Side[]) {
      for (const row of ['front', 'back'] as Row[]) {
        for (let col = 0; col < BOARD.COLS; col++) {
          const g = state.sides[s].rows[row][col];
          if (g && g.uid === inst.srcUid && g.hp > 0) return { side: s, row, col, unit: g };
        }
      }
    }
  }
  return null;
}

/** 目标当前生命 */
export function refHp(state: MatchState, ref: TargetRef): number {
  if (ref.kind === 'lord') return state.sides[ref.side].lord.hp;
  if (ref.kind === 'hand') return 0;                 // 手牌无生命（ADR-038）
  return getUnit(state, ref.side, ref.row, ref.col)?.hp ?? 0;
}

/** 目标是否仍存在 */
export function refAlive(state: MatchState, ref: TargetRef): boolean {
  if (ref.kind === 'lord') return state.sides[ref.side].lord.hp > 0;
  if (ref.kind === 'hand') return false;             // 手牌不是"存活对象"（ADR-038）
  const u = getUnit(state, ref.side, ref.row, ref.col);
  return !!u && u.hp > 0;
}

/* ============================================================
   抽牌 / 粮尽
   ============================================================ */

/**
 * 「抽到时释放」解析器（ADR-050）。
 *
 * 依赖方向是 effects → mutate，所以 mutate 不能直接调 runEffects；
 * 这里留一个挂载点，由 effects.ts 在模块加载时注册。返回 false = 交给普通抽牌；
 * 返回对象则表示已处理，并由 discard 字段决定是否进入弃牌堆。
 */
export type OnDrawResult = false | { discard: boolean };

export type OnDrawResolver = (
  state: MatchState, cards: Map<string, CardDef>, side: Side,
  card: CardDef, events: GameEvent[], rng: ReturnType<typeof createRng>,
) => OnDrawResult;

let onDrawResolver: OnDrawResolver | null = null;

export function registerOnDrawResolver(fn: OnDrawResolver): void {
  onDrawResolver = fn;
}

/** 抽牌进入手牌后重算光环（例如郭嘉对战法的费用修正）。 */
export type AfterDrawResolver = (
  state: MatchState, cards: Map<string, CardDef>, events: GameEvent[],
  rng: ReturnType<typeof createRng>,
) => void;

let afterDrawResolver: AfterDrawResolver | null = null;

export function registerAfterDrawResolver(fn: AfterDrawResolver): void {
  afterDrawResolver = fn;
}

/**
 * 「亡语」解析器（ADR-050）。
 *
 * 原实现只硬编码了 damage / draw 两种动作，其余（send_to_deck、summon、apply_status…）
 * **静默不生效**——袁绍「遗毒」就是这么被吃掉的。改为统一交给 DSL 解释器。
 */
export type OnDeathResolver = (
  state: MatchState, cards: Map<string, CardDef>, side: Side,
  unit: Unit, skills: SkillDef[], events: GameEvent[],
  rng: ReturnType<typeof createRng>,
  /** 击杀者（华雄「亡语：击杀华雄的角色获得 +1/+1」需要它，ADR-070） */
  killer?: { side: Side; row?: Row; col?: number } | null,
) => void;

let onDeathResolver: OnDeathResolver | null = null;

/** 「击杀时」解算器（ADR-070）：由 effects.ts 注册，避免 mutate ↔ effects 循环依赖 */
export type OnKillResolver = (
  state: MatchState, cards: Map<string, CardDef>,
  killer: { side: Side; row: Row; col: number },
  victim: { name: string; side: Side; row: Row; col: number; type: CardType },
  events: GameEvent[], rng: ReturnType<typeof createRng>,
) => void;

let onKillResolver: OnKillResolver | null = null;

export function registerOnKillResolver(fn: OnKillResolver): void {
  onKillResolver = fn;
}

export function registerOnDeathResolver(fn: OnDeathResolver): void {
  onDeathResolver = fn;
}

/**
 * 「主公受伤后」解算器（ADR-113，无难兵「赴难」）
 *
 * 起因：光环（aura）在**每次重算时清空并重挂**，所以「条件型光环」只能反映**上次重算那一刻**
 * 的局面。而 `recomputeAuras` 此前只在「出牌 / 阵亡 / 回合边界」被调用 ——
 * **主公掉血不会触发它**。
 *
 * 于是「己方主公血 < 敌方主公时攻 +1」这种**依赖主公血量**的光环会滞后到下一个回合边界
 * 才刷新（玩家看到的是「血已经低了，卡面还是 2/4」）。
 *
 * 这里补一个挂载点，由 effects.ts 注册 `recomputeAuras`，避免 mutate ↔ effects 循环依赖。
 */
export type AfterLordDamagedResolver = (
  state: MatchState, cards: Map<string, CardDef>, events: GameEvent[],
  side: Side, actualDamage: number, reflected: boolean,
) => void;

let afterLordDamagedResolver: AfterLordDamagedResolver | null = null;

export function registerAfterLordDamagedResolver(fn: AfterLordDamagedResolver): void {
  afterLordDamagedResolver = fn;
}

/**
 * 「标记阵亡」解算器（ADR-087）
 *
 * `runMarkDeath`（effects.ts）从 ADR-041 起就写好了，**却从来没有人调用** ——
 * 于是「仇敌」标记与「阵亡标记」的阵亡结算一直是死代码：
 * 草船借箭卡面承诺的「敌方每阵亡一个武将，己方抽取两张卡」一次都没生效过。
 * 这里按 onDeath / onKill 同样的挂载点模式接上，避免 mutate ↔ effects 循环依赖。
 */
export type MarkDeathResolver = (
  state: MatchState, cards: Map<string, CardDef>, dead: Unit,
  rng: ReturnType<typeof createRng>, events: GameEvent[],
) => void;

let markDeathResolver: MarkDeathResolver | null = null;

export function registerMarkDeathResolver(fn: MarkDeathResolver): void {
  markDeathResolver = fn;
}

/**
 * 「死亡后光环重算」解算器（ADR-087，时机表第 19 步）
 *
 * 原先只有**攻击者自己被打死**这一条路径会重算光环（`resolveAttack` 里那一处），
 * 被反击打死的**防守方**则不会 —— 于是张飞阵亡后「攻低于他的敌人 −1 攻」还在，
 * 与卡面「张飞阵亡就会消失」直接矛盾。死亡只有一个漏斗（killUnit），在这里接一次即可。
 */
export type AfterDeathResolver = (
  state: MatchState, cards: Map<string, CardDef>, events: GameEvent[],
) => void;

let afterDeathResolver: AfterDeathResolver | null = null;

export function registerAfterDeathResolver(fn: AfterDeathResolver): void {
  afterDeathResolver = fn;
}

export function drawCard(
  state: MatchState,
  cards: Map<string, CardDef>,
  side: Side,
  events: GameEvent[],
  rng?: ReturnType<typeof createRng>,
): void {
  const s = state.sides[side];
  if (s.deck.length === 0) {
    // 粮尽：递增伤害
    s.fatigue += 1;
    events.push({ type: 'FATIGUE', side, amount: s.fatigue, hp: Math.max(0, s.lord.hp - s.fatigue) });
    dealDamage(state, cards, lordRef(side), s.fatigue, events, 'fatigue');
    return;
  }
  // 断抽（ADR-041）：该方主帅带 block_draw 状态时抽牌无效
  if (hasCapOn(state.sides[side].lord.statuses, 'block_draw')) {
    events.push({ type: 'DRAW_BLOCKED', side });
    return;
  }
  const id = s.deck.pop() as string;
  const card = cards.get(id);
  if (!card) return;
  events.push({ type: 'CARD_DRAWN', side, card, deckLeft: s.deck.length });

  // 「抽到时释放」（ADR-050，如「万箭齐发」）：不进手牌，直接结算并进弃牌堆。
  // rng 未传入时退回由 state.rngState 临时派生——确定可复现，但随机质量略降（见 ADR-050）
  if (onDrawResolver) {
    const r = rng ?? createRng(state.rngState);
    const result = onDrawResolver(state, cards, side, card, events, r);
    if (result) {
      if (result.discard) s.discard.push(card);
      events.push({ type: 'CARD_AUTO_CAST', side, card });
      return;
    }
  }

  s.hand.push({ card, mods: [] });            // ADR-038：包成手牌实例
  afterDrawResolver?.(state, cards, events, rng ?? createRng(state.rngState));
  // 手牌上限：超出部分在回合结束时弃置（见 engine.endTurn）
}

/* ============================================================
   伤害 / 治疗
   ============================================================ */

/**
 * 造成伤害（完整结算：武圣 → 护甲 → 扣血 → 死亡）
 * @returns 实际造成的伤害
 */
export function dealDamage(
  state: MatchState,
  cards: Map<string, CardDef>,
  ref: TargetRef,
  amount: number,
  events: GameEvent[],
  source: string,
  depth = 0,
  /** 造成伤害的单位（用于把「击杀者」传给 killUnit → on_kill，ADR-070） */
  killerRef?: { side: Side; row: Row; col: number } | null,
  /** 造成伤害的具体单位，用于普通兵升级进度与剧毒。 */
  sourceUnit?: Unit,
  /**
   * 本次伤害的**属性**（藤甲兵 ADR-108）。缺省 `physical` = 普通攻击 / 无属性效果伤害。
   *
   * 这是**受伤侧**唯一能知道"来源是火还是水"的入口 —— 此前 `damage_type` 只在
   * 发起伤害时被读取（水攻加成），`dealDamage` 完全不知道来源属性，
   * 导致「藤甲：火 +1 / 其余 −1」这类减伤效果无法实现（见 GDD 18 §3）。
   */
  damageType: DamageType = 'physical',
  reflected = false,
  deathSource?: { side: Side; row?: Row; col?: number },
): number {
  if (amount <= 0 || !refAlive(state, ref)) return 0;

  // 甘宁「锦帆统领」：己方物理/无属性伤害统一转为水攻；显式火/毒/水不改写。
  if (sourceUnit && damageType === 'physical') {
    const sourceSide = (['own', 'enemy'] as Side[]).find((sd) =>
      allUnits(state, sd).some((r) => r.unit.uid === sourceUnit.uid));
    if (sourceSide && allUnits(state, sourceSide).some((r) => hasCap(r.unit, 'water_convert'))) {
      damageType = 'water';
    }
  }

  if (ref.kind === 'lord') {
    const lord = state.sides[ref.side].lord;
    const hpBefore = lord.hp;
    if (hasCapOn(lord.statuses, 'immune_all_damage')) return 0;
    const shield = Object.keys(lord.statuses ?? {}).find(k => STATUSES[k]?.caps?.includes('immune_damage'));
    if (shield) {
      delete lord.statuses![shield];
      events.push({ type: 'LORD_STATUS_EXPIRED', side: ref.side, status: shield });
      return 0;
    }
    // 「护主」守护（ADR-071，祖茂「替主」）：主帅的伤害转由守护者承受。
    // 必须在扣护甲/扣血之前判定 —— 否则主帅已经掉了血，转移就成了补刀。
    const lguard = findLordGuard(state, ref.side);
    if (lguard && depth < 3) {
      events.push({ type: 'DAMAGE_REDIRECTED', side: ref.side, lord: true,
                    to: lguard.side, guardName: lguard.unit.name });
      return dealDamage(state, cards, unitRef(lguard.side, lguard.row, lguard.col),
                        amount, events, source, depth + 1, killerRef, sourceUnit, damageType, reflected, deathSource);
    }
    let dmg = amount;
    if (lord.armor > 0) {
      const absorbed = Math.min(lord.armor, dmg);
      lord.armor -= absorbed;
      lord.temporaryArmor = Math.max(0, (lord.temporaryArmor ?? 0) - absorbed);
      dmg -= absorbed;
    }
    lord.hp -= dmg;
    const actual = Math.min(dmg, hpBefore);
    if (sourceUnit && actual > 0 && isBasicTroop(sourceUnit)) {
      const p = upgradeProgress(sourceUnit);
      if (sourceUnit.troopKind === 'infantry') p.damage += actual;
      if (sourceUnit.troopKind === 'archer') p.heroHits += 1;
    }
    events.push({ type: 'DAMAGE', target: ref, amount, source });
    if (lord.hp <= 0) {
      lord.hp = 0;
      checkWinner(state, events);
    }
    // 主公血量变了 → 条件型光环（如无难兵「赴难」比较双方主公血量）必须立刻重算，
    // 否则卡面要滞后到下一个回合边界才更新。见 registerAfterLordDamagedResolver。
    if (actual > 0) afterLordDamagedResolver?.(state, cards, events, ref.side, actual, reflected);
    return actual;
  }

  if (ref.kind !== 'unit') return 0;                // 手牌不受伤害（ADR-038）
  const u = getUnit(state, ref.side, ref.row, ref.col);
  if (!u) return 0;

  // 伤害重定向（ADR-039）：守护状态把伤害整体转给守护者
  const guard = findGuard(state, u);
  if (guard && depth < 3) {
    events.push({ type: 'DAMAGE_REDIRECTED', side: ref.side, row: ref.row, col: ref.col,
                  to: guard.side, guardName: guard.unit.name });
    return dealDamage(state, cards, unitRef(guard.side, guard.row, guard.col),
                      amount, events, source, depth + 1, killerRef, sourceUnit, damageType, reflected, deathSource);
  }

  // 免疫伤害（圣盾）：既支持效果施加的 sheng_dun_status，也支持卡牌固有的
  // sheng_dun 关键词。两种载体都只消耗一次，且都产生同样的过期事件。
  const shieldStatus = Object.keys(u.statuses).find((k) => STATUSES[k]?.caps?.includes('immune_damage'));
  if (hasCap(u, 'immune_all_damage')) return 0;
  const shieldKeyword = u.kw.includes('sheng_dun');
  if (shieldStatus || shieldKeyword) {
    if (shieldStatus) delete u.statuses[shieldStatus];
    if (shieldKeyword) u.kw = u.kw.filter((k) => k !== 'sheng_dun');
    events.push({ type: 'STATUS_EXPIRED', side: ref.side, row: ref.row, col: ref.col,
      status: shieldStatus ?? 'sheng_dun_status' });
    return 0;
  }

  const hpBefore = u.hp;

  // 受伤侧减伤 / 反伤（ADR-108 藤甲兵）：
  //   reduce_physical —— 受到 physical 伤害时 −N（最低 0，"刀枪不入"）
  //   vulnerable_fire —— 受到 fire 伤害时 +N（"遇火即燃"）
  //   thorns —— 本次实际受伤后，来源单位反弹 N 点
  // 三个能力都是**状态驱动**（藤甲兵入场自挂），故只认能力、不认卡 id。
  // ⚠️ 一律走 `capValue`（ADR-142）：它在层数之上多套一层「规则覆盖」，
  //    让「藤甲强化」能把 `reduce_physical` 单独抬到 2、同时把 `vulnerable_fire` 压到 0，
  //    而不必靠加层数（加层数会把减伤与怕火一起放大）。没有覆盖时与 `capStacks` 完全等价。
  const reducePhysical = capValue(u, 'reduce_physical');
  const vulnerableFire = capValue(u, 'vulnerable_fire');
  let finalAmount = amount;
  if (damageType === 'physical' && reducePhysical > 0) {
    finalAmount = Math.max(0, finalAmount - reducePhysical);
  } else if (damageType === 'fire' && vulnerableFire > 0) {
    finalAmount = finalAmount + vulnerableFire;
  }
  if (finalAmount <= 0) {
    // 被完全减伤：只发 0 伤事件，不进入后面的击杀/免死/升级进度判定
    events.push({ type: 'DAMAGE', target: ref, amount: 0, source });
    return 0;
  }

  u.hp -= finalAmount;
  const actual = Math.min(finalAmount, hpBefore);

  if (sourceUnit && actual > 0 && isBasicTroop(sourceUnit)) {
    const p = upgradeProgress(sourceUnit);
    if (sourceUnit.troopKind === 'infantry') p.damage += actual;
    if (sourceUnit.troopKind === 'archer' && ['general', 'strategist'].includes(u.type)) p.heroHits += 1;
  }
  events.push({ type: 'DAMAGE', target: ref, amount: finalAmount, source });

  // 剧毒是伤害来源单位的能力，不依赖额外牌组或状态；伤害至少命中 1 点后直接摧毁目标。
  if (actual > 0 && sourceUnit?.kw.includes('ju_du') && u.hp > 0) {
    killUnit(state, cards, { side: ref.side, row: ref.row, col: ref.col, unit: u }, events, deathSource ?? killerRef);
    return actual;
  }

  // 反伤（ADR-108 的 thorns cap；白毦兵「忠勇」是首个使用者）：
  // 本次实际受伤后，由**来源单位**额外承受 N 点。
  //
  // 位置很关键 —— 必须排在**免死与击杀判定之前**，否则：
  //   ① 反伤把被打死的一方提前 `return`，会让扣成负血的目标**留在场上不死**
  //      （实测：20 攻打 6 血白毦兵，hp = −14 却仍在场，死亡结算被跳过）；
  //   ② 「被打死也照样回敬」的语义会丢失（与自动反击的「同时结算」不一致）。
  // 来源的**坐标**取自 killerRef —— `sourceUnit`（Unit）本身不携带 row/col。
  const thorns = capValue(u, 'thorns');
  if (actual > 0 && thorns > 0 && sourceUnit && killerRef && sourceUnit.uid !== u.uid) {
    const { side: srcSide, row: srcRow, col: srcCol } = killerRef;
    const v = getUnit(state, srcSide, srcRow, srcCol);
    if (v) {
      const before = v.hp;
      // killerRef 传 null：反伤不再引发对方的反伤，避免双向 thorns 递归
      dealDamage(state, cards, unitRef(srcSide, srcRow, srcCol), thorns, events, u.name,
        depth + 1, null, u, 'physical');
      if (before > 0 && v.hp <= 0) {
        killUnit(state, cards, { side: srcSide, row: srcRow, col: srcCol, unit: v }, events, null);
      }
    }
  }

  // 主公普攻同样触发反伤；普通技能来源不会进入此分支。
  if (actual > 0 && thorns > 0 && deathSource && deathSource.row === undefined) {
    dealDamage(state, cards, lordRef(deathSource.side), thorns, events, u.name,
      depth + 1, null, u, 'physical');
  }

  // 免死判定（ADR-039）：致命伤害时按 on_lethal 技能掷骰，成功则以 1 血存活
  if (u.hp <= 0 && tryLethalSave(state, u, ref, events)) return finalAmount;

  if (u.hp <= 0) killUnit(state, cards, { side: ref.side, row: ref.row, col: ref.col, unit: u }, events, deathSource ?? killerRef);
  return finalAmount;
}

/**
 * 免死判定（ADR-039）
 *
 * 在**扣血后、移出战场前**判定——免疫是"扣血前取消"，免死是"归零后抬回 1 血"。
 * 使用由 state.rngState 派生的确定性 RNG，保证回放可复现。
 */
function tryLethalSave(
  state: MatchState, u: Unit, ref: Extract<TargetRef, { kind: 'unit' }>, events: GameEvent[],
): boolean {
  const saves = (u.skills ?? []).filter((sk) => sk.trigger === 'on_lethal');
  if (!saves.length) return false;
  const usedOnce = (u as Unit & { lethalUsed?: boolean }).lethalUsed;
  const rng = createRng(state.rngState);
  for (const sk of saves) {
    if (sk.frequency === 'once' && usedOnce) continue;
    const chance = sk.chance ?? 1;
    const roll = rng.next();
    if (roll < chance) {
      state.rngState = rng.getState();
      u.hp = 1;
      (u as Unit & { lethalUsed?: boolean }).lethalUsed = true;
      events.push({ type: 'UNIT_SURVIVED', side: ref.side, row: ref.row, col: ref.col, unit: u });
      return true;
    }
  }
  state.rngState = rng.getState();
  return false;
}

/**
 * 受到伤害触发技（时机表第 16 步，ADR-031/036）
 * 由 engine 在伤害结算后统一调用，避免 mutate 反向依赖 effects。
 */
export function collectDamaged(
  state: MatchState, side: Side, uid: string,
): { row: Row; col: number; unit: Unit } | null {
  for (const ref of allUnits(state, side)) if (ref.unit.uid === uid) return ref;
  return null;
}

export function healTarget(
  state: MatchState,
  ref: TargetRef,
  amount: number,
  events: GameEvent[],
): void {
  if (amount <= 0 || !refAlive(state, ref)) return;
  if (ref.kind === 'lord') {
    const lord = state.sides[ref.side].lord;
    lord.hp = Math.min(lord.maxHp, lord.hp + amount);
    events.push({ type: 'HEAL', target: ref, amount, hp: lord.hp });
    return;
  }
  if (ref.kind !== 'unit') return;                   // 手牌不可被治疗（ADR-038）
  const u = getUnit(state, ref.side, ref.row, ref.col);
  if (!u) return;
  u.hp = Math.min(u.maxHp, u.hp + amount);
  if (u.hp >= u.maxHp) {
    for (const [id, inst] of Object.entries(u.statuses)) {
      if (!inst.untilFullHealth) continue;
      delete u.statuses[id];
      events.push({ type: 'STATUS_EXPIRED', side: ref.side, row: ref.row, col: ref.col, status: id });
    }
  }
  events.push({ type: 'HEAL', target: ref, amount, hp: u.hp });
}

export function gainArmor(state: MatchState, side: Side, amount: number, events: GameEvent[]): void {
  const lord = state.sides[side].lord;
  lord.armor += amount;
  events.push({ type: 'ARMOR_GAINED', side, amount, armor: lord.armor });
}

/* ============================================================
   状态
   ============================================================ */

/**
 * 数值型状态的**层数合并**（ADR-117 封顶 / ADR-132 合并方式）
 *
 *   · 标志型（`numeric: false`）—— 只判"存在与否"，固定 1 层
 *   · `stack_mode: 'add'`（默认）—— 层数累加（灼烧：再烧一次就多 1 层）
 *   · `stack_mode: 'max'`         —— 取较大者、**不降级**（水困：层数＝阶段，
 *     连续施加不该让阶段倒退；若按累加，2 费卡连发两次就能把阶段顶到 4 → 行动一次掉 8 点）
 *   · `max_stacks` 在**施加时**夹紧（不是在结算时夹）—— 卡面徽章直接显示层数，
 *     徽章写 5 而只结算 3 会让玩家算不出这一下掉多少（ADR-117）
 */
function mergeStacks(def: StatusDef | undefined, numeric: boolean, prev: number, incoming: number): number {
  if (!numeric) return Math.max(1, incoming);
  const merged = def?.stack_mode === 'max' ? Math.max(prev, incoming) : prev + incoming;
  return def?.max_stacks !== undefined ? Math.min(merged, def.max_stacks) : merged;
}

/**
 * 移除状态（驱散，ADR-066）
 *
 * 与 applyStatus 对称：`stacks` 省略时移除**全部层数**；给了就只扣那么多层，
 * 扣到 0 才真正删除。只在「状态彻底消失」时发 STATUS_EXPIRED ——
 * 部分削减也发的话客户端会误判成"状态没了"。
 *
 * 返回实际移除了几层，便于调用方/测试核对。
 */
export function removeStatus(
  state: MatchState,
  ref: TargetRef,
  status: string,
  events: GameEvent[],
  stacks?: number,
): number {
  if (ref.kind === 'hand') return 0;

  if (ref.kind === 'lord') {
    const lord = state.sides[ref.side].lord;
    const inst = lord.statuses?.[status];
    if (!inst) return 0;
    const removed = stacks === undefined ? inst.stacks : Math.min(stacks, inst.stacks);
    if (stacks === undefined || removed >= inst.stacks) {
      delete lord.statuses![status];
      // 主公没有 row/col，用专用事件（STATUS_EXPIRED 要求坐标）
      events.push({ type: 'LORD_STATUS_EXPIRED', side: ref.side, status });
    } else {
      inst.stacks -= removed;
    }
    return removed;
  }

  const u = getUnit(state, ref.side, ref.row, ref.col);
  if (!u) return 0;
  const inst = u.statuses[status];
  if (!inst) return 0;

  const removed = stacks === undefined ? inst.stacks : Math.min(stacks, inst.stacks);
  if (stacks === undefined || removed >= inst.stacks) {
    delete u.statuses[status];
    // 关键词携带的状态（架盾/圣盾/先攻）同时要把关键词去掉，
    // 否则会出现"状态没了但关键词还在"的幽灵效果。
    u.kw = u.kw.filter((k) => k !== status);
    events.push({ type: 'STATUS_EXPIRED', side: ref.side, row: ref.row, col: ref.col, status });
  } else {
    inst.stacks -= removed;
  }
  return removed;
}

export function applyStatus(
  state: MatchState,
  ref: TargetRef,
  status: string,
  stacks: number,
  events: GameEvent[],
  turns?: number,
  srcUid?: string,
  auraId?: string,
  /** 施加当回合不递减（ADR-089）—— 见 StatusInstance.skipTick */
  skipTick = false,
  /** 目标恢复满血时解除（马忠「设伏」） */
  untilFullHealth = false,
): void {
  if (ref.kind === 'hand') return;                    // 手牌用 HandMod（ADR-038）
  const def = STATUSES[status];

  // 主公状态（ADR-040）
  if (ref.kind === 'lord') {
    const lord = state.sides[ref.side].lord;
    lord.statuses = lord.statuses ?? {};
    if (def?.kind === 'debuff' && hasCapOn(lord.statuses, 'immune_debuff')) return;
    const prevL = lord.statuses[status];
    const numericL = def?.numeric ?? true;
    // 光环施加的状态（ADR-071）：生命周期由光环决定 —— 每次 recomputeAuras 都先清后加。
    // 若还按 `duration: 'turns'` 记 1 回合，它会在**自己回合结束**的那一刻被清掉，
    // 而「护主」要挡的恰恰是**对手回合**的伤害，等于形同虚设。
    const turnsL = untilFullHealth ? undefined
      : auraId !== undefined && turns === undefined ? undefined
      : turns !== undefined ? turns
      : def?.duration === 'until_enemy_turn_end' ? undefined
      : def?.duration === 'permanent' || def?.duration === 'until_consumed' ? undefined
      : def?.duration === 'turns' || def?.duration === 'this_turn' ? 1 : undefined;
    lord.statuses[status] = {
      stacks: mergeStacks(def, numericL, prevL?.stacks ?? 0, stacks),
      turns: turnsL, srcUid, auraId,
      ...(def?.duration === 'this_turn' && auraId === undefined ? { expiresAtHalfTurn: state.halfTurn } : {}),
      ...(def?.duration === 'until_enemy_turn_end' ? { expiresAtHalfTurn: state.halfTurn + 1 } : {}),
      ...(untilFullHealth ? { untilFullHealth: true } : {}),
      ...(skipTick && turnsL !== undefined ? { skipTick: true } : {}),
    };
    if (auraId === undefined) events.push({ type: 'STATUS_APPLIED', side: ref.side, status, stacks, turns: turnsL });
    return;
  }

  const u = getUnit(state, ref.side, ref.row, ref.col);
  if (!u) return;

  // 免疫负面：带 immune_debuff 能力的单位，负面状态施加无效（ADR-034）
  if (def?.kind === 'debuff' && hasCap(u, 'immune_debuff')) {
    events.push({ type: 'STATUS_BLOCKED', side: ref.side, row: ref.row, col: ref.col, status, reason: '免疫' });
    return;
  }

  const numeric = def?.numeric ?? true;
  const prev = u.statuses[status];
  // 层数合并与封顶见 mergeStacks（ADR-117 施加时夹紧 / ADR-132 stack_mode）
  const nextStacks = mergeStacks(def, numeric, prev?.stacks ?? 0, stacks);
  // 持续时间：调用方指定优先；否则按状态定义（permanent → 永久）。
  // 光环施加的状态同上：交给光环管生命周期，不吃回合到期（ADR-071）。
  const nextTurns = untilFullHealth ? undefined
    : auraId !== undefined && turns === undefined ? undefined
    : turns !== undefined ? turns
    : def?.duration === 'until_enemy_turn_end' ? undefined
    : prev?.turns !== undefined ? Math.max(prev.turns, 1)
    : def?.duration === 'permanent' || def?.duration === 'until_consumed' ? undefined
    : def?.duration === 'turns' || def?.duration === 'this_turn' ? 1
    : undefined;
  u.statuses[status] = {
    stacks: nextStacks, turns: nextTurns, srcUid, auraId,
    ...(def?.duration === 'this_turn' && auraId === undefined ? { expiresAtHalfTurn: state.halfTurn } : {}),
    ...(def?.duration === 'until_enemy_turn_end' ? { expiresAtHalfTurn: state.halfTurn + 1 } : {}),
    ...(untilFullHealth ? { untilFullHealth: true } : {}),
    ...(skipTick && nextTurns !== undefined ? { skipTick: true } : {}),
  };
  if (auraId === undefined) events.push({ type: 'STATUS_APPLIED', side: ref.side, row: ref.row, col: ref.col, status, stacks, turns: nextTurns });
}

/**
 * 「中毒」的削上限原语（ADR-132）
 *
 * 永久降低 N 点生命上限，**不造成伤害** —— 这是中毒与灼烧（掉血）/水困（行动掉血）
 * 的根本区别：它削的是"这一局的耐久"，而不是"当前这一条命"。
 *
 *   · 削减量记进 `mods`（`kind: 'permanent'`，id = `shrink:<状态 id>`）——
 *     复用既有的属性修正层（ADR-037），光环重算/临时修正到期都会把它一并算进去，
 *     不新造一套"已损失上限"的平行字段。
 *   · 派生上限 = `max(0, baseMaxHp + Σmods.health)` —— **刻意不走 `applyMods` 的 `[1, ∞)` 夹紧**：
 *     那条夹紧是为「光环失效不致死」服务的（state.ts 注释），而中毒的语义正是
 *     能把上限削到 0 并致死。两处都要保留，所以这里另算一次。
 *   · 当前生命**只夹不缩**：高于新上限才夹到新上限，否则原地不动（削上限 ≠ 扣血）。
 *   · 上限归零 → 当前生命夹到 0 → 走既有的「hp ≤ 0 即阵亡」约定（`killUnit`）。
 *   · 状态被净化后**停止**继续削，但**已削的不恢复**（修正项不随状态删除而回滚）。
 *
 * @returns 实际削掉的上限点数（0 = 未削：单位不存在 / 已阵亡 / 削量非正）
 */
export function shrinkMaxHp(
  state: MatchState,
  cards: Map<string, CardDef>,
  ref: { side: Side; row: Row; col: number },
  amount: number,
  events: GameEvent[],
  /** 状态 id：只用于给修正项起一个稳定 id（同状态重复施加合并成一条），不参与行为判定 */
  statusId: string,
  /** 事件与日志里的来源名（取状态显示名，便于 UI 飘字与回放排查） */
  source = '中毒',
): number {
  if (amount <= 0) return 0;
  const u = getUnit(state, ref.side, ref.row, ref.col);
  if (!u || u.hp <= 0) return 0;                       // 已阵亡不重复结算（沿用行动税的保护）

  const before = u.maxHp;
  const modId = `shrink:${statusId}`;
  const mod = u.mods.find((m) => m.id === modId);
  if (mod) mod.health = (mod.health ?? 0) - amount;
  else u.mods.push({ id: modId, kind: 'permanent', health: -amount });

  const dHp = u.mods.reduce((s, m) => s + (m.health ?? 0), 0);
  u.maxHp = Math.max(0, u.baseMaxHp + dHp);
  u.hp = Math.max(0, Math.min(u.hp, u.maxHp));
  const shrunk = before - u.maxHp;
  if (shrunk > 0) {
    events.push({ type: 'STAT_MODIFIED', side: ref.side, row: ref.row, col: ref.col, health: -shrunk, source });
  }
  if (u.hp <= 0) killUnit(state, cards, { side: ref.side, row: ref.row, col: ref.col, unit: u }, events, null);
  return shrunk;
}

/* ============================================================
   召唤 / 死亡
   ============================================================ */

export function summonUnit(
  state: MatchState,
  cards: Map<string, CardDef>,
  side: Side,
  row: Row,
  col: number,
  cardId: string,
  events: GameEvent[],
): Unit | null {
  const card = cards.get(cardId);
  if (!card) return null;
  if (state.sides[side].rows[row][col]) return null;
  const u = makeUnit(card, state.turn, nextUidSeq(state));
  setUnit(state, side, row, col, u);
  // 丁奉「雪中奋短兵」：只强化其光环存在后新召唤的单位。
  // 丁奉「雪中奋短兵」只强化后续召唤的武将、谋臣和兵种，
  // 不把 token / 军械等其他单位类型误算进来。
  const dingfengEligible = ['troop', 'general', 'strategist'].includes(card.type);
  if (dingfengEligible && allUnits(state, side).some((ref) => ref.unit.uid !== u.uid && hasCap(ref.unit, 'future_summon'))) {
    u.kw = [...new Set([...u.kw, 'xian_gong'])];
    u.statuses.xian_gong_status = { stacks: 1 };
    u.mods.push({ id: `dingfeng#${u.uid}`, kind: 'permanent', attack: -2, health: -2 });
    applyMods(u);
  }
  events.push({ type: 'UNIT_SUMMONED', side, row, col, unit: u });
  return u;
}

export interface UnitRefFull { side: Side; row: Row; col: number; unit: Unit }

/** 死亡结算：移除 → 亡语（忠义 / 遗计）→ 胜负检查 */
export function killUnit(
  state: MatchState,
  cards: Map<string, CardDef>,
  ref: UnitRefFull,
  events: GameEvent[],
  /** 击杀者（谁把它打死的）。供 on_kill 触发技与「亡语给击杀者加成」用（ADR-070） */
  killer?: { side: Side; row?: Row; col?: number } | null,
): void {
  const { side, row, col, unit } = ref;
  if (!getUnit(state, side, row, col)) return;

  // 骑兵升变进度：只统计击杀基础兵，或击杀武将/谋臣；特殊兵不算基础兵。
  if (killer?.row !== undefined && killer.col !== undefined) {
    const killerUnit = getUnit(state, killer.side, killer.row, killer.col);
    if (killerUnit?.troopKind === 'cavalry' && isBasicTroop(killerUnit)) {
      const p = upgradeProgress(killerUnit);
      if (isBasicTroop(unit)) p.basicKills += 1;
      if (unit.type === 'general' || unit.type === 'strategist') p.characterKills += 1;
    }
  }

  setUnit(state, side, row, col, null);
  events.push({ type: 'UNIT_DIED', side, row, col, unit });

  // 标记阵亡（ADR-041 / ADR-087）：仇敌标记、阵亡标记的结算。
  // 放在亡语之前 —— 标记是"别人挂在我身上的账"，先结账再走自己的亡语。
  if (markDeathResolver) {
    markDeathResolver(state, cards, unit, createRng(state.rngState), events);
  }

  // 遗计：阵亡时抽 1 张
  if (hasTrait(unit, 'yi_ji')) drawCard(state, cards, side, events);

  // 忠义：触发卡牌自定义的 on_death 效果（统一走 DSL，ADR-050）
  const card = cards.get(unit.cardId);
  const deathSkills = (card?.skills ?? []).filter((sk) => sk.trigger === 'on_death');
  if (deathSkills.length && onDeathResolver) {
    // rng 由 state 派生：killUnit 的调用链（伤害结算）里没有现成的 rng。
    // 与 on_draw 同理，确定可复现；外层 rng 写回时会以自身状态为准（见 ADR-050）
    onDeathResolver(state, cards, side, unit, deathSkills, events, createRng(state.rngState), killer);
  }

  // on_kill（ADR-070）：击杀者的「每次击杀时」触发技。
  // 华雄「威震四方」靠它每次击杀获得 +1/+1。
  // 走挂载点而不是直接 import runEffects —— 否则 mutate ↔ effects 形成循环依赖。
  if (killer?.row !== undefined && killer.col !== undefined && onKillResolver) {
    onKillResolver(state, cards, { side: killer.side, row: killer.row, col: killer.col }, { name: unit.name, side, row, col, type: unit.type }, events, createRng(state.rngState));
  }

  // 第 19 步：死亡后光环重算（ADR-087）—— 放在最后，让亡语/标记都结算完再重算一次
  if (afterDeathResolver) afterDeathResolver(state, cards, events);
}

/* ============================================================
   胜负
   ============================================================ */

export function checkWinner(state: MatchState, events: GameEvent[]): void {
  if (state.winner) return;
  const ownDead = state.sides.own.lord.hp <= 0;
  const enemyDead = state.sides.enemy.lord.hp <= 0;
  if (!ownDead && !enemyDead) return;
  // ADR-054：无平局。双方同时阵亡的极端情况按「同时判负」处理为敌方胜（不会出现在正常对局）
  state.winner = ownDead ? 'enemy' : 'own';
  events.push({ type: 'GAME_OVER', winner: state.winner });
}

/* ============================================================
   回合开始 / 结束的状态结算
   ============================================================ */

export function resolveTurnStartStatuses(
  state: MatchState,
  cards: Map<string, CardDef>,
  side: Side,
  events: GameEvent[],
): void {
  for (const ref of allUnits(state, side)) {
    const heal = statusStacks(ref.unit, 'ji_jiu');
    if (heal > 0) healTarget(state, unitRef(ref.side, ref.row, ref.col), heal, events);
  }
}

/**
 * **回合开始时**的状态结算：灼烧（时机表第 0 步，ADR-132）
 *
 * 灼烧在该方回合的**第一步**结算 —— 早于统率回满、抽牌与一切行动
 * （由 `engine.startTurn` 在函数最开头调用）。设计者定案：三系 debuff 的时机**刻意错开**，
 * 让玩家一眼分清挨的是哪一种：
 *
 *   · **回合开始 = 灼烧（火）** —— 伤害 = 层数 N、火属性、永久、不封顶
 *   · **行动时　 = 水困（水）** —— 只有行动才受 `2^(阶段-1)` 点水伤，不行动完全不受伤
 *   · **回合结束 = 中毒（毒）** —— 永久削 N 点生命上限，不造成伤害
 *
 * 为什么灼烧放在"动手之前"而不是"回合结束"：伤害**完全可预期**（层数即伤害、
 * 徽章上就写着数字），所以"先烧后动"不构成零交互 —— 玩家仍有一整个回合去净化、
 * 去速杀、或去用这个单位换掉对面；反过来把它放在回合末，它就和中毒挤在同一时点、
 * 两种"掉上限/掉血"混在一起看不清。详见 GDD 10 §3.2.4 与 ADR-132。
 *
 * ⚠️ 与 `resolveTurnEndStatuses` 一样**按 cap 驱动**（`dot_fire`），不认状态 id。
 */
export function resolveTurnStartDamage(
  state: MatchState,
  cards: Map<string, CardDef>,
  side: Side,
  events: GameEvent[],
): void {
  for (const ref of allUnits(state, side)) {
    for (const [id, inst] of Object.entries(ref.unit.statuses)) {
      if (inst.stacks <= 0) continue;
      const def = STATUSES[id];
      if (!def?.caps?.includes('dot_fire')) continue;
      // 伤害属性由 cap 推得（fire）—— 藤甲「遇火即燃」要吃它（ADR-108）
      dealDamage(state, cards, unitRef(ref.side, ref.row, ref.col), inst.stacks, events,
        def.name, 0, undefined, undefined, 'fire');
    }
  }
}

/**
 * 该方回合结束时的状态结算（时机表第 20 步①，ADR-116/117/132）
 *
 * ⚠️ 别退回「按状态 id 硬编码」的写法。
 * 原先这里写死 `statusStacks(u, 'zhong_du')`，于是新增任何持续伤害状态都得回来改这一行
 * —— 水困（ADR-116）就是这么被漏掉的。改为按**状态定义的 cap** 驱动。
 *
 * ADR-132 起这里只剩两条，且分**两趟**跑，顺序固定、与状态在对象里的插入顺序无关：
 *   ① `shrink_max_hp` 中毒：**永久削 N 点生命上限**（不造成伤害）
 *   ② `stage_up`      水困：**阶段 +1**（层数＝阶段，供行动税的 2^(阶段-1) 取用）
 *
 * 灼烧（`dot_fire`）**不在这一步** —— 它已移到该方**回合开始**（见 `resolveTurnStartDamage`）。
 */
export function resolveTurnEndStatuses(
  state: MatchState,
  cards: Map<string, CardDef>,
  side: Side,
  events: GameEvent[],
): void {
  const units = allUnits(state, side).map((r) => ({ side: r.side, row: r.row, col: r.col, unit: r.unit }));

  // ① 永久削生命上限：中毒（shrink_max_hp）
  for (const ref of units) {
    for (const [id, inst] of Object.entries(ref.unit.statuses)) {
      if (inst.stacks <= 0) continue;
      const def = STATUSES[id];
      if (!def?.caps?.includes('shrink_max_hp')) continue;
      shrinkMaxHp(state, cards, { side: ref.side, row: ref.row, col: ref.col },
        inst.stacks, events, id, def.name);
    }
  }

  // ② 阶段推进：水困（stage_up）—— 施加当回合为阶段 1，此后每个回合末 +1。
  // 水困**没有回合末伤害**（ADR-132）：伤害只由"行动"触发，不行动就完全不受伤。
  for (const ref of units) {
    if (ref.unit.hp <= 0) continue;                    // 刚被中毒削上限削死的单位不再推进
    for (const [id, inst] of Object.entries(ref.unit.statuses)) {
      if (inst.stacks <= 0) continue;
      if (!STATUSES[id]?.caps?.includes('stage_up')) continue;
      inst.stacks += 1;
      // 用 STATUS_APPLIED 通告新的层数（= 阶段）：徽章上的数字就是阶段，
      // 客户端据此刷新卡面；「所有变更都产生事件」是 mutate 的一贯约定。
      events.push({ type: 'STATUS_APPLIED', side: ref.side, row: ref.row, col: ref.col,
        status: id, stacks: inst.stacks });
    }
  }
}

/**
 * 临时属性修正到期（时机表第 21 步，ADR-037）
 * 与状态递减同一步：有 turns 的 mod 减 1，减到 0 移除并重算派生属性。
 */
export function expireMods(state: MatchState, side: Side): void {
  for (const owner of ['own', 'enemy'] as Side[]) {
    for (const ref of allUnits(state, owner)) {
    const u = ref.unit;
    const before = u.mods.length;
    u.mods = u.mods.filter((m) => {
      if (m.expiresAtHalfTurn !== undefined && m.expiresAtHalfTurn <= state.halfTurn) return false;
      if (m.kind !== 'temp' || m.turns === undefined) return true;
      m.turns -= 1;
      return m.turns > 0;
    });
    if (u.mods.length !== before) applyMods(u);
    }
  }
}

/**
 * 手牌修正到期（时机表第 21 步，ADR-038）
 * 与属性修正同构：有 turns 的减 1，减到 0 移除。
 */
/** 最近被弃的牌（ADR-040）：供 value_from_discarded 读取 */
export interface LastDiscarded { card: CardDef; side: Side }
export function setLastDiscarded(state: MatchState, card: CardDef, side: Side): void {
  (state as MatchState & { lastDiscarded?: LastDiscarded }).lastDiscarded = { card, side };
}

export function expireHandMods(state: MatchState, side: Side): void {
  for (const hc of state.sides[side].hand) {
    if (!hc.mods.length) continue;
    hc.mods = hc.mods.filter((m) => {
      if (m.turns === undefined) return true;
      m.turns -= 1;
      return m.turns > 0;
    });
  }
}

/**
 * 清除临时效果（时机表第 21 步，ADR-034）
 *
 * ⚠️ 必须在 `turn_end` 触发技**之后**调用——否则「持续 1 回合」的混乱
 * 会在自己的回合结束技生效前就被清掉。中毒削上限与水困阶段推进都在第 20 步。
 * （灼烧不在此列：它已移到该方**回合开始**的第 0 步，见 `resolveTurnStartDamage`。）
 */
export function expireStatuses(
  state: MatchState,
  side: Side,
  events: GameEvent[],
): void {
  for (const owner of ['own', 'enemy'] as Side[]) {
    const lordStatuses = state.sides[owner].lord.statuses ?? {};
    for (const [id, inst] of Object.entries(lordStatuses)) {
      if (inst.expiresAtHalfTurn !== undefined && inst.expiresAtHalfTurn <= state.halfTurn) {
        delete lordStatuses[id];
        events.push({ type: 'LORD_STATUS_EXPIRED', side: owner, status: id });
      }
    }
    for (const ref of allUnits(state, owner)) {
      for (const [id, inst] of Object.entries(ref.unit.statuses)) {
        if (inst.expiresAtHalfTurn !== undefined && inst.expiresAtHalfTurn <= state.halfTurn) {
          delete ref.unit.statuses[id];
          events.push({ type: 'STATUS_EXPIRED', side: owner, row: ref.row, col: ref.col, status: id });
        }
      }
    }
  }
  // 主公状态递减（ADR-040）
  const lord = state.sides[side].lord;
  if (lord.statuses) {
    for (const [id, inst] of Object.entries(lord.statuses)) {
      if (inst.turns === undefined) continue;
      if (inst.skipTick) { inst.skipTick = false; continue; }
      inst.turns -= 1;
      if (inst.turns <= 0) {
        delete lord.statuses[id];
        events.push({ type: 'LORD_STATUS_EXPIRED', side, status: id });
      }
    }
  }
  for (const ref of allUnits(state, side)) {
    for (const [id, inst] of Object.entries(ref.unit.statuses)) {
      if (inst.turns === undefined) continue;               // 永久 / 直到消耗
      // 施加当回合不递减（ADR-089）：守护类状态要撑过**对手回合**才有意义
      if (inst.skipTick) { inst.skipTick = false; continue; }
      inst.turns -= 1;
      if (inst.turns <= 0) {
        delete ref.unit.statuses[id];
        events.push({ type: 'STATUS_EXPIRED', side: ref.side, row: ref.row, col: ref.col, status: id });
      }
    }
  }
}

/** 回合结束时弃牌至上限 */
export function discardOverflow(state: MatchState, side: Side): CardDef[] {
  const s = state.sides[side];
  const dropped: CardDef[] = [];
  while (s.hand.length > DECK.HAND_LIMIT) {
    const c = s.hand.pop();
    if (c) { s.discard.push(c.card); dropped.push(c.card); }
  }
  return dropped;
}
