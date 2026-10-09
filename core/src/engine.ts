function useLordSkill(
  state: MatchState, ctx: EngineContext,
  action: Extract<Action, { type: 'USE_LORD_SKILL' }>,
  events: GameEvent[], rng: ReturnType<typeof createRng>,
): boolean {
  const side = state.active;
  const lord = state.sides[side].lord;
  // 门控统一在 rules.canUseLordSkill（ADR-086）——AI 与引擎共用，不可能再漂移
  const gate = canUseLordSkill(state, side);
  if (!gate.ok || !gate.skill) return false;
  const skill = gate.skill;

  const cost = skill.cost ?? LORD_SKILL_COST;
  const target: TargetRef | undefined = action.target
    ? action.target.row !== undefined
      ? unitRef(action.target.side, action.target.row, action.target.col as number)
      : lordRef(action.target.side)
    : undefined;

  state.sides[side].command.cur -= cost;
  // 有「参谋」加成时先消耗加成次数，再消耗基础次数
  if (capStacks(lord.statuses, 'extra_lord_skill') > 0 && lord.skillUsedThisTurn) {
    const bonus = Object.entries(lord.statuses ?? {})
      .find(([id, st]) => st.stacks > 0 && STATUSES[id]?.caps?.includes('extra_lord_skill'));
    if (bonus) bonus[1].stacks -= 1;
  } else {
    lord.skillUsedThisTurn = true;
  }
  events.push({ type: 'LORD_SKILL_USED', side, skill: lord.skill });
  emitSkillTriggered(state, side, null, skill, 'lord_skill', events);
  // 抉择（ADR-071）：主公技同样支持 modes
  runEffects(state, ctx.cards, effectsOf(skill, action.modeIndex),
             { side, chosen: target, handIndex: action.handIndex, modeIndex: action.modeIndex }, rng, events);
  // 主公技结算完成后，触发己方单位的「辅政」等联动技能。
  runTriggerSkills(state, ctx.cards, side, 'on_lord_skill_used', rng, events);
  return true;
}

/**
 * 引擎主循环：applyAction
 *
 * 这是 core 唯一的写入口。客户端与服务器都调用它，拿到 { state, events }。
 * 客户端只消费 events 播放动画；服务器用同一个引擎做权威裁决。
 */

import { COMMAND, LORD_SKILL_COST, MATCH, STATUSES, TIMING } from './constants.ts';
import { createRng } from './rng.ts';
import {
  capStacks,
  lordStatusStacks,
  allUnits, cloneState, getUnit, hasTrait, isBasicTroop, makeUnit, nextUidSeq, other, setUnit, statusStacks,
  upgradeProgress,
} from './state.ts';
import { applyMods } from './state.ts';
import {
  canPlayCard, canUseLordSkill, canUseUnitSkill, legalTargets, lordAttackTargets, effectiveAttack,
} from './rules.ts';
import {
  dealDamage, discardOverflow, drawCard, effectiveCost, expireHandMods, expireMods, expireStatuses, killUnit,
  gainArmor, isBanned, lordRef,
  resolveTurnEndStatuses, resolveTurnStartDamage, resolveTurnStartStatuses, unitRef, type TargetRef,
} from './mutate.ts';
import {
  costRuleDelta, effectsOf, emitSkillTriggered, recomputeAuras, resolveAttack, resolveTargets,
  resolveDrawTrigger,
  runCardPlayedTriggers, runEffects, runTriggerSkills, runUnitTrigger, runMarkDamaged,
} from './effects.ts';
import type {
  Action, ApplyResult, CardDef, CardEffect, EngineContext, GameEvent, MatchState, Row, Side,
  TargetSelector, Unit,
} from './types.ts';

/** 开局：创建对局后调用一次，进入第一回合 */
export function startMatch(state: MatchState, ctx: EngineContext): ApplyResult {
  const events: GameEvent[] = [];
  const next = cloneState(state);
  const rng = createRng(next.rngState);
  startTurn(next, ctx, events, rng);
  next.rngState = rng.getState();
  return { ok: true, state: next, events };
}

/** 唯一写入口 */
export function applyAction(state: MatchState, ctx: EngineContext, action: Action): ApplyResult {
  if (state.winner) {
    return { ok: false, state, events: [{ type: 'REJECTED', reason: '对局已结束', action }], error: '对局已结束' };
  }
  const events: GameEvent[] = [];
  const next = cloneState(state);
  const rng = createRng(next.rngState);
  let ok = true;
  let error: string | undefined;

  try {
    if (next.pendingDiscover && action.type !== 'CHOOSE_DISCOVER') {
      throw new Error('请先选择发现的牌');
    }
    // ADR-144：结算中途的手牌选择同样是"必须先把这一步做完"的暂停点
    if (next.pendingHandChoice && action.type !== 'CHOOSE_HAND') {
      throw new Error('请先选择一张手牌');
    }
    switch (action.type) {
      case 'PLAY_CARD': ok = playCard(next, ctx, action, events, rng); break;
      case 'CHOOSE_DISCOVER': ok = chooseDiscover(next, ctx, action, events, rng); break;
      case 'CHOOSE_HAND': ok = chooseHand(next, ctx, action, events, rng); break;
      case 'UPGRADE_UNIT': ok = upgradeUnit(next, ctx, action, events, rng); break;
      case 'ATTACK': ok = attack(next, ctx, action, events, rng); break;
      case 'LORD_ATTACK': {
        const side = next.active;
        const to = action.to;
        if (!lordAttackTargets(next, side).targets.some(t => t.kind === to.kind &&
          (to.kind === 'lord' || (t.row === to.row && t.col === to.col)))) { ok = false; break; }
        const lord = next.sides[side].lord;
        lord.attackedThisTurn = true;
        const foe = other(side);
        const damage = lord.attackThisTurn ?? 0;
        const defender = to.kind === 'unit' ? getUnit(next, foe, to.row, to.col) : null;
        const retaliation = to.kind === 'unit' ? effectiveAttack(next, foe, to.row, to.col) : 0;
        events.push({ type: 'LORD_ATTACK_DECLARED', side, to });
        dealDamage(next, ctx.cards, to.kind === 'lord' ? lordRef(foe) : unitRef(foe, to.row, to.col),
          damage, events, lord.name, 0, undefined, undefined, 'physical', false, { side });
        if (defender && defender.hp > 0) {
          runUnitTrigger(next, ctx.cards, defender, 'on_damaged', rng, events);
          runMarkDamaged(next, ctx.cards, defender, damage, rng, events);
        }
        if (retaliation > 0) dealDamage(next, ctx.cards, lordRef(side), retaliation, events, '反击',
          0, undefined, defender ?? undefined, 'physical', false,
          to.kind === 'unit' ? { side: foe, row: to.row, col: to.col } : undefined);
        break;
      }
      case 'USE_LORD_SKILL': ok = useLordSkill(next, ctx, action, events, rng); break;
      case 'USE_SKILL': ok = useUnitSkill(next, ctx, action, events, rng); break;
      case 'END_TURN': endTurn(next, ctx, events, rng); break;
      default: ok = false;
    }
  } catch (e) {
    ok = false;
    error = (e as Error).message;
  }

  if (!ok) {
    error = error ?? '动作不合法';
    events.push({ type: 'REJECTED', reason: error, action });
    return { ok: false, state, events, error };
  }

  next.rngState = rng.getState();
  return { ok: true, state: next, events };
}

