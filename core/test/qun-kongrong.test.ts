/** 孔融〈北海举贤〉—— 2 费 1/3 群雄谋臣（elite）。 */
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

function setup() {
  const s = scenario({});
  for (const c of cards) s.ctx.cards.set(c.id, c);
  s.state.sides.own.deck = ['qun_huatuo', 'qun_tianfeng', 'qun_yuanshu'];
  return s;
}

function playKongrong(s: ReturnType<typeof setup>) {
  s.state.sides.own.command.cur = 2;
  s.state.sides.own.hand = [{ card: real('qun_kongrong'), mods: [] }];
  return applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
}

test('孔融 数据形态：2 费 1/3、北海举贤 discover -2', () => {
  const c = real('qun_kongrong');
  assert.equal(c.cost, 2);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 3);
  const sk = (c.skills ?? []).find((k) => k.id === 'bei_hai_ju_xian');
  assert.ok(sk);
  assert.equal(sk.effects?.[0]?.action, 'discover');
  assert.equal(sk.effects?.[0]?.value, -2);
  assert.equal(sk.effects?.[0]?.picks, 1);
});

test('孔融〈北海举贤〉：从牌库发现 1 张人物，-2 费', () => {
  const s = setup();
  const r1 = playKongrong(s);
  assert.equal(r1.ok, true);
  const pending = r1.state.pendingDiscover;
  assert.ok(pending);
  const picked = pending.candidates[0]!;
  const r2 = applyAction(r1.state, s.ctx, { type: 'CHOOSE_DISCOVER', cardId: picked });
  assert.equal(r2.ok, true);
  const h = r2.state.sides.own.hand.find((x) => x.card.id === picked);
  assert.ok(h);
  assert.ok(h.mods.some((m) => m.kind === 'cost' && m.value === -2));
  assert.ok((h.card.cost ?? 0) - 2 >= 0);
});

test('孔融 2 费 1/3（身板 4，基准 5，−1）', () => {
  const c = real('qun_kongrong');
  assert.equal(c.cost * 2 + 1 - ((c.attack ?? 0) + (c.health ?? 0)), 1);
});
