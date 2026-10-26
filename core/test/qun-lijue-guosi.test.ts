/** 李傕〈纵兵劫掠〉+ 郭汜〈公卿尽质〉+ 双将〈劫掠长安〉。 */
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

test('李傕 数据形态：8 费 5/5、纵兵劫掠', () => {
  const c = real('qun_lijue');
  assert.equal(c.cost, 8);
  assert.equal(c.attack, 5);
  assert.equal(c.health, 5);
  const sk = (c.skills ?? []).find((k) => k.id === 'zong_bing_jie_lue');
  assert.ok(sk);
  assert.equal(sk.effects?.[0]?.health, -1);
  assert.equal(sk.effects?.[2]?.status, 'duan_liang');
  assert.equal(sk.effects?.[2]?.target?.side, 'both');
});

test('李傕〈纵兵劫掠〉：敌方全体 −1 上限，李傕 +N 上限，双方断粮 2', () => {
  const s = setup();
  const f1 = makeUnit(mk('test_f1', 3, 3), 1, nextUidSeq(s.state));
  const f2 = makeUnit(mk('test_f2', 3, 3), 1, nextUidSeq(s.state));
  setUnit(s.state, 'enemy', 'front', 0, f1);
  setUnit(s.state, 'enemy', 'front', 1, f2);
  s.state.sides.own.command.cur = 8;
  s.state.sides.own.hand = [{ card: real('qun_lijue'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.maxHp, 2);
  assert.equal(getUnit(r.state, 'enemy', 'front', 1)!.maxHp, 2);
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.maxHp, 7);
  assert.equal(r.state.sides.own.lord.statuses?.duan_liang?.stacks ?? 0, 2);
  assert.equal(r.state.sides.enemy.lord.statuses?.duan_liang?.stacks ?? 0, 2);
});

test('郭汜 数据形态：3 费 3/4、公卿尽质、劫掠长安', () => {
  const c = real('qun_guosi');
  assert.equal(c.cost, 3);
  assert.equal(c.attack, 3);
  assert.equal(c.health, 4);
  const sk = (c.skills ?? []).find((k) => k.id === 'gong_qing_jin_zhi');
  assert.ok(sk);
  assert.equal(sk.effects?.[0]?.action, 'cost_modifier');
  assert.equal(sk.effects?.[0]?.value, 2);
});

test('郭汜〈公卿尽质〉：2 张人物 +2 费，挂待劫标记', () => {
  const s = setup();
  s.state.sides.enemy.hand = [
    { card: real('qun_huatuo'), mods: [] },
    { card: real('qun_tianfeng'), mods: [] },
  ];
  s.state.sides.own.hand = [{ card: real('qun_guosi'), mods: [] }];
  s.state.sides.own.command.cur = 3;
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  for (const h of r.state.sides.enemy.hand) {
    assert.ok(h.mods.some((m) => m.kind === 'cost' && m.value === 2));
  }
  assert.ok((r.state.sides.enemy.lord.statuses?.gong_qing_pending?.stacks ?? 0) > 0);
});

test('双将〈劫掠长安〉：李傕在场时郭汜入场，抢 2 张并 −2 费', () => {
  const s = setup();
  const lijue = makeUnit(real('qun_lijue'), 1, nextUidSeq(s.state));
  setUnit(s.state, 'own', 'front', 1, lijue);
  s.state.sides.enemy.hand = [
    { card: real('qun_huatuo'), mods: [] },
    { card: real('qun_tianfeng'), mods: [] },
    { card: real('qun_yuanshu'), mods: [] },
  ];
  s.state.sides.own.hand = [{ card: real('qun_guosi'), mods: [] }];
  s.state.sides.own.command.cur = 3;
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(r.state.sides.own.hand.length, 2);
  for (const h of r.state.sides.own.hand) {
    assert.ok(h.mods.some((m) => m.kind === 'cost' && m.value === -2));
  }
});

test('身板：李傕 8/5/5（−7）、郭汜 3/3/4（0）', () => {
  const l = real('qun_lijue');
  assert.equal(l.cost * 2 + 1 - ((l.attack ?? 0) + (l.health ?? 0)), 7);
  const g = real('qun_guosi');
  assert.equal(g.cost * 2 + 1 - ((g.attack ?? 0) + (g.health ?? 0)), 0);
});