/**
 * 结算中途的**手牌**选择（ADR-144，杨仪「筹度粮谷」）
 *
 * 与 `chooseDiscover` 同构：挂起 → 引擎只接受这一个动作 → 结算并清除挂起。
 * 差别只在候选来自**手牌**而不是牌库，且 `indices` 可以限定"只能在这几张里选"
 *（杨仪的"抽二选一"就靠它把候选锁死在刚抽到的那两张）。
 */
function chooseHand(
  state: MatchState, ctx: EngineContext,
  action: Extract<Action, { type: 'CHOOSE_HAND' }>,
  events: GameEvent[], rng: ReturnType<typeof createRng>,
): boolean {
  const pending = state.pendingHandChoice;
  if (!pending || state.active !== pending.side) return false;
  const hand = state.sides[pending.side].hand;
  const i = action.handIndex;
  if (!(Number.isInteger(i) && i >= 0 && i < hand.length)) return false;
  if (pending.indices && !pending.indices.includes(i)) return false;
  const [chosen] = hand.splice(i, 1);
  if (!chosen) return false;
  delete state.pendingHandChoice;

  const s = state.sides[pending.side];
  if (pending.kind === 'deck_top') s.deck.push(chosen.card.id);          // 数组末尾 = 牌库顶
  else if (pending.kind === 'deck_bottom') s.deck.unshift(chosen.card.id); // 数组开头 = 牌库底
  else if (pending.kind === 'random') s.deck.splice(rng.int(s.deck.length + 1), 0, chosen.card.id);
  else s.discard.push(chosen.card);                                       // 'discard'：真弃掉

  events.push({ type: 'HAND_CHOSEN', side: pending.side, card: chosen.card, kind: pending.kind });
  return true;
}

function chooseDiscover(
  state: MatchState, ctx: EngineContext,
  action: Extract<Action, { type: 'CHOOSE_DISCOVER' }>,
  events: GameEvent[], rng: ReturnType<typeof createRng>,
): boolean {
  const pending = state.pendingDiscover;
    // 发现可能由亡语、受击等非当前行动方的触发技产生（例如郭嘉亡语）。
    // 发现的拥有方仍然是 pending.side，但不能要求它恰好是当前回合方，
    // 否则对方回合触发的发现会永远无法选择，且会卡住后续结算。
    if (!pending || !pending.candidates.includes(action.cardId)) return false;
  const index = state.sides[pending.side].deck.indexOf(action.cardId);
  if (index < 0) return false;
  const [id] = state.sides[pending.side].deck.splice(index, 1);
  const card = ctx.cards.get(id);
  if (!card) return false;
  delete state.pendingDiscover;
  events.push({ type: 'CARD_DISCOVERED', side: pending.side, card, costModifier: pending.costModifier, destination: pending.destination ?? 'hand' });
  // 发现到带“抽到时”技能的牌时，沿用抽牌触发规则；例如曹休会立即召唤。
  const auto = resolveDrawTrigger(state, ctx.cards, pending.side, card, events, rng);
  if (auto) {
    if (auto.discard) state.sides[pending.side].discard.push(card);
    events.push({ type: 'CARD_AUTO_CAST', side: pending.side, card });
    const continuation = state.pendingTriggerSkills;
    if (continuation) {
      runTriggerSkills(state, ctx.cards, continuation.side, continuation.trigger, rng, events);
    }
    return true;
  }
  if (pending.destination === 'deck_top') {
    // 抽牌使用 pop()，数组末尾才是实际牌库顶部。
    state.sides[pending.side].deck.push(card.id);
  } else {
    state.sides[pending.side].hand.push({
      card,
      mods: pending.costModifier ? [{ id: 'discover', kind: 'cost', value: pending.costModifier }] : [],
    });
    recomputeAuras(state, ctx.cards, rng, events);
  }
  const continuation = state.pendingTriggerSkills;
  if (continuation) {
    runTriggerSkills(state, ctx.cards, continuation.side, continuation.trigger, rng, events);
  }
  return true;
}

/**
 * 玩家确认的普通兵升变（BDSB v0.4）。
 *
 * 目标卡只从正式卡池解析，不检查牌库/手牌，也不消耗同名卡；这是形态转换，
 * 因此不触发目标卡的入场、战吼或亡语。与技能 DSL 的 `transform` 区分：
 * `transform` 保留伤害，`UPGRADE_UNIT` 按设计稿恢复为目标形态满血。
 */
