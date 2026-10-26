/**
 * 颜良〈白马搦战〉—— 5 费 5/5 群雄武将（`yuan_shi` / elite）。
 *
 * 设计者定稿（2026-10-21）：
 *   战吼：指定一名敌将立即攻击颜良（`duel`：双方各打一次真实普攻，含反击）。
 *   若将其反杀（`on_kill`）：敌主公获得「断粮 2」（统率上限 −2），并抽 1 张牌。
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

function playYanliang(
  s: ReturnType<typeof setup>,
  target: { kind: 'unit'; side: 'enemy'; row: 'front'; col: number },
) {
  s.state.sides.own.command.cur = 5;
  s.state.sides.own.hand = [{ card: real('qun_yanliang'), mods: [] }];
  return applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0, target,
  });
}

/* =====================================================================
 * 1. 数据形态
 * ===================================================================== */
test('颜良 数据形态：5 费 5/5、白马搦战 duel、反杀断粮', () => {
  const c = real('qun_yanliang');
  assert.equal(c.cost, 5);
  assert.equal(c.attack, 5);
  assert.equal(c.health, 5);
  const zhan = (c.skills ?? []).find((k) => k.id === 'bai_ma_nuo_zhan');
  assert.ok(zhan);
  assert.equal(zhan.trigger, 'on_play');
  assert.equal(zhan.effects?.[0]?.action, 'duel');
  const fan = (c.skills ?? []).find((k) => k.id === 'fan_sha_duan_liang');
  assert.ok(fan);
  assert.equal(fan.trigger, 'on_kill');
  assert.equal(fan.effects?.[0]?.action, 'apply_status');
  assert.equal(fan.effects?.[0]?.status, 'duan_liang');
  assert.equal(fan.effects?.[0]?.stacks, 2);
  assert.equal(fan.effects?.[1]?.action, 'draw');
});

/* =====================================================================
 * 2. 5/5 打 3/3：反杀 → 断粮 2 + 抽 1
 * ===================================================================== */
test('颜良〈白马搦战〉：决斗 3/3 反杀 → 敌主公断粮 2 + 抽 1', () => {
  const s = setup();
  placeEnemy(s, mk('test_gen3', 3, 3));
  const r = playYanliang(s, { kind: 'unit', side: 'enemy', row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0), null);
  assert.equal(r.state.sides.enemy.lord.statuses?.duan_liang?.stacks ?? 0, 2);
  assert.equal(r.state.sides.own.hand.length, 1);
});

/* =====================================================================
 * 3. 5/5 打 4/4：反杀
 * ===================================================================== */
test('颜良〈白马搦战〉：决斗 4/4 反杀', () => {
  const s = setup();
  placeEnemy(s, mk('test_gen4', 4, 4));
  const r = playYanliang(s, { kind: 'unit', side: 'enemy', row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0), null);
  assert.equal(r.state.sides.enemy.lord.statuses?.duan_liang?.stacks ?? 0, 2);
});

/* =====================================================================
 * 4. 5/5 打 6/6：颜良被反杀，不触发
 * ===================================================================== */
test('颜良〈白马搦战〉：决斗 6/6 颜良被反杀，不触发断粮', () => {
  const s = setup();
  placeEnemy(s, mk('test_gen6', 6, 6));
  const r = playYanliang(s, { kind: 'unit', side: 'enemy', row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'own', 'front', 0), null);
  assert.equal(r.state.sides.enemy.lord.statuses?.duan_liang?.stacks ?? 0, 0);
  assert.equal(r.state.sides.own.hand.length, 0);
});

/* =====================================================================
 * 5. 5 费 5/5
 * ===================================================================== */
test('颜良 5 费 5/5（身板 10，基准 11，−1）', () => {
  const c = real('qun_yanliang');
  assert.equal(c.cost * 2 + 1 - ((c.attack ?? 0) + (c.health ?? 0)), 1);
});
