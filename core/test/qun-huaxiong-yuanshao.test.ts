/** 华雄〈威震四方〉/ 袁绍〈号令四州〉/ 万箭齐发（ADR-195）。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
import { drawCard, killUnit } from '../src/mutate.ts';
import { createRng } from '../src/rng.ts';
import { getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { scenario } from './fixtures.ts';
import type { CardDef, GameEvent } from '../src/types.ts';

const cards: CardDef[] = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const real = (id: string): CardDef => {
  const card = cards.find((c) => c.id === id);
  assert.ok(card, id);
  return card;
};

function setup() {
  const s = scenario({});
  for (const c of cards) s.ctx.cards.set(c.id, c);
  s.state.sides.own.deck = ['qun_huatuo', 'qun_yuanshu'];
  s.state.sides.enemy.deck = ['qun_huatuo', 'qun_yuanshu'];
  return s;
}

function mk(id: string, attack: number, health: number): CardDef {
  return { id, name: id, faction: 'qun', type: 'general', cost: 3, attack, health, rarity: 'common', keywords: [] } as CardDef;
}

test('华雄 数据形态：3 费 4/4、击杀成长 + 亡语给击杀者', () => {
  const c = real('qun_huaxiong');
  assert.equal(c.cost, 3);
  assert.equal(c.attack, 4);
  assert.equal(c.health, 4);
  const triggers = (c.skills ?? []).map((s) => s.trigger);
  assert.deepEqual(triggers, ['on_kill', 'on_death']);
  const death = (c.skills ?? []).find((s) => s.trigger === 'on_death')!;
  assert.equal(death.effects?.[0]?.target?.event, 'killer');
});

test('华雄〈威震四方〉：击杀后永久 +1/+1', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_huaxiong'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(mk('prey', 1, 1), 0, nextUidSeq(s.state)));
  const r = applyAction(s.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.equal(r.ok, true);
  const hx = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(hx.atk, 5, '4 + 1');
  assert.equal(hx.maxHp, 5, '4 + 1');
});

test('华雄〈遗计·威震四方〉：击杀者永久 +1/+1', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_huaxiong'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(mk('slayer', 3, 3), 0, nextUidSeq(s.state)));
  const evs: GameEvent[] = [];
  const me = getUnit(s.state, 'own', 'front', 0)!;
  killUnit(s.state, s.ctx.cards, { side: 'own', row: 'front', col: 0, unit: me }, evs, { side: 'enemy', row: 'front', col: 0 });
  const killer = getUnit(s.state, 'enemy', 'front', 0)!;
  assert.equal(killer.atk, 4, '击杀者 +1 攻');
  assert.equal(killer.maxHp, 4, '击杀者 +1 上限');
});

test('袁绍 数据形态：6 费 3/6、号令四州', () => {
  const c = real('qun_yuanshao');
  assert.equal(c.cost, 6);
  assert.equal(c.attack, 3);
  assert.equal(c.health, 6);
  assert.ok((c.tags ?? []).includes('yuan_shi'));
  const sk = (c.skills ?? []).find((s) => s.id === 'hao_ling_si_zhou');
  assert.ok(sk);
  assert.equal(sk.trigger, 'on_play');
  assert.deepEqual((sk.effects ?? []).map((e) => e.action), ['summon', 'add_to_hand', 'add_to_deck']);
  assert.equal(sk.effects?.[2]?.value_from?.filter?.tag, 'yuan_shi');
});

test('袁绍〈号令四州〉：召士族兵 + 1 张万箭入手 + 每名袁氏洗 1 张进牌库', () => {
  const s = setup();
  s.state.sides.own.command.cur = 10;
  s.state.sides.own.deck = [];
  s.state.sides.own.hand = [{ card: real('qun_yuanshao'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  const shizu = r.state.sides.own.rows.front.find((u) => u?.cardId === 'qun_shizubing');
  assert.ok(shizu, '应召唤 1/2 士族兵');
  assert.equal(shizu!.atk, 1);
  assert.equal(shizu!.maxHp, 2);
  assert.ok((shizu!.tags ?? []).includes('yuan_shi'));
  assert.equal(r.state.sides.own.hand.filter((h) => h.card.id === 'tactic_wanjianqifa').length, 1, '1 张进手牌');
  assert.equal(r.state.sides.own.deck.filter((x) => x === 'tactic_wanjianqifa').length, 2,
    '袁绍自己 + 士族兵 = 2 名袁氏 → 2 张进牌库');
});

test('士族兵 数据形态：1/2 袁氏衍生物', () => {
  const c = real('qun_shizubing');
  assert.equal(c.attack, 1);
  assert.equal(c.health, 2);
  assert.ok((c.tags ?? []).includes('yuan_shi'));
});

test('万箭齐发：2 费普通战法，抽到不自动释放', () => {
  const c = real('tactic_wanjianqifa');
  assert.equal(c.cost, 2);
  assert.equal((c.skills ?? []).length, 0, '不再有 on_draw 技能');
  assert.equal(c.effects?.length, 2);
  const s = setup();
  s.state.sides.own.deck = ['tactic_wanjianqifa'];
  const evs: GameEvent[] = [];
  drawCard(s.state, s.ctx.cards, 'own', evs);
  assert.ok(s.state.sides.own.hand.some((h) => h.card.id === 'tactic_wanjianqifa'), '抽到进手牌');
  assert.ok(!evs.some((e) => e.type === 'CARD_AUTO_CAST'), '不应自动释放');
});

test('万箭齐发：敌方全体 1 伤，已受伤的目标多受 1（共 2），主公只吃 1', () => {
  const s = setup();
  const healthy = makeUnit(mk('healthy', 1, 5), 0, nextUidSeq(s.state));
  const wounded = makeUnit(mk('wounded', 1, 5), 0, nextUidSeq(s.state));
  wounded.hp = 3;
  setUnit(s.state, 'enemy', 'front', 0, healthy);
  setUnit(s.state, 'enemy', 'front', 1, wounded);
  s.state.sides.own.command.cur = 10;
  s.state.sides.own.hand = [{ card: real('tactic_wanjianqifa'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 4, '健康：1 点');
  assert.equal(getUnit(r.state, 'enemy', 'front', 1)!.hp, 1, '已受伤：3 − 2 = 1');
  assert.equal(r.state.sides.enemy.lord.hp, 29, '主公 1 点，不额外');
});