function upgradeUnit(
  state: MatchState,
  ctx: EngineContext,
  action: Extract<Action, { type: 'UPGRADE_UNIT' }>,
  events: GameEvent[],
  rng: ReturnType<typeof createRng>,
): boolean {
  const side = state.active;
  const u = getUnit(state, side, action.row, action.col);
  const toCard = ctx.cards.get(action.toCardId);
  const status = upgradeStatus(state, ctx.cards, side, action.row, action.col);
  const option = status?.options.find((o) => o.card.id === toCard?.id);
  if (!u || !toCard || !status || !status.ready || !option) return false;

  // ADR-133：升变按**印刷费用差**收费。**费用差 = +1 档（d ≤ 1）叫「自然升级」——0 统率**；
  // **超出自然升级的部分，每多 1 费消耗当前回合主公 1 点统率**（即 `max(0, d − 1)`，
  // 唯一真源 `upgradeCommandCost`）。
  // 判定必须在**扣费与换形态之前**：统率不够 → 整个动作被拒绝，不扣统率、不换形态、
  // 也不派发新形态的战吼。这里用 throw 而不是 `return false`，是为了让 `applyAction`
  // 带回明确 reason（沿用 `canPlayCard` 的「统率值不足（需要 N，当前 M）」文案惯例）；
  // 抛错时 `next` 克隆被丢弃，返回的仍是**原状态**。
  //
  // 扣的数额直接取 `upgradeStatus()` 宣告的 `commandCost` —— 与 UI/AI 看到的是同一个数，
  // 两处不可能各写一份公式而漂移（同 `rules.canUseUnitSkill` 让 AI 与引擎共用判定的理由）。
  const commandCost = option.commandCost;
  const commandCur = state.sides[side].command.cur;
  if (commandCur < commandCost) {
    throw new Error(`统率值不足（升变需要 ${commandCost}，当前 ${commandCur}）`);
  }
  state.sides[side].command.cur -= commandCost;

  const from = u.cardId;
  u.cardId = toCard.id;
  u.name = toCard.name;
  u.type = toCard.type;
  u.faction = toCard.faction;
  u.cost = toCard.cost;
  u.baseAtk = toCard.attack ?? 0;
  u.baseMaxHp = toCard.health ?? 1;
  u.kw = [...(toCard.keywords ?? [])];
  u.tags = [...(toCard.tags ?? [])];
  u.skills = toCard.skills ? structuredClone(toCard.skills) : undefined;
  u.troopKind = toCard.troopKind;
  u.gender = toCard.gender;
  applyMods(u);
  u.hp = u.maxHp;
  // 升变目标可能带“无法攻击”等光环技能；形态替换后立即重算，避免新单位
  // 在本回合错误获得普通攻击能力。
  recomputeAuras(state, ctx.cards, rng, events);
  delete u.upgradeProgress;

  // 升变 = 换了一个形态**上场**，所以新形态的「战吼（on_play）」必须照样发动。
  //
  // 此前这里完全不派发 on_play —— 而**升变正是获得特种兵的主要途径**，
  // 于是宿卫虎士「虎士：上场获得披坚」在升变时永远拿不到披坚（卡面既不显示
  // 徽章也不显示光圈），只有"从手牌直接打出"才会触发 —— 玩家看到的是
  // "同一个兵，打出有免疫、升变没有"，无法理解。
  //
  // 注意：**不能**把这类技能改成 aura 来绕开 —— 光环每次重算都会重挂，
  // 披坚被消耗后会在下一次重算时被重新加上，等于永久免疫。
  const onPlay = (toCard.skills ?? []).filter((sk) => sk.trigger === 'on_play');
  // ADR-116：指向性战吼（如虎步军「越水」）需要玩家选目标。UI 会在升变前把选中的目标
  // 一并放进 action.target；没有传则退回 narrowByMode 的兜底（AI / 测试路径）。
  const upgradeChosen: TargetRef | undefined = action.target
    ? action.target.row !== undefined
      ? unitRef(action.target.side, action.target.row, action.target.col as number)
      : lordRef(action.target.side)
    : undefined;
  for (const sk of onPlay) {
    emitSkillTriggered(state, side, u, sk, 'on_play', events);
    // ADR-127：走 `effectsOf(sk, modeIndex)` 而不是 `sk.effects` —— 有「抉择（modes）」的战吼
    // 本身没有 effects，只写 modes；原先这里直接读 `sk.effects` → **抉择战吼在升变路径整个不执行**
    // （陷阵营「架盾／先攻」选了也白选），只有从手牌打出才会生效。
    runEffects(state, ctx.cards, effectsOf(sk, action.modeIndex),
      { side, source: u, chosen: upgradeChosen, chosenRow: action.row, chosenCol: action.col }, rng, events);
  }
  // 战吼可能挂了状态 / 改了属性 → 再重算一次光环，让卡面（含徽章与光圈）与状态一致。
  recomputeAuras(state, ctx.cards, rng, events);

  // ADR-127：**先攻的返还必须在「战吼」之后判定** —— 有些形态的先攻不是卡面关键词，
  // 而是升变时的**抉择战吼**用 `apply_status: xian_gong_status` 现授予的（陷阵营「陷阵」形态）。
  // 原先这段检查放在派发战吼**之前**，于是「升变选先攻」拿不到这次额外普攻 ——
  // 玩家看到的先攻是残缺的（同一个形态，打出来的能再打一次、升变来的不能）。
  // 语义不变：只返还一次，避免连击单位被错误地重置为完整攻击次数。
  if (hasTrait(u, 'xian_gong') && u.attackedThisTurn > 0) {
    u.attackedThisTurn -= 1;
  }

  events.push({ type: 'UNIT_UPGRADED', side, row: action.row, col: action.col, from, to: toCard.id, unit: u });
  return true;
}

/** 一个升变候选：目标卡 + 本次升变的统率费用（ADR-133） */
export interface UpgradeOption {
  /** 兼容旧 UI/测试直接读取候选 id；卡牌完整定义仍在 card 字段。 */
  id: string;
  /** 目标特种兵卡（只来自正式卡池，不要求放入本局卡组） */
  card: CardDef;
  /**
   * 本次升变要消耗的**当前回合统率**；`0` = 免费。
   *
   * 由 `upgradeCommandCost` 按两张卡的**印刷费用**算出（`max(0, d − 1)`），
   * 也是 `upgradeUnit` 实际扣除的那个数 —— 两处同源。
   *
   * `0` 就是设计者口中的「**自然升级**」（费用差 = +1 或更小）；UI 用
   * `commandCost === 0` 判断即可，**不另设布尔字段**。
   */
  commandCost: number;
  /** 以该方**当前**统率是否付得起；与 `ready`（进度条件）正交，**不要**混成一个字段 */
  affordable: boolean;
}

export interface UpgradeStatus {
  label: string;
  progress: string;
  /** 升变的**进度条件**（击杀 / 存活 / 命中…）是否满足；**不含**统率是否够（ADR-133） */
  ready: boolean;
  options: UpgradeOption[];
  /** 兼容旧 UI 的费用索引；实际扣费以 options[].commandCost 为唯一来源。 */
  costs: Record<string, number>;
}

/**
 * 升变的统率费用（ADR-133）—— **唯一真源**，UI / AI / 引擎都从这里取。
 *
 * 设 `d = 目标特种兵卡的 cost − 该单位当前卡的 cost`（一律取 `CardDef.cost` 的**印刷费用**，
 * 不看被效果改过的 `Unit.cost`），则设计者口径是：
 *
 *   · **费用差 = +1（`d ≤ 1`）＝「自然升级」：0 统率**，只要进度条件满足就能升；
 *   · **超出自然升级的部分，每多 1 费消耗当前回合主公 1 点统率**。
 *
 * 合起来就是
 *
 *     升变统率费用 = max(0, d − 1)
 *
 * 即 `d = 2`（比自然升级多 1 费）→ **1 统率**；`d = 3` → 2 统率……
 * **不硬编码任何数值、不按兵种写特例表** —— 基础兵或特种兵日后调费，规则自动自洽。
 *
 * `upgradeStatus()` 用它给出每个候选的 `commandCost`，`upgradeUnit()` 扣的就是那个数，
 * 所以"预览"与"实扣"不可能漂移（同 ADR-086 把主公技门控下沉到 `rules.canUseLordSkill` 的理由）。
 */
