/** 何进〈诏召猛将〉—— 8 费 5/7 群雄武将（elite）。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
import { getUnit } from '../src/state.ts';
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
  // 牌库里放一张 ≤6 费武将（qun_huaxiong 3 费 3/3）和一张 >6 费（qun_lvbu 9 费）
  s.state.sides.own.deck = ['qun_lvbu', 'qun_huaxiong', 'qun_huatuo'];
  return s;
}

function playHejin(s: ReturnType<typeof setup>) {
  s.state.sides.own.command.cur = 8;
  s.state.sides.own.hand = [{ card: real('qun_hejin'), mods: [] }];
  return applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
}

test('何进 数据形态：8 费 5/7、诏召猛将、亡语', () => {
  const c = real('qun_hejin');
  assert.equal(c.cost, 8);
  assert.equal(c.attack, 5);
  assert.equal(c.health, 7);
  const sk = (c.skills ?? []).find((k) => k.id === 'zhao_zhao_meng_jiang');
  assert.ok(sk);
  assert.equal(sk.effects?.[0]?.action, 'deploy_from_deck');
  assert.equal(sk.effects?.[0]?.grant_keyword, 'xian_gong');
  assert.equal(sk.effects?.[0]?.target?.filter?.cost_max, 6);
  const death = (c.skills ?? []).find((k) => k.id === 'he_jin_wang_yu');
  assert.ok(death);
  assert.equal(death.trigger, 'on_death');
});

test('何进〈诏召猛将〉：从牌库召唤 ≤6 费武将 + 先攻', () => {
  const s = setup();
  const r = playHejin(s);
  assert.equal(r.ok, true);
  const u = getUnit(r.state, 'own', 'front', 1);
  assert.ok(u);
  assert.equal(u.cardId, 'qun_huaxiong');
  assert.ok(u.kw.includes('xian_gong') || (u.statuses.xian_gong_status?.stacks ?? 0) > 0);
});

test('何进 亡语：己方主公 3 伤（数据形态）', () => {
  const c = real('qun_hejin');
  const death = (c.skills ?? []).find((k) => k.id === 'he_jin_wang_yu');
  assert.ok(death);
  assert.equal(death.effects?.[0]?.action, 'damage');
  assert.equal(death.effects?.[0]?.target?.lord, true);
  assert.equal(death.effects?.[0]?.target?.side, 'ally');
});

test('何进 8 费 5/7（身板 12，基准 17，−5）', () => {
  const c = real('qun_hejin');
  assert.equal(c.cost * 2 + 1 - ((c.attack ?? 0) + (c.health ?? 0)), 5);
});
