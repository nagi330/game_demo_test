/**
 * 「战技的多步选择」与**手牌步骤**（ADR-146）
 *
 * ⚠️ ADR-148 起，原本的载体卡巫医「祭礼」已改成「医圣」（不再弃牌），
 * 所以本文件改用**合成卡**（`NECROMANCER`）来钉住这套机制 ——
 * 机制本身保留：它让"先选一张手牌、再选场上目标"这类技能能被引擎表达、被 UI 逐步问、
 * 被 AI 枚举（`ai/options.ts` 的 `needsHandIndex`）。
 *
 * ## 卡面要什么
 *
 * 「可弃掉自己手中一张手牌，恢复指定场上一个人物**其对应弃掉牌统率值**的血量，并清除其负面状态。」
 * —— 两步：**先点手牌**（弃哪张由玩家定，且决定了回血量）→ **再选场上目标**（出指向箭头）。
 *
 * ## 引擎侧怎么表达
 *
 * `unitSkillTargetPlan(...).choices` 里**按效果声明顺序**给出两步：
 *   1. `{ zone: 'hand', targets: [] }`  ← 手牌步骤：结果写进 `USE_SKILL.handIndex`
 *   2. `{ targets: [己方人物…] }`        ← 场上步骤：结果写进 `USE_SKILL.target`
 * 玩家一次提交两个选择（`USE_SKILL { target, handIndex }`）—— **动作协议不需要扩展**。
 *
 * ⚠️ 两个曾经的坑（本文件钉住）：
 *   · `choiceOf` 只认 `mode: 'choose'` 的效果，所以巫医的 `discard` 缺 `mode: choose` 时
 *     那一步根本不会出现在 plan 里，玩家只能拿到"随机弃"（与卡面"可弃掉…一张手牌"不符）；
 *   · plan 的去重口径是 `pick`（1/2），而"弃手牌"和"回血目标"都是 pick 1 ——
 *     不把 `zone` 一起比就会把前者吞掉。
 */
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

import { applyAction, unitSkillTargetPlan } from '../src/engine.ts';
import { canUseUnitSkill } from '../src/rules.ts';
import { applyStatus, killUnit } from '../src/mutate.ts';
import { getUnit, makeUnit, setUnit, statusStacks } from '../src/state.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { Action, CardDef, GameEvent } from '../src/types.ts';

const REAL: CardDef[] = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cards.json'), 'utf8'),
);
const real = (id: string): CardDef => {
  const c = REAL.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
};

const ALLY = real('shu_wangping');        // 4 费 3/4，当回血目标（真实卡，防夹具漂移）

/**
 * 合成卡：一个"两步战技"的最小样本 —— **先弃一张手牌，再治疗一位己方人物 3 点**。
 * 用它而不是真卡，是因为卡池里已没有这种形状的卡（巫医改设计了），
 * 而这套机制要留着给以后的卡用。
 */
const NECROMANCER: CardDef = {
  id: 'test_necromancer', name: '巫医', faction: 'qun', type: 'strategist',
  cost: 3, attack: 0, health: 4, keywords: [], gender: 'male', memo: '测试：两步战技',
  skills: [{
    id: 'two_step', name: '祭礼', kind: 'active', cost: 0, frequency: 'once_per_turn',
    text: '战技（每回合一次）：弃一张手牌，治疗一位己方人物 3 点并清除其负面状态。',
    effects: [
      { action: 'discard', count: 1, mode: 'choose', target: { side: 'self', zone: 'hand' } },
      { action: 'heal', value: 3, target: { side: 'ally', filter: { type: 'character' }, count: 1, mode: 'choose' } },
      // 第三条与第二条**共用同一步目标**（pick 相同）→ 顺便覆盖 plan 的去重口径
      { action: 'remove_status', remove_kind: 'debuff', target: { side: 'ally', filter: { type: 'character' }, count: 1, mode: 'choose' } },
    ],
  }],
} as CardDef;

for (const c of [NECROMANCER, ALLY]) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);
}

/** 摆场：巫医在 col 4；col 0 放一个受伤的友军；手牌两张不同费用的牌 */
function setup(opts: { allyHp?: number; hand?: string[] } = {}) {
  const { state, ctx } = scenario({ ownHand: opts.hand ?? ['shu_wangping', 'neutral_infantry'] });
  setUnit(state, 'own', 'front', 4, makeUnit(NECROMANCER, 0, 990));
  const ally = makeUnit(ALLY, 0, 991);
  ally.maxHp = 20;                       // 抬高上限，免得回血被 maxHp 截断（4 费牌回 4 血要看得见）
  ally.hp = opts.allyHp ?? 1;
  setUnit(state, 'own', 'front', 0, ally);
  return { state, ctx };
}

const skillOf = (id = 'two_step') => NECROMANCER.skills!.find((s) => s.id === id)!;

/* ============================================================
   1. plan 形态：两步，手牌在前
   ============================================================ */