export function upgradeCommandCost(from: CardDef | undefined, to: CardDef): number {
  return Math.max(0, (to.cost ?? 0) - (from?.cost ?? 0) - 1);
}

/** 旧 API 兼容别名，统一采用 ADR-133 的自然升级费用公式。 */
export function upgradeCost(from: Pick<CardDef, 'cost'>, to: Pick<CardDef, 'cost'>): number {
  return Math.max(0, to.cost - from.cost - 1);
}

/** UI 与 AI 共用升变资格；不改变对局状态。 */
export function upgradeStatus(
  state: MatchState, cards: Map<string, CardDef>, side: Side, row: Row, col: number,
): UpgradeStatus | null {
  const u = getUnit(state, side, row, col);
  if (!u || !isBasicTroop(u)) return null;
  const p = u.upgradeProgress ?? { damage: 0, shieldSurvival: 0, basicKills: 0, characterKills: 0, heroHits: 0 };
  let label = '', progress = '', ready = false;
  switch (u.troopKind) {
    case 'infantry': label = '累计造成伤害'; progress = `${p.damage}/2`; ready = p.damage >= 2; break;
    case 'shield': label = '敌方回合结束时存活'; progress = `${p.shieldSurvival}/2`; ready = p.shieldSurvival >= 2; break;
    case 'cavalry': label = '击杀基础兵或人物'; progress = `${p.basicKills}/2 · ${p.characterKills}/1`; ready = p.basicKills >= 2 || p.characterKills >= 1; break;
    case 'archer': label = '命中武将、谋臣或主公'; progress = `${p.heroHits}/1`; ready = p.heroHits >= 1; break;
    default: return null;
  }
  const faction = state.sides[side].lord.faction;
  const commandCur = state.sides[side].command.cur;
  // 当前形态的印刷费用：取该单位**当前卡**的 CardDef（升变后就是上一个目标形态）。
  const fromCard = cards.get(u.cardId);
  const options: UpgradeOption[] = ready ? [...cards.values()].filter((c) => c.type === 'troop'
    && c.upgradeFrom === u.troopKind && c.troopKind === u.troopKind
    && c.id !== 'elite_xianzhen_dun'
    && (c.faction === faction || c.faction === 'qun' || c.faction === 'neutral')).map((card) => {
    const commandCost = upgradeCommandCost(fromCard, card);
    return { id: card.id, card, commandCost, affordable: commandCost <= commandCur };
  }) : [];
  const costs = Object.fromEntries(options.map((o) => [o.id, o.commandCost]));
  return { label, progress, ready, options, costs };
}

/* ============================================================
   出牌前的「要选什么」—— 判定下沉到 core，UI 不自己判断（BACKLOG §3）
   ============================================================ */

/** 一个需要玩家做的选择（写进 `PLAY_CARD.target` / `target2`） */
export interface PlayTargetChoice {
  /** 1 → `action.target`；2 → `action.target2`（ADR-071） */
  pick: 1 | 2;
  label: string;
  /**
   * 发起该选择的效果动作（`damage` / `heal` / `modify` / `apply_status`…）。
   *
   * ADR-086：AI 要靠它判断「这个选择该选敌人还是自己人」——
   * 只看 `label` 里的"敌方/己方"会被 `side: 'both'`（仁德、程昱）这类选择器骗到，
   * 而动作名是**语义真源**：damage/destroy 选敌人，heal/modify 选自己人。
   */
  action: string;
  /** 候选池实际覆盖的阵营（按池内目标去重），AI 用于兜底排序 */
  sides: Side[];
  /** 合法目标（场上 / 主将）。手牌类目标不在此列 —— UI 表达不了，交给引擎兜底 */
  targets: Array<{ kind: 'unit' | 'lord'; side: Side; row?: Row; col?: number }>;
  /** 候选池里还含手牌（`zone: 'both'`）→ UI 选不到，引擎会用兜底目标 */
  includesHand: boolean;
  /**
   * 这一步选的是**手牌**（ADR-146，华佗「青囊」＝先弃一张手牌再选回血目标）。
   *
   * `zone: 'hand'` 时 `targets` 必为空 —— 结果要写进 `PLAY_CARD.handIndex` /
   * `USE_SKILL.handIndex`，**不是** `target`。UI 见它应进入"点手牌"模式（不出箭头）。
   * 缺省 = 场上目标。注意 `pick` 只对场上步骤有意义。
   */
  zone?: 'hand';
}

export interface PlayTargetPlan {
  /** 抉择分支名（`modes`）：长度 > 1 时 UI 要先让玩家选一项，其下标即 `modeIndex` */
  modes: string[];
  /** 需要依次询问的选择；空 = 直接打出 */
  choices: PlayTargetChoice[];
}

const TYPE_CN: Record<string, string> = {
  troop: '兵种', general: '武将', strategist: '谋臣', character: '人物',
  event: '事件', tactic: '策略', elite: '精英', token: '衍生物',
};

function choiceLabel(t: TargetSelector): string {
  const who = t.lord ? '主帅'
    : (t.side === 'ally' || t.side === 'self' ? '己方' : t.side === 'enemy' ? '敌方' : '任意');
  const what = TYPE_CN[t.filter?.type ?? 'character'] ?? '人物';
  const gender = t.filter?.gender === 'male' ? '男性' : t.filter?.gender === 'female' ? '女性' : '';
  return who + gender + what;
}

/**
 * 这张牌打出前需要玩家选什么（战吼 / 卡级效果里的 `mode: 'choose'` 选择器）。
 *
 * 与 `canUseUnitSkill` 同样的思路：**判定放在 core**，原型 / 客户端 / AI 共用，
 * 免得 UI 各写一份"要不要选目标"的猜测（BACKLOG §3 明确要求）。
 *
 * 注意两点：
 *  · `modes` 需要玩家先选分支；`modeIndex` 缺省时按 `modes[0]` 枚举；
 *  · 枚举用的"来源单位"是**尚未入场**的卡的替身（只有 cost/atk），
 *    所以 `adjacent_to` 这类依赖站位的过滤会得到空集（当前没有战吼这样写）。
 */
