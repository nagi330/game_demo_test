/**
 * 华佗「医圣」（ADR-148，2026-10-10 改设计）：**数据驱动**验证
 *
 * 卡面：战技（每回合一次）—— 治疗一位人物恢复 2 点生命；**若治疗的是主公，额外抽一张牌**。
 *
 * 两个实现要点：
 *   · 候选池 = 己方人物 + 主公 → `filter: { type: 'character', include_lord: true }`；
 *   · "选的是主公" → 新条件 `chosen_lord`（与 `chosen_side` 同源，读 `ctx.chosen`）。
 *
 * ⚠️ 旧设计（弃一张手牌、按其统率回血、清负面）已作废：它需要**两步选择**（先点手牌再选目标），
 * 设计者反馈太重。相关机制（手牌步骤）仍保留并被 `skill-hand-step.test.ts` 用**合成卡**钉住。
 */
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

import { applyAction, unitSkillTargetPlan } from '../src/engine.ts';
import { canUseUnitSkill } from '../src/rules.ts';
import { applyStatus } from '../src/mutate.ts';
import { getUnit, makeUnit, setUnit, statusStacks } from '../src/state.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { Action, CardDef } from '../src/types.ts';

const REAL: CardDef[] = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cards.json'), 'utf8'),
);
const real = (id: string): CardDef => {
  const c = REAL.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
};

const HUATUO = real('qun_huatuo');
const ALLY = real('shu_wangping');
for (const c of [HUATUO, ALLY]) if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);

const skillId = () => HUATUO.skills!.find((s) => s.kind === 'active')!.id;

function setup(opts: { allyHp?: number } = {}) {
  const { state, ctx } = scenario({});
  setUnit(state, 'own', 'front', 4, makeUnit(HUATUO, 0, 980));
  const ally = makeUnit(ALLY, 0, 981);
  ally.maxHp = 20;
  ally.hp = opts.allyHp ?? 3;
  setUnit(state, 'own', 'front', 0, ally);
  return { state, ctx };
}

const use = (state: Parameters<typeof applyAction>[0], ctx: Parameters<typeof applyAction>[1],
  target: { side: 'own' | 'enemy'; row?: 'front'; col?: number }) =>
  applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 4, skillId: skillId(), target,
  } as Action);

/* ============================================================
   1. 数据
   ============================================================ */

test('数据：华佗是 4 费 0/5 谋臣，战技「医圣」每回合一次', () => {
  assert.equal(HUATUO.name, '华佗');
  assert.equal(HUATUO.cost, 4);
  assert.equal(`${HUATUO.attack}/${HUATUO.health}`, '0/5');
  assert.equal(HUATUO.type, 'strategist');
  assert.deepEqual(HUATUO.keywords, ['zhan_ji'], '带「战技」关键词');
  const sk = HUATUO.skills!.find((s) => s.id === 'yi_sheng')!;
  assert.equal(sk.name, '医圣');
  assert.equal(sk.frequency, 'once_per_turn');
  assert.equal(sk.cost, 0);
  assert.equal(HUATUO.skills!.some((s) => s.id === 'qing_nang'), false, '旧的「青囊」已移除');
});

/* ============================================================
   2. 治疗人物：+2 血，不抽牌
   ============================================================ */

