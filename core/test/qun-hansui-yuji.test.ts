/** 韩遂〈纵横西凉〉+ 于吉〈太平仙道〉（含仙·于吉与三张符水）。 */
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
  s.state.sides.own.deck = ['qun_huatuo', 'qun_tianfeng', 'qun_yuanshu', 'qun_huaxiong'];
  return s;
}

function mk(id: string, attack: number, health: number): CardDef {
  return { id, name: id, faction: 'qun', type: 'general', cost: 3, attack, health, rarity: 'common', keywords: [] } as CardDef;
}

test('韩遂 数据形态：7 费 4/6、先攻、steal_attack', () => {
  const c = real('qun_hansui');
  assert.equal(c.cost, 7);
  assert.equal(c.attack, 4);
  assert.equal(c.health, 6);
  assert.ok((c.keywords ?? []).includes('xian_gong'));
  const sk = (c.skills ?? []).find((k) => k.id === 'zong_heng_xi_liang');
  assert.ok(sk);
  assert.equal(sk.effects?.[0]?.action, 'steal_attack');
});

test('韩遂〈纵横西凉〉：目标攻击力永久 0，韩遂获得等量攻击力', () => {
  const s = setup();
  const foe = makeUnit(mk('test_foe', 3, 3), 1, nextUidSeq(s.state));
  setUnit(s.state, 'enemy', 'front', 0, foe);
  s.state.sides.own.command.cur = 7;
  s.state.sides.own.hand = [{ card: real('qun_hansui'), mods: [] }];
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.atk, 0);
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.atk, 7);
});

test('韩遂 7 费 4/6（身板 10，基准 15，−5）', () => {
  const c = real('qun_hansui');
  assert.equal(c.cost * 2 + 1 - ((c.attack ?? 0) + (c.health ?? 0)), 5);
});

test('于吉 数据形态：2 费 1/4 传说、三选一、亡语洗入仙·于吉', () => {
  const c = real('qun_yuji');
  assert.equal(c.cost, 2);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 4);
  assert.equal(c.rarity, 'legendary');
  const sk = (c.skills ?? []).find((k) => k.id === 'tai_ping_fu_shui');
  assert.ok(sk);
  assert.equal(sk.effects?.[0]?.action, 'discover');
  assert.equal(sk.effects?.[0]?.picks, 1);
  const death = (c.skills ?? []).find((k) => k.id === 'shi_jie_cheng_xian');
  assert.ok(death);
  assert.equal(death.trigger, 'on_death');
  assert.equal(death.effects?.[0]?.unit, 'qun_yuji_xian');
});

test('于吉〈太平符水〉：展示三张符水，选 1 张入手', () => {
  const s = setup();
  s.state.sides.own.command.cur = 2;
  s.state.sides.own.hand = [{ card: real('qun_yuji'), mods: [] }];
  const r1 = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r1.ok, true);
  const pending = r1.state.pendingDiscover;
  assert.ok(pending);
  assert.equal(pending.candidates.length, 3);
  const picked = pending.candidates[0]!;
  const r2 = applyAction(r1.state, s.ctx, { type: 'CHOOSE_DISCOVER', cardId: picked });
  assert.equal(r2.ok, true);
  assert.ok(r2.state.sides.own.hand.some((h) => h.card.id === picked));
});

test('仙·于吉 数据形态：token、2 费 1/4、三张符水全部入手', () => {
  const c = real('qun_yuji_xian');
  assert.equal(c.cost, 2);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 4);
  assert.equal(c.rarity, 'common');
  const sk = (c.skills ?? []).find((k) => k.id === 'xian_dao_da_cheng');
  assert.ok(sk);
  assert.equal(sk.effects?.[0]?.picks, 3);
});

test('三张符水：类型 special、1 费', () => {
  for (const id of ['qun_fushui_zhibing', 'qun_fushui_huahuo', 'qun_fushui_shijie']) {
    const c = real(id);
    assert.equal(c.type, 'special', id);
    assert.equal(c.cost, 1, id);
  }
});

test('符水治病：治疗友方 4 + 抽 1', () => {
  const s = setup();
  s.state.sides.own.lord.hp = 20;
  s.state.sides.own.hand = [{ card: real('qun_fushui_zhibing'), mods: [] }];
  s.state.sides.own.command.cur = 1;
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'own' },
  });
  assert.equal(r.ok, true);
  assert.equal(r.state.sides.own.lord.hp, 24);
  assert.ok(r.state.sides.own.hand.length >= 1);
});

test('符水幻惑：-2 攻 + 1 回合震慑', () => {
  const s = setup();
  const foe = makeUnit(mk('test_foe', 3, 3), 1, nextUidSeq(s.state));
  setUnit(s.state, 'enemy', 'front', 0, foe);
  s.state.sides.own.hand = [{ card: real('qun_fushui_huahuo'), mods: [] }];
  s.state.sides.own.command.cur = 1;
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.equal(r.ok, true);
  const u = getUnit(r.state, 'enemy', 'front', 0)!;
  assert.equal(u.atk, 1);
  assert.ok((u.statuses.zhen_she?.stacks ?? 0) > 0);
});

test('符水尸解：友方人物获得披坚', () => {
  const s = setup();
  const ally = makeUnit(mk('test_ally', 2, 2), 0, nextUidSeq(s.state));
  setUnit(s.state, 'own', 'front', 1, ally);
  s.state.sides.own.hand = [{ card: real('qun_fushui_shijie'), mods: [] }];
  s.state.sides.own.command.cur = 1;
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'own', row: 'front', col: 1 },
  });
  assert.equal(r.ok, true);
  const u = getUnit(r.state, 'own', 'front', 1)!;
  assert.ok((u.statuses.sheng_dun_status?.stacks ?? 0) > 0);
});