export function playTargetPlan(
  state: MatchState, side: Side, card: CardDef, modeIndex?: number,
): PlayTargetPlan {
  const plan: PlayTargetPlan = { modes: [], choices: [] };
  const onPlay = (card.skills ?? []).filter((sk) => sk.trigger === 'on_play');
  for (const sk of onPlay) {
    if (sk.modes?.length) plan.modes = sk.modes.map((m, i) => m.name || `选项 ${i + 1}`);
    for (const eff of effectsOf(sk, modeIndex)) collect(eff);
  }
  // 非人物卡的卡级效果同样可能带 mode:'choose'（如指定一方）
  if (!['troop', 'general', 'strategist', 'machine'].includes(card.type)) {
    for (const eff of card.effects ?? []) collect(eff);
  }
  return plan;

  // 预览来源用**卡面数值**：`attack_below_source` / `cost_below_source` 这类过滤要靠它
  function collect(eff: CardEffect): void {
    const c = choiceOf(state, side, eff, { cost: card.cost, atk: card.attack ?? 0 });
    if (c && !plan.choices.some((x) => x.pick === c.pick)) plan.choices.push(c);
  }
}

/**
 * 枚举**一个 `mode:'choose'` 效果**的合法目标（ADR-077）
 *
 * 三种"要玩家点目标"的场景共用它：卡牌战吼（`playTargetPlan`）、
 * 主动技（`unitSkillTargetPlan`）、主公技（`lordSkillTargetPlan`）。
 *
 * 此前原型 UI 自己按 `selector.side` 枚举"该方所有单位"，**完全忽略 filter** ——
 * 于是貂蝉（只认男性）、陆抗（排除自己）这类带过滤的技能会高亮一堆非法目标，
 * 点了之后引擎又退回兜底目标，表现为"指向性技能的选择逻辑有问题，有些又没问题"
 * （没问题的那些恰好是 filter 为空、按 side 枚举就等于合法集的）。
 */
function choiceOf(
  state: MatchState, side: Side, eff: CardEffect,
  preview: { cost: number; atk: number },
): PlayTargetChoice | null {
  const t = eff.target;
  if (!t) return null;
  // "要不要玩家选"有两种写法，引擎自己就是两种都认（ADR-146）：
  //   · 选择器级 `target.mode: 'choose'` —— 绝大多数效果（damage/heal/modify…）
  //   · **效果级 `eff.mode: 'choose'`** —— `discard` / `cycle_to_deck` 这类"作用于一整方手牌"的动作
  //     （它们从 `ctx.handIndex` 取牌，模式写在动作上；华佗「青囊」的弃牌就是这种）
  if (t.mode !== 'choose' && eff.mode !== 'choose') return null;
  if (t.count === 'all' || (t.count ?? 1) !== 1) return null;
  const pick: 1 | 2 = t.pick === 2 ? 2 : 1;
  // 用 `count:'all'` 拿**整个候选池**（而不是 resolveTargets 的"取前 N 个"）
  const src = { uid: '#preview', cost: preview.cost, atk: preview.atk } as Unit;
  const pool = resolveTargets(state, { ...t, count: 'all', mode: 'first' },
    { side, source: src }, createRng(state.seed));
  const targets: PlayTargetChoice['targets'] = [];
  for (const r of pool) {
    if (r.kind === 'lord') targets.push({ kind: 'lord', side: r.side });
    else if (r.kind === 'unit') targets.push({ kind: 'unit', side: r.side, row: r.row, col: r.col });
  }
  const sides = [...new Set(pool.map((r) => r.side))];
  // 手牌步骤（ADR-146）：选择器直接指向手牌（`zone: 'hand'`）时，这一步就是"点一张手牌"。
  // 判据取**选择器**而不是池内容 —— 手牌为空时池是空的，若按池判定就会漏掉这一步。
  const byHand = t.zone === 'hand';
  return {
    pick, action: eff.action, sides, targets,
    label: choiceLabel(t),
    includesHand: byHand || pool.some((r) => r.kind === 'hand'),
    ...(byHand ? { zone: 'hand' as const } : {}),
  };
}

/** 主公技的预览来源：主公不参与普攻，cost/atk 取 0 即可 */
const LORD_PREVIEW = { cost: 0, atk: 0 };

/**
 * **主动技**需要玩家选什么（ADR-077）
 *
 * 与 `playTargetPlan` 同一套判定，UI 直接照它高亮即可 —— 不再自己按 side 猜。
 */
export function unitSkillTargetPlan(
  state: MatchState, side: Side, row: Row, col: number, modeIndex = 0, skillId?: string,
): PlayTargetPlan {
  const plan: PlayTargetPlan = { modes: [], choices: [] };
  const u = getUnit(state, side, row, col);
  if (!u) return plan;
  const sk = (u.skills ?? []).find((x) => x.kind === 'active' && (!skillId || x.id === skillId));
  if (!sk) return plan;
  if (sk.modes?.length) plan.modes = sk.modes.map((m, i) => m.name || `选项 ${i + 1}`);
  for (const eff of effectsOf(sk, modeIndex)) {
    const c = choiceOf(state, side, eff, { cost: u.cost, atk: u.atk });
    // ⚠️ 去重要**连 zone 一起比**：华佗「青囊」的"弃手牌"与"回血目标"都是 pick 1，
    //    只看 pick 会把前者吞掉（ADR-146）。
    if (c && !plan.choices.some((x) => x.pick === c.pick && x.zone === c.zone)) plan.choices.push(c);
  }
  return plan;
}

/** **主公技**需要玩家选什么（ADR-077） */
export function lordSkillTargetPlan(state: MatchState, side: Side, modeIndex = 0): PlayTargetPlan {
  const plan: PlayTargetPlan = { modes: [], choices: [] };
  const sk = state.sides[side].lord.skillDef;
  if (!sk) return plan;
  if (sk.modes?.length) plan.modes = sk.modes.map((m, i) => m.name || `选项 ${i + 1}`);
  for (const eff of effectsOf(sk, modeIndex)) {
    const c = choiceOf(state, side, eff, LORD_PREVIEW);
    if (c && !plan.choices.some((x) => x.pick === c.pick)) plan.choices.push(c);
  }
  return plan;
}

/* ============================================================
   回合流程
   ============================================================ */

