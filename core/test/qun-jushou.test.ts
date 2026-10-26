/**
 * 沮授〈缓师蓄粮〉—— 4 费 1/5 群雄谋臣（`yuan_shi` / elite）。
 *
 * 设计者定稿（2026-10-21）：
 *   己方回合结束时，每有 2 点未使用的统率，便抽 1 张牌，
 *   并为随机一名已受伤的友方角色（含主公）恢复 2 点生命（每回合最多触发 3 次）。
 *
 * 引擎：新增 `count_from`（resource: command / divisor / max，ADR-183），
 * 读回合结束时的 `command.cur`；`draw`/`heal` 各自按次数重复，`heal` 每次重新随机。
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
  // 抽牌测试需要牌库非空；否则 draw 会触发 FATIGUE（并对主公造成 1 点伤害），
  // 把「已受伤的友方」池子搅乱（lord 被疲劳打伤后会被 include_lord 选中）。
  s.state.sides.own.deck = ['qun_huatuo', 'qun_tianfeng', 'qun_yuanshu', 'qun_huaxiong', 'qun_caiwenji'];
  return s;
}

function mk(id: string, attack: number, health: number): CardDef {
  return {
    id, name: id, faction: 'qun', type: 'general', cost: 3,
    attack, health, rarity: 'common', keywords: [],
  } as CardDef;
}

function placeOwn(s: ReturnType<typeof setup>, state: ReturnType<typeof setup>['state'],
  card: CardDef, col: number, hp: number) {
  const u = makeUnit(card, 0, nextUidSeq(state));
  u.hp = hp;
  setUnit(state, 'own', 'front', col, u);
  return u;
}

function playJushou(s: ReturnType<typeof setup>) {
  s.state.sides.own.command.cur = 4;
  s.state.sides.own.hand = [{ card: real('qun_jushou'), mods: [] }];
  return applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
  });
}

function endTurn(s: ReturnType<typeof setup>, state: ReturnType<typeof setup>['state'], unused: number) {
  state.sides.own.command.cur = unused;
  return applyAction(state, s.ctx, { type: 'END_TURN' });
}

/* =====================================================================
 * 1. 数据形态
 * ===================================================================== */
test('沮授 数据形态：4 费 1/5 谋臣、turn_end、缓师蓄粮', () => {
  const c = real('qun_jushou');
  assert.equal(c.cost, 4);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 5);
  assert.equal(c.type, 'strategist');
  const sk = (c.skills ?? []).find((k) => k.id === 'huan_shi_xu_liang');
  assert.ok(sk);
  assert.equal(sk.name, '缓师蓄粮');
  assert.equal(sk.trigger, 'turn_end');
  const draw = sk.effects?.[0];
  const heal = sk.effects?.[1];
  assert.equal(draw?.action, 'draw');
  assert.deepEqual(draw?.count_from, { resource: 'command', divisor: 2, max: 3 });
  assert.equal(heal?.action, 'heal');
  assert.deepEqual(heal?.count_from, { resource: 'command', divisor: 2, max: 3 });
  assert.equal(heal?.target?.filter?.damaged, true);
  assert.equal(heal?.target?.filter?.include_lord, true);
  assert.equal(heal?.target?.mode, 'random');
});

/* =====================================================================
 * 2. 0 点未使用统率 → 不抽不治
 * ===================================================================== */
test('0 点未使用统率 → 不抽不治', () => {
  const s = setup();
  const st = playJushou(s).state;
  placeOwn(s, st, mk('test_friend', 5, 5), 1, 3);
  const r = endTurn(s, st, 0);
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'own', 'front', 1)?.hp, 3);
  assert.equal(r.state.sides.own.hand.length, 0);
});

/* =====================================================================
 * 3. 2 点 → 1 次（抽 1 + 治疗 2）
 * ===================================================================== */
test('2 点未使用统率 → 抽 1 + 治疗 2', () => {
  const s = setup();
  const st = playJushou(s).state;
  placeOwn(s, st, mk('test_friend', 5, 5), 1, 3);
  const r = endTurn(s, st, 2);
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'own', 'front', 1)?.hp, 5);
  assert.equal(r.state.sides.own.hand.length, 1);
});

/* =====================================================================
 * 4. 4 点 → 2 次（抽 2 + 治疗 4）
 * ===================================================================== */
test('4 点未使用统率 → 2 次（抽 2 + 治疗 4）', () => {
  const s = setup();
  const st = playJushou(s).state;
  placeOwn(s, st, mk('test_friend', 5, 5), 1, 1);
  const r = endTurn(s, st, 4);
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'own', 'front', 1)?.hp, 5);
  assert.equal(r.state.sides.own.hand.length, 2);
});

/* =====================================================================
 * 5. 8 点 → 封顶 3 次
 * ===================================================================== */
test('8 点未使用统率 → 封顶 3 次（抽 3 + 治疗 6）', () => {
  const s = setup();
  const st = playJushou(s).state;
  placeOwn(s, st, mk('test_friend', 10, 10), 1, 1);
  const r = endTurn(s, st, 8);
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'own', 'front', 1)?.hp, 7);
  assert.equal(r.state.sides.own.hand.length, 3);
});

/* =====================================================================
 * 6. 只有主公受伤 → 治疗主公
 * ===================================================================== */
test('只有主公受伤 → 治疗主公 2', () => {
  const s = setup();
  const st = playJushou(s).state;
  st.sides.own.lord.hp = 10;
  const r = endTurn(s, st, 2);
  assert.equal(r.ok, true);
  assert.equal(r.state.sides.own.lord.hp, 12);
  assert.equal(r.state.sides.own.hand.length, 1);
});

/* =====================================================================
 * 7. 没有受伤友方 → 只抽牌、不治疗
 * ===================================================================== */
test('没有受伤友方 → 只抽牌、不治疗', () => {
  const s = setup();
  const st = playJushou(s).state;
  placeOwn(s, st, mk('test_friend', 5, 5), 1, 5);
  const r = endTurn(s, st, 2);
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'own', 'front', 1)?.hp, 5);
  assert.equal(r.state.sides.own.hand.length, 1);
});

/* =====================================================================
 * 8. 两名受伤友方 → 随机一名 +2（总量 2）
 * ===================================================================== */
test('两名受伤友方 → 随机一名 +2', () => {
  const s = setup();
  const st = playJushou(s).state;
  placeOwn(s, st, mk('test_fa', 5, 5), 1, 3);
  placeOwn(s, st, mk('test_fb', 5, 5), 2, 3);
  const r = endTurn(s, st, 2);
  assert.equal(r.ok, true);
  const ha = getUnit(r.state, 'own', 'front', 1)?.hp ?? 0;
  const hb = getUnit(r.state, 'own', 'front', 2)?.hp ?? 0;
  assert.equal(ha + hb, 8);
  assert.equal(r.state.sides.own.hand.length, 1);
});
