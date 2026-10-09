/**
 * `send_hand_to_deck` —— 把手牌放回牌库**指定位置**，且不抽牌（ADR-139，杨仪「筹度粮谷」）
 *
 * ## 为什么需要它
 *
 * 现成的 `cycle_to_deck` 是"手牌 → 牌库**随机位置** → **必抽 1 张**"的置换（孙权「坐断东南」）。
 * 杨仪要的是「先抽两张，再把其中一张放回**牌库底**」——顺序相反、落点固定、且**不抽牌**，
 * 用 `cycle_to_deck` 表达不出来（会多抽一张、且位置随机）。
 *
 * ## 牌库方向（全项目唯一的约定）
 *
 *   `drawCard` 用 `deck.pop()` → **数组末尾 = 牌库顶**，**数组开头 = 牌库底**。
 *   所以本动作：`deck_bottom` → `unshift`，`deck_top` → `push`。
 *   （`scry` 原先用了相反的约定，是既有 bug —— 见 ADR-140，本文件用不变量钉住正确方向。）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyAction } from '../src/engine.ts';
import { drawCard } from '../src/mutate.ts';
import { getUnit, makeUnit, setUnit } from '../src/state.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { Action, CardDef, GameEvent } from '../src/types.ts';

/* ---------- 夹具 ---------- */

const TO_BOTTOM: CardDef = {
  id: 'test_to_bottom', name: '归底', faction: 'shu', type: 'general', cost: 1, attack: 1, health: 2,
  keywords: [], gender: 'male', memo: '测试',
  skills: [{
    id: 'test_to_bottom_sk', name: '归底', kind: 'trigger', trigger: 'on_play',
    effects: [{ action: 'send_hand_to_deck', to: 'deck_bottom', mode: 'choose' }],
  }],
} as CardDef;

const TO_TOP: CardDef = {
  id: 'test_to_top', name: '归顶', faction: 'shu', type: 'general', cost: 1, attack: 1, health: 2,
  keywords: [], gender: 'male', memo: '测试',
  skills: [{
    id: 'test_to_top_sk', name: '归顶', kind: 'trigger', trigger: 'on_play',
    effects: [{ action: 'send_hand_to_deck', to: 'deck_top', mode: 'choose' }],
  }],
} as CardDef;

/** 杨仪式两段效果：抽 2 → 选 1 张放回牌库底 */
const DRAW2_KEEP1: CardDef = {
  id: 'test_draw2_keep1', name: '筹度', faction: 'shu', type: 'strategist', cost: 4, attack: 1, health: 4,
  keywords: [], gender: 'male', memo: '测试',
  skills: [{
    id: 'test_draw2_keep1_sk', name: '筹度粮谷', kind: 'active', frequency: 'once_per_turn',
    effects: [
      { action: 'draw', value: 2 },
      { action: 'send_hand_to_deck', to: 'deck_bottom', mode: 'choose' },
    ],
  }],
} as CardDef;

for (const c of [TO_BOTTOM, TO_TOP, DRAW2_KEEP1]) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);
}

const NAMES: Record<string, string> = {
  neutral_infantry: '步兵', neutral_shieldman: '盾兵', neutral_archer: '弓兵',
};

/** 场景：手牌 = 要打的卡 + 两张可辨识的手牌；牌库固定三张 */
function scene(card: CardDef, handExtra: string[] = ['neutral_infantry', 'neutral_shieldman']) {
  const { state, ctx } = scenario({ ownHand: [card.id, ...handExtra] });
  state.sides.own.deck = ['neutral_infantry', 'neutral_shieldman', 'neutral_archer'];
  return { state, ctx };
}

const playCard = (state: ReturnType<typeof scene>['state'], ctx: ReturnType<typeof scene>['ctx'],
  extra: Partial<Extract<Action, { type: 'PLAY_CARD' }>> = {}) =>
  applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 4, ...extra } as Action);

/* ---------- 用例 ---------- */