function startTurn(state: MatchState, ctx: EngineContext, events: GameEvent[], rng: ReturnType<typeof createRng>): void {
  const side = state.active;
  // 第 0 步：**灼烧**（ADR-132）—— 该方回合的第一步，早于统率回满、抽牌与一切行动。
  // 位置刻意在最前面：伤害 = 层数、写在徽章上、完全可预期，所以"先烧后动"不构成零交互，
  // 玩家仍有一整个回合去净化 / 速杀 / 用这个单位去换掉对面（详见 GDD 10 §3.2.4）。
  resolveTurnStartDamage(state, ctx.cards, side, events);

  // 回合计数（ADR-064，设计者裁定）：**双方都行动完才算一个完整回合**。
  // halfTurn 每有一方开始行动就 +1；turn 只在完整回合推进时 +1，
  // 与统率值上限的增长严格同步（原先 turn 每半回合 +1，导致显示的第 N 回合
  // 与统率值的第 N 档对不上）。
  state.halfTurn += 1;
  const s = state.sides[side];

  // 第 1、3、5… 个半回合 = 新一轮完整回合的开始。
  // 第 1 个半回合属于开局的第 1 回合（已在 createMatch 里计过），故不再 +1。
  if (state.halfTurn % 2 === 1 && state.halfTurn > 1) {
    state.turn += 1;
    // 统率值增长（ADR-061）：完整回合结束后**双方一起** +1
    for (const sd of ['own', 'enemy'] as Side[]) {
      state.sides[sd].command.max = Math.min(COMMAND.MAX, state.sides[sd].command.max + 1);
    }
  }
  // 断粮：主公状态「断粮」按层数削减本回合统率上限（ADR-040）
  const duan = lordStatusStacks(s.lord, 'duan_liang');
  s.command.cur = Math.max(0, s.command.max - duan);
  s.lord.skillUsedThisTurn = false;
  for (const ref of allUnits(state, side)) {
    ref.unit.attackedThisTurn = 0;
    ref.unit.actedThisTurn = false;               // ADR-074：本回合行为标记
    ref.unit.dealtDamageThisTurn = false;
    ref.unit.skillUsesThisTurn = {};              // 主动技频率每回合重置（GDD 10 §1.1）
  }

  events.push({ type: 'TURN_START', side, turn: state.turn, halfTurn: state.halfTurn, command: { ...s.command } });

  drawCard(state, ctx.cards, side, events);
  // 后手补偿（ADR-053）：该方第 1 回合额外抽 1 张
  if (state.secondCompensation === 'extra_draw' && state.halfTurn === 2) {
    drawCard(state, ctx.cards, side, events);
  }
  // ADR-059：翻面的单位在**自己的回合开始时翻回正面并能行动**
  // （翻面 = 当回合不能行动 + 不能被指定为目标；下个回合开始即恢复）
  for (const ref of allUnits(state, side)) {
    if (ref.unit.statuses.fan_mian) {
      delete ref.unit.statuses.fan_mian;
      events.push({ type: 'UNIT_FLIPPED', side, row: ref.row, col: ref.col, to: 'front', unit: ref.unit });
    }
  }
  resolveTurnStartStatuses(state, ctx.cards, side, events);
  recomputeAuras(state, ctx.cards, rng, events);                              // 第 3 步 ②光环重算
  runTriggerSkills(state, ctx.cards, side, TIMING.TURN_START, rng, events);   // 第 3 步 ③回合开始技
  // 敌方回合开始触发技（宋谦「奋戟」等），在行动方完成回合初始化后结算。
  runTriggerSkills(state, ctx.cards, other(side), TIMING.ENEMY_TURN_START, rng, events);
}

/** 结算当前行动方的回合结束（第 20~23 步），**不**换手、不开始新回合 */
function finishTurn(state: MatchState, ctx: EngineContext, events: GameEvent[], rng: ReturnType<typeof createRng>): void {
  const side = state.active;
  resolveTurnEndStatuses(state, ctx.cards, side, events);                     // 第 20 步 ①中毒削上限 + 水困阶段 +1
  runTriggerSkills(state, ctx.cards, side, TIMING.TURN_END, rng, events);     // 第 20 步 ②回合结束技
  // 敌方回合结束时，触发我方单位的对应技能（例如陷阵营的每回合 +1/+1）。
  runTriggerSkills(state, ctx.cards, other(side), TIMING.ENEMY_TURN_END, rng, events);
  for (const ref of [...allUnits(state, side)]) {
    if (ref.unit.hp > 0 && Object.entries(ref.unit.statuses).some(([id, inst]) =>
      inst.stacks > 0 && STATUSES[id]?.caps?.includes('die_at_turn_end'))) {
      killUnit(state, ctx.cards, ref, events, null);
    }
  }
  // 盾兵在敌方回合结束时仍存活，记录一次独立升变进度。
  for (const ref of allUnits(state, other(side))) {
    if (ref.unit.troopKind === 'shield' && isBasicTroop(ref.unit) && ref.unit.hp > 0) {
      upgradeProgress(ref.unit).shieldSurvival += 1;
    }
  }
  expireStatuses(state, side, events);                                        // 第 21 步 清除临时效果
  expireMods(state, side);                                                     // 第 21 步 临时属性修正到期
  for (const sd of ['own', 'enemy'] as const) {
    const lord = state.sides[sd].lord;
    lord.armor = Math.max(0, lord.armor - (lord.temporaryArmor ?? 0));
    delete lord.temporaryArmor;
    delete lord.attackThisTurn;
    delete lord.attackedThisTurn;
  }
  expireHandMods(state, side);                                                 // 第 21 步 手牌修正到期
  recomputeAuras(state, ctx.cards, rng, events);                              // 第 21 步后重算
  const dropped = discardOverflow(state, side);
  dropped.forEach((c) => events.push({ type: 'CARD_PLAYED', side, card: c }));   // 弃牌也用同一事件，客户端可区分
  events.push({ type: 'TURN_END', side, turn: state.turn, halfTurn: state.halfTurn });
}

/** 该方身上是否有「跳过整个回合」的状态（ADR-074，休养生息）；有则消耗掉并返回 true */
function consumeSkipTurn(state: MatchState, events: GameEvent[]): boolean {
  const lord = state.sides[state.active].lord;
  const hit = Object.entries(lord.statuses ?? {})
    .find(([id, inst]) => inst.stacks > 0 && STATUSES[id]?.caps?.includes('skip_turn'));
  if (!hit) return false;
  delete lord.statuses![hit[0]];
  events.push({ type: 'LORD_STATUS_EXPIRED', side: state.active, status: hit[0] });
  events.push({ type: 'TURN_SKIPPED', side: state.active, reason: STATUSES[hit[0]]?.name ?? hit[0] });
  return true;
}

function endTurn(state: MatchState, ctx: EngineContext, events: GameEvent[], rng: ReturnType<typeof createRng>): void {
  finishTurn(state, ctx, events, rng);

  // ADR-054：不设回合上限、不判平局——对局只能由主将阵亡结束（粮尽保证必然收束）

  state.active = other(state.active);
  startTurn(state, ctx, events, rng);

  // 跳回合（ADR-074，休养生息「下一回合不进行任何活动」）：
  // 带 `skip_turn` 状态的一方，其回合刚开始就整个结束 —— 用循环而不是递归，
  // 并设上限防呆（双方同时带着该状态时不会无限套娃）。
  for (let guard = 0; guard < 4; guard++) {
    if (!consumeSkipTurn(state, events)) break;
    finishTurn(state, ctx, events, rng);
    state.active = other(state.active);
    startTurn(state, ctx, events, rng);
  }
}