test('祭礼的 plan 是两步：先「弃一张手牌」再「选回血目标」', () => {
  const { state } = setup({ hand: ['shu_wangping', 'neutral_infantry'] });
  const plan = unitSkillTargetPlan(state, 'own', 'front', 4);

  assert.equal(plan.choices.length, 2, '两步');
  const [first, second] = plan.choices;
  assert.equal(first!.zone, 'hand', '第一步是手牌步骤');
  assert.deepEqual(first!.targets, [], '手牌步骤没有场上目标（UI 不该出箭头）');
  assert.equal(first!.action, 'discard', '动作是弃牌（AI 靠它判语义）');
  assert.equal(second!.zone, undefined, '第二步是场上目标');
  assert.ok(second!.targets.length >= 2, '候选含巫医自己与受伤的友军');
  assert.ok(second!.targets.every((t) => t.side === 'own'), '回血目标只可能是己方');
});

test('手牌步骤的候选数 = 手牌张数（弃完就不该再列出）', () => {
  const { state } = setup({ hand: ['neutral_infantry'] });
  const plan = unitSkillTargetPlan(state, 'own', 'front', 4);
  assert.equal(plan.choices[0]!.zone, 'hand');
  assert.equal(state.sides.own.hand.length, 1, '引擎按选择器判定"这一步是手牌"，与池子大小无关');
});

/* ============================================================
   2. 一次提交两个选择：弃哪张 → 回多少血
   ============================================================ */

test('只给 target、不给 handIndex → 弃牌退回随机（不静默失败）', () => {
  const { state, ctx } = setup({ hand: ['neutral_infantry', 'shu_wangping'], allyHp: 1 });
  const before = state.sides.own.hand.length;
  const r = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 4, skillId: skillOf().id,
    target: { side: 'own', row: 'front', col: 0 },        // 故意不给 handIndex
  } as Action);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.own.hand.length, before - 1, '仍然弃掉了一张（随机挑的）');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, 4, '治疗照常 +3');
});

test('弃牌是**玩家指定**的：指定第二张就弃第二张（不再随机）', () => {
  const { state, ctx } = setup({ hand: ['neutral_infantry', 'shu_wangping'], allyHp: 1 });
  const r = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 4, skillId: skillOf().id,
    handIndex: 1, target: { side: 'own', row: 'front', col: 0 },
  } as Action);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.own.discard.some((c) => c.id === 'shu_wangping'), true,
    '弃的是 handIndex=1 的王平（4 费）');
  assert.equal(r.state.sides.own.hand[0]!.card.id, 'neutral_infantry', '另一张留在手里');
});

test('同时清除目标的负面状态（祭礼第二条）', () => {
  const { state, ctx } = setup({ allyHp: 1 });
  applyStatus(state, { kind: 'unit', side: 'own', row: 'front', col: 0 }, 'zhong_du', 2, []);
  assert.equal(statusStacks(getUnit(state, 'own', 'front', 0)!, 'zhong_du'), 2, '先中毒');
  const r = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 4, skillId: skillOf().id,
    handIndex: 0, target: { side: 'own', row: 'front', col: 0 },
  } as Action);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(statusStacks(getUnit(r.state, 'own', 'front', 0)!, 'zhong_du'), 0, '负面被清掉');
});

/* ============================================================
   2.5 手牌为空时不能放（否则会读到"上一次弃牌的残值"）
   ============================================================ */

test('手牌为空 → 祭礼不可用（否则回血量会取到上一次弃牌的残值）', () => {
  const { state, ctx } = setup({ hand: [], allyHp: 1 });
  const gate = canUseUnitSkill(state, 'own', 'front', 4);
  assert.equal(gate.ok, false, '手牌为空时不该允许使用');
  assert.match(String(gate.reason), /手牌为空/);

  // 反证：先在别处制造一次"最近被弃的牌"，再试祭礼 —— 若不被拦，它会按那张牌的统率回血
  state.sides.own.discard.push(real('shu_guanyu'));            // 6 费
  (state as unknown as { lastDiscarded?: unknown }).lastDiscarded = { card: real('shu_guanyu'), side: 'own' };
  const r = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 4, skillId: skillOf().id,
    target: { side: 'own', row: 'front', col: 0 },
  } as Action);
  assert.equal(r.ok, false, '空手时引擎直接拒绝，不会凭空回 6 血');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, 1, '目标血量没变');
});

/* ============================================================
   3. 目标校验仍然有效（手牌步骤不能把校验废掉）
   ============================================================ */

test('选一个不在候选里的目标 → 被拒（手牌步骤不影响场上目标的合法性判定）', () => {
  const { state, ctx } = setup({ hand: ['neutral_infantry'] });
  setUnit(state, 'enemy', 'front', 1, makeUnit(ALLY, 0, 992));       // 敌方单位
  const r = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 4, skillId: skillOf().id,
    handIndex: 0, target: { side: 'enemy', row: 'front', col: 1 },
  } as Action);
  assert.equal(r.ok, false, '回血目标不能选敌人');
});

test('巫医阵亡后技能不可用（既有规则不受影响）', () => {
  const { state, ctx } = setup({ hand: ['neutral_infantry'] });
  const events: GameEvent[] = [];
  killUnit(state, ctx.cards, { side: 'own', row: 'front', col: 4, unit: getUnit(state, 'own', 'front', 4)! }, events);
  const r = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 4, skillId: skillOf().id, handIndex: 0,
    target: { side: 'own', row: 'front', col: 0 },
  } as Action);
  assert.equal(r.ok, false, '人没了就不能放');
});
