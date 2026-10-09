/**
 * 孟获全流程（ADR-141）：**战吼「蛮王」永久 +2/+2** ＋ **亡语「七擒」阵亡后重建于手牌**
 *
 * ## 「蛮王」是**战吼**（不是光环）—— 这点决定了实现方式
 *
 * 设计者口径：「上场的时候触发，让**当前主公手牌上的**和**己方战场上的**所有 `man_zu` 牌
 * **永久 +2/+2**，即使孟获阵亡了也不会扣除。」（且**不含孟获自己**）
 *
 * 所以在引擎里它必须是 `trigger: on_play` + 两条 `modify`（**不写 duration = 永久**）：
 *   · **场上那半**：直接写单位的永久 mod → 不是光环，`recomputeAuras` 不会碰它，孟获死了也不掉；
 *   · **手牌那半**：写 `HandMod.kind: 'attack' / 'health'`（**不带 auraId**）→ 永久挂在手牌上，
 *     等这张牌**被打出时**由 `engine.playCard` 一次性结算到单位身上，所以"手牌加成"是有意义的。
 *     ⚠️ 若写成**光环**，手牌 mod 会带 `auraId`，重算时先清后加、打出瞬间就没了 —— 那是另一种卡。
 *
 * ## 「七擒」为什么能实现
 *
 * `return_to_hand` 用不上：它按**场上坐标**找目标，而亡语触发时单位已被 `killUnit` 移出战场
 * （`setUnit(null)` 排在 `onDeathResolver` 之前）。正确做法是**不碰战场** —— 用亡语 ctx 里的
 * **阵亡单位对象**（`ctx.source`）把这张卡**重新造一份手牌**，即"消失之后再在手里重建"。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyAction } from '../src/engine.ts';
import { killUnit } from '../src/mutate.ts';
import { recomputeAuras } from '../src/effects.ts';
import { createRng } from '../src/rng.ts';
import { getUnit, makeUnit, setUnit } from '../src/state.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { Action, CardDef, GameEvent, MatchState, Side, Unit } from '../src/types.ts';

/* ============================================================
   夹具：孟获（设计稿形状）+ 蛮族 / 非蛮族对照
   ============================================================ */

const ALLY_MAN = { side: 'ally' as const, filter: { type: 'character' as const, tag: 'man_zu', exclude_source: true }, count: 'all' as const };
const HAND_MAN = { side: 'ally' as const, zone: 'hand' as const, filter: { type: 'character' as const, tag: 'man_zu', exclude_source: true }, count: 'all' as const };

const MENGHUO: CardDef = {
  id: 'shu_menghuo', name: '孟获', faction: 'shu', type: 'general', cost: 8, attack: 4, health: 7,
  keywords: [], tags: ['man_zu'], gender: 'male', memo: '七纵七禽：战吼永久增益蛮族，阵亡后回到手牌',
  skills: [
    {
      // 「蛮王」**战吼**：己方战场上 + 手牌里的其它蛮族人物**永久** +2/+2（孟获阵亡也不扣除）
      id: 'man_wang', name: '蛮王', kind: 'trigger', trigger: 'on_play',
      effects: [
        { action: 'modify', attack: 2, health: 2, target: ALLY_MAN },
        { action: 'modify', attack: 2, health: 2, target: HAND_MAN },
      ],
    },
    {
      // 「七擒」：阵亡后收回手牌，最多 6 次，每次 −1 费 −1 血上限，第 7 次转给对手
      id: 'qi_qin', name: '七擒', kind: 'trigger', trigger: 'on_death',
      effects: [{ action: 'self_to_hand', count: 6, value: -1, health: -1, overflow: 'enemy' }],
    },
  ],
} as CardDef;

const MAN_BING: CardDef = {
  id: 'test_man_bing', name: '蛮兵', faction: 'shu', type: 'general', cost: 2, attack: 2, health: 2,
  keywords: [], tags: ['man_zu'], gender: 'male', memo: '测试：蛮族',
} as CardDef;

const HAN_BING: CardDef = {
  id: 'test_han_bing', name: '汉兵', faction: 'shu', type: 'general', cost: 2, attack: 2, health: 2,
  keywords: [], gender: 'male', memo: '测试：非蛮族',
} as CardDef;

for (const c of [MENGHUO, MAN_BING, HAN_BING]) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);
}

/** 摆场：己方战场放若干单位、手牌若干；返回 state / ctx */
function board(opts: { units?: string[]; hand?: string[] } = {}) {
  const { state, ctx } = scenario({ ownHand: opts.hand ?? [] });
  // 摆位约定：`units` 从 col 0 起连续放；**打出的孟获固定放 col 4**（永远空着）
  (opts.units ?? []).forEach((id, i) => {
    const def = TEST_CARDS.find((c) => c.id === id)!;
    setUnit(state, 'own', 'front', i, makeUnit(def, 0, 950 + i));
  });
  return { state, ctx };
}

