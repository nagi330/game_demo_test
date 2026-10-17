/**
 * 赵云重做（ADR-157）—— 6 费 6/6 **传奇**：「一身是胆」＝披坚 ＋ 按敌方人数永久加攻
 *
 * ## 设计者定稿
 *
 * 「赵云我目前倾向于 **6 费 6/6「披坚」**，**下场时根据敌方在场人物数量加攻**，
 *   比如敌方 3 个人物在场就变为永久的 **9/6 披坚**。」
 *
 * ## 三条必须钉住的语义
 *
 * ① **披坚不能写成关键词**：ADR-103 已删除公开的 `sheng_dun` 关键词，一次伤害免疫
 *    改由 `sheng_dun_status` 状态承载 —— 旧卡写的 `mian_yi`（免疫）**根本没有伤害免疫能力**
 *    （`caps: [immune_debuff, untargetable]`），卡面那句「免疫一切伤害」一直是假的。
 *    本文件第 2 条测试就是这条的回归锁。
 * ② **加攻打那一刻的敌方人数，且永不重算**：`attack_from` 取"选择器命中集合的大小"，
 *    不带 `duration` 的 `modify` 写成 `permanent`。**它是战吼不是光环** ——
 *    若写成光环，`recomputeAuras` 每次重算都会跟着人数浮动。
 * ③ **衍生物与军械都算"敌方人物"**（`type: character` 包含它们）—— 有意为之：惩罚铺场。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { applyAction } from '../src/engine.ts';
import { effectiveAttack, canAttack } from '../src/rules.ts';
import { getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { CardDef } from '../src/types.ts';

const REAL: CardDef[] = JSON.parse(
  readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'),
);
const real = (id: string): CardDef => {
  const c = REAL.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
};

const ZY = real('shu_zhaoyun');
for (const id of ['shu_zhaoyun', 'neutral_infantry', 'neutral_archer', 'neutral_shieldman',
  'token_jia_ren', 'wei_piliche']) {
  const c = real(id);
  if (!TEST_CARDS.some((x) => x.id === id)) TEST_CARDS.push(c);
}

/** 敌方摆 n 个人物，然后打出赵云 */
function playAgainst(enemyFront: (string | null)[], seed = 1) {
  const { state, ctx } = scenario({
    ownHand: ['shu_zhaoyun'],
    ownCommand: 10,
    enemy: { front: enemyFront },
    seed,
  });
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '赵云应能打出');
  const zy = getUnit(r.state, 'own', 'front', 0);
  assert.ok(zy, '赵云应在场上');
  return { state: r.state, ctx, zy: zy! };
}

/* ============================================================
   1. 数据形态
   ============================================================ */

test('数据：赵云 7 费 6/6 传奇，战吼两条效果（披坚 + 按敌方人数加攻）', () => {
  assert.equal(`${ZY.cost}费 ${ZY.attack}/${ZY.health}`, '7费 6/6');
  assert.equal(ZY.type, 'general');
  assert.equal(ZY.rarity, 'legendary');

  const sk = (ZY.skills ?? [])[0]!;
  assert.equal(sk.id, 'yi_shen_shi_dan');
  assert.equal(sk.kind, 'trigger');
  assert.equal(sk.trigger, 'on_play', '是战吼 —— 只结算一次，不是光环');
  const effs = sk.effects ?? [];
  assert.equal(effs.length, 2);
  assert.equal(effs[0]!.action, 'apply_status');
  assert.equal(effs[0]!.status, 'sheng_dun_status', '披坚必须走状态，不能走关键词');
  assert.equal(effs[1]!.action, 'modify');
  assert.deepEqual(effs[1]!.attack_from?.filter, { type: 'character' },
    '按敌方人物数取攻击力加成');
  assert.equal(effs[1]!.duration, undefined, '不带 duration = permanent（永不回落）');
});

test('数据（回归锁）：赵云身上**不再有 `mian_yi`** —— 那个状态给不了伤害免疫', () => {
  const statuses = (ZY.skills ?? []).flatMap((s) => s.effects ?? [])
    .filter((e) => e.action === 'apply_status')
    .map((e) => e.status);
  assert.ok(!statuses.includes('mian_yi'),
    '`mian_yi` 的能力只有 [immune_debuff, untargetable]，没有伤害免疫 —— '
    + '旧卡面「免疫一切伤害」就是被它骗了很久（ADR-157）');
  assert.ok(statuses.includes('sheng_dun_status'), '免疫一次伤害要用披坚');
});

/* ============================================================
   2. 按敌方人数加攻
   ============================================================ */

test('一身是胆：敌方 3 个人物在场 → 永久变成 9/9', () => {
  const { zy } = playAgainst(['neutral_infantry', 'neutral_archer', 'neutral_shieldman']);
  assert.equal(zy.atk, 9, '6 + 3 = 9（永久修正写进单位属性）');
  assert.equal(zy.hp, 9, '6 + 3 = 9（生命值也按敌方人数加）');
});

