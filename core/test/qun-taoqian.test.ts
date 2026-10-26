/** 陶谦〈三让徐州〉—— 6 费 1/5 群雄谋臣（elite）。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
import { getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { killUnit } from '../src/mutate.ts';
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

function playTaoqian(s: ReturnType<typeof setup>, extra: string[] = []) {
  s.state.sides.own.command.cur = 6;
  s.state.sides.own.hand = [{ card: real('qun_taoqian'), mods: [] }];
  for (const id of extra) s.state.sides.own.hand.push({ card: real(id), mods: [] });
  return applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
}

function mk(id: string, attack: number, health: number): CardDef {
  return { id, name: id, faction: 'qun', type: 'general', cost: 3, attack, health, rarity: 'common', keywords: [] } as CardDef;
}

test('陶谦 数据形态：6 费 1/5、三让徐州、亡语', () => {
  const c = real('qun_taoqian');
  assert.equal(c.cost, 6);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 5);
  const sk = (c.skills ?? []).find((k) => k.id === 'san_rang_xu_zhou');
  assert.ok(sk);
  assert.equal(sk.trigger, 'turn_end');
  assert.equal(sk.effects?.[0]?.action, 'modify');
  assert.equal(sk.effects?.[1]?.action, 'cost_modifier');
  const death = (c.skills ?? []).find((k) => k.id === 'tao_qian_wang_yu');
  assert.ok(death);
  assert.equal(death.trigger, 'on_death');
  assert.equal(death.effects?.[1]?.target?.lord, true);
});

test('陶谦〈三让徐州〉：手牌最高费武将 +2/+2 且 −1 费', () => {
  const s = setup();
  const r1 = playTaoqian(s, ['qun_yuanshu', 'qun_lvbu']);   // 5 费 / 9 费，最高是吕布
  const st = r1.state;
  const r2 = applyAction(st, s.ctx, { type: 'END_TURN' });
  assert.equal(r2.ok, true);
  const lvbu = r2.state.sides.own.hand.find((h) => h.card.id === 'qun_lvbu');
  assert.ok(lvbu);
  assert.ok(lvbu.mods.some((m) => m.kind === 'attack' && m.value === 2));
  assert.ok(lvbu.mods.some((m) => m.kind === 'health' && m.value === 2));
  assert.ok(lvbu.mods.some((m) => m.kind === 'cost' && m.value === -1));
  const yuanshu = r2.state.sides.own.hand.find((h) => h.card.id === 'qun_yuanshu');
  assert.ok(yuanshu);
  assert.equal(yuanshu.mods.length, 0);
});

test('陶谦〈三让徐州〉：手牌没有武将 → 不触发', () => {
  const s = setup();
  const r1 = playTaoqian(s, []);
  const r2 = applyAction(r1.state, s.ctx, { type: 'END_TURN' });
  assert.equal(r2.ok, true);
  assert.equal(r2.state.sides.own.hand.length, 0);
});

test('陶谦 亡语：随机其他友方 +1/+5，主公回 3', () => {
  const s = setup();
  s.state.sides.own.lord.hp = 20;
  const ally = makeUnit(mk('test_ally', 2, 2), 1, nextUidSeq(s.state));
  setUnit(s.state, 'own', 'front', 1, ally);
  const r1 = playTaoqian(s);
  const st = r1.state;
  const unit = getUnit(st, 'own', 'front', 0)!;
  const events: { type: string }[] = [];
  killUnit(st, s.ctx.cards, { side: 'own', row: 'front', col: 0, unit }, events as never);
  const buffed = getUnit(st, 'own', 'front', 1)!;
  assert.equal(buffed.atk, 3);
  assert.equal(buffed.maxHp, 7);
  assert.equal(st.sides.own.lord.hp, 23);
});

test('陶谦 6 费 1/5（身板 6，基准 13，−7）', () => {
  const c = real('qun_taoqian');
  assert.equal(c.cost * 2 + 1 - ((c.attack ?? 0) + (c.health ?? 0)), 7);
});
