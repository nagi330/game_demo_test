/**
 * 魏延「子午奇谋」（ADR-163）
 *
 * ## 设计者定稿
 *
 * 「我同意将魏延改为「子午奇谋」，但是条件我有些纠结，如果我方场上人物少于对方
 *   还是我方场上只有 1 人时？然后触发可直接攻击主公并且 +3 攻？」
 *
 * ## 本文件钉死的四件事
 *
 * ① **条件用「己方人物 < 敌方人物」，不是「只剩 1 人」** —— 决定性区别在**对手空场**时：
 *    「只剩 1 人」在**你清空对手、自己只剩魏延**时照样成立（大优白送、滚雪球）；
 *    「人少于对方」在对手 0 人时**不成立**（1 > 0）。本文件把两种局面都测出来。
 * ② **条件不成立时是彻底的白板**（不是弱化版）—— 一条效果都不该跑。
 * ③ **「直取主公」用 `damage` 实现，天然绕过架盾** —— 嘲讽只拦**普通攻击**，
 *    不拦效果伤害。这是"可直接攻击主公"在零引擎改动下的等价写法（见卡面 note 的长注释）。
 * ④ **先攻**（`xian_gong` 关键词）真的生效：入场当回合即可攻击。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { applyAction } from '../src/engine.ts';
import { getUnit } from '../src/state.ts';
import { canAttack, effectiveAttack, legalTargets } from '../src/rules.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { Action, CardDef } from '../src/types.ts';

const REAL: CardDef[] = JSON.parse(
  readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'),
);
const real = (id: string): CardDef => {
  const c = REAL.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
};

const WY = real('shu_weiyan');
/** 卡面基础攻击力（`CardDef.attack` 是可选字段，取出来定死，免得断言里到处 `!`） */
const WY_ATK = WY.attack ?? 0;
for (const c of [WY, real('neutral_infantry')]) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);
}

/**
 * 搭一个可控场面。
 * ⚠️ 摆位**必须走夹具的 `scenario()`**（它用 `setUnit` + `makeUnit` + `nextUidSeq`）——
 * 手搓 `{cardId, hp, ...}` 这种对象会缺 `uid` 等字段，随机/计数解析会静默出错。
 * 魏延放**手牌**，额外人物与敌方放**场上**，打出时把魏延放到空着的第 3 列。
 */
function setup(opts: { own?: number; enemy?: number; enemyShield?: boolean } = {}) {
  const ownFront: Array<string | null> = [null, null, null, null];
  for (let i = 0; i < (opts.own ?? 0); i++) ownFront[i] = 'neutral_infantry';
  const enemyFront = Array.from({ length: opts.enemy ?? 1 }, () => 'test_champion');
  const { state, ctx } = scenario({
    own: { front: ownFront },
    ownCommand: 10,
    enemy: { front: enemyFront },
    ownHand: ['shu_weiyan'],
  });
  state.sides.own.deck = Array(12).fill('neutral_infantry');
  state.sides.enemy.deck = Array(12).fill('neutral_infantry');
  // 敌方血厚，免得被顺手打死影响计数
  for (let col = 0; col < (opts.enemy ?? 1); col++) {
    const u = getUnit(state, 'enemy', 'front', col);
    if (u) { u.hp = 20; u.maxHp = 20; u.baseMaxHp = 20; }
  }
  if (opts.enemyShield) {
    const u = getUnit(state, 'enemy', 'front', 0);
    // ⚠️ 必须带 `stacks: 1` —— `hasTrait` 的判据是 `statuses['<kw>_status'].stacks > 0`
    //    （`state.ts:178-179`）。只写 `{turns: 99}` 会让 `undefined > 0 === false`，
    //    架盾**静默不生效**、嘲讽不成立 —— 排查了半天才定位到。
    if (u) u.statuses = { jia_dun_status: { turns: 99, stacks: 1 } };
  }
  return { state, ctx };
}

const play = (state: ReturnType<typeof setup>['state'], ctx: ReturnType<typeof setup>['ctx']) =>
  applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 3 } as Action);

/** ⚠️ `unit.attack` 是 undefined —— 实攻要走 `effectiveAttack`（它把 base 与 mods 一起算） */
const wyAtk = (s: ReturnType<typeof setup>['state']) => effectiveAttack(s, 'own', 'front', 3);