test('治人物：回 2 血，且**不**抽牌', () => {
  const { state, ctx } = setup({ allyHp: 3 });
  const handBefore = state.sides.own.hand.length;
  const r = use(state, ctx, { side: 'own', row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, 5, '3 → 5（+2）');
  assert.equal(r.state.sides.own.hand.length, handBefore, '治的不是主公 → 不抽牌');
});

test('治疗量会被最大生命截断（不会溢出）', () => {
  const { state, ctx } = setup({ allyHp: 19 });
  const r = use(state, ctx, { side: 'own', row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, 20, '19 → 20（上限 20）');
});

test('也能治自己（候选池含华佗本人）', () => {
  const { state, ctx } = setup();
  const me = getUnit(state, 'own', 'front', 4)!;
  me.hp = 3;
  const r = use(state, ctx, { side: 'own', row: 'front', col: 4 });
  assert.ok(r.ok, r.error ?? '');
  assert.equal(getUnit(r.state, 'own', 'front', 4)!.hp, 5, '自己也是己方人物 ✓');
});

/* ============================================================
   3. 治疗主公：额外抽一张（`chosen_lord`）
   ============================================================ */

test('治主公：回 2 血 **且**额外抽一张牌', () => {
  const { state, ctx } = setup();
  state.sides.own.lord.maxHp = 30;
  state.sides.own.lord.hp = 20;
  state.sides.own.deck = ['neutral_infantry', 'neutral_shieldman', 'neutral_archer'];
  const handBefore = state.sides.own.hand.length;
  const r = use(state, ctx, { side: 'own' });                    // 主公目标：只给 side，无 row/col
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.own.lord.hp, 22, '主公 20 → 22（+2）');
  assert.equal(r.state.sides.own.hand.length, handBefore + 1, '治主公 → 额外抽 1 张');
  assert.equal(r.state.sides.own.deck.length, 2, '牌库 -1');
});

test('候选池同时含人物与主公（UI 靠这个 plan 出高亮）', () => {
  const { state } = setup();
  const plan = unitSkillTargetPlan(state, 'own', 'front', 4);
  assert.equal(plan.choices.length, 1, '只有一步（不需要先弃牌了）');
  const targets = plan.choices[0]!.targets;
  assert.ok(targets.some((t) => t.kind === 'lord' && t.side === 'own'), '主公在候选里');
  assert.ok(targets.some((t) => t.kind === 'unit' && t.row === 'front' && t.col === 0), '友军在候选里');
  assert.ok(targets.some((t) => t.kind === 'unit' && t.col === 4), '华佗自己也在候选里');
  assert.equal(plan.choices[0]!.zone, undefined, '不是手牌步骤');
});

/* ============================================================
   3.5 净化（2026-10-10 设计者追加：加血的同时清除负面状态）
   ============================================================ */

test('治疗的同时清除目标的负面状态', () => {
  const { state, ctx } = setup({ allyHp: 3 });
  applyStatus(state, { kind: 'unit', side: 'own', row: 'front', col: 0 }, 'zhong_du', 2, []);
  applyStatus(state, { kind: 'unit', side: 'own', row: 'front', col: 0 }, 'zhen_she', 1, []);
  assert.equal(statusStacks(getUnit(state, 'own', 'front', 0)!, 'zhong_du'), 2, '先中毒+震慑');

  const r = use(state, ctx, { side: 'own', row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '');
  const after = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(after.hp, 5, '3 → 5（+2）');
  assert.equal(statusStacks(after, 'zhong_du'), 0, '中毒被清');
  assert.equal(statusStacks(after, 'zhen_she'), 0, '震慑被清（按 debuff 类别批量驱散）');
});

test('净化不影响正面状态（只清 debuff）', () => {
  const { state, ctx } = setup({ allyHp: 3 });
  applyStatus(state, { kind: 'unit', side: 'own', row: 'front', col: 0 }, 'sheng_dun_status', 1, []);
  const r = use(state, ctx, { side: 'own', row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '');
  assert.equal(statusStacks(getUnit(r.state, 'own', 'front', 0)!, 'sheng_dun_status'), 1, '披坚保留');
});

test('plan 仍然只有**一步**（治疗与净化共用同一个目标，UI 不会问两次）', () => {
  const { state } = setup();
  const plan = unitSkillTargetPlan(state, 'own', 'front', 4);
  assert.equal(plan.choices.length, 1, '同选择器的多条效果必须合并成一步');
  assert.equal(plan.choices[0]!.zone, undefined, '不是手牌步骤');
});

test('治主公也一并净化（主公同样会中负面）', () => {
  const { state, ctx } = setup();
  state.sides.own.lord.maxHp = 30;      // 抬高上限，免得 +2 被 maxHp 截断
  state.sides.own.lord.hp = 20;
  state.sides.own.deck = ['neutral_infantry'];   // ⚠️ 治主公 → 抽 1 张；牌库空会吃疲劳伤害，把 +2 顶掉 1 点
  applyStatus(state, { kind: 'lord', side: 'own' }, 'duan_liang', 2, []);
  const r = use(state, ctx, { side: 'own' });
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.own.lord.hp, 22, '主公 +2');
  assert.equal(r.state.sides.own.lord.statuses?.duan_liang, undefined, '断粮被清');
});

/* ============================================================
   4. 频率与门控
   ============================================================ */

test('每回合一次：用完之后本回合不可再用', () => {
  const { state, ctx } = setup();
  const r = use(state, ctx, { side: 'own', row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '');
  const again = use(r.state, ctx, { side: 'own', row: 'front', col: 0 });
  assert.equal(again.ok, false, '同回合第二次应被拒');
  // 门控理由取自共享判定（applyAction 只回一句笼统的"动作不合法"）
  assert.match(String(canUseUnitSkill(r.state, 'own', 'front', 4).reason), /本回合已用过/);
});

test('费用为 0：统率不足也放得出（0 费战技）', () => {
  const { state, ctx } = setup();
  state.sides.own.command = { cur: 0, max: 0 };
  const r = use(state, ctx, { side: 'own', row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '0 费技能不受统率限制');
});