/** 让某格单位阵亡（走真实 killUnit 路径，亡语链完整） */
function slay(state: MatchState, ctx: ReturnType<typeof board>['ctx'], col: number, side: Side = 'own') {
  const u = getUnit(state, side, 'front', col)!;
  const events: GameEvent[] = [];
  killUnit(state, ctx.cards, { side, row: 'front', col, unit: u }, events);
  return events;
}

const handOf = (s: MatchState, side: Side) => s.sides[side].hand;
const statOf = (u: Unit) => `${u.atk}/${u.maxHp}`;
const handMods = (hc: { mods: Array<{ kind: string; value?: number }> }, kind: 'attack' | 'health') =>
  hc.mods.filter((m) => m.kind === kind).reduce((s, m) => s + (m.value ?? 0), 0);

/* ============================================================
   1. 「蛮王」＝ 战吼永久增益（场上 + 手牌）
   ============================================================ */

test('战吼「蛮王」：己方**场上**其它蛮族永久 +2/+2，孟获自己不吃', () => {
  const { state, ctx } = board({ units: ['test_man_bing', 'test_han_bing'], hand: ['shu_menghuo'] });
  state.sides.own.command = { cur: 10, max: 10 };
  const before = statOf(getUnit(state, 'own', 'front', 0)!);

  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 4 } as Action);
  assert.ok(r.ok, r.error ?? '');

  assert.equal(before, '2/2', '战吼前是白板');
  assert.equal(statOf(getUnit(r.state, 'own', 'front', 0)!), '4/4', '场上蛮族 +2/+2');
  assert.equal(statOf(getUnit(r.state, 'own', 'front', 4)!), '4/7', '孟获自己不吃（exclude_source）');
  assert.equal(statOf(getUnit(r.state, 'own', 'front', 1)!), '2/2', '非蛮族不受影响');
});

test('战吼「蛮王」：**手牌**里的其它蛮族拿到永久 +2/+2，且会在打出时生效', () => {
  const { state, ctx } = board({ units: ['test_man_bing'], hand: ['shu_menghuo', 'test_man_bing', 'test_han_bing'] });
  state.sides.own.command = { cur: 10, max: 10 };
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 4 } as Action);
  assert.ok(r.ok, r.error ?? '');

  const hand = handOf(r.state, 'own');
  const man = hand.find((h) => h.card.id === 'test_man_bing')!;
  const han = hand.find((h) => h.card.id === 'test_han_bing')!;
  assert.equal(handMods(man, 'attack'), 2, '手牌蛮族 +2 攻');
  assert.equal(handMods(man, 'health'), 2, '手牌蛮族 +2 血');
  assert.equal(man.mods.every((m) => m.auraId === undefined), true,
    '**战吼**留下的手牌修正是永久的（不带 auraId）——写成光环就会在打出瞬间消失');
  assert.equal(han.mods.length, 0, '非蛮族手牌不受影响');

  // 这张被强化过的手牌打出去 → 单位带着 +2/+2 进场
  const r2 = applyAction(r.state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 3 } as Action);
  assert.ok(r2.ok, r2.error ?? '');
  assert.equal(statOf(getUnit(r2.state, 'own', 'front', 3)!), '4/4', '手牌加成跟着进场（2/2 → 4/4）');
});

test('「永久」：孟获阵亡后，场上与手牌的 +2/+2 **都不扣除**', () => {
  const { state, ctx } = board({ units: ['test_man_bing'], hand: ['shu_menghuo', 'test_man_bing'] });
  state.sides.own.command = { cur: 10, max: 10 };
  const played = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 4 } as Action);
  assert.ok(played.ok, played.error ?? '');
  let s = played.state;
  assert.equal(statOf(getUnit(s, 'own', 'front', 0)!), '4/4');

  slay(s, ctx, 4);                                  // 孟获阵亡（亡语把他收回手牌）
  recomputeAuras(s, ctx.cards, createRng(1), []);   // 即便跑一次光环重算，也不该动这些永久修正

  assert.equal(statOf(getUnit(s, 'own', 'front', 0)!), '4/4', '场上的加成不因孟获阵亡而消失');
  const man = handOf(s, 'own').find((h) => h.card.id === 'test_man_bing')!;
  assert.equal(handMods(man, 'attack'), 2, '手牌加成同样保留');
  // 且孟获本人已经回到手牌
  assert.equal(handOf(s, 'own').some((h) => h.card.id === 'shu_menghuo'), true, '孟获回到手牌');
});