test('放回牌库底：牌进 deck[0]（数组开头），且**不抽牌**', () => {
  const { state, ctx } = scene(TO_BOTTOM);
  const before = state.sides.own.deck.length;
  const r = playCard(state, ctx, { handIndex: 0 });
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.own.hand.length, 1, '打出的卡离手、放回 1 张 → 手牌剩 1（没有抽牌）');
  assert.equal(r.state.sides.own.deck.length, before + 1, '牌库 +1');
  assert.equal(r.state.sides.own.deck[0], 'neutral_infantry',
    '放回的是 handIndex=0 的那张（步兵），且落在**数组开头 = 牌库底**');
  assert.ok((r.events as GameEvent[]).some((e) => e.type === 'CARD_RETURNED_TO_DECK' && e.to === 'deck_bottom'),
    '事件应带落点，供客户端播"回到牌库底"');
});

test('放回牌库顶：牌进数组**末尾**，下一次抽牌立刻抽到它', () => {
  const { state, ctx } = scene(TO_TOP);
  const r = playCard(state, ctx, { handIndex: 0 });
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.own.deck[r.state.sides.own.deck.length - 1], 'neutral_infantry',
    '牌库顶 = 数组末尾');
  const events: GameEvent[] = [];
  drawCard(r.state, ctx.cards, 'own', events);
  const drawn = r.state.sides.own.hand[r.state.sides.own.hand.length - 1]!;
  assert.equal(NAMES[drawn.card.id], '步兵', '刚放回顶部的那张应被下一抽拿到');
});

test('handIndex 越界 / 缺省 → 退回随机，绝不静默失败', () => {
  const { state, ctx } = scene(TO_BOTTOM);
  const before = state.sides.own.hand.length;
  const r = playCard(state, ctx, { handIndex: 99 });
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.own.hand.length, before - 2,
    '打出的卡 + 随机放回 1 张 = 手牌 -2（越界不是"什么都不做"）');
  assert.equal(r.state.sides.own.deck.length, 4, '牌库应 +1');
});

test('手牌为空时空转（不抛异常、不动牌库）', () => {
  const { state, ctx } = scene(TO_BOTTOM, []);
  const r = playCard(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.own.hand.length, 0);
  assert.equal(r.state.sides.own.deck.length, 3, '没有手牌可放 → 牌库不变');
});

test('杨仪式两段效果：抽 2 张后再放回 1 张 —— 净手牌 +1、牌库 -1、落点在牌库底', () => {
  const { state, ctx } = scene(DRAW2_KEEP1, []);
  setUnit(state, 'own', 'front', 4, makeUnit(DRAW2_KEEP1, 0, 921));
  state.sides.own.hand = [{ card: DRAW2_KEEP1, mods: [] }];
  state.sides.own.deck = ['neutral_infantry', 'neutral_shieldman', 'neutral_archer'];
  const r = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 4, handIndex: 1,
  } as Action);
  assert.ok(r.ok, r.error ?? '');
  // 手牌：[筹度] --draw 2（抽走 archer、shieldman）--> [筹度, archer, shieldman]
  //        --handIndex 1 放回--> [筹度, shieldman]
  assert.deepEqual(r.state.sides.own.hand.map((h) => h.card.id),
    [DRAW2_KEEP1.id, 'neutral_shieldman'], '手牌 = 原卡 + 保留的那张（另一张被放回）');
  // 牌库：[infantry, shieldman, archer] --抽 2--> [infantry] --放回 archer--> [archer, infantry]
  assert.deepEqual(r.state.sides.own.deck, ['neutral_archer', 'neutral_infantry'],
    '放回的 archer 落在**数组开头 = 牌库底**，所以不会被紧接着的抽牌拿到');
  const ret = (r.events as GameEvent[]).find((e) => e.type === 'CARD_RETURNED_TO_DECK');
  assert.ok(ret && ret.type === 'CARD_RETURNED_TO_DECK' && ret.card.id === 'neutral_archer',
    '事件里应记录被放回的是 archer');
});

test('不变量：牌库"顶"永远是数组末尾（draw 用 pop）—— 防有人再写反', () => {
  const { state, ctx } = scene(TO_BOTTOM, []);
  state.sides.own.deck = ['neutral_infantry', 'neutral_shieldman', 'neutral_archer'];
  const events: GameEvent[] = [];
  drawCard(state, ctx.cards, 'own', events);
  const drawn = state.sides.own.hand[state.sides.own.hand.length - 1]!;
  assert.equal(drawn.card.id, 'neutral_archer',
    '抽到的应是数组**末尾**那张 —— 这是全项目统一的牌库方向');
  assert.deepEqual(state.sides.own.deck, ['neutral_infantry', 'neutral_shieldman']);
});