/* ============================================================
   出牌
   ============================================================ */

function playCard(
  state: MatchState, ctx: EngineContext,
  action: Extract<Action, { type: 'PLAY_CARD' }>,
  events: GameEvent[], rng: ReturnType<typeof createRng>,
): boolean {
  const side = state.active;
  const s = state.sides[side];
  const hc = s.hand[action.cardIndex];
  if (!hc) return false;
  const playedRightmost = action.cardIndex === s.hand.length - 1;
  if (isBanned(hc)) return false;                 // 被禁止上场（ADR-038）
  const card = hc.card;
  const cost = effectiveCost(hc, costRuleDelta(state, card, side, rng));  // 费用 = 卡面 + cost_rule + mods

  const isCharacter = ['troop', 'general', 'strategist', 'machine'].includes(card.type);
  const slot = isCharacter ? { row: action.row as 'front' | 'back', col: action.col as number } : undefined;
  const check = canPlayCard(state, side, card, slot, cost);
  if (!check.ok) return false;

  s.command.cur -= cost;
  // ✅ 约定（ADR-139/144）：`PLAY_CARD.handIndex` 用的是**出牌后**的手牌下标 ——
  // 效果结算时这张牌已经离手。**调用方负责换算**：UI 在 `finishPlay` 里减 1（若点在打出的牌之后），
  // AI 在生成候选时同样按"出牌后"枚举。技能路径（USE_SKILL / 主公技）不动手牌，两套下标一致。
  s.hand.splice(action.cardIndex, 1);
  events.push({ type: 'CARD_PLAYED', side, card, row: slot?.row, col: slot?.col, handIndex: action.cardIndex });

  if (isCharacter && slot) {
    const u = makeUnit(card, state.turn, nextUidSeq(state));
    // 手牌数值修正（ADR-141）：打出时**一次性结算到单位身上**
    //   · 光环施加的（`auraId` 有值）在打出前已随 `recomputeAuras` 清掉，不会带进场 —— 符合预期：
    //     孟获在场上时手牌里的蛮族 +2/+2，打出去的瞬间孟获的光环就不再罩着它了；
    //   · 非光环的（如「蛮王」每次收回留下的 −1 费 / −1 血上限）是**永久代价**，要跟着进场。
    // 费用一侧不用在这里处理：`effectiveCost` 在算 `cost` 时已经把 cost mod 计进去了。
    const handAtk = hc.mods.filter((m) => m.kind === 'attack' && m.auraId === undefined)
      .reduce((sum, m) => sum + (m.value ?? 0), 0);
    const handHp = hc.mods.filter((m) => m.kind === 'health' && m.auraId === undefined)
      .reduce((sum, m) => sum + (m.value ?? 0), 0);
    if (handAtk) u.mods.push({ id: `handatk#${nextUidSeq(state)}`, kind: 'permanent', attack: handAtk });
    if (handHp) u.mods.push({ id: `handhp#${nextUidSeq(state)}`, kind: 'permanent', health: handHp });
    // 规则覆盖（ADR-142）：手牌上带的「某状态某档位按新值结算」跟着这张牌进场。
    // 例：兀突骨「藤甲统率」给手牌里的藤甲兵留下 {teng_jia, reduce_physical: 2} +
    //     {teng_jia, vulnerable_fire: 0}，这张牌打出后它的藤甲就是「物理 −2 且不怕火」。
    for (const m of hc.mods) {
      if (m.kind !== 'rule' || !m.rule || m.auraId !== undefined) continue;
      u.mods.push({ id: `rule#${nextUidSeq(state)}`, kind: 'rule', rule: m.rule });
    }
    if (handAtk || handHp) applyMods(u);          // maxHp 由 applyMods 夹在 ≥1
    setUnit(state, side, slot.row, slot.col, u);
    events.push({ type: 'UNIT_SUMMONED', side, row: slot.row, col: slot.col, unit: u });
    // 入场效果（战吼）
    const onPlay = (card.skills ?? []).filter((sk) => sk.trigger === 'on_play');
    // 战吼需要选目标时（如陈宫「忠烈」、蔡瑁「水攻」），把玩家选的目标作为 chosen 传入。
    // 此前完全没传 → mode:'choose' 只能退回"取第一个合法目标"，玩家无法真正选择。
    const chosen: TargetRef | undefined = action.target
      ? action.target.row !== undefined
        ? unitRef(action.target.side, action.target.row, action.target.col as number)
        : lordRef(action.target.side)
      : undefined;
    // 第二选择（ADR-071，程昱「审时度势」：牺牲谁 + 恢复谁）
    const chosen2: TargetRef | undefined = action.target2
      ? action.target2.row !== undefined
        ? unitRef(action.target2.side, action.target2.row, action.target2.col as number)
        : lordRef(action.target2.side)
      : undefined;
    for (const sk of onPlay) {
      emitSkillTriggered(state, side, u, sk, 'on_play', events);
      // 抉择（ADR-071）：给了 modes 就按 modeIndex 挑分支，否则用 effects
      // `handIndex`（ADR-139）：战吼里"由玩家挑一张手牌"的效果（如杨仪式弃/放回手牌）读它，
      // 与 USE_SKILL / USE_LORD_SKILL 同一套约定；缺省时效果自己退回随机。
      runEffects(state, ctx.cards, effectsOf(sk, action.modeIndex),
        { side, source: u, chosen, chosen2, chosenRow: slot.row, chosenCol: slot.col, handIndex: action.handIndex }, rng, events);
    }
    if (card.effects?.length) {
      runEffects(state, ctx.cards, card.effects, { side, source: u }, rng, events);
    }
    // 时机表第 7 步：入场后光环重算（ADR-037）
    recomputeAuras(state, ctx.cards, rng, events);
    runCardPlayedTriggers(state, ctx.cards, card, rng, events, side, playedRightmost);   // ADR-041
    recomputeAuras(state, ctx.cards, rng, events);
  } else {
    // 非人物卡：直接执行效果
    runEffects(state, ctx.cards, card.effects, {
      side,
      chosen: action.target
        ? action.target.row !== undefined
          ? unitRef(action.target.side, action.target.row, action.target.col as number)
          : lordRef(action.target.side)
        : undefined,
    }, rng, events);
    s.discard.push(card);
    runCardPlayedTriggers(state, ctx.cards, card, rng, events, side, playedRightmost);   // ADR-041
    recomputeAuras(state, ctx.cards, rng, events);
  }
  return true;
}