test('一身是胆：敌方人数不同 → 加成随之变化（含 0 人与 1 人）', () => {
  assert.equal(playAgainst([null, null, null]).zy.atk, 6, '敌方空场 → 不加法，仍是 6/6');
  assert.equal(playAgainst(['neutral_infantry']).zy.atk, 7, '敌方 1 人 → 7/7');
  assert.equal(playAgainst(['neutral_infantry']).zy.hp, 7, '生命也 +1');
  assert.equal(playAgainst([null, 'neutral_infantry', null, 'neutral_archer']).zy.atk, 8,
    '空格不计数 → 8/6');
});

test('一身是胆：**只结算一次**（战吼 ≠ 光环）—— 之后敌方增减人都不再改变他的攻击力', () => {
  const { state, ctx, zy } = playAgainst(['neutral_infantry', 'neutral_archer', 'neutral_shieldman']);
  assert.equal(zy.atk, 9);

  // ① 敌方**减员**：攻击力不该回落（若是光环会掉回 8）
  const victim = getUnit(state, 'enemy', 'front', 0)!;
  setUnit(state, 'enemy', 'front', 0, null);
  assert.equal(getUnit(state, 'own', 'front', 0)!.atk, 9,
    `敌方少一个人也不该回落（拆掉的是 ${victim.name}）`);

  // ② 敌方**增员**：攻击力也不该继续涨（若是光环会涨到 10）
  setUnit(state, 'enemy', 'front', 5,
    makeUnit(ctx.cards.get('neutral_infantry')!, 0, nextUidSeq(state)));
  assert.equal(getUnit(state, 'own', 'front', 0)!.atk, 9,
    '敌方多一个人也不该补加 —— 战吼在打出那一刻就结算完了');
});

test('一身是胆：**衍生物与军械也算敌方人物**（惩罚铺场，有意为之）', () => {
  // token_jia_ren 是衍生物、wei_piliche 是军械，两者 type 都被 `character` 选择器包含
  const { zy } = playAgainst(['token_jia_ren', 'wei_piliche', 'neutral_infantry']);
  assert.equal(zy.atk, 9, '3 个目标（衍生物 + 军械 + 兵种）都应计入');
});

/* ============================================================
   3. 披坚：真的免一次伤害，且只有一次
   ============================================================ */

test('一身是胆：披坚真的挡住第一次伤害，第二次就吃满', () => {
  const { state, ctx, zy } = playAgainst(['neutral_infantry', 'neutral_archer', 'neutral_shieldman']);
  assert.ok(zy.statuses.sheng_dun_status, '应获得披坚状态');
  assert.equal(canAttack(state, 'own', 'front', 0).ok, false,
    '召唤失调：本回合入场不能攻击（没有先攻）');

  // 换到敌方回合，让敌方 5/5 打他两次
  const r1 = applyAction(state, ctx, { type: 'END_TURN' });
  assert.ok(r1.ok, r1.error ?? '');
  setUnit(r1.state, 'enemy', 'front', 7,
    makeUnit(ctx.cards.get('test_champion')!, 0, nextUidSeq(r1.state)));

  const hpBefore = getUnit(r1.state, 'own', 'front', 0)!.hp;   // 6
  const hit1 = applyAction(r1.state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 7 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.ok(hit1.ok, hit1.error ?? '');
  assert.equal(getUnit(hit1.state, 'own', 'front', 0)!.hp, hpBefore,
    '第一刀应被披坚完全挡下');
  assert.equal(getUnit(hit1.state, 'own', 'front', 0)!.statuses.sheng_dun_status, undefined,
    '披坚是一次性的，挡完就该消耗掉');

  // 第二个 5/5 再打 —— 这次要吃满
  setUnit(hit1.state, 'enemy', 'front', 6,
    makeUnit(ctx.cards.get('test_champion')!, 0, nextUidSeq(hit1.state)));
  const hit2 = applyAction(hit1.state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 6 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.ok(hit2.ok, hit2.error ?? '');
  const after = getUnit(hit2.state, 'own', 'front', 0);
  assert.ok(!after || after.hp < hpBefore, '第二刀必须真的掉血 —— 披坚只免一次');
});

test('一身是胆：加攻是**永久**的，跨过一整轮仍然保持', () => {
  const { state, ctx } = playAgainst(['neutral_infantry', 'neutral_archer', 'neutral_shieldman']);
  const r1 = applyAction(state, ctx, { type: 'END_TURN' });
  assert.ok(r1.ok);
  const r2 = applyAction(r1.state, ctx, { type: 'END_TURN' });
  assert.ok(r2.ok);
  assert.equal(effectiveAttack(r2.state, 'own', 'front', 0), 9,
    '回到自己回合后仍是 9 攻 —— permanent 修正不会随时间回落');
});
