/**
 * 袁术〈传国玉玺〉—— 5 费 3/5 群雄武将（`yuan_shi` / elite）。
 *
 * 设计者定稿（2026-10-21）：
 *   战吼：展示「玉玺·场」「玉玺·手」「玉玺·抽」三张 1 费宝物，由你选择 2 张置入手牌。
 *   （原案是“随机 2 of 3”，设计者改为“3 选 2”，给玩家 agency。）
 *
 * 引擎：`discover` 的 `pool.cards`（ADR-181）+ `picks: 2`；第 3 张默认丢弃（`rest` 不填）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
import { getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { scenario } from './fixtures.ts';
import type { CardDef } from '../src/types.ts';

const cards: CardDef[] = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const real = (id: string): CardDef => {
  const card = cards.find((c) => c.id === id);
  assert.ok(card, id);
  return card;
};

function setup() {
  const s = scenario({});
  for (const c of cards) s.ctx.cards.set(c.id, c);
  return s;
}

function placeOwn(s: ReturnType<typeof setup>, id: string, col: number) {
  const u = makeUnit(real(id), 0, nextUidSeq(s.state));
  setUnit(s.state, 'own', 'front', col, u);
  return u;
}

function playYuanshu(s: ReturnType<typeof setup>) {
  s.state.sides.own.command.cur = 5;
  s.state.sides.own.hand = [{ card: real('qun_yuanshu'), mods: [] }];
  return applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
  });
}

function playToken(s: ReturnType<typeof setup>, id: string, col: number, extra: string[] = []) {
  s.state.sides.own.command.cur = 1;
  s.state.sides.own.hand = [
    { card: real(id), mods: [] },
    ...extra.map((x) => ({ card: real(x), mods: [] })),
  ];
  return applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col,
  });
}

function choose(s: ReturnType<typeof setup>, id: string, state = s.state) {
  return applyAction(state, s.ctx, { type: 'CHOOSE_DISCOVER', cardId: id });
}

/* =====================================================================
   一、数据形态
   ===================================================================== */

test('袁术：5 费 3/5 群雄武将，精英，传国玉玺 3 选 2', () => {
  const c = real('qun_yuanshu');
  assert.deepEqual([c.cost, c.attack, c.health], [5, 3, 5]);
  assert.equal(c.faction, 'qun');
  assert.equal(c.type, 'general');
  assert.equal(c.rarity, 'elite');
  assert.deepEqual(c.tags ?? [], ['yuan_shi']);
  assert.match(c.memo ?? '', /3 张 1 费玉玺/);

  const sk = (c.skills ?? [])[0]!;
  assert.equal(sk.name, '传国玉玺');
  assert.equal(sk.trigger, 'on_play');
  const eff = sk.effects![0]!;
  assert.equal(eff.action, 'discover');
  assert.equal(eff.count, 3);
  assert.equal(eff.picks, 2);
  assert.equal(eff.discover_to, 'hand');
  assert.deepEqual(eff.pool?.cards, ['qun_yuxi_board', 'qun_yuxi_hand', 'qun_yuxi_draw']);
  assert.match(sk.text ?? '', /展示/);
  assert.match(sk.text ?? '', /选择 2 张/);
});

test('玉玺 3 张：1 费 token，场/手/抽三种效果', () => {
  for (const id of ['qun_yuxi_board', 'qun_yuxi_hand', 'qun_yuxi_draw']) {
    const c = real(id);
    assert.deepEqual([c.cost, c.attack, c.health], [1, 0, 1], id);
    assert.equal(c.type, 'token', id);
    assert.equal(c.rarity, 'common', id);
    assert.equal(c.effects?.length, 1, id);
  }
  assert.equal(real('qun_yuxi_board').effects?.[0]?.action, 'modify');
  assert.equal(real('qun_yuxi_hand').effects?.[0]?.action, 'grant_hand');
  assert.equal(real('qun_yuxi_draw').effects?.[0]?.action, 'draw');
});

/* =====================================================================
   二、3 选 2：全部展示、玩家自选、第 3 张丢弃
   ===================================================================== */

