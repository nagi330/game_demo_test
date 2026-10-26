/** 田丰〈举杖击地〉/ 马腾〈西凉统领〉（ADR-194）。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
import { effectiveCost } from '../src/mutate.ts';
import { getUnit, hasTrait, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
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
  s.state.sides.own.deck = ['qun_huatuo', 'qun_yuanshu', 'qun_lvbu', 'qun_huaxiong', 'qun_mateng'];
  s.state.sides.enemy.deck = ['qun_huatuo', 'qun_yuanshu'];
  return s;
}

function mk(id: string, attack: number, health: number): CardDef {
  return { id, name: id, faction: 'qun', type: 'general', cost: 3, attack, health, rarity: 'common', keywords: [] } as CardDef;
}

test('田丰 数据形态：3 费 1/4 谋臣、举杖击地（discover + unplayed_penalty）', () => {
  const c = real('qun_tianfeng');
  assert.equal(c.cost, 3);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 4);
  assert.equal(c.type, 'strategist');
  assert.ok((c.tags ?? []).includes('yuan_shi'));
  assert.equal(c.rarity, 'elite');
  const sk = (c.skills ?? []).find((s) => s.id === 'ju_zhang_ji_di');
  assert.ok(sk);
  const eff = sk.effects?.[0];
  assert.equal(eff?.action, 'discover');
  assert.equal(eff?.value, -1);
  assert.equal(eff?.unplayed_penalty?.damage, 1);
});

test('田丰〈举杖击地〉：发现并 −1 费，pendingUnplayed 被记录', () => {
  const s = setup();
  s.state.sides.own.command.cur = 3;
  s.state.sides.own.hand = [{ card: real('qun_tianfeng'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  const pending = r.state.pendingDiscover!;
  assert.ok(pending, '应进入发现选择');
  assert.equal(pending.candidates.length, 3);

  const pick = pending.candidates[0]!;
  const r2 = applyAction(r.state, s.ctx, { type: 'CHOOSE_DISCOVER', cardId: pick });
  assert.equal(r2.ok, true);
  const hc = r2.state.sides.own.hand.find((h) => h.card.id === pick)!;
  assert.ok(hc, '发现的牌应入手');
  assert.equal(effectiveCost(hc), Math.max(0, real(pick).cost - 1), '费用 −1');
  assert.ok(r2.state.pendingUnplayed, '待结算项应被记录');
});

test('田丰〈举杖击地〉：本回合没打出 → 回合结束弃掉并炸敌方全体 1', () => {
  const s = setup();
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(mk('e1', 3, 3), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'enemy', 'front', 1, makeUnit(mk('e2', 4, 4), 0, nextUidSeq(s.state)));
  s.state.sides.own.command.cur = 3;
  s.state.sides.own.hand = [{ card: real('qun_tianfeng'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  const pick = r.state.pendingDiscover!.candidates[0]!;
  const r2 = applyAction(r.state, s.ctx, { type: 'CHOOSE_DISCOVER', cardId: pick });
  assert.equal(r2.state.sides.own.hand.length, 1);

  const r3 = applyAction(r2.state, s.ctx, { type: 'END_TURN' });
  assert.equal(r3.state.sides.own.hand.length, 0, '未打出的发现牌被弃掉');
  assert.ok(r3.state.sides.own.discard.some((c) => c.id === pick));
  assert.equal(getUnit(r3.state, 'enemy', 'front', 0)!.hp, 2, '敌方全体人物各吃 1');
  assert.equal(getUnit(r3.state, 'enemy', 'front', 1)!.hp, 3);
  assert.equal(r3.state.sides.enemy.lord.hp, 30, '主公不在此列');
});

test('田丰〈举杖击地〉：本回合打出了 → 不弃也不炸', () => {
  const s = setup();
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(mk('e3', 4, 4), 0, nextUidSeq(s.state)));
  s.state.sides.own.command.cur = 10;
  s.state.sides.own.hand = [{ card: real('qun_tianfeng'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  const pick = 'qun_huatuo';
  const r2 = applyAction(r.state, s.ctx, { type: 'CHOOSE_DISCOVER', cardId: pick });
  assert.equal(r2.ok, true);
  const idx = r2.state.sides.own.hand.findIndex((h) => h.card.id === pick);
  assert.ok(idx >= 0);
  assert.equal(effectiveCost(r2.state.sides.own.hand[idx]!), Math.max(0, real(pick).cost - 1), '费用 −1');

  const r3 = applyAction(r2.state, s.ctx, { type: 'PLAY_CARD', cardIndex: idx, row: 'front', col: 1 });
  assert.equal(r3.ok, true, '打出发现在的牌');
  const r4 = applyAction(r3.state, s.ctx, { type: 'END_TURN' });
  assert.equal(getUnit(r4.state, 'enemy', 'front', 0)!.hp, 4, '打出了就不炸');
  assert.ok(!r4.state.sides.own.discard.some((c) => c.id === pick));
  assert.equal(getUnit(r4.state, 'own', 'front', 1)!.cardId, pick);
});

test('马腾 数据形态：5 费 4/4 先攻、西凉统领', () => {
  const c = real('qun_mateng');
  assert.equal(c.cost, 5);
  assert.equal(c.attack, 4);
  assert.equal(c.health, 4);
  assert.equal(c.type, 'general');
  assert.equal(c.rarity, 'elite');
  assert.ok((c.tags ?? []).includes('xi_liang'));
  assert.ok((c.keywords ?? []).includes('xian_gong'));
  const sk = (c.skills ?? []).find((s) => s.id === 'xi_liang_tong_ling');
  assert.ok(sk);
  assert.equal(sk.effects?.length, 2);
  assert.ok(sk.effects?.every((e) => e.status === 'sheng_dun_status'));
  assert.ok((real('qun_xiliangtieqi').tags ?? []).includes('xi_liang'), '西凉铁骑也带西凉 tag');
});

test('马腾〈西凉统领〉：与西凉人物同场 → 双方披坚', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 1, makeUnit(real('qun_hansui'), 0, nextUidSeq(s.state)));
  s.state.sides.own.command.cur = 5;
  s.state.sides.own.hand = [{ card: real('qun_mateng'), mods: [] }];
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'own', row: 'front', col: 1 },
  });
  assert.equal(r.ok, true);
  const mateng = getUnit(r.state, 'own', 'front', 0)!;
  const hansui = getUnit(r.state, 'own', 'front', 1)!;
  assert.equal(mateng.statuses.sheng_dun_status?.stacks, 1, '马腾自己披坚');
  assert.equal(hansui.statuses.sheng_dun_status?.stacks, 1, '西凉同伴披坚');
  assert.ok(hasTrait(mateng, 'xian_gong'), '先攻');
});

test('马腾〈西凉统领〉：西凉铁骑（衍生兵种）也算', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 1, makeUnit(real('qun_xiliangtieqi'), 0, nextUidSeq(s.state)));
  s.state.sides.own.command.cur = 5;
  s.state.sides.own.hand = [{ card: real('qun_mateng'), mods: [] }];
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'own', row: 'front', col: 1 },
  });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'own', 'front', 1)!.statuses.sheng_dun_status?.stacks, 1);
});

test('马腾〈西凉统领〉：没有西凉同伴 → 不给披坚', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 1, makeUnit(mk('plain', 3, 3), 0, nextUidSeq(s.state)));
  s.state.sides.own.command.cur = 5;
  s.state.sides.own.hand = [{ card: real('qun_mateng'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.statuses.sheng_dun_status, undefined);
  assert.equal(getUnit(r.state, 'own', 'front', 1)!.statuses.sheng_dun_status, undefined);
});
