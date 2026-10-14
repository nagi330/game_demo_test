/**
 * 效果 DSL 解释器
 *
 * 对应 docs/gdd/13-balance-data-model.md §7。
 * 卡牌、事件、战法、技能全部通过这套 DSL 表达——**加卡不改代码**。
 */

import { BOARD, COMMAND, STATUSES, TIMING, type StatusCap } from './constants.ts';
import { allUnits, applyMods, capOverride, capStacks, capValue, getUnit, hasCap, hasTrait, isBasicTroop, makeUnit, nextUidSeq, other, setUnit } from './state.ts';
import { handRef, removeStatus } from './mutate.ts';
import { effectiveAttack } from './rules.ts';
// 合并说明（rebase 到 main 时）：两边各加了一个 import —— main 把「抽到时释放」
// 重构成返回 OnDrawResult 的具名函数，我这边（ADR-087 的死亡后光环重算）需要 createRng。
// 两个都要留。
import { createRng, type Rng } from './rng.ts';
import { type OnDrawResult } from './mutate.ts';
import type { CardDef, CardEffect, CardType, EffectCondition, GameEvent, HandCard, HandMod, MatchState, Row, Side, SkillDef, TargetSelector, Unit } from './types.ts';
import {
  applyStatus, dealDamage, drawCard, gainArmor, healTarget, killUnit, lordRef, registerOnDeathResolver,
  registerOnDrawResolver,
  registerAfterDeathResolver, registerAfterDrawResolver, registerAfterLordDamagedResolver, registerMarkDeathResolver, registerOnKillResolver, summonUnit, unitRef,
  type TargetRef,
} from './mutate.ts';

/**
 * 「属性伤害挂对应 DoT」的映射表（ADR-134 火 / ADR-138 扩展水、毒）
 *
 * ⚠️ 只在**效果层**用（见 `case 'damage'` 内的长注释）：DoT 自己的跳伤绕过效果层，
 * 所以不会被这张表反复挂层。`physical`（含普通攻击与无属性效果伤害）**不在表内**：
 * 物伤不产生 DoT。
 */
const ELEMENTAL_DOT: Record<string, string> = {
  fire: 'zhuo_shao',      // 灼烧：回合开始受 N 点火伤，层数可叠加、不封顶
  water: 'shui_kun',      // 水困：层数＝阶段，主动行动时受 2^(阶段-1) 水伤（stack_mode: max，不叠层）
  poison: 'zhong_du',     // 中毒：回合结束永久降低 N 点生命上限（层数可叠加、不封顶）
};

/**
 * 「抽到时释放」（ADR-050）：带 `trigger: 'on_draw'` 技能的卡被抽到时不进手牌，
 * 直接结算其效果并进弃牌堆。由 mutate.drawCard 通过挂载点回调。
 */
export function resolveDrawTrigger(state: MatchState, cards: Map<string, CardDef>, side: Side,
  card: CardDef, events: GameEvent[], rng: Rng): OnDrawResult {
  const sk = (card.skills ?? []).find((k) => k.trigger === 'on_draw');
  if (!sk) return false;

  // 人物牌的“抽到时”技能是自动召唤：占用第一个空置前军格。
  // 战场已满时不消耗技能，回退为普通手牌，避免卡牌凭空消失。
  if (['troop', 'general', 'strategist', 'machine'].includes(card.type)) {
    const col = state.sides[side].rows.front.findIndex((unit) => unit === null);
    if (col < 0) return false;
    emitSkillTriggered(state, side, null, sk, 'trigger', events);
    runEffects(state, cards, sk.effects ?? [], { side }, rng, events);
    return { discard: false };
  }

  emitSkillTriggered(state, side, null, sk, 'trigger', events);
  // 技能自己没写效果时，按**卡级效果**释放（ADR-088）
  // —— 「抽到时释放」= 释放这张牌，与从手牌打出走的是同一组效果，
  //    免得同一段伤害在 on_draw 与 effects 两处各写一份、迟早漂移。
  //    ⚠️ 只作用于**非人物卡**这条路径：人物卡的卡级效果是"打出时"的战吼，
  //       不该在抽到时重放（人物卡那条在上面的自动召唤分支里）。
  const effs = sk.effects?.length ? sk.effects : (card.effects ?? []);
  runEffects(state, cards, effs, { side }, rng, events);
  return { discard: true };
}

registerOnDrawResolver(resolveDrawTrigger);

registerAfterDrawResolver((state, cards, events, rng) => {
  recomputeAuras(state, cards, rng, events);
});

/**
 * 取一张卡"被释放"时该跑的效果（ADR-162，庞统「连环」）。
 *
 * 口径对齐 ADR-088 的「抽到时释放」：**优先取技能自己的效果**，技能用 `modes` 抉择时
 * **随机挑一个分支**（既然是随机释放，抉择也随机）；两者都没有才退回 `card.effects`。
 */
function cardCastEffects(card: CardDef, rng: { int(n: number): number }): CardEffect[] {
  const out: CardEffect[] = [];
  for (const sk of card.skills ?? []) {
    if (sk.modes?.length) {
      const m = sk.modes[rng.int(sk.modes.length)];
      if (m) out.push(...m.effects);
    } else if (sk.effects?.length) {
      out.push(...sk.effects);
    }
  }
  return out.length ? out : (card.effects ?? []);
}

/**
 * 把一组效果里的**所有目标选择器**递归改写成 `mode: 'random'`（ADR-162）。
 *
 * 「需要指定目标的卡，随机释放时就随机打」—— 与「混乱」（`random_target` 能力）
 * 是同一套做法（见 `resolveTargets` 里的 `confused ? {...selector, mode:'random'}`）。
 *
 * ⚠️ **只改 `target` / `target2` / `modes[].effects`**：
 * `condition.*.selector` 是**只读判断**，绝不能改（改了条件语义就变了）。
 * ⚠️ `count: 'all'` 的选择器不受 `mode` 影响（`narrowByMode` 先看 `count === 'all'`），
 * 所以群体效果仍然是全体的 —— 包括**作用在己方身上的群体效果**（池子里有这种卡，
 * 随机释放就会打到自己人，这是有意保留的风险）。
 */
export function forceRandomTargets(effs: CardEffect[]): CardEffect[] {
  // ⚠️ `CardEffect` 上只有 `target` 一个选择器字段（`modes` 在 `SkillDef` 上，
  // `target2` 在 `Action` 上），所以这里只需处理 `target` —— 抉择分支已在
  // `cardCastEffects` 里随机挑定了。
  return effs.map((e) => (e.target ? { ...e, target: { ...e.target, mode: 'random' as const } } : { ...e }));
}

/** `cast_random` 的卡池筛选 */
function inCastPool(card: CardDef, pool: CardEffect['pool']): boolean {
  if (!pool?.type || card.type !== pool.type) return false;
  if (pool.factions?.length && !pool.factions.includes(card.faction)) return false;
  return true;
}

/** 亡语解析器：把 on_death 技能交给 DSL 解释器（ADR-050） */
registerOnDeathResolver((state, cards, side, unit, skills, events, rng, killer) => {
  for (const sk of skills) {
    emitSkillTriggered(state, side, unit, sk, 'trigger', events);
    runEffects(state, cards, sk.effects ?? [],
      { side, source: unit, killer: killer ?? undefined }, rng, events);
  }
});

// 「死亡后光环重算」挂载点（ADR-087，时机表第 19 步）
registerAfterDeathResolver((state, cards, events) => {
  recomputeAuras(state, cards, createRng(state.rngState), events);
});

// 「主公受伤后光环重算」挂载点（ADR-113）：条件型光环若依赖**双方主公血量**
// （无难兵「赴难」），主公掉血必须立刻重算，否则卡面滞后到回合边界才更新。
registerAfterLordDamagedResolver((state, cards, events, side, amount, reflected) => {
  recomputeAuras(state, cards, createRng(state.rngState), events);
  if (reflected) return;
  const rng = createRng(state.rngState);
  for (const ref of allUnits(state, side)) {
    if (ref.unit.hp <= 0) continue;
    for (const sk of (ref.unit.skills ?? []).filter(sk => sk.trigger === TIMING.ON_LORD_DAMAGED)) {
      emitSkillTriggered(state, side, ref.unit, sk, 'trigger', events);
      runEffects(state, cards, effectsOf(sk), { side, source: ref.unit, flags: [`lord_damage:${amount}`] }, rng, events);
    }
  }
});

// 「标记阵亡」挂载点（ADR-087）：仇敌 / 阵亡标记的结算（runMarkDeath 从此真正被调用）
registerMarkDeathResolver((state, cards, dead, rng, events) => {
  runMarkDeath(state, cards, dead, rng, events);
});

// 「击杀时」挂载点（ADR-070）：华雄「威震四方」每次击杀 +1/+1
registerOnKillResolver((state, cards, killer, victim, events, rng) => {
  const k = getUnit(state, killer.side, killer.row, killer.col);
  if (!k || k.hp <= 0) return;
  const card = cards.get(k.cardId);
  const killSkills = (card?.skills ?? []).filter((sk) => sk.trigger === 'on_kill');
  for (const sk of killSkills) {
    emitSkillTriggered(state, killer.side, k, sk, 'trigger', events);
    runEffects(state, cards, sk.effects ?? [],
      { side: killer.side, source: k, eventVictim: victim, victimType: victim.type } as EffectContext,
      rng, events);
  }
});

export interface EffectContext {
  side: Side;            // 效果来源方
  source?: Unit;         // 来源单位（人物卡的技能）
  chosen?: TargetRef;    // 玩家选择的目标（`TargetSelector.pick` 缺省 = 1）
  /** 玩家的第二个选择（ADR-071，程昱「审时度势」）；`pick: 2` 的选择器读它 */
  chosen2?: TargetRef;
  chosenRow?: 'front' | 'back';
  /** 本次结算的「被击杀者」（on_kill 用，供亡语/条件引用，ADR-070） */
  eventVictim?: { name: string; side: Side; row: Row; col: number };
  eventAttacker?: { side: Side; row: Row; col: number };
  /** 本次结算的「击杀者」（亡语要指向它时用，ADR-070） */
  killer?: { side: Side; row?: Row; col?: number };
  /** 本次被击杀者的类型（victim_type 条件用） */
  victimType?: string;
  chosenCol?: number;
  /** 本次结算中发生的事件标记（killed / clash_won…），供条件判定读取（ADR-033） */
  flags?: string[];
  /** 本次效果结算中各事件发生的次数；用于“每次击杀”类条件效果。 */
  eventCounts?: Record<string, number>;
  /** 光环收集模式（ADR-037）：非空时 modify 写入修正层而非直接改数值 */
  auraId?: string;
  /** discard mode:'choose' 时，指定弃掉手牌的第几张（ADR-049） */
  handIndex?: number;
  /** 抉择分支下标（ADR-071）：未指定/越界一律取 modes[0] */
  modeIndex?: number;
  /** 本次技能结算开始时双方主公是否满血 */
  lordFullHpAtStart?: Record<Side, boolean>;
  /**
   * **本次技能结算开始时**所选目标是否已受伤（ADR-159，黄忠「百步穿杨」）。
   *
   * ⚠️ **为什么必须快照**：`condition` 是在**结算到那一条效果时**求值的，而效果**按顺序**发生 ——
   * 技能先打 3 点出去，目标就当场从满血变成受伤，后面那条"若已受伤则 +1"的条件**必然成立**，
   * 于是"满血 3 点"永远退化成"必定 4 点"。设计意图是"**你射击之前**他是否受伤"，故取开始时的快照。
   * 与 `lordFullHpAtStart`（`lord_full_hp` 条件用）是同一套做法。
   */
  chosenDamagedAtStart?: boolean;
  /** 当前普通攻击目标；仅 on_attack 技能条件可读取。 */
  attackTarget?: TargetRef;
  lastDamageTargetType?: CardType;
  /** 本组效果刚刚弃掉的牌；避免读取上一组效果的残留值。 */
  lastDiscarded?: CardDef;
  /** 协同水攻的额外伤害不再次触发协同。 */
  skipWaterSynergy?: boolean;
}

/**
 * 按 `TargetSelector.pick` 取对应的玩家选择（ADR-071）。
 *
 * 只提供 `action.target` 时，`pick: 2` 会退回第一个选择 ——
 * 这样 AI、测试与尚未支持多目标的 UI 都不会因为少传一个参数而空转。
 */
const pickOf = (ctx: EffectContext, sel?: TargetSelector): TargetRef | undefined =>
  sel?.pick === 2 ? (ctx.chosen2 ?? ctx.chosen) : ctx.chosen;

/** 目标当前生命（主将/单位通用） */
const hpOf = (s: MatchState, t: TargetRef): number =>
  t.kind === 'lord' ? s.sides[t.side].lord.hp
  : t.kind === 'hand' ? 0
  : (getUnit(s, t.side, t.row, t.col)?.hp ?? 0);

/** 两个目标引用是否指向同一个对象 */
const sameTarget = (a: TargetRef, b: TargetRef): boolean =>
  a.kind === b.kind && a.side === b.side && (
    a.kind === 'lord' ||
    (a.kind === 'hand' && b.kind === 'hand' && a.index === b.index) ||
    (a.kind === 'unit' && b.kind === 'unit' && a.row === b.row && a.col === b.col)
  );

/**
 * 选择器里 `type: 'character'` 指什么（ADR-093）
 *
 * 原先只认三类人物卡（troop / general / strategist），于是**召唤出来的衍生物**
 * （黄巾兵 / 假人 / 机械哨兵 / 士族兵……`type: token`）虽然站在场上、普通攻击也打得到，
 * 却**选不中** —— 指向性技能点上去没反应（设计者实机反馈：「黄巾兵、假人这些召唤出来的
 * 不能被指向性选择到」）。现在按"场上的单位"来理解，含 token。
 */
const CHARACTER_TYPES = ['troop', 'general', 'strategist', 'machine', 'token'];
const isCharacterType = (t: string): boolean => CHARACTER_TYPES.includes(t);

const matchesCardType = (t: string, want?: string): boolean => {
  if (!want) return true;
  if (want === 'character') return isCharacterType(t);
  return t === want;
};

/** 检查卡牌是否包含指定属性的伤害效果，供发现水攻牌使用。 */
const cardHasDamageType = (card: CardDef, damageType: string): boolean => {
  const effects = (card.effects ?? []).concat((card.skills ?? []).flatMap((s) => s.effects ?? []));
  return effects.some((e) => e.action === 'damage' && (e.damage_type ?? 'physical') === damageType);
};

/** 手牌过滤（ADR-038）：类型 + 性别（ADR-071） + 归属标签 / 排除来源（ADR-141） */
const matchesHandFilter = (
  hc: HandCard, f: NonNullable<TargetSelector['filter']> | undefined, srcCardId?: string,
): boolean => {
  if (!f) return true;
  if (!matchesCardType(hc.card.type, f.type as string | undefined)) return false;
  if (f.types && !f.types.includes(hc.card.type)) return false;
  if (f.gender && hc.card.gender !== f.gender) return false;
  if (f.faction && hc.card.faction !== f.faction) return false;
  if (typeof f.cost_max === 'number' && hc.card.cost > f.cost_max) return false;
  if (typeof f.cost_min === 'number' && hc.card.cost < f.cost_min) return false;
  if (f.keyword && !(hc.card.keywords ?? []).includes(f.keyword)) return false;
  if (f.card_id && hc.card.id !== f.card_id) return false;
  // 归属标签（ADR-141）：手牌也要能按 tag 选（孟获「蛮王」＝"手牌里的蛮族人物 +2/+2"）。
  // 场上目标一直支持 tag，手牌这边此前漏了 —— 补上后两侧语义一致。
  if (f.tag && !(hc.card.tags ?? []).includes(f.tag)) return false;
  // exclude_source（ADR-141）：**手牌没有 uid**，所以按**卡 id** 排除来源自己
  //（孟获「蛮王」＝"除孟获自己以外的场上和手牌里的 man_zu"）。
  // 场上那侧的同名字段走 uid 判断（`matchesFilter`），两侧语义一致：都不含来源本身。
  if (f.exclude_source && srcCardId !== undefined && hc.card.id === srcCardId) return false;
  return true;
};

