/** 陈宫〈扶危就义〉/ 宋宪〈白门盗戟〉/ 臧霸〈泰山磐石〉。 */
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
  return s;
}

function mk(id: string, attack: number, health: number): CardDef {
  return { id, name: id, faction: 'qun', type: 'general', cost: 3, attack, health, rarity: 'common', keywords: [] } as CardDef;
}

test('陈宫 数据形态：3 费 1/3、扶危就义（战吼+亡语）', () => {
  const c = real('qun_chengong');
  assert.equal(c.cost, 3);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 3);
  assert.equal(c.type, 'strategist');
  const play = (c.skills ?? []).find((k) => k.id === 'fu_wei_jiu_yi');
  assert.ok(play);
  assert.equal(play.effects?.[0]?.action, 'modify');
  assert.equal(play.effects?.[1]?.status, 'sheng_dun_status');
  const death = (c.skills ?? []).find((k) => k.id === 'fu_wei_jiu_yi_death');
  assert.ok(death);
  assert.equal(death.trigger, 'on_death');
});

test('陈宫〈扶危就义〉战吼：另一名友方 +1/+1 与披坚', () => {
  const s = setup();
  const ally = makeUnit(mk('test_ally', 2, 2), 1, nextUidSeq(s.state));
  setUnit(s.state, 'own', 'front', 1, ally);
  s.state.sides.own.command.cur = 3;
  s.state.sides.own.hand = [{ card: real('qun_chengong'), mods: [] }];
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'own', row: 'front', col: 1 },
  });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'own', 'front', 1)!.atk, 3);
  assert.equal(getUnit(r.state, 'own', 'front', 1)!.maxHp, 3);
  assert.ok((r.state.sides.own.rows.front[1]?.statuses?.sheng_dun_status?.stacks ?? 0) > 0);
});

test('陈宫〈扶危就义〉亡语：全体友方（含主公）回 3', () => {
  const s = setup();
  const ally = makeUnit(mk('test_ally', 2, 3), 1, nextUidSeq(s.state));
  ally.hp = 1;
  setUnit(s.state, 'own', 'front', 1, ally);
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_chengong'), 0, nextUidSeq(s.state)));
  const foe = makeUnit(mk('test_foe', 5, 5), 0, nextUidSeq(s.state));
  setUnit(s.state, 'enemy', 'front', 0, foe);
  s.state.sides.own.lord.hp = 20;
  s.state.sides.enemy.command.cur = 99;
  const r1 = applyAction(s.state, s.ctx, { type: 'END_TURN' });
  const r2 = applyAction(r1.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.equal(r2.ok, true);
  assert.equal(getUnit(r2.state, 'own', 'front', 1)!.hp, 3);
  assert.equal(r2.state.sides.own.lord.hp, 23);
});

test('宋宪 数据形态：2 费 2/3、白门盗戟', () => {
  const c = real('qun_songxian');
  assert.equal(c.cost, 2);
  assert.equal(c.attack, 2);
  assert.equal(c.health, 3);
  const sk = (c.skills ?? []).find((k) => k.id === 'bai_men_dao_ji');
  assert.ok(sk);
  assert.equal(sk.effects?.[0]?.status, 'zhen_she');
  assert.equal(sk.effects?.[1]?.condition?.chosen_attack_min, 4);
});

test('宋宪〈白门盗戟〉：目标攻 ≥4 → 震慑 + 自己永久 +2 攻', () => {
  const s = setup();
  const foe = makeUnit(mk('test_big', 4, 4), 1, nextUidSeq(s.state));
  setUnit(s.state, 'enemy', 'front', 0, foe);
  s.state.sides.own.command.cur = 2;
  s.state.sides.own.hand = [{ card: real('qun_songxian'), mods: [] }];
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.statuses?.zhen_she?.stacks, 1);
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.atk, 4);
});

test('宋宪〈白门盗戟〉：目标攻 <4 → 只有震慑，自己不加攻', () => {
  const s = setup();
  const foe = makeUnit(mk('test_small', 3, 3), 1, nextUidSeq(s.state));
  setUnit(s.state, 'enemy', 'front', 0, foe);
  s.state.sides.own.command.cur = 2;
  s.state.sides.own.hand = [{ card: real('qun_songxian'), mods: [] }];
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.atk, 2);
});

test('臧霸 数据形态：4 费 3/6、架盾、泰山磐石（once）', () => {
  const c = real('qun_zangba');
  assert.equal(c.cost, 4);
  assert.equal(c.attack, 3);
  assert.equal(c.health, 6);
  assert.ok((c.keywords ?? []).includes('jia_dun'));
  const sk = (c.skills ?? []).find((k) => k.id === 'tai_shan_pan_shi');
  assert.ok(sk);
  assert.equal(sk.trigger, 'on_damaged');
  assert.equal(sk.frequency, 'once');
});

test('臧霸〈泰山磐石〉：受击未死永久 +2 攻（只一次）', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_zangba'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(mk('test_foe', 3, 3), 0, nextUidSeq(s.state)));
  s.state.sides.enemy.command.cur = 99;
  const r1 = applyAction(s.state, s.ctx, { type: 'END_TURN' });
  const r2 = applyAction(r1.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.equal(r2.ok, true);
  assert.equal(getUnit(r2.state, 'own', 'front', 0)!.atk, 5);
  const r3 = applyAction(r2.state, s.ctx, { type: 'END_TURN' });
  const r4 = applyAction(r3.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.equal(getUnit(r4.state, 'own', 'front', 0)!.atk, 5, '只触发一次，不会叠到 7');
});

test('身板：陈宫 3/1/3（−3）、宋宪 2/2/3（0）、臧霸 4/3/6（0）', () => {
  const cg = real('qun_chengong');
  assert.equal(cg.cost * 2 + 1 - ((cg.attack ?? 0) + (cg.health ?? 0)), 3);
  const sx = real('qun_songxian');
  assert.equal(sx.cost * 2 + 1 - ((sx.attack ?? 0) + (sx.health ?? 0)), 0);
  const zb = real('qun_zangba');
  assert.equal(zb.cost * 2 + 1 - ((zb.attack ?? 0) + (zb.health ?? 0)), 0);
});

/* ===== 审计补齐：此前只靠 verify:dsl 的两张群雄卡 ===== */