test('「蛮王」不是光环：它没有任何 aura 修正（换人/离场都不会重算它）', () => {
  const { state, ctx } = board({ units: ['test_man_bing'], hand: ['shu_menghuo'] });
  state.sides.own.command = { cur: 10, max: 10 };
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 4 } as Action);
  assert.ok(r.ok, r.error ?? '');
  const boosted = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(boosted.mods.some((m) => m.kind === 'aura'), false,
    '写的是 permanent 修正，不是 aura（所以孟获死了也不掉）');
  assert.equal(boosted.mods.some((m) => m.kind === 'permanent'), true);
});

/* ============================================================
   2. 「七擒」＝ 阵亡后重建于手牌
   ============================================================ */

test('孟获阵亡 → 手牌里重建一张孟获，并带上 −1 费 / −1 血上限', () => {
  const { state, ctx } = board({ units: ['shu_menghuo'] });
  assert.equal(handOf(state, 'own').length, 0, '起始手牌为空');
  const events = slay(state, ctx, 0);

  assert.equal(getUnit(state, 'own', 'front', 0), null, '战场上已经消失');
  const hand = handOf(state, 'own');
  assert.equal(hand.length, 1, '手牌里重建出一张');
  assert.equal(hand[0]!.card.id, 'shu_menghuo', '重建的是孟获本体');

  const ev = events.find((e) => e.type === 'CARD_REBUILT_IN_HAND');
  assert.ok(ev && ev.type === 'CARD_REBUILT_IN_HAND');
  assert.equal(ev.times, 1, '第 1 次收回');
  assert.equal(ev.exceeded, false);
  assert.equal(ev.costDelta, -1);
  assert.equal(ev.healthDelta, -1);
  assert.equal(state.recalls?.shu_menghuo, 1, '计数写进 state（跨手牌/战场存活）');
});

test('累计：第 2 次阵亡 → −2 费 / −2 血上限（只留一条 mod）', () => {
  const { state, ctx } = board({ units: ['shu_menghuo'] });
  slay(state, ctx, 0);
  handOf(state, 'own').length = 0;
  setUnit(state, 'own', 'front', 0, makeUnit(MENGHUO, 0, 951));
  slay(state, ctx, 0);

  const hand = handOf(state, 'own');
  assert.equal(hand.length, 1);
  assert.equal(hand[0]!.mods.filter((m) => m.kind === 'cost').length, 1, '只有一条费用修正（写累计值）');
  assert.equal(hand[0]!.mods.filter((m) => m.kind === 'cost')[0]!.value, -2);
  assert.equal(hand[0]!.mods.filter((m) => m.kind === 'health')[0]!.value, -2);
  assert.equal(state.recalls?.shu_menghuo, 2);
});

test('第 7 次阵亡 → 卡进**对手**手牌（只能收回 6 次）', () => {
  const { state, ctx } = board({ units: ['shu_menghuo'] });
  state.recalls = { shu_menghuo: 6 };
  const events = slay(state, ctx, 0);

  assert.equal(handOf(state, 'own').length, 0, '己方手牌里没有了');
  assert.equal(handOf(state, 'enemy').length, 1, '进了对手手牌');
  assert.equal(handOf(state, 'enemy')[0]!.card.id, 'shu_menghuo');
  const ev = events.find((e) => e.type === 'CARD_REBUILT_IN_HAND');
  assert.ok(ev && ev.type === 'CARD_REBUILT_IN_HAND');
  assert.equal(ev.times, 7);
  assert.equal(ev.exceeded, true, '事件标记"已超上限"');
  assert.equal(ev.costDelta, -7, '第 7 次：−7 费（8 → 1）');
});

test('削弱后的孟获打出 → 生命上限真的少了（手牌 mod 在打出时结算）', () => {
  const { state, ctx } = board({ hand: ['shu_menghuo'] });
  state.sides.own.command = { cur: 10, max: 10 };
  handOf(state, 'own')[0]!.mods.push({ id: 'recallcost#3', kind: 'cost', value: -3 });
  handOf(state, 'own')[0]!.mods.push({ id: 'recallhp#3', kind: 'health', value: -3 });

  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 4 } as Action);
  assert.ok(r.ok, r.error ?? '');
  const u = getUnit(r.state, 'own', 'front', 4)!;
  assert.equal(statOf(u), '4/4', '4/7 − 3 血上限；且不吃自己的「蛮王」（exclude_source）');
  assert.equal(u.hp, 4, '当前生命同步到新上限');
});

test('费用修正同样生效：8 费 → 收回 3 次后实扣 5 统率', () => {
  const { state, ctx } = board({ hand: ['shu_menghuo'] });
  state.sides.own.command = { cur: 10, max: 10 };
  handOf(state, 'own')[0]!.mods.push({ id: 'recallcost#3', kind: 'cost', value: -3 });
  const before = state.sides.own.command.cur;
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 4 } as Action);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(before - r.state.sides.own.command.cur, 5, '实扣 5 统率（8 − 3）');
});