const matchesFilter = (
  u: Unit, f: NonNullable<TargetSelector['filter']>, row: string,
  srcCost?: number, srcAtk?: number, srcUid?: string,
): boolean => {
  if (!f) return true;
  // 排除来源自身（ADR-071）：陆抗「手里或场上友方将领」不该把自己算成目标
  if (f.exclude_source && srcUid !== undefined && u.uid === srcUid) return false;
  if (f.type) {
    if (f.type === 'character') { if (!isCharacterType(u.type)) return false; }
    else if (u.type !== f.type) return false;
  }
  if (f.types && !f.types.includes(u.type)) return false;
  // 性别（ADR-071，貂蝉「祸国倾城」只认「男性角色」）
  if (f.gender && u.gender !== f.gender) return false;
  if (f.keyword && !u.kw.includes(f.keyword)) return false;
  if (f.tag && !(u.tags ?? []).includes(f.tag)) return false;
  if (f.faction && u.faction !== f.faction) return false;
  if (f.row && row !== f.row) return false;
  if (typeof f.health_max === 'number' && u.hp > f.health_max) return false;
  // ⚠️ 原先只处理 `=== true`，写 `damaged: false` 等于**不生效**（静默失效）。
  // 越骑「厉志」需要 `{source:true, filter:{damaged:false}}` 表达「自身未受伤」。
  if (f.damaged !== undefined && f.damaged !== (u.hp < u.maxHp)) return false;
  if (f.attacked_this_turn !== undefined && (u.attackedThisTurn > 0) !== f.attacked_this_turn) return false;
  if (f.acted_this_turn !== undefined && u.actedThisTurn !== f.acted_this_turn) return false;
  if (f.has_status && !((u.statuses[f.has_status]?.stacks ?? 0) > 0)) return false;
  // 攻击力上限（与 cost_max 对称）——越骑「厉志」靠它做 +3 的硬上限
  if (typeof f.attack_max === 'number' && u.atk > f.attack_max) return false;
  if (typeof f.cost_max === 'number' && u.cost > f.cost_max) return false;
  if (typeof f.cost_min === 'number' && u.cost < f.cost_min) return false;
  if (f.troopKind && u.troopKind !== f.troopKind) return false;   // 兵种过滤（ADR-042）
  if (f.cost_below_source && srcCost !== undefined && u.cost >= srcCost) return false;
  // 攻击力低于来源单位（张飞「咆哮」：所有攻击力低于张飞的敌军）
  if (f.attack_below_source && srcAtk !== undefined && u.atk >= srcAtk) return false;
  // 指定具体卡（关平「勇武」亡语：使**关羽**获得圣盾）
  if (f.card_id && u.cardId !== f.card_id) return false;
  if (f.basic_troop && !isBasicTroop(u)) return false;
  return true;
};

const cmp = (a: number, op: string, b: number): boolean =>
  op === '>=' ? a >= b : op === '<=' ? a <= b : op === '==' ? a === b
  : op === '>' ? a > b : op === '<' ? a < b : op === '!=' ? a !== b : false;

/**
 * 条件判定（ADR-033）。全部基于**当前局面的动态查询**，无隐藏状态。
 * `killed` 由本次效果结算过程写入 ctx.flags，供同一张卡的后续效果读取。
 */
/**
 * 某个目标引用**此刻**是否已受伤（ADR-159）。主将也适用（有 hp/maxHp）。
 * @returns `false` = 未受伤，`true` = 已受伤，`null` = 该引用没有"受伤"概念或目标已不在场
 */
export function chosenDamagedNow(
  state: MatchState, t: TargetRef,
): boolean | null {
  if (t.kind === 'lord') {
    const lord = state.sides[t.side].lord;
    return lord.hp < lord.maxHp;
  }
  if (t.kind === 'unit') {
    const u = getUnit(state, t.side, t.row, t.col);
    return u ? u.hp < u.maxHp : null;
  }
  // hand 等其他引用没有"受伤"概念
  return null;
}

function checkCondition(
  state: MatchState, cond: EffectCondition | undefined, ctx: EffectContext, rng: Rng,
): boolean {
  if (!cond) return true;
  if (cond.last_damage_target_not_type &&
      (!ctx.lastDamageTargetType || ctx.lastDamageTargetType === cond.last_damage_target_not_type)) return false;
  // 条件的与 / 或组合（ADR-074）：先判组合，再与其余字段相与
  if (cond.all_of?.length && !cond.all_of.every((c) => checkCondition(state, c, ctx, rng))) return false;
  if (cond.any_of?.length && !cond.any_of.some((c) => checkCondition(state, c, ctx, rng))) return false;
  // 来源单位本回合的行为（ADR-074，司马懿「谋定后动」）
  if (cond.acted_this_turn !== undefined) {
    const src = ctx.source;
    if (!src || !!src.actedThisTurn !== cond.acted_this_turn) return false;
  }
  if (cond.dealt_damage_this_turn !== undefined) {
    const src = ctx.source;
    if (!src || !!src.dealtDamageThisTurn !== cond.dealt_damage_this_turn) return false;
  }
  if (cond.lord_hp) {
    const side = cond.lord_hp.side === 'self' ? ctx.side : other(ctx.side);
    if (!cmp(state.sides[side].lord.hp, cond.lord_hp.op, cond.lord_hp.value)) return false;
  }
  if (cond.lord_hp_vs_enemy && !cmp(state.sides[ctx.side].lord.hp,
    cond.lord_hp_vs_enemy, state.sides[other(ctx.side)].lord.hp)) return false;
  if (cond.attack_target) {
    const t = ctx.attackTarget;
    if (!t) return false;
    if (cond.attack_target.type === 'lord') { if (t.kind !== 'lord') return false; }
    else {
      if (t.kind !== 'unit') return false;
      const target = getUnit(state, t.side, t.row, t.col);
      if (!target) return false;
      if (cond.attack_target.type && !matchesCardType(target.type, cond.attack_target.type)) return false;
      if (cond.attack_target.keyword && !hasTrait(target, cond.attack_target.keyword)) return false;
      if (cond.attack_target.has_status && !((target.statuses[cond.attack_target.has_status]?.stacks ?? 0) > 0)) return false;
      if (cond.attack_target.damaged !== undefined && (target.hp < target.maxHp) !== cond.attack_target.damaged) return false;
    }
  }
  if (cond.lord_full_hp) {
    const side = cond.lord_full_hp.side === 'self' ? ctx.side : other(ctx.side);
    const lord = state.sides[side].lord;
    const full = ctx.lordFullHpAtStart?.[side] ?? (lord.hp === lord.maxHp);
    if (full !== cond.lord_full_hp.value) return false;
  }
  if (cond.exists) {
    return resolveTargets(state, { ...cond.exists, count: 'all' }, ctx, rng).length > 0;
  }
  if (cond.count) {
    const n = resolveTargets(state, { ...cond.count.selector, count: 'all' }, ctx, rng).length;
    return cmp(n, cond.count.op, cond.count.value);
  }
  if (cond.count_vs) {
    const l = resolveTargets(state, { ...cond.count_vs.left, count: 'all' }, ctx, rng).length;
    const r = resolveTargets(state, { ...cond.count_vs.right, count: 'all' }, ctx, rng).length;
    return cmp(l, cond.count_vs.op, r);
  }
  if (cond.event && !(ctx.flags ?? []).includes(cond.event)) return false;
  if (cond.roll && !(ctx.flags ?? []).includes(`roll:${cond.roll}`)) return false;
  if (cond.source_status && !(ctx.source?.statuses[cond.source_status]?.stacks ?? 0)) return false;
  // 按「所选目标属于哪一方」分支：ctx 的 side 是施法方，chosen.side 是目标方
  if (typeof cond.turn_max === 'number' && state.turn > cond.turn_max) return false;
  if (cond.victim_type) {
    // 类型由阵亡前记录传入，目标离场后不可再查询其格子。
    if (ctx.victimType !== cond.victim_type) return false;
  }
  if (cond.chosen_kind && ctx.chosen?.kind !== cond.chosen_kind) return false;
  if (cond.chosen_side) {
    const t = ctx.chosen;
    if (!t) return false;
    const targetSide = t.side;
    return cond.chosen_side === 'ally' ? targetSide === ctx.side : targetSide !== ctx.side;
  }
  // ADR-148：所选目标是不是主公（华佗「医圣」）—— 与 chosen_side 同一套读法
  if (cond.chosen_lord !== undefined) {
    const t = ctx.chosen;
    if (!t) return false;
    if ((t.kind === 'lord') !== cond.chosen_lord) return false;
  }
  // ADR-160：某张卡**本局是否阵亡过**（姜维「复汉」公开判胜技）——读 `SideState.fallen`。
  // ⚠️ 问的是「**死过**」，不是「现在不在场上」：没被打出的卡与已阵亡的卡在场上都看不见。
  if (cond.has_fallen) {
    const fs = cond.has_fallen.side === 'ally' ? ctx.side : other(ctx.side);
    if (!state.sides[fs].fallen.includes(cond.has_fallen.card_id)) return false;
  }
  // ADR-159：所选目标是否**已受伤**（黄忠「百步穿杨」＝满血 3 点、主公或受伤 4 点）。
  // 三妹条件，同样读 `ctx.chosen`；主将也有 hp/maxHp，故一并适用。
  if (cond.chosen_damaged !== undefined) {
    const t = ctx.chosen;
    if (!t) return false;
    // ⚠️ **优先读技能开始时的快照**（见 EffectContext.chosenDamagedAtStart 的注释）：
    // 本技能自己打出的伤害会把目标变成"受伤"，若不快照，条件在后续效果里必然成立。
    const damaged = ctx.chosenDamagedAtStart ?? chosenDamagedNow(state, t);
    if (damaged === null) return false;
    if (damaged !== cond.chosen_damaged) return false;
  }
  return true;
}

/**
 * 发一条「技能发动」事件（ADR-074）
 *
 * 客户端原先只能从 DAMAGE / STATUS_APPLIED 这些**效果**事件反推，
 * 「咆哮」「五雷轰顶」这种技能生效时玩家看不出发生了什么。
 * 引擎在技能真正执行的前一刻发这条事件，客户端据此播技能名提示。
 */
export function emitSkillTriggered(
  state: MatchState,
  side: Side,
  source: Unit | null,
  sk: SkillDef,
  from: 'on_play' | 'active' | 'trigger' | 'aura' | 'lord_skill' | 'card',
  events: GameEvent[],
): void {
  let row: Row | undefined;
  let col: number | undefined;
  if (source) {
    const pos = findPos(state, side, source.uid);
    if (pos) { row = pos.row; col = pos.col; }
  }
  events.push({
    type: 'SKILL_TRIGGERED', side, row, col,
    unitName: source?.name ?? '', skillName: sk.name || sk.id || '(技能)',
    skillId: sk.id || '', kind: sk.kind, timing: sk.trigger, from,
  });
}

/**
 * 执行某一方所有单位的指定时机触发技（ADR-031）
 *
 * 时机表见 docs/gdd/10-skills-statuses.md §4：
 *   · 第 3 步  回合开始类效果 → turn_start
 *   · 第 20 步 回合结束类效果 → turn_end
 * 触发顺序按战场从左到右、前排到后排（确定性，保证回放可复现）。
 */
export function runTriggerSkills(
  state: MatchState,
  cards: Map<string, CardDef>,
  side: Side,
  trigger: string,
  rng: Rng,
  events: GameEvent[],
): void {
  const refs = allUnits(state, side);
  const start = state.pendingTriggerSkills?.side === side && state.pendingTriggerSkills.trigger === trigger
    ? state.pendingTriggerSkills.nextIndex : 0;
  delete state.pendingTriggerSkills;
  for (let index = start; index < refs.length; index++) {
    const ref = refs[index]!;
    const u = ref.unit;
    if (u.hp <= 0) continue;
    for (const sk of (u.skills ?? []).filter((s) => s.trigger === trigger)) {
      emitSkillTriggered(state, side, u, sk, 'trigger', events);
      runEffects(state, cards, effectsOf(sk), { side, source: u }, rng, events);
      if (state.pendingDiscover) {
        state.pendingTriggerSkills = { side, trigger, nextIndex: index + 1 };
        return;
      }
    }
  }
}

/**
 * 卡牌自身费用规则（ADR-040）：每次计算费用时重新判定条件
 */
export function costRuleDelta(
  state: MatchState, card: CardDef, side: Side, rng: Rng,
): number {
  if (!card.cost_rule) return 0;
  return checkCondition(state, card.cost_rule.condition, { side }, rng) ? card.cost_rule.value : 0;
}

/**
 * 光环重算（ADR-037）
 *
 * ① 清除全部 aura 修正 → ② 遍历双方存活单位重新收集 → ③ 重写派生属性。
 * 必须在入场后、死亡后、回合开始、临时效果清除后各调用一次。
 */
export function recomputeAuras(
  state: MatchState,
  cards: Map<string, CardDef>,
  rng: Rng,
  events: GameEvent[],
): void {
  const sides: Side[] = ['own', 'enemy'];
  for (const side of sides) {
    // 清除上次光环留下的痕迹：属性修正、光环施加的状态、光环施加的手牌修正
    for (const ref of allUnits(state, side)) {
      ref.unit.mods = ref.unit.mods.filter((m) => m.kind !== 'aura');
      for (const [id, inst] of Object.entries(ref.unit.statuses)) {
        if (inst.auraId) delete ref.unit.statuses[id];
      }
    }
    for (const hc of state.sides[side].hand) {
      hc.mods = hc.mods.filter((m) => !m.auraId);
    }
    const lord = state.sides[side].lord;
    for (const [id, inst] of Object.entries(lord.statuses ?? {})) {
      if (inst.auraId) delete lord.statuses![id];
    }
  }
  for (const side of sides) {
    for (const ref of allUnits(state, side)) {
      const u = ref.unit;
      if (u.hp <= 0) continue;
      for (const sk of (u.skills ?? []).filter((s) => s.kind === 'aura')) {
        // 每个单位生命周期只播报一次（见 Unit.auraAnnounced 的说明），否则光环重算会刷屏
        u.auraAnnounced = u.auraAnnounced ?? [];
        if (!u.auraAnnounced.includes(sk.id)) {
          u.auraAnnounced.push(sk.id);
          emitSkillTriggered(state, side, u, sk, 'aura', events);
        }
        runEffects(state, cards, effectsOf(sk),
          { side, source: u, auraId: `${u.uid}#${sk.id}` }, rng, events);
      }
    }
  }
  for (const side of sides) {
    for (const ref of allUnits(state, side)) applyMods(ref.unit);
  }
}

/**
 * 出牌事件触发（ADR-041）：任何卡被打出后，双方存活单位的 on_card_played 技能触发
 */
export function runCardPlayedTriggers(
  state: MatchState, cards: Map<string, CardDef>, played: CardDef,
  rng: Rng, events: GameEvent[], playedSide: Side = state.active, playedRightmost = false,
): void {
  for (const side of ['own', 'enemy'] as Side[]) {
    for (const ref of allUnits(state, side)) {
      const u = ref.unit;
      if (u.hp <= 0) continue;
      for (const sk of (u.skills ?? []).filter((x) => x.trigger === 'on_card_played')) {
        if (sk.same_side && side !== playedSide) continue;
        if (sk.played_rightmost && !playedRightmost) continue;
        if (sk.duration === 'this_turn' && u.enteredTurn !== state.turn) continue;
        // 条件里可用 played_type 过滤：只有指定类型的牌被打出时才触发
        const want: string | undefined = sk.target?.filter?.type;
        if (want === 'character') {
          if (!isCharacterType(played.type)) continue;
        } else if (want && played.type !== want) continue;
        emitSkillTriggered(state, side, u, sk, 'trigger', events);
        runEffects(state, cards, effectsOf(sk), { side, source: u }, rng, events);
      }
    }
  }
}