/* ============================================================
   一、数据形态
   ============================================================ */

test('魏延 数据：4 费 4/4 精英、自带先攻、战吼子午奇谋', () => {
  assert.equal(`${WY.cost}费 ${WY.attack}/${WY.health}`, '4费 4/4');
  assert.equal(WY.rarity, 'elite');
  assert.ok(WY.keywords?.includes('xian_gong'), '应自带先攻');
  const sk = (WY.skills ?? [])[0]!;
  assert.equal(sk.name, '子午奇谋');
  assert.equal(sk.trigger, 'on_play');
  // ⚠️ 2026-10-11 设计者修订：去掉「直取主公 3 点」（"已经有先攻了"），+3 攻改为**永久**
  assert.equal(sk.effects?.length, 1, '只剩"加攻"一条，直取主公已移除');
  const e0 = (sk.effects ?? [])[0]!;
  assert.equal(e0.action, 'modify');
  assert.equal(e0.attack, 3, '永久 +3 攻');
  assert.equal(e0.duration, undefined, '🔴 不带 duration 才是永久（带 this_turn 会变回一次性）');
  assert.ok(e0.condition?.count_vs, '仍必须带"人少于对方"条件');
  assert.equal(e0.condition?.count_vs?.op, '<');
  assert.equal(e0.condition?.count_vs?.left?.side, 'self');
  assert.equal(e0.condition?.count_vs?.right?.side, 'enemy');
});

/* ============================================================
   二、条件成立 → 全额收益
   ============================================================ */

test('子午奇谋：己方 1 人 < 敌方 2 人 → **永久** +3 攻', () => {
  const { state, ctx } = setup({ own: 0, enemy: 2 });   // 己方只有魏延(1) vs 敌方 2
  const lordBefore = state.sides.enemy.lord.hp;
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(wyAtk(r.state), WY_ATK + 3, '攻击力 4 → 7');
  assert.equal(r.state.sides.enemy.lord.hp, lordBefore,
    '⚠️ 直取主公已按设计者要求移除 —— 主公不该掉血');
});

test('⭐ 子午奇谋：+3 攻是**永久**的（`modify` 不带 `duration`），不靠临时 mod', () => {
  const { state, ctx } = setup({ own: 0, enemy: 2 });
  const r = play(state, ctx);
  assert.equal(wyAtk(r.state), 7, '4+3');
  // ⚠️ 判据不是"有没有 mod"，而是**这条 mod 是不是临时的**：
  //    带 `duration: this_turn` 会记成 `kind: 'temp'` + `turns`，到点由 `expireMods` 清掉；
  //    永久加成不能是 temp（否则下回合就打回 4）。
  const mods = getUnit(r.state, 'own', 'front', 3)!.mods ?? [];
  const tempMod = mods.find((m) => m.kind === 'temp' && m.attack);
  assert.equal(tempMod, undefined, '🔴 不该出现临时加攻 —— 这次要求的是永久');
  assert.equal(getUnit(r.state, 'own', 'front', 3)!.atk, WY_ATK + 3, '永久加成落在基础攻上（atk）');
});

/* ============================================================
   三、⭐ 条件的两种边界（本文件的核心）
   ============================================================ */

test('⭐ 条件不成立：人数相等（1 vs 1）→ 完全白板', () => {
  const { state, ctx } = setup({ own: 0, enemy: 1 });
  const lordBefore = state.sides.enemy.lord.hp;
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(wyAtk(r.state), WY_ATK, '人数相等不该加攻');
  assert.equal(r.state.sides.enemy.lord.hp, lordBefore, '也不该有主公伤害（直取已移除）');
});

test('⭐⭐ 条件不成立：**己方占优**（己方 3 vs 敌方 1）→ 白板（不能滚雪球）', () => {
  const { state, ctx } = setup({ own: 2, enemy: 1 });   // 己方 3 人 vs 敌方 1 人
  const lordBefore = state.sides.enemy.lord.hp;
  const r = play(state, ctx);
  assert.equal(wyAtk(r.state), WY_ATK);
  assert.equal(r.state.sides.enemy.lord.hp, lordBefore);
});

