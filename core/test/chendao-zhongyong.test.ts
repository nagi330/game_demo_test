/**
 * 陈到「白毦统领」：己方白毦兵的「忠勇」+1 层（ADR-165）
 *
 * ## 设计口径（设计者 2026-10-15 定稿）
 *
 * 4 费 3/3（4 费基准 9，**−3**）＋ 一条兵种联动：己方白毦兵的「忠勇」（thorns）**加 1 层**，**不设上限**。
 * 白毦兵自带「架盾」→ 对手必须先碰它才能打主公，所以这条惩罚**必然会被触发**。
 *
 * ## ⚠️ 本文件最重要的一条：必须写成 `kind: aura`，不能写战吼
 *
 * `u.statuses[status]` 只存**一个** `auraId`，而 `recomputeAuras` 的清理
 * **只删 `auraId` 为真的条目**（`effects.ts` 的 `if (inst.auraId) delete ...`）。
 * 若用战吼（无 auraId）加层，会把白毦兵自己光环留下的 `auraId` **覆盖成 undefined**：
 *   ① 该条目此后不再被清理 → 白毦兵自己的光环又 +1 → 实测出现 **3 层**；
 *   ② 下一次重算又因它带上光环 id 而被**整条删除** → 加成**静默消失**（实测序列 2 → 3 → 1 → 1）。
 * 光环版连续重算恒为 2（探针实测，见下方「连续重算」用例）。
 * → 所以第 1 条用例直接锁 `kind === 'aura'`：**任何人把它改成战吼，测试立刻变红**。
 *
 * ## 对冲口
 *
 * 「忠勇」只在**普通攻击并实际受伤**后结算；技能/效果伤害不带 `killerRef`
 * → 对手用火攻、战技、AOE 打白毦兵**不吃反伤**（与 `troop-special.test.ts` 的「这是它的解药」同一口径）。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { scenario, TEST_CARDS } from './fixtures.ts';
import { capStacks, getUnit, makeUnit, setUnit, statusStacks } from '../src/state.ts';
import { recomputeAuras, resolveAttack, runEffects } from '../src/effects.ts';
import { dealDamage, unitRef } from '../src/mutate.ts';
import { createRng } from '../src/rng.ts';
import type { CardDef } from '../src/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL: CardDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));

for (const c of ALL) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) {
    TEST_CARDS.push({ ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] });
  }
}

/** 取真实翻译后的卡（就地替换卡表），便于按需改造 —— 与 skills-071 同一套约定 */
function real(id: string): CardDef {
  const raw = ALL.find((c) => c.id === id);
  assert.ok(raw, `cards.json 里找不到 ${id}`);
  const flat: CardDef = { ...raw, keywords: raw.keywords ?? [], skills: raw.skills ?? [] };
  const i = TEST_CARDS.findIndex((x) => x.id === id);
  if (i >= 0) TEST_CARDS[i] = flat; else TEST_CARDS.push(flat);
  return flat;
}

const RAID: CardDef = {
  id: 'test_chendao_raider', name: '进攻者', faction: 'wei', type: 'troop',
  cost: 2, attack: 3, health: 20, troopKind: 'infantry', keywords: [], memo: '测试',
};

/** 己方 陈到(0) + 白毦兵(1)，敌方 进攻者(0) */
function board() {
  const { state, ctx } = scenario({ own: { front: ['shu_chendao', 'shu_bai_erbing'] } });
  ctx.cards.set(RAID.id, RAID);
  setUnit(state, 'enemy', 'front', 0, makeUnit(RAID, 0, 9001));
  const rng = createRng(1);
  recomputeAuras(state, ctx.cards, rng, []);
  return { state, ctx, rng };
}

const thorns = (state: ReturnType<typeof board>['state'], col: number) =>
  capStacks(getUnit(state, 'own', 'front', col)?.statuses ?? {}, 'thorns');

/* ============================================================
   ① 数据形态 —— 锁死「必须是光环」
   ============================================================ */

test('陈到 数据形态：4 费 3/3，技能是 aura 且给白毦兵加忠勇', () => {
  const c = real('shu_chendao');
  assert.equal(c.cost, 4, '4 费');
  assert.equal(c.attack, 3);
  assert.equal(c.health, 3);

  const sk = (c.skills ?? []).find((s) => s.id === 'bai_er_tong_ling');
  assert.ok(sk, '陈到应有「白毦统领」');
  assert.equal(sk!.kind, 'aura',
    '⚠️ 必须是 aura：战吼（无 auraId）加层会被白毦兵自己的光环重算**静默吃掉**（ADR-165 实测 2 → 3 → 1）');

  const ef = sk!.effects?.[0];
  assert.ok(ef, '应有效果');
  assert.equal(ef!.action, 'apply_status');
  assert.equal(ef!.status, 'zhong_yong_status');
  assert.equal(ef!.stacks, 1, '+1 层');
  assert.equal(ef!.target?.side, 'ally', '只强化己方');
  assert.equal(ef!.target?.filter?.card_id, 'shu_bai_erbing', '只强化白毦兵');
  assert.equal(ef!.target?.count, 'all', '全部白毦兵（最多同名 3 张）');
});

