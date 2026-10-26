/** 华佗〈麻沸济世〉/ 张角〈黄天当立〉〈五雷轰顶〉（ADR-198）。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
import { applyStatus, unitRef } from '../src/mutate.ts';
import { getUnit, makeUnit, nextUidSeq, setUnit, statusStacks } from '../src/state.ts';
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
  s.state.sides.own.deck = ['qun_huatuo', 'qun_yuanshu'];
  s.state.sides.enemy.deck = ['qun_huatuo', 'qun_yuanshu'];
  return s;
}

function mk(id: string, attack: number, health: number): CardDef {
  return { id, name: id, faction: 'qun', type: 'general', cost: 3, attack, health, rarity: 'common', keywords: [] } as CardDef;
}

const summoned = (events: { type: string; unit?: { cardId?: string } }[]) =>
  events.filter((e) => e.type === 'UNIT_SUMMONED' && e.unit?.cardId === 'token_huangjin_bing').length;

/* ================= 华佗 ================= */

test('华佗 数据形态：5 费 1/6 传说谋臣、麻沸济世（战吼 + 回合结束）', () => {
  const c = real('qun_huatuo');
  assert.equal(c.cost, 5);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 6);
  assert.equal(c.rarity, 'legendary');
  assert.equal(c.type, 'strategist');
  assert.deepEqual((c.skills ?? []).map((s) => s.trigger), ['on_play', 'turn_end']);
});

test('华佗〈麻沸济世〉：战吼让友方人物满血并清掉所有负面状态', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_huatuo'), 0, nextUidSeq(s.state)));
  const patient = makeUnit(mk('patient', 2, 5), 0, nextUidSeq(s.state));
  patient.hp = 1;
  setUnit(s.state, 'own', 'front', 1, patient);
  applyStatus(s.state, unitRef('own', 'front', 1), 'zhong_du', 2, []);
  applyStatus(s.state, unitRef('own', 'front', 1), 'zhen_she', 1, []);
  s.state.sides.own.command.cur = 10;
  s.state.sides.own.hand = [{ card: real('qun_huatuo'), mods: [] }];

  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 2,
    target: { side: 'own', row: 'front', col: 1 },
  });
  assert.equal(r.ok, true);
  const after = getUnit(r.state, 'own', 'front', 1)!;
  assert.equal(after.hp, after.maxHp, '1 → 满血');
  assert.equal(statusStacks(after, 'zhong_du'), 0, '中毒被清');
  assert.equal(statusStacks(after, 'zhen_she'), 0, '震慑被清（按 debuff 类别批量驱散）');
});

test('华佗 回合结束：所有友方角色（含主公）回 2', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_huatuo'), 0, nextUidSeq(s.state)));
  const ally = makeUnit(mk('ally', 2, 6), 0, nextUidSeq(s.state));
  ally.hp = 2;
  setUnit(s.state, 'own', 'front', 1, ally);
  s.state.sides.own.lord.hp = 20;

  const r = applyAction(s.state, s.ctx, { type: 'END_TURN' });
  assert.equal(getUnit(r.state, 'own', 'front', 1)!.hp, 4, '友军 2 → 4');
  assert.equal(r.state.sides.own.lord.hp, 22, '主公 20 → 22');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, 6, '华佗自己满血（不溢出）');
});

/* ================= 张角 ================= */

test('张角 数据形态：7 费 1/6 传说、黄天当立 + 五雷（回合开始/登场）', () => {
  const c = real('qun_zhangjiao');
  assert.equal(c.cost, 7);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 6);
  assert.equal(c.rarity, 'legendary');
  assert.ok((c.tags ?? []).includes('huang_jin_tongling'));
  assert.deepEqual((c.skills ?? []).map((s) => s.trigger), ['on_play', 'turn_start', 'on_play']);
  assert.ok((c.skills ?? []).some((s) => s.id === 'huang_tian_dang_li'));
});

test('张角〈黄天当立〉：场上没有其他黄巾 → 先召 1 个黄巾兵，再全体黄巾 +1/+1', () => {
  const s = setup();
  s.state.sides.own.command.cur = 10;
  s.state.sides.own.hand = [{ card: real('qun_zhangjiao'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(summoned(r.events), 1, '先召 1 个黄巾兵');
  const zj = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(zj.atk, 2, '张角 1 → 2');
  assert.equal(zj.maxHp, 7, '张角 6 → 7');
  const bing = r.state.sides.own.rows.front.find((u) => u?.cardId === 'token_huangjin_bing')!;
  assert.equal(bing.atk, 3, '黄巾兵：1 + 黄巾众 1 + 黄天当立 1');
  assert.equal(bing.maxHp, 3);
});

test('张角〈黄天当立〉：场上有其他黄巾 → 不再召唤，只 +1/+1', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 2, makeUnit(real('token_huangjin_bing'), 0, nextUidSeq(s.state)));
  s.state.sides.own.command.cur = 10;
  s.state.sides.own.hand = [{ card: real('qun_zhangjiao'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(summoned(r.events), 0, '已有黄巾 → 不额外召唤');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.atk, 2);
  assert.equal(getUnit(r.state, 'own', 'front', 2)!.maxHp, 2, '旧黄巾兵也 +1/+1');
});

test('张角〈五雷轰顶·登场〉：5 次雷击，击杀召唤黄巾兵', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 2, makeUnit(real('token_huangjin_bing'), 0, nextUidSeq(s.state)));
  const a = makeUnit(mk('victimA', 1, 1), 0, nextUidSeq(s.state));
  const b = makeUnit(mk('victimB', 1, 1), 0, nextUidSeq(s.state));
  setUnit(s.state, 'enemy', 'front', 0, a);
  setUnit(s.state, 'enemy', 'front', 1, b);
  s.state.sides.own.command.cur = 10;
  s.state.sides.own.hand = [{ card: real('qun_zhangjiao'), mods: [] }];

  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0), null, '两个 1 血靶子都被雷死');
  assert.equal(getUnit(r.state, 'enemy', 'front', 1), null);
  assert.equal(summoned(r.events), 2, '每次击杀各召 1 个黄巾兵');
});

test('张角〈五雷轰顶〉：己方回合开始再轰一次（turn_start）', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_zhangjiao'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(mk('vA', 1, 1), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'enemy', 'front', 1, makeUnit(mk('vB', 1, 1), 0, nextUidSeq(s.state)));
  const r1 = applyAction(s.state, s.ctx, { type: 'END_TURN' });
  const r2 = applyAction(r1.state, s.ctx, { type: 'END_TURN' });
  assert.equal(summoned([...r1.events, ...r2.events]), 2, '回合开始五雷：2 个击杀 → 2 个黄巾兵');
});
