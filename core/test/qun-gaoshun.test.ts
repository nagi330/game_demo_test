/** 高顺〈陷阵统领〉—— 7 费 4/7 群雄武将（elite，先攻+架盾）。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
import { scenario } from './fixtures.ts';
import type { CardDef } from '../src/types.ts';

const cards: CardDef[] = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const real = (id: string): CardDef => {
  const card = cards.find((c) => c.id === id);
  assert.ok(card, id);
  return card;
};

test('高顺 数据形态：7 费 4/7、先攻+架盾、陷阵统领', () => {
  const c = real('qun_gaoshun');
  assert.equal(c.cost, 7);
  assert.equal(c.attack, 4);
  assert.equal(c.health, 7);
  assert.ok((c.keywords ?? []).includes('jia_dun'));
  assert.ok((c.keywords ?? []).includes('xian_gong'));
  const sk = (c.skills ?? []).find((k) => k.id === 'xian_zhen_tong_ling');
  assert.ok(sk);
  const eff = sk.effects?.[0];
  assert.equal(eff?.action, 'add_to_hand');
  assert.equal(eff?.unit, 'qun_xianzhenying');
  assert.equal(eff?.count, 2);
});

test('陷阵营：复用既有的 4 费 2/5 抉择卡', () => {
  const c = real('qun_xianzhenying');
  assert.equal(c.cost, 4);
  assert.equal(c.attack, 2);
  assert.equal(c.health, 5);
  assert.equal(c.type, 'troop');
});

test('高顺〈陷阵统领〉：战吼将 2 张陷阵营置入手牌', () => {
  const s = scenario({});
  for (const c of cards) s.ctx.cards.set(c.id, c);
  s.state.sides.own.command.cur = 7;
  s.state.sides.own.hand = [{ card: real('qun_gaoshun'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  const ids = r.state.sides.own.hand.map((h) => h.card.id);
  assert.equal(ids.filter((id) => id === 'qun_xianzhenying').length, 2);
});

test('高顺 7 费 4/7（身板 11，基准 15，−4）', () => {
  const c = real('qun_gaoshun');
  assert.equal(c.cost * 2 + 1 - ((c.attack ?? 0) + (c.health ?? 0)), 4);
});