/**
 * 仇敌标记联动（ADR-041）：被标记单位受伤时，运行标记者的 on_mark_damaged 技能
 */
export function runMarkDamaged(
  state: MatchState, cards: Map<string, CardDef>, victim: Unit, amount: number,
  rng: Rng, events: GameEvent[],
): void {
  const inst = victim.statuses.chou_di;
  if (!inst?.srcUid) return;
  for (const side of ['own', 'enemy'] as Side[]) {
    for (const ref of allUnits(state, side)) {
      const marker = ref.unit;
      if (marker.uid !== inst.srcUid || marker.hp <= 0) continue;
      for (const sk of (marker.skills ?? []).filter((x) => x.trigger === 'on_mark_damaged')) {
        runEffects(state, cards, sk.effects,
          { side, source: marker, flags: [`mark_amount:${amount}`] }, rng, events);
      }
    }
  }
}

/**
 * 阵亡联动（ADR-041）：被标记单位阵亡时，运行标记者的 on_mark_death 技能
 */
export function runMarkDeath(
  state: MatchState, cards: Map<string, CardDef>, dead: Unit, rng: Rng, events: GameEvent[],
): void {
  const inst = dead.statuses.chou_di_shou ?? dead.statuses.zhen_wang;
  // ① 卡牌级标记（ADR-087）：结算写在标记上，由施法方执行 —— 不依赖任何单位
  if (inst?.payoff?.length && inst.srcSide) {
    runEffects(state, cards, inst.payoff, { side: inst.srcSide }, rng, events);
  }
  // ② 单位级标记（ADR-041）：跑标记者自己的 on_mark_death 技能
  if (!inst?.srcUid) return;
  for (const side of ['own', 'enemy'] as Side[]) {
    for (const ref of allUnits(state, side)) {
      const marker = ref.unit;
      if (marker.uid !== inst.srcUid || marker.hp <= 0) continue;
      for (const sk of (marker.skills ?? []).filter((x) => x.trigger === 'on_mark_death')) {
        runEffects(state, cards, sk.effects, { side, source: marker }, rng, events);
      }
    }
  }
}

/**
 * 执行**单个单位**的指定时机触发技（ADR-036）
 * 用于 on_attack / on_damaged 这类"由某个单位自己引发"的时机。
 */
export function runUnitTrigger(
  state: MatchState,
  cards: Map<string, CardDef>,
  unit: Unit,
  trigger: string,
  rng: Rng,
  events: GameEvent[],
): void {
  if (unit.hp <= 0) return;
  const side = findSide(state, unit.uid);
  if (!side) return;
  for (const sk of (unit.skills ?? []).filter((x) => x.trigger === trigger)) {
    emitSkillTriggered(state, side, unit, sk, 'trigger', events);
    runEffects(state, cards, effectsOf(sk), { side, source: unit }, rng, events);
  }
}

/** 李异「协同追击」：己方其它来源造成水攻后触发一次。 */
function runWaterDamageSynergies(
  state: MatchState, cards: Map<string, CardDef>, side: Side,
  source: Unit | undefined, rng: Rng, events: GameEvent[],
): void {
  for (const ref of allUnits(state, side)) {
    if (ref.unit.hp <= 0 || ref.unit.uid === source?.uid) continue;
    for (const sk of (ref.unit.skills ?? []).filter((s) => s.trigger === 'on_water_damage')) {
      emitSkillTriggered(state, side, ref.unit, sk, 'trigger', events);
      runEffects(state, cards, effectsOf(sk),
        { side, source: ref.unit, skipWaterSynergy: true }, rng, events);
    }
  }
}

/** 程普「三朝虎臣」：其他己方武将完成普通攻击且存活后触发。 */
export function runAllyAttackTriggers(
  state: MatchState, cards: Map<string, CardDef>, side: Side,
  attacker: Unit, row: Row, col: number, rng: Rng, events: GameEvent[],
): void {
  if (attacker.type !== 'general' || attacker.hp <= 0) return;
  for (const ref of allUnits(state, side)) {
    if (ref.unit.uid === attacker.uid || ref.unit.hp <= 0) continue;
    for (const sk of (ref.unit.skills ?? []).filter((s) => s.trigger === 'on_ally_attack')) {
      const key = sk.id || sk.name || 'on_ally_attack';
      if ((ref.unit.skillUsesThisTurn[key] ?? 0) >= 1) continue;
      ref.unit.skillUsesThisTurn[key] = (ref.unit.skillUsesThisTurn[key] ?? 0) + 1;
      emitSkillTriggered(state, side, ref.unit, sk, 'trigger', events);
      runEffects(state, cards, effectsOf(sk),
        { side, source: ref.unit, eventAttacker: { side, row, col } }, rng, events);
    }
  }
}

/** 反查单位属于哪一方 */
function findSide(state: MatchState, uid: string): Side | null {
  for (const side of ['own', 'enemy'] as Side[]) {
    for (const r of BOARD.ROWS) {
      if (state.sides[side].rows[r].some((u) => u?.uid === uid)) return side;
    }
  }
  return null;
}

/** 定位某单位的列号（相邻判定用） */
function findCol(state: MatchState, side: Side, uid: string): number {
  for (const r of BOARD.ROWS) {
    const i = state.sides[side].rows[r].findIndex((u) => u?.uid === uid);
    if (i >= 0) return i;
  }
  return -1;
}

/** 某方场上最高的统率值（供拼点使用） */
function topCost(state: MatchState, side: Side): number {
  let max = 0;
  for (const r of BOARD.ROWS) {
    for (const u of state.sides[side].rows[r]) if (u && u.cost > max) max = u.cost;
  }
  return max;
}

/** 选择器指向哪些「方」——手牌与场上共用（pick 无关） */
function handSides(selector: TargetSelector, ctx: EffectContext): Side[] {
  const sideSel = selector.side ?? 'enemy';
  return sideSel === 'both' ? ['own', 'enemy']
    : sideSel === 'self' || sideSel === 'ally' ? [ctx.side] : [other(ctx.side)];
}

/**
 * 按 `mode` / `count` 收窄一个已算好的候选池（ADR-033）。
 *
 * 抽出来是为了让「手牌」与「场上」两条路径共用同一套选取语义 ——
 * 原先手牌路径自己写了一份 random/slice，`pick` / `lowest_health` 都享受不到。
 */
function narrowByMode(
  state: MatchState, pool: TargetRef[], selector: TargetSelector, rng: Rng,
): TargetRef[] {
  if (selector.mode === 'random' && pool.length) {
    const n = selector.count === 'all' ? pool.length : (selector.count ?? 1);
    const picked: TargetRef[] = [];
    const copy = [...pool];
    for (let i = 0; i < n && copy.length; i++) {
      picked.push(copy.splice(rng.int(copy.length), 1)[0] as TargetRef);
    }
    return picked;
  }
  if (selector.count === 'all') return pool;
  const n = selector.count ?? 1;
  if (selector.mode === 'first') return pool.slice(0, n);
  if (selector.mode === 'lowest_health') {
    return [...pool].sort((a, b) => hpOf(state, a) - hpOf(state, b)).slice(0, n);
  }
  if (selector.mode === 'highest_cost') {
    return [...pool].sort((a, b) => {
      const cost = (t: TargetRef): number => t.kind === 'hand'
        ? (state.sides[t.side].hand[t.index]?.card.cost ?? 0) : 0;
      return cost(b) - cost(a);
    }).slice(0, n);
  }
  // mode === 'choose' 的「玩家选择」由调用方先行处理（见 resolveTargets），
  // 走到这里说明没有合法选择（AI / 测试 / UI 未传目标）→ 取前 n 个兜底
  return pool.slice(0, n);
}

/** 解析选择器 → 目标列表 */
export function resolveTargets(
  state: MatchState,
  selector: TargetSelector | undefined,
  ctx: EffectContext,
  rng: Rng,
): TargetRef[] {
  // 「本次普通攻击的目标」（ADR-130）：象兵「象阵」＝打谁就给谁挂状态。
  // 攻击语境由 runOnAttackPhase 注入 ctx.attackTarget；其它语境取不到 → 空池（效果自然跳过）。
  if (selector?.attack_target) {
    return ctx.attackTarget ? [ctx.attackTarget] : [];
  }
  // 「本次事件的另一方单位」：华雄亡语要指向击杀者（ADR-070）
  if (selector?.event) {
    const k = selector.event === 'killer' ? ctx.killer
      : selector.event === 'attacker' ? ctx.eventAttacker : ctx.eventVictim;
    if (!k) return [];
    return k.row !== undefined && k.col !== undefined ? [unitRef(k.side, k.row, k.col)] : [lordRef(k.side)];
  }
  if (!selector) return ctx.chosen ? [ctx.chosen] : [];

  // zone: 'hand' —— 作用于手牌而非场上（ADR-038）
  if (selector.zone === 'hand') {
    const out: TargetRef[] = [];
    for (const sd of handSides(selector, ctx)) {
      state.sides[sd].hand.forEach((hc, i) => {
        if (matchesHandFilter(hc, selector.filter, ctx.source?.cardId)) out.push(handRef(sd, i));
      });
    }
    const pick = pickOf(ctx, selector);
    if (selector.mode !== 'random' && pick && out.some((t) => sameTarget(t, pick))) return [pick];
    return narrowByMode(state, out, selector, rng);
  }

  // lord: true —— 目标为该方主帅（ADR-036）
  // ADR-071：支持 `filter.has_status` —— 祖茂「替主」的光环靠它做到**幂等**
  // （主帅已经有「护主」时不再重复施加，否则每次光环重算都会刷一条事件）。
  if (selector.lord) {
    const sideSel = selector.side ?? 'enemy';
    const ls: Side[] = sideSel === 'both' ? ['own', 'enemy']
      : sideSel === 'self' || sideSel === 'ally' ? [ctx.side] : [other(ctx.side)];
    const f = selector.filter;
    const kept = ls.filter((sd) => {
      if (!f) return true;
      const lord = state.sides[sd].lord;
      if (f.has_status && !((lord.statuses?.[f.has_status]?.stacks ?? 0) > 0)) return false;
      if (f.faction && lord.faction !== f.faction) return false;
      return true;
    });
    return kept.map((x) => lordRef(x));
  }

  // source: true —— 只解析「来源单位自身」
  if (selector.source) {
    const src = ctx.source;
    if (!src) return [];
    for (const r of BOARD.ROWS) {
      for (let c = 0; c < BOARD.COLS; c++) {
        const u = state.sides[ctx.side].rows[r][c];
        if (u?.uid !== src.uid) continue;
        // ⚠️ 原先这里**直接 return，完全忽略 filter** —— 全池 42 处 `source:true`
        // 都没带 filter，所以这个洞从未暴露。越骑「厉志」需要
        // `{source:true, filter:{damaged:false}}` 表达「自身未受伤」，故补上。
        if (selector.filter && !matchesFilter(u, selector.filter, r, src.cost, src.atk, src.uid)) return [];
        return [unitRef(ctx.side, r, c)];
      }
    }
    return [];
  }

  const sideSel = selector.side ?? 'enemy';
  const sides: Side[] =
    sideSel === 'both' ? ['own', 'enemy'] :
    sideSel === 'self' ? [ctx.side] :
    sideSel === 'ally' ? [ctx.side] :
    [other(ctx.side)];

  // 混乱（random_target，ADR-034）：目标池扩为**全场**，不分敌我
  const confused = hasCap(ctx.source ?? null, 'random_target');
  const poolSides: Side[] = confused ? ['own', 'enemy'] : sides;

  const pool: TargetRef[] = [];
  for (const s of poolSides) {
    for (const r of BOARD.ROWS) {
      state.sides[s].rows[r].forEach((u, c) => {
        if (!u) return;
        if (hasCap(u, 'untargetable')) return;          // 免疫/翻面：不能被指定为目标
        // 单挑锁定（ADR-041）：决斗中的单位不被第三方选中
        if (hasCap(u, 'duel_lock') && ctx.source && !hasCap(ctx.source, 'duel_lock')) return;
        if (matchesFilter(u, selector.filter ?? {}, r, ctx.source?.cost, ctx.source?.atk, ctx.source?.uid)) pool.push(unitRef(s, r, c));
      });
    }
  }
  // zone: 'both'（ADR-071，陆抗「手里或场上」）：把该方手牌也并入候选池。
  // adjacent_to 用不到手牌（恒为 panel 外），末尾的相邻过滤会把它们自然剔掉。
  if (selector.zone === 'both') {
    for (const sd of poolSides) {
      state.sides[sd].hand.forEach((hc, i) => {
        if (matchesHandFilter(hc, selector.filter, ctx.source?.cardId)) pool.push(handRef(sd, i));
      });
    }
  }
  // include_lord（ADR-051）：把该方主将也放进候选池，供「随机打敌方任意目标（含主将）」使用
  if (selector.filter?.include_lord) {
    for (const s of poolSides) {
      if (state.sides[s].lord.hp > 0) pool.push(lordRef(s));
    }
  }

  // 相邻（adjacent_to: self）：只保留与来源单位同列或左右相邻列的单位
  let finalPool = pool;
  if (selector.filter?.adjacent_to === 'self' && ctx.source) {
    const srcCol = ctx.source ? findCol(state, ctx.side, ctx.source.uid) : -1;
    finalPool = srcCol < 0 ? [] : pool.filter((t) =>
      t.kind === 'unit' && Math.abs(t.col - srcCol) <= 1);
  }
  if (selector.filter?.adjacent_to === 'chosen') {
    const chosen = pickOf(ctx, selector);
    finalPool = chosen?.kind === 'unit' ? finalPool.filter((t) =>
      t.kind === 'unit' && t.side === chosen.side && t.row === chosen.row
      && Math.abs(t.col - chosen.col) === 1) : [];
  }
  if (selector.filter?.adjacent_to === 'killer') {
    const k = ctx.killer;
    finalPool = k?.row !== undefined && k.col !== undefined ? finalPool.filter(t =>
      t.kind === 'unit' && t.side === k.side && t.row === k.row && Math.abs(t.col - k.col!) === 1) : [];
  }
  if (selector.filter?.offset_from_chosen !== undefined) {
    const chosen = pickOf(ctx, selector);
    const offset = selector.filter.offset_from_chosen;
    finalPool = chosen?.kind === 'unit' ? finalPool.filter(t => t.kind === 'unit'
      && t.side === chosen.side && t.row === chosen.row && t.col === chosen.col + offset) : [];
  }

  const sel: TargetSelector = confused ? { ...selector, mode: 'random' } : selector;
  const pick = pickOf(ctx, sel);

  if (sel.mode === 'choose' && pick && finalPool.some((t) => sameTarget(t, pick))) {
    return [pick];
  }
  return narrowByMode(state, finalPool, sel, rng);
}

/** 定位某单位在战场上的位置（连环普攻需要来源坐标） */
function findPos(state: MatchState, side: Side, uid: string): { row: Row; col: number } | null {
  for (const r of BOARD.ROWS) {
    const i = state.sides[side].rows[r].findIndex((u) => u?.uid === uid);
    if (i >= 0) return { row: r, col: i };
  }
  return null;
}

/** 目标身上的某类状态 id 列表（驱散用，ADR-071） */
function statusIdsOfKind(
  state: MatchState, ref: TargetRef, kind: 'buff' | 'debuff',
): string[] {
  const bags = ref.kind === 'unit'
    ? getUnit(state, ref.side, ref.row, ref.col)?.statuses
    : ref.kind === 'lord' ? state.sides[ref.side].lord.statuses : undefined;
  return Object.entries(bags ?? {})
    .filter(([id, inst]) => inst.stacks > 0 && STATUSES[id]?.kind === kind)
    .map(([id]) => id);
}