/* ============================================================
   ② 行为：1 → 2 层，且多次重算不漂移
   ============================================================ */

test('行为：陈到在场 → 己方白毦兵的忠勇 1 → 2 层', () => {
  const { state } = board();
  assert.equal(thorns(state, 1), 2, '白毦兵自带 1 层 ＋ 陈到 1 层 = 2');
});

test('⭐ 连续重算不漂移：跑 6 次 recomputeAuras 恒为 2（战吼版会掉回 1 —— 这就是必须用光环的原因）', () => {
  const { state, ctx } = board();
  const rng = createRng(7);
  const seq: number[] = [];
  for (let i = 0; i < 6; i++) {
    recomputeAuras(state, ctx.cards, rng, []);
    seq.push(thorns(state, 1));
  }
  assert.deepEqual(seq, [2, 2, 2, 2, 2, 2], `光环加层必须稳定（实际 ${seq.join(' → ')}）`);
});

test('多张白毦兵同时吃满（count: all）', () => {
  const { state, ctx } = scenario({ own: { front: ['shu_chendao', 'shu_bai_erbing', 'shu_bai_erbing'] } });
  recomputeAuras(state, ctx.cards, createRng(1), []);
  recomputeAuras(state, ctx.cards, createRng(1), []);
  assert.equal(thorns(state, 1), 2, '第一张');
  assert.equal(thorns(state, 2), 2, '第二张');
});

test('陈到自己不吃忠勇（筛选只认白毦兵）', () => {
  const { state } = board();
  assert.equal(capStacks(getUnit(state, 'own', 'front', 0)!.statuses, 'thorns'), 0);
});

test('敌方的白毦兵不被强化（side: ally）', () => {
  const { state, ctx } = scenario({ own: { front: ['shu_chendao'] }, enemy: { front: ['shu_bai_erbing'] } });
  recomputeAuras(state, ctx.cards, createRng(1), []);
  recomputeAuras(state, ctx.cards, createRng(1), []);
  assert.equal(capStacks(getUnit(state, 'enemy', 'front', 0)!.statuses, 'thorns'), 1,
    '对手的白毦兵应保持自带的 1 层');
});

test('光环语义：陈到阵亡后白毦兵回落到 1 层（统领没了，亲军失援）', () => {
  const { state, ctx } = board();
  assert.equal(thorns(state, 1), 2, '阵亡前是 2');
  dealDamage(state, ctx.cards, unitRef('own', 'front', 0), 99, [], '测试', 0, undefined, undefined, 'physical');
  assert.equal(getUnit(state, 'own', 'front', 0), null, '陈到应已阵亡离场');
  recomputeAuras(state, ctx.cards, createRng(1), []);
  assert.equal(thorns(state, 1), 1, '陈到离场后只剩白毦兵自带的 1 层');
});

/* ============================================================
   ③ 对冲口：普攻吃惩罚，技能伤害不吃
   ============================================================ */

test('对冲：普通攻击白毦兵 → 攻击者吃 反击 2 + 忠勇 2 = 4 点', () => {
  const { state, ctx, rng } = board();
  const before = getUnit(state, 'enemy', 'front', 0)!.hp;
  resolveAttack(state, ctx.cards, 'enemy', { row: 'front', col: 0 },
    { kind: 'unit', row: 'front', col: 1 }, [], rng, { toSide: 'own' });
  const lost = before - (getUnit(state, 'enemy', 'front', 0)?.hp ?? 0);
  assert.equal(lost, 4, '白毦兵 2 攻反击 ＋ 忠勇 2 层 = 4（未强化时是 3）');
});

test('对冲：用技能/效果伤害打白毦兵 → 不吃忠勇（这是对手的破法）', () => {
  const { state, ctx, rng } = board();
  const atkHp = getUnit(state, 'enemy', 'front', 0)!.hp;
  const baierHp = getUnit(state, 'own', 'front', 1)!.hp;
  runEffects(state, ctx.cards,
    [{ action: 'damage', value: 2, damage_type: 'fire', target: { side: 'enemy', filter: { card_id: 'shu_bai_erbing' }, count: 'all' } }],
    { side: 'enemy' }, rng, []);
  assert.equal(getUnit(state, 'own', 'front', 1)!.hp, baierHp - 2, '白毦兵正常受伤');
  assert.equal(getUnit(state, 'enemy', 'front', 0)!.hp, atkHp, '技能伤害不得引发忠勇回敬');
});

test('忠勇层数记在状态上（+1 层＝ stacks 2，不是两层同名状态）', () => {
  const { state } = board();
  const u = getUnit(state, 'own', 'front', 1)!;
  assert.equal(statusStacks(u, 'zhong_yong_status'), 2);
  assert.equal(Object.keys(u.statuses).filter((k) => k === 'zhong_yong_status').length, 1);
});
