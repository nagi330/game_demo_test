/**
 * 刘表〈坐观天下〉—— 5 费 1/6 群雄谋臣（elite）。
 *
 * 设计者定稿（2026-10-21）：
 *   己方回合结束时，若己方本回合所有人物未对敌方发起过普通攻击，
 *   你抽 1 张牌，并使你手牌中的所有人物牌永久获得 +1/+1。
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
  s.state.sides.own.deck = ['qun_huatuo', 'qun_tianfeng', 'qun_yuanshu'];
  return s;
}

function playLiubiao(s: ReturnType<typeof setup>, handCardId = 'qun_huatuo') {
  s.state.sides.own.command.cur = 5;
  s.state.sides.own.hand = [
    { card: real('qun_liubiao'), mods: [] },
    { card: real(handCardId), mods: [] },
  ];
  return applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
}

function endTurn(s: ReturnType<typeof setup>, state: ReturnType<typeof setup>['state']) {
  return applyAction(state, s.ctx, { type: 'END_TURN' });
}

function mk(id: string, attack: number, health: number): CardDef {
  return {
    id, name: id, faction: 'qun', type: 'general', cost: 3,
    attack, health, rarity: 'common', keywords: [],
  } as CardDef;
}

function placeEnemy(s: ReturnType<typeof setup>, card: CardDef) {
  const u = makeUnit(card, 1, nextUidSeq(s.state));
  setUnit(s.state, 'enemy', 'front', 0, u);
  return u;
}

test('刘表 数据形态：5 费 1/6、坐观天下、未普攻条件', () => {
  const c = real('qun_liubiao');
  assert.equal(c.cost, 5);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 6);
  const sk = (c.skills ?? []).find((k) => k.id === 'zuo_guan_tian_xia');
  assert.ok(sk);
  assert.equal(sk.trigger, 'turn_end');
  assert.equal(sk.effects?.[0]?.action, 'draw');
  assert.equal(sk.effects?.[1]?.action, 'modify');
  assert.equal(sk.effects?.[1]?.target?.zone, 'hand');
  assert.equal(sk.effects?.[1]?.target?.count, 'all');
  const cond = sk.effects?.[1]?.condition?.count;
  assert.ok(cond);
  assert.equal(cond.value, 0);
});

test('刘表〈坐观天下〉：本回合未普攻 → 抽 1 + 手牌人物 +1/+1', () => {
  const s = setup();
  const r1 = playLiubiao(s);
  const st = r1.state;
  const before = st.sides.own.hand[0]!.card;
  const r2 = endTurn(s, st);
  assert.equal(r2.ok, true);
  assert.equal(r2.state.sides.own.hand.some((h) => h.card.id === before.id), true);
  const hand = r2.state.sides.own.hand;
  const buffed = hand.find((h) => h.card.id === 'qun_huatuo');
  assert.ok(buffed);
  assert.ok(buffed.mods.some((m) => m.kind === 'attack' && m.value === 1));
  assert.ok(buffed.mods.some((m) => m.kind === 'health' && m.value === 1));
});

test('刘表〈坐观天下〉：本回合有普攻 → 不触发', () => {
  const s = setup();
  placeEnemy(s, mk('test_target', 1, 1));
  const r1 = playLiubiao(s);
  const st = r1.state;
  // 己方另一名 1/1 攻击一次
  const u = makeUnit(mk('test_ally', 2, 2), 0, nextUidSeq(st));
  setUnit(st, 'own', 'front', 1, u);
  st.sides.own.command.cur = 10;
  const r2 = applyAction(st, s.ctx, {
    type: 'ATTACK',
    from: { row: 'front', col: 1 },
    to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.equal(r2.ok, true);
  const r3 = endTurn(s, r2.state);
  assert.equal(r3.ok, true);
  const hand = r3.state.sides.own.hand;
  const huatuo = hand.find((h) => h.card.id === 'qun_huatuo');
  assert.ok(huatuo);
  assert.equal(huatuo.mods.length, 0);
});

test('刘表 5 费 1/6（身板 7，基准 11，−4）', () => {
  const c = real('qun_liubiao');
  assert.equal(c.cost * 2 + 1 - ((c.attack ?? 0) + (c.health ?? 0)), 4);
});