/**
 * 攻击时触发技（时机表 8½，ADR-036 / ADR-071 / ADR-072）
 *
 * **必须拆成两趟**，因为 `condition.event === 'killed'` 的真假只有伤害结算完才知道：
 *
 * · `before` —— 伤害**之前**跑「非击杀条件」的效果。
 *   姜维「文武双全」/魏延「桀骜不驯」的「攻击时攻击力 +1」必须赶在算攻击力之前，
 *   否则这一下吃不到加成（ADR-071）。
 * · `after`  —— 伤害**之后**，且**确实击杀了**目标时，才跑「击杀条件」的效果。
 *   张辽「冲锋陷阵」的溢出伤害、关兴「额外行动」写的都是 `condition: {event: killed}`；
 *   原先统一排在伤害之前 → 条件**永远为假**、技能等于白板（ADR-072 修）。
 *
 * 按**效果**而不是按技能拆分：同一个技能里可以既有 buff 又有击杀奖励。
 */
export function runOnAttackPhase(
  state: MatchState,
  cards: Map<string, CardDef>,
  attacker: Unit,
  phase: 'before' | 'after',
  killed: boolean,
  rng: Rng,
  events: GameEvent[],
  /** 本次击杀的溢出伤害（ADR-088）——以 `overflow:N` 事件标记交给 DSL 的 `value_from_flag` */
  overflow = 0,
  attackTarget?: TargetRef,
  victimType?: string,
): number {
  if (attacker.hp <= 0) return 0;
  const side = findSide(state, attacker.uid);
  if (!side) return 0;
  let bonus = 0;
  for (const sk of (attacker.skills ?? []).filter((x) => x.trigger === TIMING.ON_ATTACK)) {
    const effs = (sk.effects ?? []).filter((e) =>
      phase === 'after'
        ? e.condition?.event === 'killed'
        : e.condition?.event !== 'killed');
    const ctx: EffectContext = { side, source: attacker, attackTarget, victimType,
      flags: killed ? ['killed', ...(overflow > 0 ? [`overflow:${overflow}`] : [])] : [] };
    const applicable = effs.filter((e) => checkCondition(state, e.condition, ctx, rng));
    if (!applicable.length) continue;
    emitSkillTriggered(state, side, attacker, sk, 'trigger', events);
    bonus += applicable.filter((e) => e.action === 'attack_bonus').reduce((sum, e) => sum + (e.value ?? 0), 0);
    runEffects(state, cards, applicable.filter((e) => e.action !== 'attack_bonus'), ctx, rng, events);
  }
  return bonus;
}

/**
 * 一次**普通攻击**的完整结算（ADR-071）
 *
 * 原先这段逻辑整体躺在 `engine.ts` 的 `attack()` 里，只有 `ATTACK` 动作能走。
 * 张苞「父子将风」（战吼时挨个对攻<自己的敌方人物发动普攻，直到自己阵亡）
 * 需要**同一条**路径 —— 复制一份必然导致反击 / 圣盾 / 饮血 / 奇袭 / 触发技
 * 各写各的并逐渐漂移，所以抽到这里由 engine 与 DSL 的 `attack_each` 共用。
 *
 * 调用方负责合法性判定（`legalTargets`）与目标选择；本函数只管结算。
 *
 * @param opts.consumeAttack 是否计入「本回合已攻击次数」。ATTACK 动作为 true；
 *        `attack_each`（战吼发动的一串普攻）为 false —— 它不占用该单位本回合的攻击机会。
 * @param opts.toSide 被打的是哪一方，缺省 = 攻击者的对面。
 *        **内讧类效果必须显式给**（混乱 / 趁火打劫「使其攻击己方单位」）——
 *        原先这里写死 `other(side)`，于是同阵营的强制攻击会**按坐标去对面抓人**，
 *        打出"打自己人却伤了对方那个人"的静默错位（ADR-087）。
 */
export function resolveAttack(
  state: MatchState,
  cards: Map<string, CardDef>,
  side: Side,
  from: { row: Row; col: number },
  to: { kind: 'unit'; row: Row; col: number } | { kind: 'lord' },
  events: GameEvent[],
  rng: Rng,
  opts: { consumeAttack?: boolean; toSide?: Side } = {},
): boolean {
  const attacker = getUnit(state, side, from.row, from.col);
  if (!attacker || attacker.hp <= 0) return false;
  const foe = opts.toSide ?? other(side);

  events.push({ type: 'ATTACK_DECLARED', side, from: { ...from }, to });

  // 时机表 8½-before：攻击时触发技里**非击杀条件**的部分（ADR-036 / ADR-071）
  //
  // ⚠️ 必须排在**算攻击力之前**：姜维「文武双全」与魏延「桀骜不驯」写的是
  // 「攻击时攻击力 +1」。原先触发技排在伤害结算之后，于是这一下吃不到加成，
  // 加成从**下一次**攻击才开始生效（还没写 duration 时会永久累积）。
  // 带 `condition: {event: killed}` 的效果**不在这里**跑 —— 见 8½-after。
  const attackTarget = to.kind === 'lord' ? lordRef(foe) : unitRef(foe, to.row, to.col);
  const victimType = to.kind === 'lord' ? 'lord' : getUnit(state, foe, to.row, to.col)?.type;
  const attackBonus = runOnAttackPhase(state, cards, attacker, 'before', false, rng, events, 0, attackTarget);

  // 触发技可能把攻击者自己弄死（如张苞连环普攻途中被反击带走）
  const me = getUnit(state, side, from.row, from.col);
  if (!me || me.hp <= 0) return false;

  const dmg = effectiveAttack(state, side, from.row, from.col) + attackBonus;
  const hasYinXue = hasTrait(me, 'yin_xue');

  // 本次普攻有没有**击杀**目标 —— 8½-after 的击杀奖励据此判定（ADR-072）
  let killed = false;
  /**
   * 击杀时的**溢出伤害**（ADR-088，张辽「冲锋陷阵」）
   *
   * 卡面写「如若斩杀敌人人物卡牌，溢出伤害由对方主将承受」——
   * 原实现给的是写死的 2 点、而且是打"敌方第一个单位"，两处都错。
   * 溢出量只在**攻击人物**时有意义（打主将时对局已经结束）。
   */
  let overflow = 0;
  /** 本次普攻实际造成的伤害合计（ADR-074：司马懿② 要判"有没有对敌方造成伤害"） */
  let dealtTotal = 0;

  if (to.kind === 'lord') {
    const dealt = dealDamage(state, cards, lordRef(foe), dmg, events, me.name, 0,
      { side, row: from.row, col: from.col }, me);
    dealtTotal += dealt;
    if (dealt > 0 && hasCap(me, 'water_convert')) {
      runWaterDamageSynergies(state, cards, side, me, rng, events);
    }
    killed = state.sides[foe].lord.hp <= 0;
    if (hasYinXue) healTarget(state, unitRef(side, from.row, from.col), dealt, events);   // 饮血：回该单位自身（ADR-057）
  } else {
    const tRow = to.row;
    const tCol = to.col;
    const targetUnit = getUnit(state, foe, tRow, tCol);
    const hpBefore = targetUnit ? targetUnit.hp : 0;
    // 反击力 = 目标的**有效**攻击力（含振奋/虚弱等，与攻击方算法对称，ADR-059）。
    // 必须在造成伤害**之前**取值：伤害不改变攻击力，但目标可能被打死而离场。
    const retaliate = effectiveAttack(state, foe, tRow, tCol);

    const dealt = dealDamage(state, cards, unitRef(foe, tRow, tCol), dmg, events, me.name, 0,
      { side, row: from.row, col: from.col }, me);
    dealtTotal += dealt;
    if (dealt > 0 && hasCap(me, 'water_convert')) {
      runWaterDamageSynergies(state, cards, side, me, rng, events);
    }

    // 时机表第 16 步：受到伤害触发技（on_damaged）
    const hit = getUnit(state, foe, tRow, tCol);
    if (hit && dealt > 0 && hit.hp > 0) runUnitTrigger(state, cards, hit, 'on_damaged', rng, events);
    if (hit && dealt > 0) runMarkDamaged(state, cards, hit, dealt, rng, events);

    // 反击（ADR-062，设计者裁定）：**同时结算**，与炉石一致。
    // 只要目标有攻击力，攻击方就吃下这一下 —— **哪怕目标已被打死**。
    // 目标 0 攻则无伤害；攻击方身上的「圣盾」（immune_damage）会在 dealDamage 里
    // 消耗一层并免掉本次伤害，这才是唯一的免疫途径。
    if (retaliate > 0) {
      const reflected = dealDamage(state, cards, unitRef(side, from.row, from.col), retaliate, events, targetUnit?.name ?? '反击', 0,
        undefined, targetUnit ?? undefined, 'physical', false, { side: foe, row: tRow, col: tCol });
      if (reflected > 0 && targetUnit && hasCap(targetUnit, 'water_convert')) {
        runWaterDamageSynergies(state, cards, foe, targetUnit, rng, events);
      }
      const back = getUnit(state, side, from.row, from.col);
      if (back && reflected > 0 && back.hp > 0) runUnitTrigger(state, cards, back, 'on_damaged', rng, events);
    }
    if (hasYinXue) healTarget(state, unitRef(side, from.row, from.col), dealt, events);   // 饮血：回该单位自身（ADR-057）
    // 目标死了就已被 killUnit 移出战场；免死（survive）留下的 1 血算"没死"
    const hitAfter = getUnit(state, foe, tRow, tCol);
    killed = !hitAfter || hitAfter.hp <= 0;
    if (killed) overflow = Math.max(0, dmg - hpBefore);
  }

  const after = getUnit(state, side, from.row, from.col);
  if (after) {
    if (opts.consumeAttack !== false) after.attackedThisTurn += 1;
    after.actedThisTurn = true;                    // ADR-074：司马懿要判"本回合有没有行动"
    if (dealtTotal > 0) after.dealtDamageThisTurn = true;

    // 奇袭：攻击后失去隐身（ADR-054 的新定义还要求"上场自动隐身"，尚未实现，见 Q-06-*）
    if (hasTrait(after, 'qi_xi')) {
      after.kw = after.kw.filter((k) => k !== 'qi_xi');
      delete after.statuses.qi_xi_status;
      events.push({ type: 'STATUS_EXPIRED', side, row: from.row, col: from.col, status: 'qi_xi' });
    }

    // 攻击者自身可能已阵亡
    if (after.hp <= 0) {
      killUnit(state, cards, { side, row: from.row, col: from.col, unit: after }, events);
      recomputeAuras(state, cards, rng, events);   // 第 19 步：死亡后光环重算
    }
  }

  // 时机表 8½-after：击杀奖励（ADR-072）。位置有两个硬约束：
  // ① 必须在**整个伤害交换之后** —— 攻击者若已被反击打死，就不该再拿到击杀奖励；
  // ② 必须在本回合攻击次数 `+1` 的**记账之后** —— 否则关兴「额外行动」刚把次数清零，
  //    立刻又被这次攻击的记账加回去，额外行动等于白给（这条被测试抓到过）。
  const survivor = getUnit(state, side, from.row, from.col);
  if (survivor && survivor.hp > 0) {
    runAllyAttackTriggers(state, cards, side, survivor, from.row, from.col, rng, events);
    runOnAttackPhase(state, cards, survivor, 'after', killed, rng, events, overflow, attackTarget, victimType);
    for (const sk of (survivor.skills ?? []).filter(sk => sk.trigger === TIMING.AFTER_ATTACK)) {
      const ctx: EffectContext = { side, source: survivor, flags: dealtTotal > 0 ? ['damaged'] : [] };
      if (!(sk.effects ?? []).some(e => checkCondition(state, e.condition, ctx, rng))) continue;
      emitSkillTriggered(state, side, survivor, sk, 'trigger', events);
      runEffects(state, cards, effectsOf(sk), ctx, rng, events);
    }
  }
  return true;
}

/** 执行效果列表 */
/**
 * 已在 `runEffects` 里实现的动作（ADR-066）。
 *
 * `ACTIONS` 是**注册表**（DSL 允许出现的名字），不等于**已实现**。
 * 两者不一致时，用该动作的卡会静默空转 —— 华佗「青囊」的 remove_status
 * 就这样空转了整整一轮。校验器现在拿它逐卡核对，杜绝再犯。
 */
export const IMPLEMENTED_ACTIONS: ReadonlySet<string> = new Set([
  'damage', 'heal', 'draw', 'summon', 'apply_status', 'remove_status',
  'destroy', 'modify', 'gain_armor', 'gain_command', 'cost_modifier', 'transform',
  'discard', 'return_to_hand', 'clash', 'flip', 'scry', 'ban_play', 'steal_card', 'survive',
  'extra_attack', 'take_control', 'copy_skill', 'force_attack', 'duel',
  'add_to_deck', 'send_to_deck', 'cycle_to_deck',
  'sacrifice', 'attack_each', 'draw_until', 'mill',
  'discover',
  'grant_hand', 'replace_lord',
  'roll',
  'attack_bonus',
  'send_hand_to_deck',   // 手牌 → 牌库顶/底/随机（ADR-139，杨仪「筹度粮谷」）
  'self_to_hand',        // 阵亡后重建于手牌（ADR-141，孟获「蛮王」）
  'override_status',     // 覆盖某状态的档位（ADR-142，兀突骨「藤甲统率」）
  'deploy_from_hand',    // 手牌 → 场上（ADR-149，诸葛瞻/诸葛尚「同赴」）
  'override_rule',       // 无状态规则覆盖（ADR-150，木鹿大王「象兵统领」）
  'cast_random',         // 从卡池随机取 N 张直接释放（ADR-162，庞统「连环」）
]);

/** 该方第一个空格（前军优先，与 `summon` 的填充顺序一致）；场上满了返回 null */
function firstEmptySlot(state: MatchState, side: Side): { row: Row; col: number } | null {
  for (const r of BOARD.ROWS) {
    for (let c = 0; c < BOARD.COLS; c++) {
      if (!state.sides[side].rows[r][c]) return { row: r, col: c };
    }
  }
  return null;
}

/**
 * 抉择分支的取值（ADR-071）
 *
 * 有 `modes` 时以 `modeIndex` 为准；缺省 / 越界 / 非整数一律取 `modes[0]`，
 * 保证 AI、测试与尚未接入分支选择的 UI 都能跑。
 */
export function effectsOf(sk: SkillDef, modeIndex?: number): CardEffect[] {
  const effects = sk.modes?.length
    ? (() => {
      const i = typeof modeIndex === 'number' && Number.isInteger(modeIndex)
        && modeIndex >= 0 && modeIndex < sk.modes.length ? modeIndex : 0;
      return sk.modes[i]!.effects ?? [];
    })()
    : (sk.effects ?? []);
  // 卡牌数据允许把主动技能的目标选择器写在技能级（`skill.target`），
  // 这样多条效果可以共享同一个玩家选择。执行与 UI 预览都必须把它下沉到
  // 没有单独 target 的效果上，否则 UI 不会进入选目标流程，技能也会空转。
  if (!sk.target) return effects;
  return effects.map((eff) => eff.target ? eff : { ...eff, target: sk.target });
}

/**
 * 「范围伤害 / 随机伤害**默认把主公算进目标**」（ADR-087，设计者裁定）
 *
 * 设计者原话：「还有一些范围伤害和随机伤害，如果没有说只能针对非主公的，
 * 默认就是主公也在攻击目标内也能被选择。」
 *
 * 判据：
 *   · 只作用于 `damage`；
 *   · 只作用于**范围**（`count: 'all'`）或**随机**（`mode: 'random'`）—— 单点指定目标不受影响；
 *   · 只作用于敌方 / 双方（打自己人的选择器不吃这条默认）；
 *   · 卡面**显式**写了 `include_lord`（true 或 false）就一律听卡面的
 *     —— 张飞「咆哮」卡面写「不含主公」，因此显式标 false。
 */
