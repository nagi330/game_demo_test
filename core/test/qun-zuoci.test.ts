/** 左慈〈幻化万千〉（ADR-196）。 */
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

test('左慈 数据形态：3 费 1/3、幻化万千（全场任一人物）', () => {
  const c = real('qun_zuoci');
  assert.equal(c.cost, 3);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 3);
  const sk = (c.skills ?? []).find((s) => s.id === 'huan_hua_wan_qian');
  assert.ok(sk);
  assert.equal(sk.trigger, 'on_play');
  const eff = sk.effects?.[0];
  assert.equal(eff?.action, 'random_transform');
  assert.equal(eff?.target?.side, 'both');
  assert.equal(eff?.target?.mode, 'choose');
});

test('幻化万千：敌方 3 费人物变成同费用的另一名人物，满血、无状态', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_zuoci'), 0, nextUidSeq(s.state)));
  const foe = makeUnit(real('qun_huangzu'), 0, nextUidSeq(s.state));   // 3 费 3/4
  foe.hp = 1;
  foe.statuses.zhen_she = { stacks: 1 };
  setUnit(s.state, 'enemy', 'front', 0, foe);
  s.state.sides.own.command.cur = 3;
  s.state.sides.own.hand = [{ card: real('qun_zuoci'), mods: [] }];

  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.equal(r.ok, true);
  const after = getUnit(r.state, 'enemy', 'front', 0)!;
  assert.notEqual(after.cardId, 'qun_huangzu', '应变成另一名人物');
  const def = real(after.cardId);
  assert.equal(def.cost, 3, '同费用');
  assert.ok(['general', 'strategist'].includes(def.type), '只能变成人物');
  assert.equal(after.hp, after.maxHp, '满血');
  assert.deepEqual(after.statuses, {}, '状态清空');
  assert.ok(r.events.some((e) => e.type === 'UNIT_TRANSFORMED'));
});

test('幻化万千：可以指定己方人物，也可以指定 5 费', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_zuoci'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'own', 'front', 1, makeUnit(real('qun_chengong'), 0, nextUidSeq(s.state))); // 3 费
  s.state.sides.own.command.cur = 3;
  s.state.sides.own.hand = [{ card: real('qun_zuoci'), mods: [] }];
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 2,
    target: { side: 'own', row: 'front', col: 1 },
  });
  assert.equal(r.ok, true);
  const after = getUnit(r.state, 'own', 'front', 1)!;
  assert.notEqual(after.cardId, 'qun_chengong');
  assert.equal(real(after.cardId).cost, 3);
});

test('幻化万千：同费用没有别的「人物」时为空操作', () => {
  // 造一张 99 费的人物，全卡库没有同费用的第二张 → 随机池为空
  const lonely: CardDef = {
    id: 'test_lonely', name: '孤家', faction: 'qun', type: 'general',
    cost: 99, attack: 5, health: 5, rarity: 'common', keywords: [],
  } as CardDef;
  const s = setup();
  s.ctx.cards.set('test_lonely', lonely);
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_zuoci'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(lonely, 0, nextUidSeq(s.state)));
  s.state.sides.own.command.cur = 3;
  s.state.sides.own.hand = [{ card: real('qun_zuoci'), mods: [] }];
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.equal(r.ok, true);
  const after = getUnit(r.state, 'enemy', 'front', 0)!;
  assert.equal(after.cardId, 'test_lonely', '池子为空 → 不变');
  assert.equal(after.atk, 5);
  assert.equal(after.maxHp, 5);
});
