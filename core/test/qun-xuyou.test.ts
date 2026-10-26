/** 许攸〈恃旧不虔〉—— 3 费 1/3 群雄谋臣（elite），光环。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recomputeAuras } from '../src/effects.ts';
import { createRng } from '../src/rng.ts';
import { makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { scenario } from './fixtures.ts';
import type { CardDef } from '../src/types.ts';

const cards: CardDef[] = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const real = (id: string): CardDef => {
  const card = cards.find((c) => c.id === id);
  assert.ok(card, id);
  return card;
};

test('许攸 数据形态：3 费 1/3、恃旧不虔、光环', () => {
  const c = real('qun_xuyou');
  assert.equal(c.cost, 3);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 3);
  const sk = (c.skills ?? []).find((k) => k.id === 'shi_jiu_bu_qian');
  assert.ok(sk);
  assert.equal(sk.kind, 'aura');
  assert.equal(sk.effects?.[0]?.action, 'cost_modifier');
  assert.equal(sk.effects?.[0]?.value, -1);
});

test('许攸〈恃旧不虔〉：手牌全部 −1 费', () => {
  const s = scenario({});
  for (const c of cards) s.ctx.cards.set(c.id, c);
  const xuyou = makeUnit(real('qun_xuyou'), 0, nextUidSeq(s.state));
  setUnit(s.state, 'own', 'front', 0, xuyou);
  s.state.sides.own.hand = [
    { card: real('qun_huatuo'), mods: [] },
    { card: real('qun_yuanshu'), mods: [] },
  ];
  recomputeAuras(s.state, s.ctx.cards, createRng(s.state.rngState), []);
  for (const h of s.state.sides.own.hand) {
    assert.ok(h.mods.some((m) => m.kind === 'cost' && m.value === -1));
  }
});

test('许攸〈恃旧不虔〉：己方主公被禁言（block_lord_skill）', () => {
  const s = scenario({});
  for (const c of cards) s.ctx.cards.set(c.id, c);
  const xuyou = makeUnit(real('qun_xuyou'), 0, nextUidSeq(s.state));
  setUnit(s.state, 'own', 'front', 0, xuyou);
  recomputeAuras(s.state, s.ctx.cards, createRng(s.state.rngState), []);
  assert.ok((s.state.sides.own.lord.statuses?.jin_yan?.stacks ?? 0) > 0);
});

test('许攸 3 费 1/3（身板 4，基准 7，−3）', () => {
  const c = real('qun_xuyou');
  assert.equal(c.cost * 2 + 1 - ((c.attack ?? 0) + (c.health ?? 0)), 3);
});