const LORD_DEFAULT_ACTIONS: ReadonlySet<string> = new Set(['damage']);

export function withDefaultLordTarget(eff: CardEffect): CardEffect {
  const t = eff.target;
  if (!t) return eff;
  if (t.filter?.include_lord !== undefined) return eff;          // 卡面已表态
  if (!LORD_DEFAULT_ACTIONS.has(eff.action)) return eff;
  if (t.count !== 'all' && t.mode !== 'random') return eff;
  const side = t.side ?? 'enemy';                                // 与 resolveTargets 的缺省口径一致
  if (side === 'self' || side === 'ally') return eff;
  return { ...eff, target: { ...t, filter: { ...(t.filter ?? {}), include_lord: true } } };
}

export function runEffects(
  state: MatchState,
  cards: Map<string, CardDef>,
  effects: CardEffect[] | undefined,
  ctx: EffectContext,
  rng: Rng,
  events: GameEvent[],
): void {
  if (!effects?.length) return;
  ctx.lordFullHpAtStart ??= {
    own: state.sides[ctx.side].lord.hp === state.sides[ctx.side].lord.maxHp,
    enemy: state.sides[other(ctx.side)].lord.hp === state.sides[other(ctx.side)].lord.maxHp,
  };
  // ADR-159：所选目标"是否受伤"也要**在技能开始时快照**一次 —— 否则本技能自己先打出的伤害
  // 会把这个条件变成恒真（详见 EffectContext.chosenDamagedAtStart 的注释）。
  if (ctx.chosenDamagedAtStart === undefined && ctx.chosen) {
    ctx.chosenDamagedAtStart = chosenDamagedNow(state, ctx.chosen) ?? false;
  }

  /** 该效果「没有解析出目标」时的兜底：取 pick 对应的玩家选择（ADR-071） */
  const chosenFor = (sel?: TargetSelector): TargetRef[] => {
    if (sel) return []; // 显式目标池为空时不能退回原选择，尤其是相邻/偏移格。
    const p = pickOf(ctx, sel);
    return p ? [p] : [];
  };

  for (const rawEff of effects) {
    // 范围/随机伤害默认含主公（ADR-087）—— 归一化后再走后面所有分支
    const eff = withDefaultLordTarget(rawEff);
    // 概率：掷一次骰子，不中则跳过（ADR-033）
    // ADR-150：概率可被**规则覆盖**（木鹿大王「象兵统领」把象兵「象阵」的 50% 抬到 100%）。
    // 读 `proc_chance` 这个档位：没有覆盖就用卡面写死的 chance。
    const chance = capOverride(ctx.source ?? null, 'proc_chance');
    const roll = chance ?? eff.chance;
    if (typeof roll === 'number' && rng.next() >= roll) continue;
    // 条件：结算前查一次局面（ADR-033）
    if (!checkCondition(state, eff.condition, ctx, rng)) continue;

    // 动态取值：数值 = 命中集合的大小（ADR-033）
    const dyn = (sel?: TargetSelector): number | undefined =>
      sel ? resolveTargets(state, { ...sel, count: 'all' }, ctx, rng).length : undefined;
    const dynAtk = dyn(eff.attack_from), dynHp = dyn(eff.health_from);
    const dynVal = dyn(eff.value_from);
    // 取「最近被弃牌」的属性（ADR-040）
    const discardVal = (() => {
      if (!eff.value_from_discarded) return undefined;
      const last = ctx.lastDiscarded;
      if (!last) return undefined;
      return eff.value_from_discarded === 'cost' ? last.cost : (last.health ?? 0);
    })();
    const flagVal = eff.value_from_flag
      ? Number((ctx.flags ?? []).find((f) => f.startsWith(`${eff.value_from_flag}:`))?.split(':')[1])
      : undefined;
    const sourceVal = eff.value_from_source === 'attack' ? ctx.source?.atk
      : eff.value_from_source === 'health' ? ctx.source?.hp : undefined;
    const statusVal = eff.value_from_status ? (ctx.source?.statuses[eff.value_from_status]?.stacks ?? 0) : undefined;
    const val = flagVal ?? discardVal ?? dynVal ?? statusVal ?? sourceVal ?? eff.value ?? 0;

    const targets = eff.target ? resolveTargets(state, eff.target, ctx, rng) : [];
    switch (eff.action) {
      case 'damage': {
        // count > 1 时重复结算，且每次**重新解析目标**（随机目标因此可命中不同单位）
        const times = eff.count ?? 1;
        for (let i = 0; i < times; i++) {
          const list = i === 0
            ? (targets.length ? targets : chosenFor(eff.target))
            : (eff.target ? resolveTargets(state, eff.target, ctx, rng) : chosenFor(eff.target));
          for (const t of list) {
            const before = hpOf(state, t);
            const victim = t.kind === 'unit' ? getUnit(state, t.side, t.row, t.col) : null;
            ctx.lastDamageTargetType = victim?.type ?? (t.kind === 'lord' ? 'lord' : undefined);
            // 甘宁「锦帆统领」也要覆盖战法、事件和主公技这类没有 sourceUnit 的伤害。
            const convertsToWater = (eff.damage_type ?? 'physical') === 'physical'
              && (ctx.source
                ? hasCap(ctx.source, 'water_convert')
                : allUnits(state, ctx.side).some((ref) => hasCap(ref.unit, 'water_convert')));
            const resolvedDamageType = convertsToWater ? 'water' : (eff.damage_type ?? 'physical');
            const waterBonus = resolvedDamageType === 'water'
              ? allUnits(state, ctx.side).reduce((sum, ref) => sum + capStacks(ref.unit.statuses, 'water_damage'), 0)
              : 0;
            const keywordBonus = victim && eff.bonus_vs_keyword && hasTrait(victim, eff.bonus_vs_keyword.keyword)
              ? eff.bonus_vs_keyword.value : 0;
            const troopBonus = victim && eff.bonus_vs_troop_kind && victim.troopKind === eff.bonus_vs_troop_kind.troopKind
              ? eff.bonus_vs_troop_kind.value : 0;
            const requested = val + waterBonus + keywordBonus + troopBonus;
            const protectedHp = typeof eff.minimum_hp === 'number' && t.kind === 'unit'
              ? Math.max(0, (getUnit(state, t.side, t.row, t.col)?.hp ?? 0) - eff.minimum_hp) : requested;
            const actual = dealDamage(state, cards, t, Math.min(requested, protectedHp), events, ctx.source?.name ?? '效果', 0, undefined, ctx.source,
              resolvedDamageType, eff.damage_origin === 'reflected',
              ctx.source && findPos(state, ctx.side, ctx.source.uid)
                ? { side: ctx.side, ...findPos(state, ctx.side, ctx.source.uid)! } : undefined);

            if (resolvedDamageType === 'water' && actual > 0
              && t.side !== ctx.side && !ctx.skipWaterSynergy) {
              runWaterDamageSynergies(state, cards, ctx.side, ctx.source, rng, events);
            }

            /* ------------------------------------------------------------
             * 🔥💧☠️「属性伤害挂对应 DoT」全局规则
             *   · 火攻 → 灼烧（`zhuo_shao`，ADR-134，设计者定案）
             *   · 水攻 → 水困（`shui_kun`，ADR-138）
             *   · 毒攻 → 中毒（`zhong_du`，ADR-138）
             *
             * **对敌方释放的属性伤害效果**（`damage_type` 命中下表、且目标属**敌方阵营**）
             * 打出去，就对**该次伤害的目标**挂 1 层对应 DoT；
             * 同一张卡的**多段**属性伤害**各算一次**，且与伤害数值无关（3 点也只 +1 层）。
             *
             * ⚠️⚠️ 这条**必须**留在**效果层**，**严禁**下沉到 `dealDamage` 里按
             * `damageType` 判断 —— 灼烧自己的回合开始跳伤
             * （`mutate.resolveTurnStartDamage`）**也是火属性**（ADR-108 为
             * 「藤甲·遇火即燃」特意如此），挂进伤害管线就会**自己给自己叠层、
             * 每回合无限增长**。DoT 跳伤 / 水困行动税 / 中毒削上限 / 藤甲反伤
             * 全都**绕过效果层**直接调 `dealDamage`，所以在效果层挂钩能从**结构上**
             * 排除它们（`test/elemental-dot.test.ts` 用「连续多回合层数不变」钉死）。
             *
             * 三系叠加差异（**由状态定义决定，不在这里特判**）：
             *   · 灼烧 = `stack_mode: add`（默认）→ 每次火攻 +1 层、不封顶
             *   · 中毒 = `stack_mode: add`（默认）→ 每次毒攻 +1 层（永久削生命上限）
             *   · 水困 = `stack_mode: max` → 重复施加**取较大者**，所以自动挂层只是
             *     「保证至少有 1 层（阶段 1）」，不会加速阶段；阶段仍由该方回合结束 +1
             * ------------------------------------------------------------ */
            const dot = eff.damage_type ? ELEMENTAL_DOT[eff.damage_type] : undefined;
            if (dot && t.kind === 'unit' && t.side !== ctx.side) {
              // 口径（ADR-134 火 / ADR-138 扩展水毒）：
              //  · **只对敌人**（设计者原话）—— 施法者自己与己方单位**永远不会**因自己的属性伤害
              //    中对应 DoT：蒙冲斗舰「蒙冲」第 4 段是**对自身**的 2 点火伤，只掉血、不挂层。
              //    （判据写成"目标阵营 ≠ 施法方"，而不是"目标不是来源单位" —— 打自己人的
              //     AoE / 混乱反噬同样不该给对方以外的自己人挂层。）
              //  · 伤害被**减到 0 也照挂**（披坚免伤 / 藤甲减伤 / 免疫伤害）—— "打出去了"即挂；
              //    真正挡住挂层的只有**既有规则**：目标不可选中（根本进不了目标池）、
              //    `immune_debuff` 免疫负面（走 `applyStatus` 的既有分支，发 STATUS_BLOCKED）。
              //  · 不写 `turns` → 按状态定义 `duration: permanent` = **永久**（可被净化，不自然到期）。
              //  · **只挂场上单位**：三个 DoT 都只遍历在场单位结算，主公挂了也不会跳伤，
              //    那就是一个"永不结算的徽章"（且陆逊/黄权/火烧洛阳 都在打脸 →
              //    会变成无需进攻的永久自动胜利线，与 ADR-117「毒不上主公」同源）。
              //    主公仍照常吃**当次**属性伤害（ADR-087 范围/随机伤害默认含主公）。
              //  · 伤害被「守护/护主」重定向时，层数挂在**效果声明的目标**身上 ——
              //    重定向发生在 `dealDamage` 内部，效果层看不到（已知边界，已在 ADR-134 写明）。
              //  · 目标被这一下打死 → 单位已移出战场，`applyStatus` 自然空转（不给尸体挂状态）。
              applyStatus(state, t, dot, 1, events);
            }
            // 记录"本次造成了击杀"，供同一张卡的后续效果做条件判定
            if (before > 0 && hpOf(state, t) <= 0) {
              ctx.flags = ctx.flags ?? [];
              if (!ctx.flags.includes('killed')) ctx.flags.push('killed');
              ctx.eventCounts = ctx.eventCounts ?? {};
              ctx.eventCounts.killed = (ctx.eventCounts.killed ?? 0) + 1;
            }
            // 时机表第 16 步：受到伤害触发技（存活才触发）
            if (victim && actual > 0 && victim.hp > 0) runUnitTrigger(state, cards, victim, 'on_damaged', rng, events);
            // 仇敌标记联动（ADR-041）：无论是否存活都触发，但只认实际受伤
            if (victim && actual > 0) runMarkDamaged(state, cards, victim, actual, rng, events);
          }
        }
        break;
      }
      case 'roll': {
        const id = eff.roll_id ?? 'default';
        ctx.flags = ctx.flags ?? [];
        if (rng.next() < (eff.chance ?? 0.5)) ctx.flags.push(`roll:${id}`);
        break;
      }
      case 'heal': {
        const list = targets.length ? targets : chosenFor(eff.target);
        for (const t of list) healTarget(state, t, val, events);
        break;
      }
      case 'draw': {
        // ⚠️ 原先无条件 `drawCard(..., ctx.side, ...)` —— **完全忽略 `eff.target`**。
        // 于是五谷丰登（名义「双方各抽 2 张」）实际变成**自己抽 4 张**，1 费抽 4 张，
        // 远超全库「3 费抽 2」的标准档，而且与卡面文案不符。
        // 这里与引擎其它动作保持一致：`target.side === 'enemy'` → 抽给对手。
        const who: Side = eff.target?.side === 'enemy' ? other(ctx.side) : ctx.side;
        for (let i = 0; i < (dynVal ?? eff.value ?? 1); i++) drawCard(state, cards, who, events);
        break;
      }
      case 'discover': {
        // 从当前方牌库中筛选候选，随机展示最多 count 张；真正取牌由 CHOOSE_DISCOVER 完成。
        const filter = eff.target?.filter;
        const candidates = state.sides[ctx.side].deck.filter((id) => {
          const card = cards.get(id);
          if (!card) return false;
          if (filter?.faction && card.faction !== filter.faction) return false;
          if (filter?.type && filter.type !== 'character' && card.type !== filter.type) return false;
          if (filter?.type === 'character' && !isCharacterType(card.type)) return false;
          if (filter?.tag && !(card.tags ?? []).includes(filter.tag)) return false;
          // ADR-149：按**具体卡**筛（"把牌库里的诸葛尚置入手中"要靠它才是必然，否则退化成随机三选一）
          if (filter?.card_id && id !== filter.card_id) return false;
          if (filter?.damage_type && !cardHasDamageType(card, filter.damage_type)) return false;
          return true;
        });
        const pool = [...candidates];
        const shown: string[] = [];
        const count = Math.min(eff.count ?? 3, pool.length);
        for (let i = 0; i < count; i++) shown.push(pool.splice(rng.int(pool.length), 1)[0]!);
        if (!shown.length) break;
        state.pendingDiscover = {
          side: ctx.side, candidates: shown, costModifier: eff.value,
          destination: eff.discover_to ?? 'hand',
        };
        events.push({
          type: 'DISCOVER_OPTIONS', side: ctx.side,
          cards: shown.map((id) => cards.get(id)!).filter(Boolean),
        });
        break;
      }
      case 'deploy_from_hand': {
        // 手牌 → 场上（**免费**）：把手里**指定的那张**直接搬上场（ADR-149，
        // 诸葛瞻/诸葛尚「同赴」：打出一个，另一个若在手牌就一起上场）。
        //
        // 与 `summon` 的分工：`summon` 是**凭空造一个**（手牌里那张还在），本动作搬的是
        // **手牌里已有的那张** —— 不消耗统率、也不多产生一张牌。现有动作做不到这件事：
        // `discard` 不支持按 `card_id` 过滤，没法精准消耗掉手里那一张。
        const sel = eff.target;
        const hand = state.sides[ctx.side].hand;
        const picks: number[] = [];
        const want = sel?.mode === 'choose' && typeof ctx.handIndex === 'number' ? ctx.handIndex : undefined;
        if (want !== undefined && hand[want]
            && matchesHandFilter(hand[want]!, sel?.filter, ctx.source?.cardId)) {
          picks.push(want);
        } else {
          const n = eff.count ?? 1;
          for (let i = 0; i < hand.length && picks.length < n; i++) {
            if (matchesHandFilter(hand[i]!, sel?.filter, ctx.source?.cardId)) picks.push(i);
          }
        }
        for (const i of [...picks].sort((a, b) => b - a)) {   // 从后往前删，避免下标漂移
          const slot = firstEmptySlot(state, ctx.side);
          if (!slot) break;                    // 场上满了：宁可不动，也**不吞掉手牌**
          const hc = hand[i];
          if (!hc) continue;
          const u = summonUnit(state, cards, ctx.side, slot.row, slot.col, hc.card.id, events);
          if (!u) continue;                    // 卡表里查无此卡 → 手牌原样留着
          hand.splice(i, 1);
          // 手牌数值修正 / 规则覆盖随牌进场（与 `playCard` 同口径，ADR-141 / ADR-142）
          const handAtk = hc.mods.filter((m) => m.kind === 'attack' && m.auraId === undefined)
            .reduce((sum, m) => sum + (m.value ?? 0), 0);
          const handHp = hc.mods.filter((m) => m.kind === 'health' && m.auraId === undefined)
            .reduce((sum, m) => sum + (m.value ?? 0), 0);
          if (handAtk) u.mods.push({ id: `handatk#${nextUidSeq(state)}`, kind: 'permanent', attack: handAtk });
          if (handHp) u.mods.push({ id: `handhp#${nextUidSeq(state)}`, kind: 'permanent', health: handHp });
          for (const m of hc.mods) {
            if (m.kind !== 'rule' || !m.rule || m.auraId !== undefined) continue;
            u.mods.push({ id: `handrule#${nextUidSeq(state)}`, kind: 'rule', rule: { ...m.rule } });
          }
          applyMods(u);
          // 与召唤同源（ADR-121）：**上场就要派发自己的战吼**
          for (const sk of (u.skills ?? []).filter((x) => x.trigger === 'on_play')) {
            emitSkillTriggered(state, ctx.side, u, sk, 'on_play', events);
            runEffects(state, cards, effectsOf(sk), { side: ctx.side, source: u }, rng, events);
          }
        }
        break;
      }
      case 'summon': {
        const empties: Array<{ row: 'front' | 'back'; col: number }> = [];
        for (const r of BOARD.ROWS) {
          for (let c = 0; c < BOARD.COLS; c++) {
            if (!state.sides[ctx.side].rows[r][c]) empties.push({ row: r, col: c });
          }
        }
        // 条件为 event:killed 时，召唤次数按本次效果实际击杀数结算，
        // 避免多次雷击只在效果列表末尾触发一次召唤（如张角五雷轰顶）。
        const eventCount = eff.condition?.event ? ctx.eventCounts?.[eff.condition.event] : undefined;
        const n = eventCount ?? eff.count ?? 1;
        for (let i = 0; i < n && empties.length; i++) {
          const idx = eff.position === 'random' ? rng.int(empties.length) : 0;
          const slot = empties.splice(idx, 1)[0]!;
          if (eff.unit) {
            const u = summonUnit(state, cards, ctx.side, slot.row, slot.col, eff.unit, events);
            if (u && eff.status) {
              applyStatus(state, unitRef(ctx.side, slot.row, slot.col), eff.status, eff.stacks ?? 1, events);
            }
            if (u && eff.copy_source_stats && ctx.source) {
              u.atk = u.baseAtk = ctx.source.atk;
              u.hp = u.maxHp = u.baseMaxHp = ctx.source.hp;
            }
            if (u) {
              // ADR-121：**召唤也是「上场」** —— 与 ADR-114 对升变的处理同理，
              // 新单位自己的「战吼（on_play）」必须照样发动。此前只有 `playCard` 与
              // `upgradeUnit` 派发 on_play，召唤出来的一律不派发。
              //
              // 影响面为零风险：改动前全池**没有任何**被召唤的单位带 on_play 技能
              // （只有主动声明该触发技的衍生物才会受影响）。首个使用者是「黄巾兵」
              // 的「黄巾众」：落地时按当时的己方统领数/是否有黄巾力士**永久**成长。
              //
              // 这里不额外 `recomputeAuras`：`modify` 分支自己会 `applyMods`，
              // 而外层动作（出牌 / 阵亡 / 回合边界）本就会在效果结算完后重算光环。
              for (const sk of (u.skills ?? []).filter((s) => s.trigger === 'on_play')) {
                emitSkillTriggered(state, ctx.side, u, sk, 'on_play', events);
                runEffects(state, cards, effectsOf(sk), { side: ctx.side, source: u }, rng, events);
              }
            }
          }
        }
        break;
      }
      case 'discard': {
        // 弃牌（ADR-033）：作用对象是「一方的手牌」，不是场上单位
        //
        // ⚠️ ADR-148：弃牌**一张都没弃成**（目标方手牌为空 / 下标越界）时，必须把
        // `lastDiscarded` **清掉**。否则后续按"弃掉那张牌"结算的效果
        //（`value_from_discarded: cost`，周瑜「离间」的伤害 / 华佗「青囊」的治疗）
        // 会读到**上一回合、甚至上一局**某次弃牌的残值 —— 凭空生效，日志里完全看不出来。
        const n = eff.count ?? 1;
        let discardedAny = false;
        const sel = eff.target?.side ?? 'enemy';
        const sides: Side[] = sel === 'both' ? ['own', 'enemy']
          : sel === 'self' || sel === 'ally' ? [ctx.side] : [other(ctx.side)];
        for (const side of sides) {
          for (let i = 0; i < n; i++) {
            const filter = eff.target?.filter;
            const candidates = state.sides[side].hand
              .map((hc, index) => ({ hc, index }))
              .filter(({ hc }) => matchesHandFilter(hc, filter));
            if (!candidates.length) break;
            // mode: 'choose' → 用 ctx.handIndex 指定的那张（ADR-049）；
            // 未指定或越界则退回随机，绝不静默失败
            const want = eff.mode === 'choose' && side === ctx.side ? ctx.handIndex : undefined;
            const picked = typeof want === 'number'
              ? candidates.find((c) => c.index === want)
              : undefined;
            const idx = picked?.index ?? candidates[rng.int(candidates.length)]!.index;
            const [hc] = state.sides[side].hand.splice(idx, 1);
            if (!hc) continue;
            state.sides[side].discard.push(hc.card);
            (state as MatchState & { lastDiscarded?: unknown }).lastDiscarded = { card: hc.card, side };
            discardedAny = true;
            ctx.lastDiscarded = hc.card;
            events.push({ type: 'CARD_DISCARDED', side, card: hc.card });
          }
        }
        if (!discardedAny) {
          ctx.lastDiscarded = undefined;
          (state as MatchState & { lastDiscarded?: unknown }).lastDiscarded = undefined;
        }
        break;
      }
      case 'add_to_deck': {
        // 往指定方的牌库**随机位置**插入 N 张指定卡（ADR-050，「万箭齐发」）
        const who: Side = eff.target?.side === 'enemy' ? other(ctx.side) : ctx.side;
        const def = cards.get(String(eff.unit ?? ''));
        if (!def) { events.push({ type: 'REJECTED', reason: `add_to_deck 的卡不存在：${eff.unit}` } as never); break; }
        const n = eff.count ?? 1;
        // to:'hand' → 直接进手牌（"获得一张"）；默认进牌库随机位置（"加入牌组"）
        if (eff.to === 'hand') {
          for (let i = 0; i < n; i++) {
            state.sides[who].hand.push({ card: def, mods: [] });
          }
        } else {
          for (let i = 0; i < n; i++) {
            const deck = state.sides[who].deck;
            deck.splice(rng.int(deck.length + 1), 0, def.id);
          }
        }
        events.push({ type: 'DECK_ADDED', side: who, card: def, count: n, to: eff.to === 'hand' ? 'hand' : 'deck' } as never);
        break;
      }
      case 'send_to_deck': {
        // 把「自己牌库里剩下的指定牌」全部塞进对方牌库（ADR-050，袁绍亡语）
        const to: Side = eff.target?.side === 'enemy' ? other(ctx.side) : ctx.side;
        const cid = String(eff.unit ?? '');
        const from = state.sides[ctx.side].deck;
        const moved: string[] = [];
        for (let i = from.length - 1; i >= 0; i--) {
          if (from[i] === cid) { from.splice(i, 1); moved.push(cid); }
        }
        for (const id of moved) {
          const deck = state.sides[to].deck;
          deck.splice(rng.int(deck.length + 1), 0, id);
        }
        events.push({ type: 'DECK_SENT', side: to, cardId: cid, count: moved.length });
        break;
      }
      case 'cycle_to_deck': {
        // 把手牌放回牌库**随机位置**，然后抽 1 张（ADR-050，孙权「坐断东南」置换模式）
        // 与 discard 的区别：牌回牌库可再抽到，不是永久损失
        const h = state.sides[ctx.side].hand;
        const idx = typeof ctx.handIndex === 'number' && ctx.handIndex >= 0 && ctx.handIndex < h.length
          ? ctx.handIndex : (h.length ? rng.int(h.length) : -1);
        if (idx < 0) break;
        const [hc] = h.splice(idx, 1);
        if (!hc) break;
        const deck = state.sides[ctx.side].deck;
        deck.splice(rng.int(deck.length + 1), 0, hc.card.id);
        events.push({ type: 'CARD_RETURNED_TO_DECK', side: ctx.side, card: hc.card });
        drawCard(state, cards, ctx.side, events, rng);
        break;
      }
      case 'send_hand_to_deck': {
        // 把一张手牌放回牌库的**指定位置**，且**不抽牌**（ADR-139，杨仪「筹度粮谷」）
        //
        // 与 `cycle_to_deck` 的区别：那个是"随机位置 + 必抽 1 张"的置换；
        // 这个只负责把牌塞回去，抽牌由调用方自己的 `draw` 效果写，
        // 因此能表达「先抽 N 张，再把其中一张放回底部」这类两段式效果。
        //
        // ⚠️ 牌库方向（全项目统一，见 `drawCard` 用 `pop()`）：
        //     数组**末尾** = 牌库**顶**，数组**开头** = 牌库**底**。
        //     所以 `deck_top` → `push`，`deck_bottom` → `unshift`。
        const hand = state.sides[ctx.side].hand;
        if (!hand.length) break;
        const where: 'deck_top' | 'deck_bottom' | 'random' =
          eff.to === 'deck_top' ? 'deck_top'
            : eff.to === 'deck_bottom' || eff.to === undefined ? 'deck_bottom'
              : 'random';
        /** 真正把某张手牌搬到牌库（延迟选择时由 `engine.chooseHand` 复用同一段逻辑） */
        const move = (pick: number): void => {
          const [chosen] = state.sides[ctx.side].hand.splice(pick, 1);
          if (!chosen) return;
          const toDeck = state.sides[ctx.side].deck;
          if (where === 'deck_top') toDeck.push(chosen.card.id);
          else if (where === 'deck_bottom') toDeck.unshift(chosen.card.id);
          else toDeck.splice(rng.int(toDeck.length + 1), 0, chosen.card.id);
          events.push({ type: 'CARD_RETURNED_TO_DECK', side: ctx.side, card: chosen.card, to: where });
        };
        if (eff.mode === 'choose') {
          const given = ctx.handIndex;
          if (typeof given === 'number' && given >= 0 && given < hand.length) {
            move(given);                     // 调用方（UI/AI）已经指明了哪张 —— 直接用
            break;
          }
          // 没指明（或越界）→ **挂起等玩家选**（ADR-144）。绝不能悄悄退回随机：
          // 卡面写的是"选一张"，随机就是文案与实现不一致。
          // `from_drawn: N` ⇒ 候选只在"本次结算刚抽到的最近 N 张"里（杨仪的"抽二选一"）。
          const take = eff.from_drawn ?? 0;
          const candidates = take > 0 ? hand.length - Math.min(take, hand.length) : 0;
          const indices: number[] = [];
          for (let i = candidates; i < hand.length; i++) indices.push(i);
          state.pendingHandChoice = { side: ctx.side, kind: where, indices };
          events.push({ type: 'HAND_CHOICE_OPTIONS', side: ctx.side, kind: where, indices });
          break;
        }
        move(typeof ctx.handIndex === 'number' && ctx.handIndex >= 0 && ctx.handIndex < hand.length
          ? ctx.handIndex : rng.int(hand.length));
        break;
      }
      case 'return_to_hand': {
        // 返回手牌（ADR-033）：把场上单位收回其拥有者手牌
        for (const t of targets) {
          if (t.kind !== 'unit') continue;
          const u = getUnit(state, t.side, t.row, t.col);
          if (!u) continue;
          const def = cards.get(u.cardId);
          state.sides[t.side].rows[t.row][t.col] = null;
          if (def) state.sides[t.side].hand.push({ card: def, mods: [] });
          events.push({ type: 'UNIT_RETURNED', side: t.side, row: t.row, col: t.col, unit: u });
        }
        break;
      }
      case 'override_status':
      case 'override_rule': {
        // 覆盖目标身上某状态的若干**档位**（ADR-142，兀突骨「藤甲统率」）
        //
        // 为什么不是"多加几层状态"：一个状态的多个 cap 共用同一个层数 —— 藤甲的
        // `reduce_physical`（物理 −N）与 `vulnerable_fire`（遇火 +N）都等于层数。
        // 想把减伤抬到 2 而又不让"怕火"跟着涨（甚至要**不再怕火**），只能覆盖档位。
        //
        // 三条语义（`capValue` 里实现，测试钉死）：
        //   · **仅当该状态存在于目标身上时才生效**（被净化 → 覆盖失效；重新获得 → 自动恢复）；
        //   · **绝对值覆盖**（`vulnerable_fire: 0` = 彻底不再怕火）；
        //   · **幂等**：同一 (状态, 档位) 的旧覆盖先删除再写，反复触发不会堆一长串。
        // `override_status` 带状态（状态消失即失效）；`override_rule` 不带状态（恒生效，ADR-150）
        const statusId = eff.status;
        const caps = eff.caps;
        if (!caps) break;
        const list = targets.length ? targets : chosenFor(eff.target);
        for (const t of list) {
          if (t.kind !== 'unit' && t.kind !== 'hand') continue;
          for (const [cap, value] of Object.entries(caps)) {
            if (typeof value !== 'number') continue;
            const rule = { ...(statusId ? { statusId } : {}), cap: cap as StatusCap, value };
            const isSame = (m: { kind: string; rule?: { statusId?: string; cap: string } }) =>
              m.kind === 'rule' && m.rule?.statusId === statusId && m.rule?.cap === cap;
            if (t.kind === 'unit') {
              const u = getUnit(state, t.side, t.row, t.col);
              if (!u) continue;
              u.mods = u.mods.filter((m) => !isSame(m));
              u.mods.push({ id: `rule#${statusId ?? 'always'}#${cap}#${nextUidSeq(state)}`, kind: 'rule', rule });
              events.push({
                type: 'STATUS_OVERRIDDEN', side: t.side,
                target: { kind: 'unit', row: t.row, col: t.col }, ...(statusId ? { statusId } : {}), cap: rule.cap, value,
              });
            } else {
              // 手牌：写成 HandMod，这张牌**打出时**再搬进单位的 mods（见 `engine.playCard`）
              const hc = state.sides[t.side].hand[t.index];
              if (!hc) continue;
              hc.mods = hc.mods.filter((m) => !isSame(m));
              hc.mods.push({ id: `rule#${statusId ?? 'always'}#${cap}#${nextUidSeq(state)}`, kind: 'rule', rule });
              events.push({
                type: 'STATUS_OVERRIDDEN', side: t.side,
                target: { kind: 'hand', index: t.index }, ...(statusId ? { statusId } : {}), cap: rule.cap, value,
              });
            }
          }
        }
        break;
      }
      case 'self_to_hand': {
        // 阵亡后**重建于手牌**（ADR-141，孟获「蛮王」）
        //
        // 为什么不能直接用 `return_to_hand`：那个按**场上坐标**找目标，而亡语触发时单位
        // 已经被 `killUnit` 移出战场（`setUnit(null)` 排在 `onDeathResolver` 之前），
        // 所以它永远找不到"自己"。这里不碰战场 —— 直接用亡语 ctx 里带着的**阵亡单位对象**
        //（`ctx.source`）把这张卡**重新造一份手牌**，就是"消失之后再在手里重建"。
        //
        // 次数与累计惩罚记在 `state.recalls[cardId]`（按卡计数，孟获同名唯一）：
        // 放 state 而不是手牌 mod，因为"第几次收回"必须跨「手牌 ↔ 战场」存活 ——
        // 单位在场上时手牌 mod 已经不存在了。
        //
        //   第 n 次收回 → 费用 −(n × value)、生命上限 −(n × health)（缺省每次 −1）
        //   超过 `count` 次（缺省 6）→ 按 `overflow`：`'enemy'`（缺省）转给对手手牌，
        //                              `'none'` 不再重建（正常进弃牌堆）
        const dead = ctx.source;
        const def = dead ? cards.get(dead.cardId) : undefined;
        if (!def) break;
        const maxTimes = eff.count ?? 6;
        const n = (state.recalls?.[def.id] ?? 0) + 1;
        state.recalls = state.recalls ?? {};
        state.recalls[def.id] = n;
        const exceeded = n > maxTimes;
        const overflow = eff.overflow ?? 'enemy';
        if (exceeded && overflow === 'none') break;
        const toSide: Side = exceeded ? other(ctx.side)
          : eff.target?.side === 'enemy' ? other(ctx.side) : ctx.side;
        // 累计值（而不是每次叠一层 mod）：重建时按"第 n 次"一次性写全，手牌上永远只有一条修正
        const costDelta = (eff.value ?? -1) * n;
        const healthDelta = (eff.health ?? -1) * n;
        const mods: HandMod[] = [];
        if (costDelta) mods.push({ id: `recallcost#${def.id}#${n}`, kind: 'cost', value: costDelta });
        if (healthDelta) mods.push({ id: `recallhp#${def.id}#${n}`, kind: 'health', value: healthDelta });
        state.sides[toSide].hand.push({ card: def, mods });
        events.push({
          type: 'CARD_REBUILT_IN_HAND', side: toSide, card: def, times: n, exceeded, costDelta, healthDelta,
        });
        break;
      }
      case 'clash': {
        // 拼点（ADR-033/034）：双方各掷点，结果写入 flags 供后续 condition 判定
        //   mode: 'roll' —— 各掷 1–6；mode: 'cost' —— 比统率值（同值则掷点决胜）
        const foe = eff.target?.side === 'self' || eff.target?.side === 'ally'
          ? ctx.side : other(ctx.side);
        const mine = ctx.source?.cost ?? 0;
        const his = topCost(state, foe);
        const mode = eff.clashMode ?? 'roll';
        const a = mode === 'cost' ? mine : rng.int(6) + 1;
        const b = mode === 'cost' ? his : rng.int(6) + 1;
        const win = mode === 'cost' && a !== b ? a > b : a >= b;
        ctx.flags = ctx.flags ?? [];
        ctx.flags.push(win ? 'clash_won' : 'clash_lost');
        events.push({ type: 'CLASH', side: ctx.side, mine: a, theirs: b, won: win });
        break;
      }
      case 'cost_modifier': {
        // 手牌费用修正（ADR-038）：作用于 zone:'hand' 选出的手牌
        const value = eff.value ?? 0;
        const turns = typeof eff.duration === 'number' ? eff.duration
          : eff.duration === 'this_turn' ? 1 : undefined;
        for (const t of targets) {
          if (t.kind !== 'hand') continue;
          const hc = state.sides[t.side].hand[t.index];
          if (!hc) continue;
          hc.mods.push({ id: `cost#${nextUidSeq(state)}`, kind: 'cost', value, turns, auraId: ctx.auraId });
          events.push({ type: 'HAND_MODIFIED', side: t.side, index: t.index, kind: 'cost', value, turns });
        }
        break;
      }
      case 'grant_hand': {
        const list = targets.length ? targets : chosenFor(eff.target);
        for (const t of list) {
          if (t.kind !== 'hand') continue;
          const hc = state.sides[t.side].hand[t.index];
          if (!hc) continue;
          hc.card = {
            ...hc.card,
            ...(eff.hand_attack !== undefined ? { attack: (hc.card.attack ?? 0) + eff.hand_attack } : {}),
            ...(eff.hand_health !== undefined ? { health: (hc.card.health ?? 0) + eff.hand_health } : {}),
            ...(eff.hand_skill ? { skills: [...(hc.card.skills ?? []), structuredClone(eff.hand_skill)] } : {}),
          };
          if (eff.value) hc.mods.push({ id: `cost#${nextUidSeq(state)}`, kind: 'cost', value: eff.value });
          events.push({ type: 'HAND_MODIFIED', side: t.side, index: t.index, kind: 'cost', value: eff.value });
        }
        break;
      }
      case 'ban_play': {
        // 禁止上场（ADR-038）：被禁的手牌无法打出，直到到期
        const turns = typeof eff.duration === 'number' ? eff.duration
          : eff.duration === 'this_turn' ? 1 : undefined;
        for (const t of targets) {
          if (t.kind !== 'hand') continue;
          const hc = state.sides[t.side].hand[t.index];
          if (!hc) continue;
          hc.mods.push({ id: `ban#${nextUidSeq(state)}`, kind: 'ban', turns, auraId: ctx.auraId });
          events.push({ type: 'HAND_MODIFIED', side: t.side, index: t.index, kind: 'ban', turns });
        }
        break;
      }
      case 'steal_card': {
        if (eff.from_deck === 'top') {
          const from = other(ctx.side);
          for (let i = 0; i < (eff.count ?? 1); i++) {
            const id = state.sides[from].deck.pop();
            if (!id) break;
            const card = cards.get(id);
            if (!card) continue;
            state.sides[ctx.side].hand.push({ card, mods: [] });
            events.push({ type: 'CARD_STOLEN', from, to: ctx.side, card });
          }
          break;
        }
        // 夺取手牌（ADR-038）：从目标方手牌随机取一张，收进己方手牌或强制上场
        const from: Side = eff.target?.side === 'self' || eff.target?.side === 'ally'
          ? ctx.side : other(ctx.side);
        const n = eff.count ?? 1;
        for (let i = 0; i < n && state.sides[from].hand.length; i++) {
          const idx = rng.int(state.sides[from].hand.length);
          const [hc] = state.sides[from].hand.splice(idx, 1);
          if (!hc) continue;
          const def = hc.card;
          const isChar = ['troop', 'general', 'strategist', 'machine'].includes(def.type);
          if (eff.to === 'board' && isChar) {
            // 强制上场：放到己方随机空格
            const empties: Array<{ row: 'front' | 'back'; col: number }> = [];
            for (const r of BOARD.ROWS) {
              for (let c = 0; c < BOARD.COLS; c++) {
                if (!state.sides[ctx.side].rows[r][c]) empties.push({ row: r, col: c });
              }
            }
            if (empties.length) {
              const slot = empties[rng.int(empties.length)]!;
              const u = makeUnit(def, state.turn, nextUidSeq(state));
              setUnit(state, ctx.side, slot.row, slot.col, u);
              events.push({ type: 'UNIT_SUMMONED', side: ctx.side, row: slot.row, col: slot.col, unit: u });
              continue;
            }
          }
          state.sides[ctx.side].hand.push({ card: def, mods: [] });
          events.push({ type: 'CARD_STOLEN', from, to: ctx.side, card: def });
        }
        break;
      }
      case 'transform': {
        // 进化（ADR-042）：把目标单位换成另一张卡的定义，保留伤害/状态/攻击次数
        const toId = String(eff.to ?? '');
        const toCard = cards.get(toId);
        if (!toCard) {
          // 不静默失败：进化目标卡必须存在于卡表（数据错误要能看见）
          events.push({ type: 'REJECTED', reason: `进化目标卡不存在：${toId}` } as never);
          break;
        }
        for (const t of targets) {
          if (t.kind !== 'unit') continue;
          const u = getUnit(state, t.side, t.row, t.col);
          if (!u) continue;
          const fromId = u.cardId;
          const taken = u.maxHp - u.hp;                    // 已受伤害，进化后保留
          u.cardId = toCard.id;
          u.name = toCard.name;
          u.baseAtk = toCard.attack ?? 0;
          u.baseMaxHp = toCard.health ?? 1;
          u.kw = [...(toCard.keywords ?? [])];             // 关键词替换
          u.skills = toCard.skills ? structuredClone(toCard.skills) : undefined;
          u.troopKind = toCard.troopKind;
          applyMods(u);
          u.hp = Math.max(1, u.maxHp - taken);             // 保留伤害（不白送治疗）
          // 攻击次数不重置：attackedThisTurn 保持原值
          events.push({ type: 'UNIT_TRANSFORMED', side: t.side, row: t.row, col: t.col,
                        from: fromId, to: toCard.id, unit: u });
        }
        break;
      }
      case 'survive': {
        // 免死（ADR-039）：把单位从濒死抬回 1 血（由 killUnit 在致命伤害时调用）
        for (const t of targets) {
          if (t.kind !== 'unit') continue;
          const u = getUnit(state, t.side, t.row, t.col);
          if (!u) continue;
          u.hp = 1;
          events.push({ type: 'UNIT_SURVIVED', side: t.side, row: t.row, col: t.col, unit: u });
        }
        break;
      }
      case 'extra_attack': {
        // 额外行动（ADR-041）：重置攻击次数，允许本回合再攻击一次
        for (const t of targets) {
          if (t.kind !== 'unit') continue;
          const u = getUnit(state, t.side, t.row, t.col);
          if (!u) continue;
          u.attackedThisTurn = Math.max(0, u.attackedThisTurn - 1);
          events.push({ type: 'EXTRA_ATTACK', side: t.side, row: t.row, col: t.col });
        }
        break;
      }
      case 'take_control': {
        // 控制权转移（ADR-041）：把目标单位移到己方随机空格，turns 后归还
        const backSide: Side = eff.target?.side === 'self' || eff.target?.side === 'ally'
          ? ctx.side : other(ctx.side);
        for (const t of targets) {
          if (t.kind !== 'unit') continue;
          const u = getUnit(state, t.side, t.row, t.col);
          if (!u) continue;
          const empties: Array<{ row: Row; col: number }> = [];
          for (const r of BOARD.ROWS) {
            for (let c = 0; c < BOARD.COLS; c++) if (!state.sides[ctx.side].rows[r][c]) empties.push({ row: r, col: c });
          }
          if (!empties.length) continue;
          state.sides[t.side].rows[t.row][t.col] = null;
          const slot = empties[rng.int(empties.length)]!;
          setUnit(state, ctx.side, slot.row, slot.col, u);
          events.push({ type: 'CONTROL_TAKEN', from: backSide, to: ctx.side, unit: u });
        }
        break;
      }
      case 'cast_random': {
        // 从卡池随机取 N 张直接释放（ADR-162，庞统「连环」）。
        // ⚠️ 全程**只读** `cards`：不碰手牌、不碰牌库、不付统率、不进弃牌堆。
        const pool = [...cards.values()].filter((c) => inCastPool(c, eff.pool));
        if (!pool.length) break;
        const n = eff.count ?? 1;
        for (let i = 0; i < n; i++) {
          const card = pool[rng.int(pool.length)];
          if (!card) continue;
          // 复用现成事件（ADR-050），UI 据此播"这张卡被释放了"的动画
          events.push({ type: 'CARD_AUTO_CAST', side: ctx.side, card });
          // 需要指定目标的一律随机；来源仍挂施法单位，故伤害/击杀归属正确
          const effs = forceRandomTargets(cardCastEffects(card, rng));
          runEffects(state, cards, effs, { side: ctx.side, source: ctx.source }, rng, events);
        }
        break;
      }
      case 'copy_skill': {
        // 复制技能（ADR-041）：把目标单位的一个技能复制给来源单位
        // ADR-071：目标也可以是**手牌**（陆抗「谦冲如常」写的是「手里或场上友方将领」）——
        // 手牌不是 Unit，技能挂在 `card.skills` 上，取值路径不同。
        const src = ctx.source;
        if (!src) break;
        for (const t of targets) {
          const unit = t.kind === 'unit' ? getUnit(state, t.side, t.row, t.col) : null;
          const hc = t.kind === 'hand' ? state.sides[t.side].hand[t.index] : null;
          const skills = unit?.skills ?? hc?.card.skills;
          const ownerName = unit?.name ?? hc?.card.name;
          if (!skills?.length || !ownerName) continue;
          const sk = skills.find((x) => x.kind === 'active') ?? skills[0];
          if (!sk) continue;
          src.skills = src.skills ?? [];
          if (!src.skills.some((x) => x.id === sk.id)) {
            src.skills.push(structuredClone(sk));
            events.push({ type: 'SKILL_COPIED', side: ctx.side, from: ownerName, skill: sk.name });
          }
        }
        break;
      }
      case 'force_attack': {
        // 强制攻击（ADR-041 / ADR-087）：令目标单位**真的打一次**。
        //
        // 走 resolveAttack（与普攻、张苞「父子将风」同一条结算路径），于是反击、圣盾、
        // 饮血、攻击时触发技、阵亡移除全部自动与普攻一致。
        //
        // 原实现只是「对挨打方 dealDamage 一下」：**没有反击、不走阵亡移除**，
        // 于是草船借箭变成"敌方白打我一下"，而且被强制者永远死不了 ——
        // 「敌方每阵亡一个武将，己方抽取两张卡」这条永远触发不了。
        //
        //   attack_side（缺省 'own'）= 打自己人（混乱内讧）；'foe' = 打施法方
        //   victim_mode（缺省 'random'）；'highest_health' 见草船借箭「血量最高单位」
        const toFoe = eff.attack_side === 'foe';
        for (const t of targets) {
          if (t.kind !== 'unit') continue;
          const u = getUnit(state, t.side, t.row, t.col);
          if (!u || u.hp <= 0) continue;
          const targetSide: Side = toFoe ? other(t.side) : t.side;
          const pool = allUnits(state, targetSide)
            .filter((x) => x.unit.hp > 0 && x.unit.uid !== u.uid);      // 内讧不该打自己
          if (!pool.length) continue;
          const victim = eff.victim_mode === 'highest_health'
            ? pool.reduce((a, b) => (b.unit.hp > a.unit.hp ? b : a))
            : pool[rng.int(pool.length)]!;
          events.push({ type: 'FORCED_ATTACK', side: t.side, row: t.row, col: t.col });
          // consumeAttack: false —— 被强制不是"用掉了自己的攻击机会"，但这回合算行动过
          resolveAttack(state, cards, t.side, { row: t.row, col: t.col },
            { kind: 'unit', row: victim.row, col: victim.col }, events, rng,
            { consumeAttack: false, toSide: targetSide });
        }
        break;
      }
      case 'duel': {
        // 决斗：来源单位与所选敌方单位各进行一次真实普攻。
        // 不消耗双方本回合普通攻击次数；这是主动技额外产生的即时交战。
        const source = ctx.source;
        if (!source) break;
        const sourcePos = findPos(state, ctx.side, source.uid);
        if (!sourcePos) break;
        for (const t of targets.length ? targets : chosenFor(eff.target)) {
          if (t.kind !== 'unit' || t.side === ctx.side) continue;
          const foe = getUnit(state, t.side, t.row, t.col);
          if (!foe || foe.hp <= 0) continue;
          events.push({ type: 'FORCED_ATTACK', side: ctx.side, row: sourcePos.row, col: sourcePos.col });
          resolveAttack(state, cards, ctx.side, sourcePos,
            { kind: 'unit', row: t.row, col: t.col }, events, rng,
            { consumeAttack: false, toSide: t.side });

          const sourceAfter = getUnit(state, ctx.side, sourcePos.row, sourcePos.col);
          const foeAfter = getUnit(state, t.side, t.row, t.col);
          if (!sourceAfter || sourceAfter.hp <= 0 || !foeAfter || foeAfter.hp <= 0) continue;
          events.push({ type: 'FORCED_ATTACK', side: t.side, row: t.row, col: t.col });
          resolveAttack(state, cards, t.side, { row: t.row, col: t.col },
            { kind: 'unit', row: sourcePos.row, col: sourcePos.col }, events, rng,
            { consumeAttack: false, toSide: ctx.side });
        }
        break;
      }
      case 'flip': {
        // 翻面（ADR-059）：当回合不能行动、不能被指定为目标；下个回合开始翻回正面
        for (const t of targets) {
          if (t.kind !== 'unit') continue;
          applyStatus(state, t, 'fan_mian', 1, events);
          const u = getUnit(state, t.side, t.row, t.col);
          if (u) events.push({ type: 'UNIT_FLIPPED', side: t.side, row: t.row, col: t.col, to: 'back', unit: u });
        }
        break;
      }
      case 'scry': {
        // 卡池操作（ADR-036）：查看/移动牌库顶或底的牌
        const who: Side = eff.target?.side === 'self' || eff.target?.side === 'ally'
          ? ctx.side : other(ctx.side);
        const deck = state.sides[who].deck;
        const n = eff.count ?? 1;
        const fromTop = (eff.from ?? 'top') === 'top';
        for (let i = 0; i < n && deck.length; i++) {
          const id = fromTop ? deck.shift()! : deck.pop()!;
          if (eff.to === 'deck_bottom') deck.push(id);
          else if (eff.to === 'deck_top') deck.unshift(id);
          else { const def = cards.get(id); if (def) state.sides[who].hand.push({ card: def, mods: [] }); }
          events.push({ type: 'CARD_SCRYED', side: who, cardId: id, from: fromTop ? 'top' : 'bottom' });
        }
        break;
      }
      case 'apply_status': {
        // count > 1 时重复结算，且每次**重新解析目标**（与 damage 同构，ADR-056）。
        // 张角「五雷轰顶」需要「5 次雷击各 50% 概率震慑」——原先 count 被忽略，
        // 而估值公式（ADR-046）却已按次数计价，两边不一致，此处补齐。
        const times = eff.count ?? 1;
        // duration: 'until_next_turn' = 1 回合，但**施加当回合不递减**（ADR-089）
        const untilNext = eff.duration === 'until_next_turn';
        const untilFullHealth = eff.duration === 'until_full_health';
        const turns = typeof eff.duration === 'number' ? eff.duration
          : eff.duration === 'this_turn' || untilNext ? 1 : undefined;
        const srcUid = eff.status_source === 'self' ? ctx.source?.uid : undefined;
        for (let i = 0; i < times; i++) {
          const list = i === 0
            ? (targets.length ? targets : chosenFor(eff.target))
            : (eff.target ? resolveTargets(state, eff.target, ctx, rng) : chosenFor(eff.target));
          for (const t of list) {
            applyStatus(state, t, eff.status as string, eff.stacks ?? 1, events, turns, srcUid, ctx.auraId, untilNext, untilFullHealth);
            // 卡牌级标记的阵亡结算（ADR-087，草船借箭）：把"该结算什么"记在标记上
            if (eff.on_death?.length) {
              const bags = t.kind === 'unit'
                ? getUnit(state, t.side, t.row, t.col)?.statuses
                : t.kind === 'lord' ? state.sides[t.side].lord.statuses : undefined;
              const inst = bags?.[eff.status as string];
              if (inst) {
                inst.payoff = structuredClone(eff.on_death);
                inst.srcSide = ctx.side;
              }
            }
          }
        }
        break;
      }
      case 'remove_status': {
        // 驱散（ADR-066）：与 apply_status 同构 —— count 次结算，每次重新解析目标。
        // 省略 value/stacks = 移除该状态的全部层数（华佗「青囊」即此用法）。
        const times = eff.count ?? 1;
        for (let i = 0; i < times; i++) {
          const list = i === 0
            ? (targets.length ? targets : chosenFor(eff.target))
            : (eff.target ? resolveTargets(state, eff.target, ctx, rng) : chosenFor(eff.target));
          for (const t of list) {
            // 按**类别**批量驱散（ADR-071，华佗「青囊」的「清除其负面效果状态」）。
            // 只认具体状态 id 时得把 debuff 逐个列出来，漏一个就漏清一个。
            if (eff.remove_kind) {
              for (const id of statusIdsOfKind(state, t, eff.remove_kind)) {
                removeStatus(state, t, id, events, eff.stacks ?? eff.value ?? undefined);
              }
              continue;
            }
            removeStatus(state, t, eff.status as string, events, eff.stacks ?? eff.value ?? undefined);
          }
        }
        break;
      }
      case 'sacrifice': {
        // 牺牲己方单位并**记录它的血量**（ADR-071，程昱「审时度势」）：
        // 后续效果用既有的 `value_from_flag` 取用 —— flagVal 的优先级高于固定值，
        // 所以此刻写进 ctx.flags 就够，不必再给 DSL 加新的取值通道。
        //   sacrificed_max_hp —— 卡面写的「血量最大值」（治疗量）
        //   sacrificed_hp     —— 牺牲时的**当前**血量（伤害量；受过伤则更小）
        for (const t of (targets.length ? targets : chosenFor(eff.target))) {
          if (t.kind !== 'unit') continue;
          const u = getUnit(state, t.side, t.row, t.col);
          if (!u) continue;
          ctx.flags = ctx.flags ?? [];
          ctx.flags.push(`sacrificed_max_hp:${u.maxHp}`, `sacrificed_hp:${u.hp}`);
          killUnit(state, cards, { side: t.side, row: t.row, col: t.col, unit: u }, events);
          recomputeAuras(state, cards, rng, events);      // 第 19 步：死亡后光环重算
        }
        break;
      }
      case 'attack_each': {
        // 挨个发动**真正的普通攻击**（ADR-071，张苞「父子将风」）：
        // 目标集由技能自己的选择器给出（"攻 < 自己的敌方人物"），
        // 每次结算走 resolveAttack —— 反击、圣盾、饮血、奇袭全部与普攻一致。
        // 自己阵亡即停止，后续目标一点伤害都不吃。
        const src = ctx.source;
        if (!src) break;
        const pos = findPos(state, ctx.side, src.uid);
        if (!pos) break;
        const queue = targets.filter((t) => t.kind === 'unit');
        for (const t of queue) {
          if (state.winner) break;
          const cur = getUnit(state, ctx.side, pos.row, pos.col);
          if (!cur || cur.hp <= 0) break;                       // 自己阵亡 → 立刻停手
          if (!getUnit(state, t.side, t.row, t.col)) continue;  // 目标已被前一次攻击带走
          resolveAttack(state, cards, ctx.side, pos,
            { kind: 'unit', row: t.row, col: t.col }, events, rng, { consumeAttack: false });
        }
        break;
      }
      case 'mill': {
        // 弃掉目标方**牌库**的 N 张（ADR-074，司马懿「谋定后动」②"使敌方卡池随机丢弃一张"）。
        // 与 discard 的区别：discard 动的是**手牌**，mill 动的是还没抽到的牌。
        const who: Side = eff.target?.side === 'self' || eff.target?.side === 'ally'
          ? ctx.side : other(ctx.side);
        const deck = state.sides[who].deck;
        const n = dynVal ?? eff.count ?? 1;
        const fromDeck = eff.from_deck ?? 'random';
        for (let i = 0; i < n && deck.length; i++) {
          const at = fromDeck === 'top' ? deck.length - 1 : rng.int(deck.length);
          const [id] = deck.splice(at, 1);
          const def = id ? cards.get(id) : undefined;
          if (def) state.sides[who].discard.push(def);
          events.push({ type: 'CARD_MILLED', side: who, cardId: id ?? '', from: fromDeck });
        }
        break;
      }
      case 'draw_until': {
        // 一直抽，直到抽出一张**不是** `until_not_type` 的牌（ADR-071，姜维「文武双全」）。
        // 牌库耗尽时 drawCard 会走「粮尽」且**不发 CARD_DRAWN** → 循环自然结束（与粮尽交互正确）；
        // 「断抽」同理（只发 DRAW_BLOCKED）。上限只是防呆，正常永远走不到。
        const stopType = eff.until_not_type ?? 'tactic';
        for (let guard = 0; guard < 60; guard++) {
          if (state.winner) break;
          const mark = events.length;
          drawCard(state, cards, ctx.side, events, rng);
          const drawn = events.slice(mark).reverse()
            .find((e): e is Extract<GameEvent, { type: 'CARD_DRAWN' }> => e.type === 'CARD_DRAWN');
          if (!drawn) break;                                        // 粮尽 / 断抽
          if (!matchesCardType(drawn.card.type, stopType)) break;    // 抽到非该类牌 → 停
        }
        break;
      }
      case 'gain_armor':
        gainArmor(state, ctx.side, eff.value ?? 1, events);
        if (eff.duration === 'this_turn') {
          const lord = state.sides[ctx.side].lord;
          lord.temporaryArmor = (lord.temporaryArmor ?? 0) + (eff.value ?? 1);
        }
        break;
      case 'gain_command': {
        // 统率（gain_command）
        //
        // 缺省 = **本回合临时统率**：只动 `cur`，且**夹在本回合上限以内**
        //（回合开始时 `cur` 已经回满，所以"回合开始 +1"这种写法在缺省模式下**没有收益**）。
        //
        // `permanent: true` = **永久提升统率上限**（ADR-139，蒋琬「足食」）：
        // 同时抬 `max` 与 `cur`，上限封顶 `COMMAND.MAX`（10）。
        // 这是"每回合 +1 统率"这类成长型后勤技唯一能落地的写法。
        const cmd = state.sides[ctx.side].command;
        const delta = eff.value ?? 1;
        if (eff.permanent) {
          const before = cmd.max;
          cmd.max = Math.max(0, Math.min(COMMAND.MAX, cmd.max + delta));
          cmd.cur = Math.max(0, Math.min(cmd.max, cmd.cur + (cmd.max - before)));
          events.push({ type: 'COMMAND_MAX_CHANGED', side: ctx.side, max: cmd.max, delta: cmd.max - before });
        } else {
          cmd.cur = Math.min(cmd.max, cmd.cur + delta);
        }
        break;
      }
      case 'destroy': {
        const list = targets.length ? targets : chosenFor(eff.target);
        for (const t of list) {
          if (t.kind === 'unit') {
            dealDamage(state, cards, t, 9999, events, '摧毁');
          }
        }
        break;
      }
      case 'replace_lord': {
        const side = ctx.side;
        const old = state.sides[side].lord;
        const purgeTag = eff.purge_tag;
        if (purgeTag) {
          for (const r of BOARD.ROWS) {
            for (let c = 0; c < BOARD.COLS; c++) {
              const u = state.sides[side].rows[r][c];
              if (u && u.tags.includes(purgeTag)) {
                state.sides[side].rows[r][c] = null;
                events.push({ type: 'UNIT_REMOVED', side, row: r, col: c, unit: u, reason: 'replace_lord' });
              }
            }
          }
          state.sides[side].hand = state.sides[side].hand.filter((hc) => !(hc.card.tags ?? []).includes(purgeTag));
          state.sides[side].deck = state.sides[side].deck.filter((id) => !(cards.get(id)?.tags ?? []).includes(purgeTag));
        }
        if (ctx.source) {
          for (const r of BOARD.ROWS) {
            const c = state.sides[side].rows[r].findIndex((u) => u?.uid === ctx.source!.uid);
            if (c >= 0) {
              state.sides[side].rows[r][c] = null;
              events.push({ type: 'UNIT_REMOVED', side, row: r, col: c, unit: ctx.source, reason: 'replace_lord' });
            }
          }
        }
        const nextSkill = eff.lord_skill_def ? structuredClone(eff.lord_skill_def) : undefined;
        state.sides[side].lord = {
          id: eff.lord_id ?? ctx.source?.cardId ?? old.id,
          name: eff.lord_name ?? ctx.source?.name ?? old.name,
          faction: eff.lord_faction ?? old.faction,
          hp: old.hp,
          maxHp: old.maxHp,
          armor: 0,
          skill: nextSkill?.name ?? old.skill,
          skillDef: nextSkill,
          skillUsedThisTurn: false,
          statuses: {},
        };
        events.push({ type: 'LORD_REPLACED', side, from: old.id, to: state.sides[side].lord.id, name: state.sides[side].lord.name });
        break;
      }
      case 'modify': {
        const list = targets.length ? targets : chosenFor(eff.target);
        for (const t of list) {
          if (t.kind === 'lord' && eff.duration === 'this_turn') {
            const lord = state.sides[t.side].lord;
            lord.attackThisTurn = Math.max(0, (lord.attackThisTurn ?? 0) + (eff.attack ?? 0));
            events.push({ type: 'LORD_ATTACK_GAINED', side: t.side, attack: lord.attackThisTurn });
            continue;
          }
          if (t.kind === 'hand') {
            // 手牌数值修正（ADR-141）：`modify` 也能作用于**手牌**
            //（孟获「蛮王」＝手牌里的蛮族人物 +2/+2）。
            // 手牌没有派生属性可改，所以写成 HandMod，等这张牌**被打出时**
            // 由 `engine.playCard` 一次性结算到上场的单位身上
            //（与 `cost_modifier` 作用于手牌是同一套约定，光环施加的同样带 auraId、重算先清后加）。
            const hc2 = state.sides[t.side].hand[t.index];
            if (!hc2) continue;
            const dAtk2 = dynAtk ?? eff.attack ?? 0;
            const dHp2 = dynHp ?? eff.health ?? 0;
            if (dAtk2) {
              hc2.mods.push({ id: `handatk#${nextUidSeq(state)}`, kind: 'attack', value: dAtk2, auraId: ctx.auraId });
            }
            if (dHp2) {
              hc2.mods.push({ id: `handhp#${nextUidSeq(state)}`, kind: 'health', value: dHp2, auraId: ctx.auraId });
            }
            if (ctx.auraId === undefined && (dAtk2 || dHp2)) {
              events.push({ type: 'HAND_MODIFIED', side: t.side, index: t.index, kind: dAtk2 ? 'attack' : 'health', value: dAtk2 || dHp2 });
            }
            continue;
          }
          if (t.kind !== 'unit') continue;
          const u = getUnit(state, t.side, t.row, t.col);
          if (!u) continue;
          // modify：attack / health 可单独指定（ADR-030）；都没给则退回 value 同时加
          const dAtk = dynAtk ?? (eff.value_from_discarded ? discardVal : undefined)
            ?? eff.attack ?? (eff.health === undefined ? eff.value : 0) ?? 0;
          const dHp = dynHp ?? eff.health ?? (eff.attack === undefined ? eff.value : 0) ?? 0;
          if (!dAtk && !dHp) continue;

          // 光环模式（ADR-037）：写入修正层，由重算统一生效，不在此处直接改数值
          if (ctx.auraId) {
            u.mods.push({ id: ctx.auraId, kind: 'aura',
                          attack: dAtk || undefined, health: dHp || undefined });
            continue;
          }

          // 普通模式：写入修正层后立即重算
          const turns = typeof eff.duration === 'number' ? eff.duration
            : eff.duration === 'this_turn' ? 1 : undefined;
          const expiresAtHalfTurn = eff.duration === 'until_enemy_turn_end' ? state.halfTurn + 1 : undefined;
          u.mods.push({
            id: `mod#${nextUidSeq(state)}`,
            kind: turns === undefined && expiresAtHalfTurn === undefined ? 'permanent' : 'temp',
            attack: dAtk || undefined, health: dHp || undefined, turns, expiresAtHalfTurn,
          });
          applyMods(u);
          events.push({ type: 'STAT_MODIFIED', side: t.side, row: t.row, col: t.col,
                        attack: dAtk || undefined, health: dHp || undefined,
                        duration: eff.duration });
        }
        break;
      }
      default:
        // 未实现的动作：记录但不崩溃（校验器会告警）
        break;
    }
  }
}
