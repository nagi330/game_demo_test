/** 郭图〈急攻进谗〉/ 审配〈深筑内堑〉（ADR-192）。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
import { dealDamage, unitRef } from '../src/mutate.ts';
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
  return s;
}

function mk(id: string, attack: number, health: number): CardDef {
  return { id, name: id, faction: 'qun', type: 'general', cost: 3, attack, health, rarity: 'common', keywords: [] } as CardDef;
}

test('郭图 数据形态：2 费 1/2 谋臣、急攻进谗四段效果', () => {
  const c = real('qun_guotu');
  assert.equal(c.cost, 2);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 2);
  assert.equal(c.type, 'strategist');
  const sk = (c.skills ?? []).find((k) => k.id === 'ji_gong_jin_chan');
  assert.ok(sk);
  assert.equal(sk.trigger, 'on_play');
  assert.deepEqual((sk.effects ?? []).map((e) => e.action), ['modify', 'extra_attack', 'apply_status', 'draw']);
  assert.equal(sk.effects?.[2]?.status, 'die_at_turn_end');
});

test('郭图〈急攻进谗〉：+2 攻、本回合能打两次、回合结束阵亡、抽 1', () => {
  const s = setup();
  const ally = makeUnit(mk('guotu_ally', 2, 2), 0, nextUidSeq(s.state));
  setUnit(s.state, 'own', 'front', 1, ally);
  s.state.sides.own.deck = ['qun_huatuo', 'qun_yuanshu'];
  s.state.sides.own.command.cur = 2;
  s.state.sides.own.hand = [{ card: real('qun_guotu'), mods: [] }];

  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'own', row: 'front', col: 1 },
  });
  assert.equal(r.ok, true);
  const buffed = getUnit(r.state, 'own', 'front', 1)!;
  assert.equal(buffed.atk, 4, '2 + 2');
  assert.equal(buffed.attackedThisTurn, -1, '配额 −1：没打过也能打两次');
  assert.ok(buffed.statuses.die_at_turn_end, '挂上「本回合结束阵亡」');
  assert.equal(r.state.sides.own.hand.length, 1, '随后抽 1');

  const r2 = applyAction(r.state, s.ctx, { type: 'ATTACK', from: { row: 'front', col: 1 }, to: { kind: 'lord' } });
  assert.equal(r2.ok, true, '第一刀');
  const r3 = applyAction(r2.state, s.ctx, { type: 'ATTACK', from: { row: 'front', col: 1 }, to: { kind: 'lord' } });
  assert.equal(r3.ok, true, '第二刀（额外攻击）');
  const r4 = applyAction(r3.state, s.ctx, { type: 'ATTACK', from: { row: 'front', col: 1 }, to: { kind: 'lord' } });
  assert.equal(r4.ok, false, '第三刀不允许');

  const r5 = applyAction(r3.state, s.ctx, { type: 'END_TURN' });
  assert.equal(getUnit(r5.state, 'own', 'front', 1), null, '回合结束阵亡');
});

test('审配 数据形态：7 费 1/6 谋臣、战吼+光环+受伤反击', () => {
  const c = real('qun_shenpei');
  assert.equal(c.cost, 7);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 6);
  assert.equal(c.type, 'strategist');
  const skills = c.skills ?? [];
  assert.ok(skills.some((k) => k.trigger === 'on_play'));
  assert.ok(skills.some((k) => k.kind === 'aura'));
  assert.ok(skills.some((k) => k.trigger === 'on_damaged'));
});

test('审配〈深筑内堑〉战吼：主公 +4 护甲', () => {
  const s = setup();
  s.state.sides.own.command.cur = 7;
  s.state.sides.own.hand = [{ card: real('qun_shenpei'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(r.state.sides.own.lord.armor, 4);
});

test('审配光环：其他友方 +2 生命与架盾，审配一死就收回', () => {
  const s = setup();
  const ally = makeUnit(mk('shenpei_ally', 2, 2), 0, nextUidSeq(s.state));
  setUnit(s.state, 'own', 'front', 1, ally);
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(mk('shenpei_foe', 6, 6), 0, nextUidSeq(s.state)));
  s.state.sides.enemy.command.cur = 99;
  s.state.sides.own.command.cur = 7;
  s.state.sides.own.hand = [{ card: real('qun_shenpei'), mods: [] }];

  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  const buffed = getUnit(r.state, 'own', 'front', 1)!;
  assert.equal(buffed.maxHp, 4, '2 + 2');
  assert.ok(hasTrait(buffed, 'jia_dun'), '获得「架盾」');

  // 直接 6 点伤害打死 6 血审配 → 光环消失
  // （不能走敌方普攻：友方此刻带「架盾」，嘲讽会强制对方先打它）
  dealDamage(r.state, s.ctx.cards, unitRef('own', 'front', 0), 6, [], 'test');
  assert.equal(getUnit(r.state, 'own', 'front', 0), null, '审配已阵亡');
  const after = getUnit(r.state, 'own', 'front', 1)!;
  assert.equal(after.maxHp, 2, '光环收回 +2');
  assert.equal(hasTrait(after, 'jia_dun'), false, '光环收回架盾');
});

test('审配光环不覆盖原生架盾：审配死后原生架盾仍在', () => {
  const s = setup();
  const ally = makeUnit(mk('shenpei_native', 2, 3), 0, nextUidSeq(s.state));
  ally.statuses.jia_dun_status = { stacks: 1 };          // 原生架盾（非光环）
  setUnit(s.state, 'own', 'front', 1, ally);
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(mk('shenpei_foe2', 6, 6), 0, nextUidSeq(s.state)));
  s.state.sides.enemy.command.cur = 99;
  s.state.sides.own.command.cur = 7;
  s.state.sides.own.hand = [{ card: real('qun_shenpei'), mods: [] }];

  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.state.sides.own.rows.front[1]!.statuses.jia_dun_status?.auraId, undefined, '不该被光环标记');
  const r1 = applyAction(r.state, s.ctx, { type: 'END_TURN' });
  const r2 = applyAction(r1.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.equal(getUnit(r2.state, 'own', 'front', 1)!.statuses.jia_dun_status?.stacks, 1, '原生架盾保留');
});

test('审配受伤反击：敌方主公与随机 1 名敌方人物各吃 3', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_shenpei'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(mk('shenpei_hitter', 3, 3), 0, nextUidSeq(s.state)));
  s.state.sides.enemy.command.cur = 99;
  s.state.sides.enemy.deck = ['qun_huatuo', 'qun_yuanshu'];   // 避免空牌库的疲劳 1 点干扰断言
  s.state.sides.own.command.cur = 0;

  const r1 = applyAction(s.state, s.ctx, { type: 'END_TURN' });
  const r2 = applyAction(r1.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.equal(r2.ok, true);
  assert.equal(getUnit(r2.state, 'own', 'front', 0)!.hp, 3, '审配 6 → 3，未死所以触发');
  assert.equal(r2.state.sides.enemy.lord.hp, 27, '敌方主公 −3');
  assert.equal(getUnit(r2.state, 'enemy', 'front', 0), null, '随机敌人（唯一一个）吃 3 阵亡');
});

test('身板：郭图 2/1/2（−2）、审配 7/1/6（−8）', () => {
  const gt = real('qun_guotu');
  assert.equal(gt.cost * 2 + 1 - ((gt.attack ?? 0) + (gt.health ?? 0)), 2);
  const sp = real('qun_shenpei');
  assert.equal(sp.cost * 2 + 1 - ((sp.attack ?? 0) + (sp.health ?? 0)), 8);
});
