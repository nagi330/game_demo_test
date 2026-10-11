/**
 * 规则断言测试 —— 对应 docs/gdd/02-battlefield.md §3（ADR-051 改版：一行 8 格）
 *
 * 新规则三条：
 *   ① 架盾＝嘲讽：敌方存在「架盾」单位时，普通攻击只能打它们
 *   ② 无敌方架盾 → 可自由攻击任意敌方人物（翻面/奇袭者除外）
 *   ③ 也可以直接攻击敌方主将（取消旧的「必须先清空一列」破阵限制）
 * 另：谋臣也可以普通攻击（ADR-051 取消「谋臣不能普攻」）。
 *
 * 运行：npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { legalPlacements, legalTargets, effectiveAttack, canAttack } from '../src/rules.ts';
import { applyStatus, unitRef } from '../src/mutate.ts';
import { getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { BOARD } from '../src/constants.ts';
import { scenario, targetsToStr } from './fixtures.ts';
import type { CardDef } from '../src/types.ts';

test('规则② 无敌方架盾 → 可自由攻击任意敌方人物', () => {
  const { state } = scenario({
    own: { front: ['neutral_infantry'] },
    enemy: { front: [null, 'neutral_infantry'] },
  });
  const res = legalTargets(state, 'own', 'front', 0);
  assert.deepEqual(targetsToStr(res.targets), ['unit:enemy.front.1', 'lord:enemy']);
});

test('规则③ 可以直接攻击敌方主将（不再要求清空一列）', () => {
  const { state } = scenario({
    own: { front: ['neutral_infantry'] },
    enemy: { front: ['neutral_infantry', 'neutral_infantry'] },
  });
  const res = legalTargets(state, 'own', 'front', 0);
  assert.ok(res.targets.some((t) => t.kind === 'lord'), '主将应始终是合法目标');
});

test('规则① 架盾＝嘲讽：敌方有架盾时只能打它', () => {
  const { state } = scenario({
    own: { front: ['neutral_infantry'] },
    enemy: { front: ['neutral_infantry', null, null, 'neutral_shieldman'] },
  });
  const res = legalTargets(state, 'own', 'front', 0);
  assert.deepEqual(targetsToStr(res.targets), ['unit:enemy.front.3']);
  assert.match(res.why, /架盾/);
});

test('规则① 架盾嘲讽：不给出主将选项', () => {
  const { state } = scenario({
    own: { front: ['neutral_infantry'] },
    enemy: { front: [null, null, null, 'neutral_shieldman'] },
  });
  const res = legalTargets(state, 'own', 'front', 0);
  assert.ok(!res.targets.some((t) => t.kind === 'lord'), '架盾在场时不能越过它打主将');
});

test('规则① 多个架盾：可以任选其中一个（嘲讽不唯一）', () => {
  const { state } = scenario({
    own: { front: ['neutral_infantry'] },
    enemy: { front: ['neutral_shieldman', null, 'neutral_shieldman'] },
  });
  const res = legalTargets(state, 'own', 'front', 0);
  assert.deepEqual(targetsToStr(res.targets), ['unit:enemy.front.0', 'unit:enemy.front.2']);
});

test('规则① 架盾单位阵亡后嘲讽解除', () => {
  const { state } = scenario({
    own: { front: ['neutral_infantry'] },
    enemy: { front: ['neutral_shieldman', 'neutral_infantry'] },
  });
  const sh = state.sides.enemy.rows.front[0]!;
  sh.hp = 0;
  const res = legalTargets(state, 'own', 'front', 0);
  assert.deepEqual(targetsToStr(res.targets), ['unit:enemy.front.1', 'lord:enemy']);
});

test('谋臣也可以普通攻击（ADR-051 取消旧限制）', () => {
  const { state } = scenario({
    own: { front: [null, null, 'test_strategist'] },
    enemy: { front: ['neutral_infantry'] },
  });
  // ⚠️ 夹具的「测试谋臣」是 **0 攻** —— 而 ADR-154 起 0 攻单位一律不能普攻，
  // 直接断言会得到"不能攻击"。但那条 0 攻是**故意留着的**：
  // `engine.test.ts`「战斗：目标 0 攻则无反击伤害」正靠它当靶子，不能改夹具。
  // 本测试要验证的是「**谋臣这个类型**不构成限制」（ADR-051），
  // 所以这里把它的攻击力补到 1（谋臣的真实上限，ADR-018）再断言。
  const u = getUnit(state, 'own', 'front', 2)!;
  u.atk = 1; u.baseAtk = 1;

  const gate = canAttack(state, 'own', 'front', 2);
  assert.equal(gate.ok, true, gate.reason ?? '');
  const res = legalTargets(state, 'own', 'front', 2);
  assert.ok(res.targets.length > 0, '谋臣应有合法目标');
});

test('0 攻单位不能普通攻击（ADR-154）—— 与"是不是谋臣"无关', () => {
  const { state } = scenario({
    own: { front: ['test_strategist'] },         // 夹具：0/3 谋臣
    enemy: { front: ['neutral_infantry'] },
  });
  const gate = canAttack(state, 'own', 'front', 0);
  assert.equal(gate.ok, false, '0 攻不该能攻击');
  assert.match(gate.reason ?? '', /攻击力为 0/);
  const res = legalTargets(state, 'own', 'front', 0);
  assert.deepEqual(res.targets, [], '连合法目标都应为空');

  // 反过来：把它加成 1 攻 → 立刻可以攻击（判据是**有效攻击力**，不是卡面类型）
  const u = getUnit(state, 'own', 'front', 0)!;
  u.atk = 1; u.baseAtk = 1;
  assert.equal(canAttack(state, 'own', 'front', 0).ok, true, '有攻击力就能打');
});

test('0 攻判定用**有效攻击力**：被「虚弱」削到 0 的 2 攻单位也不能攻击（ADR-154）', () => {
  const { state } = scenario({
    own: { front: ['neutral_infantry'] },        // 夹具：2/1
    enemy: { front: ['neutral_infantry'] },
  });
  assert.equal(canAttack(state, 'own', 'front', 0).ok, true, '2 攻本来能打');
  // 虚弱 2 层 → 有效攻击力 2 − 2 = 0
  applyStatus(state, unitRef('own', 'front', 0), 'xu_ruo', 2, []);
  const gate = canAttack(state, 'own', 'front', 0);
  assert.equal(gate.ok, false, '有效攻击力 0 → 不能打（与反击取同一个量）');
  assert.match(gate.reason ?? '', /攻击力为 0/);
});

test('池子守卫：真实卡表里**每一张 0 攻单位**都不能普攻（ADR-154，防新卡踩空）', () => {
  const real: CardDef[] = JSON.parse(
    readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
  const zeroAtk = real.filter((c) =>
    (c.attack ?? 0) === 0
    && ['general', 'strategist', 'troop', 'machine', 'token'].includes(c.type));
  assert.ok(zeroAtk.length >= 8, `0 攻单位应有一批（现 ${zeroAtk.length} 张）—— 明显变少说明筛选写错了`);

  const { state, ctx } = scenario({});
  const offenders: string[] = [];
  for (const c of zeroAtk) {
    ctx.cards.set(c.id, { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] });
    setUnit(state, 'own', 'front', 0, makeUnit(ctx.cards.get(c.id)!, 0, nextUidSeq(state)));
    const gate = canAttack(state, 'own', 'front', 0);
    if (gate.ok) offenders.push(`${c.id}（${c.name} 0/${c.health}）`);
    setUnit(state, 'own', 'front', 0, null);
  }
  assert.deepEqual(offenders, [],
    `这些 0 攻单位仍然可以普攻（ADR-154 要求一律不能）：${offenders.join('、')}`);
});

test('奇袭单位不能被指定为目标', () => {
  const { state } = scenario({
    own: { front: ['neutral_infantry'] },
    enemy: { front: ['neutral_infantry'] },
  });
  state.sides.enemy.rows.front[0]!.kw.push('qi_xi');
  const res = legalTargets(state, 'own', 'front', 0);
  assert.ok(!res.targets.some((t) => t.kind === 'unit'), '奇袭者不可被指定');
  assert.ok(res.targets.some((t) => t.kind === 'lord'), '但仍可打主将');
});

test('部署：一行 8 格，已占用的格子不可再部署', () => {
  const { state } = scenario({ own: { front: ['neutral_infantry'] } });
  const spots = legalPlacements(state, 'own');
  assert.equal(BOARD.COLS, 8, '每行 8 格');
  assert.equal(BOARD.MAX_UNITS, 8, '上限 8 张');
  assert.equal(spots.length, 8 - 1);
  assert.ok(!spots.some((sp) => sp.col === 0), '已占用的 0 号格不可再部署');
});

test('部署：满 8 张后无法再部署', () => {
  const full = Array(BOARD.COLS).fill('neutral_infantry');
  const { state } = scenario({ own: { front: full } });
  assert.equal(legalPlacements(state, 'own').length, 0);
});

// 「结阵」已移除（ADR-067）：引擎里"相邻有友方步兵时 +1 攻"是 AI 自己推的机制，
// 设计者从未设计，且 0 张卡在用。原先这两条测试锁的是一个不该存在的行为。
test('有效攻击力：不因相邻步兵而加成（「结阵」已移除）', () => {
  const { state } = scenario({
    own: { front: ['neutral_infantry', 'neutral_infantry'] },
  });
  assert.equal(effectiveAttack(state, 'own', 'front', 0), 2, '相邻步兵不应再加攻');
  assert.equal(effectiveAttack(state, 'own', 'front', 1), 2);
});

test('震慑状态：不能攻击', () => {
  const { state } = scenario({
    own: { front: ['neutral_infantry'] },
    enemy: { front: ['neutral_infantry'] },
  });
  state.sides.own.rows.front[0]!.statuses.zhen_she = { stacks: 1, turns: 1 };
  const check = canAttack(state, 'own', 'front', 0);
  assert.equal(check.ok, false);
  assert.match(check.reason ?? '', /无法普通攻击/);
});

test('入场当回合不能攻击（疾行除外）', () => {
  const { state } = scenario({
    own: { front: ['neutral_infantry'] },
    enemy: { front: ['neutral_infantry'] },
  });
  state.sides.own.rows.front[0]!.enteredTurn = state.turn;
  assert.equal(canAttack(state, 'own', 'front', 0).ok, false);
});

test('连击：每回合可攻击两次', () => {
  const { state } = scenario({
    own: { front: ['neutral_infantry'] },
    enemy: { front: ['neutral_infantry'] },
  });
  const u = state.sides.own.rows.front[0]!;
  u.kw.push('lian_ji');
  u.attackedThisTurn = 1;
  assert.equal(canAttack(state, 'own', 'front', 0).ok, true);
  u.attackedThisTurn = 2;
  assert.equal(canAttack(state, 'own', 'front', 0).ok, false);
});
