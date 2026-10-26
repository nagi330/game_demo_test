/** 张绣〈盗戟夜袭〉—— 6 费 5/5 群雄武将（elite）。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
import { makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
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

function mk(id: string, attack: number, health: number): CardDef {
  return { id, name: id, faction: 'qun', type: 'general', cost: 3, attack, health, rarity: 'common', keywords: [] } as CardDef;
}

test('张绣 数据形态：6 费 5/5、盗戟夜袭、value_from_chosen', () => {
  const c = real('qun_zhangxiu');
  assert.equal(c.cost, 6);
  assert.equal(c.attack, 5);
  assert.equal(c.health, 5);
  assert.ok((c.tags ?? []).includes('xi_liang'));
  const sk = (c.skills ?? []).find((k) => k.id === 'dao_ji_ye_xi');
  assert.ok(sk);
  assert.equal(sk.effects?.[0]?.action, 'damage');
  assert.equal(sk.effects?.[0]?.value_from_chosen, 'attack');
});

test('张绣〈盗戟夜袭〉：敌方 3 攻人物 → 敌主公 3 伤', () => {
  const s = setup();
  const foe = makeUnit(mk('test_foe', 3, 3), 1, nextUidSeq(s.state));
  setUnit(s.state, 'enemy', 'front', 0, foe);
  s.state.sides.own.command.cur = 6;
  s.state.sides.own.hand = [{ card: real('qun_zhangxiu'), mods: [] }];
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.equal(r.ok, true);
  assert.equal(r.state.sides.enemy.lord.hp, 27);
});

test('张绣〈盗戟夜袭〉：己方 4 攻人物 → 敌主公 4 伤（不论敌我）', () => {
  const s = setup();
  const ally = makeUnit(mk('test_ally', 4, 4), 0, nextUidSeq(s.state));
  setUnit(s.state, 'own', 'front', 1, ally);
  s.state.sides.own.command.cur = 6;
  s.state.sides.own.hand = [{ card: real('qun_zhangxiu'), mods: [] }];
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'own', row: 'front', col: 1 },
  });
  assert.equal(r.ok, true);
  assert.equal(r.state.sides.enemy.lord.hp, 26);
});

test('张绣 6 费 5/5（身板 10，基准 13，−3）', () => {
  const c = real('qun_zhangxiu');
  assert.equal(c.cost * 2 + 1 - ((c.attack ?? 0) + (c.health ?? 0)), 3);
});