test('袁术：3 张全展示，自选 2 张置入手牌，第 3 张丢弃', () => {
  const s = setup();
  const r = playYuanshu(s);
  assert.ok(r.ok, r.error ?? '');
  const pend = r.state.pendingDiscover;
  assert.ok(pend, '应挂起 3 选 2');
  assert.equal(pend!.side, 'own');
  assert.equal(pend!.picks, 2);
  assert.equal(pend!.fromPool, true);
  const shown = [...pend!.candidates].sort();
  assert.deepEqual(shown, ['qun_yuxi_board', 'qun_yuxi_draw', 'qun_yuxi_hand']);

  const deckBefore = [...r.state.sides.own.deck];
  const first = pend!.candidates[0]!;
  const r2 = choose(s, first, r.state);
  assert.ok(r2.ok, r2.error ?? '');
  assert.equal(r2.state.pendingDiscover?.picks, 1, '选 1 张后仍挂起');
  const second = r2.state.pendingDiscover!.candidates[0]!;
  const r3 = choose(s, second, r2.state);
  assert.ok(r3.ok, r3.error ?? '');
  assert.equal(r3.state.pendingDiscover, undefined, '选满 2 张后不再挂起');
  assert.equal(r3.state.sides.own.hand.length, 2, '2 张入手牌');
  const chosen = [first, second].sort();
  assert.deepEqual(r3.state.sides.own.hand.map((h) => h.card.id).sort(), chosen);

  const remaining = shown.find((id) => !chosen.includes(id))!;
  assert.ok(!r3.state.sides.own.hand.some((h) => h.card.id === remaining), '第 3 张不进手牌');
  assert.ok(!r3.state.sides.own.deck.includes(remaining), '第 3 张不进牌库');
  assert.deepEqual([...r3.state.sides.own.deck].sort(), [...deckBefore].sort(), '牌库不变');
});

/* =====================================================================
   三、三张玉玺的实际效果
   ===================================================================== */

test('玉玺·场：1 费，己方场上全体 +1 攻', () => {
  const s = setup();
  placeOwn(s, 'qun_caimao', 1);          // 2/2
  const r = playToken(s, 'qun_yuxi_board', 0);
  assert.ok(r.ok, r.error ?? '');
  const after = getUnit(r.state, 'own', 'front', 1);
  assert.equal(after?.atk, 3, '场上 2/2 → 3/2');
});

test('玉玺·手：1 费，己方手牌全体 +1 攻', () => {
  const s = setup();
  const r = playToken(s, 'qun_yuxi_hand', 0, ['qun_caimao']);
  assert.ok(r.ok, r.error ?? '');
  const hand = r.state.sides.own.hand.find((h) => h.card.id === 'qun_caimao');
  assert.ok(hand, '手牌里的曹茂还在');
  // grant_hand 直接改手牌卡面的 attack（不是加 mod）
  assert.equal(hand!.card.attack, 3, '手牌 2 攻 +1 = 3');
});

test('玉玺·抽：1 费，抽 1 张牌', () => {
  const s = setup();
  s.state.sides.own.deck = ['qun_caimao'];
  const r = playToken(s, 'qun_yuxi_draw', 0);
  assert.ok(r.ok, r.error ?? '');
  assert.ok(r.state.sides.own.hand.some((h) => h.card.id === 'qun_caimao'), '抽到的牌入手');
  assert.equal(r.state.sides.own.deck.length, 0);
});

/* =====================================================================
   四、3 选 2 的实战组合：拿「场」+「手」都能用
   ===================================================================== */

test('袁术：3 选 2 可拿「场」「手」，两张都能正常使用', () => {
  const s = setup();
  placeOwn(s, 'qun_caimao', 1);          // 2/2
  const r = playYuanshu(s);
  assert.ok(r.ok, r.error ?? '');
  const pend = r.state.pendingDiscover!;
  const board = pend.candidates.find((id) => id === 'qun_yuxi_board')!;
  const hand = pend.candidates.find((id) => id === 'qun_yuxi_hand')!;

  const r2 = choose(s, board, r.state);
  assert.ok(r2.ok, r2.error ?? '');
  const r3 = choose(s, hand, r2.state);
  assert.ok(r3.ok, r3.error ?? '');
  assert.equal(r3.state.pendingDiscover, undefined);
  assert.deepEqual(r3.state.sides.own.hand.map((h) => h.card.id).sort(), ['qun_yuxi_board', 'qun_yuxi_hand']);

  r3.state.sides.own.command.cur = 3;
  r3.state.sides.own.hand.push({ card: real('qun_caimao'), mods: [] });

  // 用「场」：场上 2/2 → 3/2
  const boardIdx = r3.state.sides.own.hand.findIndex((h) => h.card.id === 'qun_yuxi_board');
  const r4 = applyAction(r3.state, s.ctx, { type: 'PLAY_CARD', cardIndex: boardIdx, row: 'front', col: 0 });
  assert.ok(r4.ok, r4.error ?? '');
  assert.equal(getUnit(r4.state, 'own', 'front', 1)?.atk, 3);

  // 用「手」：手牌里的曹茂 +1 攻
  const handIdx = r4.state.sides.own.hand.findIndex((h) => h.card.id === 'qun_yuxi_hand');
  const r5 = applyAction(r4.state, s.ctx, { type: 'PLAY_CARD', cardIndex: handIdx, row: 'front', col: 2 });
  assert.ok(r5.ok, r5.error ?? '');
  const caomao = r5.state.sides.own.hand.find((h) => h.card.id === 'qun_caimao');
  assert.ok(caomao, '曹茂还在手牌');
  assert.equal(caomao!.card.attack, 3, '手牌曹茂 2 攻 +1 = 3');
});
