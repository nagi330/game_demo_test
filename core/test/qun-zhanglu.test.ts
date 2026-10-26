/** 张鲁〈义舍〉—— 3 费 1/3 群雄谋臣（elite）。 */
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
  s.state.sides.own.deck = ['qun_huatuo', 'qun_tianfeng', 'qun_yuanshu', 'qun_huaxiong'];
  s.state.sides.enemy.deck = ['qun_caiwenji', 'qun_caimao'];
  return s;
}

function playZhanglu(s: ReturnType<typeof setup>, handCount: number, enemyHandCount: number) {
  s.state.sides.own.command.cur = 3;
  s.state.sides.own.hand = [{ card: real('qun_zhanglu'), mods: [] }];
  for (let i = 1; i < handCount; i++) s.state.sides.own.hand.push({ card: real('qun_huatuo'), mods: [] });
  for (let i = 0; i < enemyHandCount; i++) s.state.sides.enemy.hand.push({ card: real('qun_caiwenji'), mods: [] });
  return applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
}

test('张鲁 数据形态：3 费 1/3、义舍', () => {
  const c = real('qun_zhanglu');
  assert.equal(c.cost, 3);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 3);
  const sk = (c.skills ?? []).find((k) => k.id === 'yi_she');
  assert.ok(sk);
  assert.equal(sk.effects?.[0]?.action, 'draw');
  assert.equal(sk.effects?.[2]?.action, 'damage');
  assert.equal(sk.effects?.[2]?.condition?.count_vs?.op, '>=');
});

test('张鲁〈义舍〉：敌手牌 ≥ 你 → 敌主公 3 伤 + 己主公回 3', () => {
  const s = setup();
  s.state.sides.own.lord.hp = 20;
  const r = playZhanglu(s, 2, 3);   // 我方 2 手牌、敌方 3 手牌 → 抽后 4 vs 4，>= 成立
  assert.equal(r.ok, true);
  assert.equal(r.state.sides.enemy.lord.hp, 27);
  assert.equal(r.state.sides.own.lord.hp, 23);
});

test('张鲁〈义舍〉：敌手牌 < 你 → 不触发伤害/治疗', () => {
  const s = setup();
  s.state.sides.own.lord.hp = 20;
  const r = playZhanglu(s, 4, 0);   // 抽后 6 vs 1，< 不成立
  assert.equal(r.ok, true);
  assert.equal(r.state.sides.enemy.lord.hp, 30);
  assert.equal(r.state.sides.own.lord.hp, 20);
});

test('张鲁 3 费 1/3（身板 4，基准 7，−3）', () => {
  const c = real('qun_zhanglu');
  assert.equal(c.cost * 2 + 1 - ((c.attack ?? 0) + (c.health ?? 0)), 3);
});