/* ============================================================
   攻击
   ============================================================ */

/**
 * 「水困」行动税（ADR-116 立项，ADR-132 重做）
 *
 * 火惩罚「**存在**」（回合开始掉血），水惩罚「**行动**」（动就掉血）——
 * 这是水火两条轴的分野，也是水困不会沦为"又一个 DoT"的原因。
 *
 * ADR-132 的新口径：
 *   · **回合末不再有水伤**（原先的 ① 删除）—— 水困的全部伤害都来自"行动"；
 *   · 行动一次受 **`2^(阶段-1)`** 点水属性伤害：阶段 1/2/3/4 → **1/2/4/8**，**无上限**；
 *     阶段就是该状态的**层数**（徽章上的数字），每个回合末 +1（见 `resolveTurnEndStatuses`）。
 *     设计者明确接受"第 5 回合 16 点，前提是他行动"—— 不行动就完全不受水伤，
 *     所以这条曲线是**玩家自己按出来的**，不是被动挨的。
 *   · **不行动 = 完全不受伤**（这是水困与灼烧/中毒的关键区别）。
 *
 * 保留旧口径的两条：
 *   ① 只由**主动行动**（普通攻击 / 主动技）触发，**不含**反击、触发技、光环
 *      —— 那些不是玩家的选择，惩罚它们等于随机削血；
 *   ② **不设每回合上限** —— 连击 / 强制攻击单位本就越强，水困正好是它的克制
 *      （连击打两次 = 收两次税，测试里钉死了这条）。
 *
 * 在行动**结算完成后**扣：让玩家先完成这次行动再吃税，
 * 避免"因为被水困所以这次攻击没了"的挫败感（且单位若已阵亡则不再扣）。
 */
function chargeWaterTax(
  state: MatchState, ctx: EngineContext, side: Side, row: Row, col: number,
  events: GameEvent[],
): void {
  const u = getUnit(state, side, row, col);
  if (!u || u.hp <= 0) return;                       // 已阵亡（如被反击打死）则不扣
  // ⚠️ 按 cap 驱动、逐状态取**该状态自己的层数**（不认状态 id）：
  //    `capStacks` 会把多个状态的层数加总，而阶段是"每个状态各自"的概念。
  for (const [id, inst] of Object.entries(u.statuses)) {
    if (inst.stacks <= 0) continue;
    const def = STATUSES[id];
    if (!def?.caps?.includes('damage_on_action')) continue;
    const amount = 2 ** (inst.stacks - 1);           // 阶段 1/2/3/4 → 1/2/4/8，无上限
    // damageType = 'water'：让受伤侧的判定按水属性走（水攻强化在发起侧结算，此处不经手）
    dealDamage(state, ctx.cards, unitRef(side, row, col), amount, events, def.name,
      0, undefined, undefined, 'water');
  }
}

function attack(
  state: MatchState, ctx: EngineContext,
  action: Extract<Action, { type: 'ATTACK' }>,
  events: GameEvent[], rng: ReturnType<typeof createRng>,
): boolean {
  const side = state.active;
  const { from, to } = action;
  const attacker = getUnit(state, side, from.row, from.col);
  if (!attacker) return false;

  const legal = legalTargets(state, side, from.row, from.col);
  if (!legal.targets.length) return false;

  // 混乱：在合法目标中随机
  let target = legal.targets.find((t) =>
    t.kind === to.kind &&
    (t.kind === 'lord' || (t.row === (to as { row: string }).row && t.col === (to as { col: number }).col)),
  );
  if (statusStacks(attacker, 'hun_luan') > 0) {
    target = legal.targets[rng.int(legal.targets.length)];
  }
  if (!target) return false;

  // 结算整体交给 effects.resolveAttack —— 与 DSL 的 `attack_each`（张苞）共用同一条
  // 路径，反击/圣盾/饮血/奇袭/触发技不可能出现两份实现（ADR-071）
  resolveAttack(state, ctx.cards, side, from,
    target as { kind: 'unit'; row: Row; col: number } | { kind: 'lord' },
    events, rng, { consumeAttack: true });
  chargeWaterTax(state, ctx, side, from.row, from.col, events);   // 水困：行动税
  return true;
}

/* ============================================================
   技能
   ============================================================ */

function useUnitSkill(
  state: MatchState, ctx: EngineContext,
  action: Extract<Action, { type: 'USE_SKILL' }>,
  events: GameEvent[], rng: ReturnType<typeof createRng>,
): boolean {
  const side = state.active;
  const u = getUnit(state, side, action.row, action.col);
  if (!u) return false;
  // 频率 / 震慑 / 费用共用 rules.ts 的判定（AI 与引擎必须同源）
  const check = canUseUnitSkill(state, side, action.row, action.col, action.skillId, ctx.cards);
  if (!check.ok) return false;
  const skill = check.skill!;

  // 目标校验（ADR-146 修订）：对手牌步骤之外**所有声明了目标的步骤**取并集校验。
  // 原先只看 `choices[0]`，而华佗「青囊」的第一步是"弃一张手牌"（targets 为空）——
  // 继续按老写法会把玩家选的回血目标一律判为非法。
  const steps = unitSkillTargetPlan(state, side, action.row, action.col, action.modeIndex, action.skillId).choices;
  const boardSteps = steps.filter((c) => c.targets.length);
  const hit = boardSteps.some((c) => c.targets.some((t) =>
    t.side === action.target?.side && (t.kind === 'lord'
      ? action.target?.row === undefined
      : t.row === action.target?.row && t.col === action.target?.col)));
  if (action.target && boardSteps.length && !hit) return false;

  const key = skill.id || skill.name || '0';
  u.skillUsesThisTurn[key] = (u.skillUsesThisTurn[key] ?? 0) + 1;
  u.actedThisTurn = true;                       // ADR-074：司马懿要判"本回合有没有行动"
  emitSkillTriggered(state, side, u, skill, 'active', events);
  if ((skill.frequency ?? 'once_per_turn') === 'once') u.skillsUsedOnce.push(key);
  state.sides[side].command.cur -= skill.cost ?? 0;
  const target: TargetRef | undefined = action.target
    ? action.target.row !== undefined
      ? unitRef(action.target.side, action.target.row, action.target.col as number)
      : lordRef(action.target.side)
    : undefined;
  // 抉择（ADR-071）：主动技同样支持 modes
  runEffects(state, ctx.cards, effectsOf(skill, action.modeIndex),
             { side, source: u, chosen: target, handIndex: action.handIndex, modeIndex: action.modeIndex }, rng, events);
  chargeWaterTax(state, ctx, side, action.row, action.col, events);   // 水困：行动税
  return true;
}