test('⭐⭐⭐ 条件不成立：**敌方空场**（己方 1 vs 敌方 0）→ 白板 —— 这正是选这个条件的原因', () => {
  // 若条件写成「己方只有 1 人」，这一局（你清空了对手、自己只剩魏延）**会成立** → 大优白送。
  // 用「人少于对方」则 1 > 0，**不成立** ✓ 这条测试就是那个决策的守门人。
  const { state, ctx } = setup({ own: 0, enemy: 0 });
  const lordBefore = state.sides.enemy.lord.hp;
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.own.rows.front.filter(Boolean).length, 1, '己方确实只剩魏延一人');
  assert.equal(wyAtk(r.state), WY_ATK,
    '🔴 敌方空场时"只剩 1 人"会误判成立 —— 本条件必须不成立');
  assert.equal(r.state.sides.enemy.lord.hp, lordBefore);
});

test('条件按**双方人数**判定：己方 1 vs 敌方 3 → 成立（劣势越大越该出奇）', () => {
  const { state, ctx } = setup({ own: 0, enemy: 3 });
  const r = play(state, ctx);
  assert.equal(wyAtk(r.state), WY_ATK + 3);
});

/* ============================================================
   四、⭐ 与架盾的关系（先攻 ≠ 绕开防线）
   ============================================================ */

test('⭐ 敌方有**架盾**时：先攻给的普攻照样被嘲讽挡住（先攻 ≠ 绕开防线）', () => {
  // ⚠️ 这条测试的来历：设计者把原设计里的「对敌方主公造成 3 点伤害」去掉了（"已经有先攻了"）。
  //    但两者**并不等价** —— 直取主公是**效果伤害**、绕开嘲讽；先攻给的是一次**普攻**，
  //    会被架盾挡住。本测试把这个差别钉住，免得日后有人以为"有先攻就等于能打主公"。
  const { state, ctx } = setup({ own: 0, enemy: 2, enemyShield: true });
  const lordBefore = state.sides.enemy.lord.hp;
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(wyAtk(r.state), WY_ATK + 3, '条件成立，+3 攻照常给');
  // ① 先攻让魏延当回合就能攻击（canAttack 放行）
  assert.equal(canAttack(r.state, 'own', 'front', 3).ok, true, '先攻 → 当回合可攻击');
  // ② 但合法目标里**没有主公** —— 被架盾挡住了
  const legal = legalTargets(r.state, 'own', 'front', 3);
  assert.equal(legal.targets.some((t) => t.kind === 'lord'), false,
    '🔴 架盾仍在 → 先攻也打不到主公（这正是"先攻 ≠ 直取主公"的证据）');
  assert.ok(legal.targets.every((t) => t.kind === 'unit'), '只能先打架盾单位');
  // ③ 主公血量不动（直取主公已按设计者要求移除）
  assert.equal(r.state.sides.enemy.lord.hp, lordBefore, '主公不该掉血');
});

/* ============================================================
   五、先攻
   ============================================================ */

test('先攻：魏延入场当回合即可攻击（与未先攻的对照）', () => {
  const { state, ctx } = setup({ own: 2, enemy: 1 });
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  const mine = getUnit(r.state, 'own', 'front', 3)!;
  assert.equal(mine.enteredTurn, r.state.turn, '魏延确实是本回合入场的');
  assert.equal(canAttack(r.state, 'own', 'front', 3).ok, true, '先攻 → 入场当回合就能攻击');
  assert.ok(legalTargets(r.state, 'own', 'front', 3).targets.length > 0, '而且有合法目标');

  // 对照：同样本回合入场、但**没有先攻**的单位不能攻击
  const foot = getUnit(r.state, 'own', 'front', 1);
  assert.ok(foot, '这里需要一个本回合入场的对照单位');
  foot.enteredTurn = r.state.turn;                  // 手动标成"本回合入场"
  const chk = canAttack(r.state, 'own', 'front', 1);
  assert.equal(chk.ok, false, '没有先攻 → 本回合入场不能攻击');
  assert.match(chk.reason ?? '', /本回合入场|先攻/, `拒绝理由应说明原因，实际：${chk.reason}`);
});
