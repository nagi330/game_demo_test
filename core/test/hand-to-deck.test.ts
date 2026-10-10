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
import { decide } from '../src/ai/index.ts';
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
      { action: 'send_hand_to_deck', to: 'deck_bottom', mode: 'choose', from_drawn: 2 },
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

test('handIndex 越界 / 缺省 → **挂起等玩家选**（ADR-144，不再悄悄退回随机）', () => {
  const { state, ctx } = scene(TO_BOTTOM);
  const before = state.sides.own.hand.length;
  const r = playCard(state, ctx, { handIndex: 99 });
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.own.hand.length, before - 1, '只少了打出的那张：还没放回');
  assert.equal(r.state.sides.own.deck.length, 3, '牌库不变');
  assert.ok(r.state.pendingHandChoice, '挂起了手牌选择');
  assert.equal(r.state.pendingHandChoice!.kind, 'deck_bottom', '去向：牌库底');
  assert.deepEqual(r.state.pendingHandChoice!.indices, [0, 1],
    '候选＝全部手牌（没有 from_drawn 限制）');
  assert.ok((r.events as GameEvent[]).some((e) => e.type === 'HAND_CHOICE_OPTIONS'),
    '发 HAND_CHOICE_OPTIONS 让 UI 弹选择器');
});

test('挂起期间其它动作一律被拒（与「发现」同一套暂停语义）', () => {
  const { state, ctx } = scene(TO_BOTTOM);
  const pending = playCard(state, ctx, {});
  assert.ok(pending.ok, pending.error ?? '');
  assert.ok(pending.state.pendingHandChoice, '先制造挂起');
  const again = applyAction(pending.state, ctx, { type: 'END_TURN' } as Action);
  assert.equal(again.ok, false, '挂起时结束回合应被拒');
  assert.match(String(again.error), /请先选择一张手牌/);
  assert.deepEqual(again.state, pending.state, '被拒时状态原样返回（动作原子性）');
});

test('CHOOSE_HAND 结算：选中的那张进牌库**底**，挂起清除', () => {
  const { state, ctx } = scene(TO_BOTTOM);
  const pending = playCard(state, ctx, {});
  assert.ok(pending.ok, pending.error ?? '');
  const r = applyAction(pending.state, ctx, { type: 'CHOOSE_HAND', handIndex: 0 } as Action);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.pendingHandChoice, undefined, '挂起已清除');
  assert.equal(r.state.sides.own.hand.length, 1, '手牌少一张');
  assert.equal(r.state.sides.own.deck[0], 'neutral_infantry',
    '数组开头 = 牌库底（选的是原来手牌 0 号：步兵）');
  assert.ok((r.events as GameEvent[]).some((e) => e.type === 'HAND_CHOSEN' && e.card.id === 'neutral_infantry'));
});

test('CHOOSE_HAND 的越界与白名单外下标都会被拒', () => {
  const { state, ctx } = scene(TO_BOTTOM);
  const pending = playCard(state, ctx, {});
  assert.ok(pending.ok, pending.error ?? '');
  assert.equal(applyAction(pending.state, ctx, { type: 'CHOOSE_HAND', handIndex: 9 } as Action).ok, false,
    '越界被拒');
  assert.equal(applyAction(pending.state, ctx, { type: 'CHOOSE_HAND', handIndex: -1 } as Action).ok, false,
    '负数被拒');
  assert.ok(applyAction(pending.state, ctx, { type: 'CHOOSE_HAND', handIndex: 1 } as Action).ok,
    '合法下标可以通过');
});

test('from_drawn: 2 → 候选锁死在**刚抽到的那两张**（杨仪「抽二选一」）', () => {
  const { state, ctx } = scene(DRAW2_KEEP1, []);
  setUnit(state, 'own', 'front', 4, makeUnit(DRAW2_KEEP1, 0, 921));
  state.sides.own.hand = [{ card: DRAW2_KEEP1, mods: [] }];
  state.sides.own.deck = ['neutral_infantry', 'neutral_shieldman', 'neutral_archer'];

  const r = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 4 } as Action);
  assert.ok(r.ok, r.error ?? '');
  // 抽 2 之后手牌 = [筹度, archer, shieldman]；候选应是**后两张**（刚抽到的）
  assert.ok(r.state.pendingHandChoice, '抽完挂起选择');
  assert.deepEqual(r.state.pendingHandChoice!.indices, [1, 2],
    '候选＝刚抽到的 archer / shieldman，不含原来的「筹度」');

  const done = applyAction(r.state, ctx, { type: 'CHOOSE_HAND', handIndex: 2 } as Action);
  assert.ok(done.ok, done.error ?? '');
  assert.deepEqual(done.state.sides.own.hand.map((h) => h.card.id),
    [DRAW2_KEEP1.id, 'neutral_archer'], '保留了 archer，把 shieldman 放回');
  assert.deepEqual(done.state.sides.own.deck, ['neutral_shieldman', 'neutral_infantry'],
    'shieldman 落在牌库底');
});

test('AI 在挂起时会给出 CHOOSE_HAND（否则对局会卡死到超时）', () => {
  const { state, ctx } = scene(DRAW2_KEEP1, []);
  setUnit(state, 'own', 'front', 4, makeUnit(DRAW2_KEEP1, 0, 921));
  state.sides.own.hand = [{ card: DRAW2_KEEP1, mods: [] }];
  const r = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 4 } as Action);
  assert.ok(r.ok, r.error ?? '');
  const decision = decide(r.state, ctx);
  assert.ok(decision.action, 'AI 必须给出动作');
  assert.equal(decision.action!.type, 'CHOOSE_HAND', '挂起时唯一合法的动作就是它');
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
