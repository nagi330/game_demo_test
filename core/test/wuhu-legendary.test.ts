/**
 * 五虎将传奇化（ADR-158）—— 关羽 / 马超 / 张飞 / 黄忠
 *
 * 四张与已完成的赵云一起构成「五虎将」`rarity: legendary` 系列。
 *
 * ## 设计者定稿
 *
 * - **关羽**：6 费 **6/6**、「水淹七军」**战吼**，水攻起始伤害 1 → **2 点**（全体禁用/水困保持不变）。
 * - **马超**：**6 费 6/5 先攻**；每回合若击杀敌人人物，敌方主公禁用主公技一回合（**不叠加**）。
 * - **张飞**：**6 费 6/5**、「燕人咆哮」——己方每回合对敌方全体（**含主公**）1 点；**击杀则再次释放**。
 * - **黄忠**：5 费 5/5、「百步穿杨」每回合点名 2 点 ＋「定军山」斩将永久 +1 攻（上限 +3）。
 *
 * ## 本文件重点钉死的四处（都是"静默失效"家族）
 *
 * ① **马超的两个死因**：`turn_max: 1` 数学上不可达（第 1 回合打不出 6 费卡）；
 *    封主公技必须用 `jin_yan` 而**不是** `jin_yong`（`canUseLordSkill` 只查 `block_lord_skill`）。
 * ② **张飞的连吼会不会死循环**：`on_kill` → 咆哮 → 可能再击杀 → 再 `on_kill`。
 *    终止性靠"每次再吼都必须真的吼死一个人"，本文件用"没人死"与"吼死主公"两个边界锁死。
 * ③ **黄忠的成长只认武将**（`victim_type: general`）—— 兵种/衍生物喂他**不会**成长。
 * ④ **黄忠的战技不含主公**（`count: 1, mode: choose` 不触发 ADR-087 的默认含主公注入）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { applyAction } from '../src/engine.ts';
import { canUseLordSkill, effectiveAttack } from '../src/rules.ts';
import { dealDamage, unitRef } from '../src/mutate.ts';
import { getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
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

const GY = real('shu_guanyu');
const MC = real('shu_machao');
const ZF = real('shu_zhangfei');
const HZ = real('shu_huangzhong');
for (const c of [GY, MC, ZF, HZ, real('neutral_infantry'), real('neutral_archer'),
  real('neutral_shieldman'), real('tactic_huogong')]) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);
}

/** 喂满牌库用：避免对手回合开始走「粮尽」而白掉 1 点主公血（会污染主公血量的断言） */
const DECK = Array.from({ length: 12 }, () => 'neutral_infantry');

/** 在指定列放一个「一刀就能砍死」的靶子 */
function victim(state: ReturnType<typeof scenario>['state'], side: 'own' | 'enemy', col: number, id: string) {
  const c = real(id);
  const v = makeUnit(c, 0, nextUidSeq(state));
  v.hp = 1; v.maxHp = 1; v.baseMaxHp = 1;
  setUnit(state, side, 'front', col, v);
  return v;
}

/* ============================================================
   一、关羽
   ============================================================ */

test('关羽 数据：6 费 6/6 传奇，战吼三条效果（禁用 / 水困 / 2 点水攻）', () => {
  assert.equal(`${GY.cost}费 ${GY.attack}/${GY.health}`, '6费 6/6');
  assert.equal(GY.rarity, 'legendary');
  const sk = (GY.skills ?? [])[0]!;
  assert.equal(sk.trigger, 'on_play', '是战吼');
  const effs = sk.effects ?? [];
  assert.deepEqual(effs.map((e) => e.action), ['apply_status', 'apply_status', 'damage']);
  assert.equal(effs[0]!.status, 'jin_yong');
  assert.equal(effs[1]!.status, 'shui_kun');
  assert.equal(effs[2]!.value, 2, '水攻伤害应为 2 点');
  assert.equal(effs[2]!.damage_type, 'water');
});

test('关羽 水淹七军：敌方已上场全体吃「禁用 + 水困 + 2 点水攻」；**水攻连主公一起打**', () => {
  // ⚠️ 靶子要用**挨得住 2 点水攻**的：盾兵只有 2 血，会被当场打死，后面就读不到它的状态了
  const { state, ctx } = scenario({
    ownHand: ['shu_guanyu'], ownCommand: 10,
    enemy: { front: ['test_champion', null, 'test_champion'] },   // 5/5
  });
  state.sides.own.deck = DECK;
  state.sides.enemy.deck = DECK;
  const lordBefore = state.sides.enemy.lord.hp;
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '');

  for (const col of [0, 2]) {
    const u = getUnit(r.state, 'enemy', 'front', col)!;
    assert.ok(u.statuses.jin_yong, `第 ${col} 列应被禁用技能`);
    assert.equal(u.statuses.jin_yong!.turns, 1, '单位状态：1 回合足够盖住对手那一回合');
    assert.equal(u.statuses.shui_kun?.stacks, 1, '水困阶段 1 起步');
  }
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 3, '5/5 应吃 2 点水伤');

  // ⚠️ 三条效果对主公的待遇**不一样**，这里逐条钉死：
  //   · `damage` → **打到主公**（ADR-087：范围伤害默认含主公，`withDefaultLordTarget` 自动补 include_lord）
  //   · `apply_status` → **不打到主公**（该注入只对 `damage` 生效）→ 主公不被禁用、也不吃水困
  assert.equal(r.state.sides.enemy.lord.hp, lordBefore - 2,
    '水攻伤害**含主公**：2 点（旧版 1 点）');
  assert.equal(r.state.sides.enemy.lord.statuses?.jin_yong, undefined,
    '主公不该被禁用 —— 设计者口径是"已上场的敌方**人物**"');
  assert.equal(r.state.sides.enemy.lord.statuses?.shui_kun, undefined, '主公也不吃水困');
});

/* ============================================================
   二、马超（两个死因的回归锁）
   ============================================================ */

test('马超 数据：6 费 6/5 传奇、先攻、西凉系，击杀挂的是 `jin_yan` 而不是 `jin_yong`', () => {
  assert.equal(`${MC.cost}费 ${MC.attack}/${MC.health}`, '6费 6/5');
  assert.equal(MC.rarity, 'legendary');
  assert.deepEqual(MC.keywords, ['xian_gong'], '先攻');
  assert.ok((MC.tags ?? []).includes('xi_liang'), '西凉系 tag 应与马腾/马岱一致');

  const sk = (MC.skills ?? [])[0]!;
  assert.equal(sk.trigger, 'on_kill');
  const eff = (sk.effects ?? [])[0]!;
  assert.equal(eff.status, 'jin_yan',
    '🔴 封主公技必须用 jin_yan（caps block_lord_skill）—— 旧版挂的 jin_yong 不生效');
  assert.equal(eff.target?.lord, true);
  assert.equal(eff.condition, undefined,
    '🔴 旧的 turn_max:1 / victim_type:general 死条件必须已删除');
});

/** 让马超击杀一个 1 血靶子，返回结算后的 state */
function machaoKill(opts: { turn: number; victimId: string }) {
  const { state, ctx } = scenario({ own: { front: ['shu_machao'] }, ownCommand: 10 });
  state.turn = opts.turn;
  victim(state, 'enemy', 1, opts.victimId);
  dealDamage(state, ctx.cards, unitRef('enemy', 'front', 1), 9, [], '马超', 0,
    { side: 'own', row: 'front', col: 0 });
  return { state, ctx };
}

test('马超 铁骑突袭：**任何回合**击杀都会封住敌方主公技（旧版 turn_max:1 是死条件）', () => {
  for (const turn of [1, 2, 5, 9]) {
    const { state } = machaoKill({ turn, victimId: 'neutral_infantry' });
    assert.ok(state.sides.enemy.lord.statuses?.jin_yan,
      `第 ${turn} 回合击杀也应触发 —— 旧版写 turn_max:1，而 6 费卡第 1 回合根本打不出来`);
  }
});

test('马超 铁骑突袭：击杀**谋臣**同样触发（旧版限定 victim_type: general 已删）', () => {
  const { state } = machaoKill({ turn: 3, victimId: 'shu_zhugeliang' });
  assert.ok(state.sides.enemy.lord.statuses?.jin_yan, '「人物」不限于武将');
});

test('马超 铁骑突袭：`jin_yan` 真的封住了主公技（死因二的端到端回归锁）', () => {
  const { state } = machaoKill({ turn: 2, victimId: 'neutral_infantry' });
  const gate = canUseLordSkill(state, 'enemy');
  assert.equal(gate.ok, false, '敌方主公技应被封');
  assert.match(gate.reason ?? '', /进言/, `理由应指出是「进言」封锁，实际：${gate.reason}`);

  // 对照：没被挂状态时是可用的（排除"本来就不可用"造成的假通过）
  const clean = scenario({ enemy: { front: ['neutral_infantry'] } });
  assert.equal(canUseLordSkill(clean.state, 'enemy').ok, true, '对照组：未封锁时主公技可用');
});

test('马超 铁骑突袭：重复击杀**不叠加**（层数恒为 1，时长不累加）', () => {
  const { state, ctx } = scenario({ own: { front: ['shu_machao'] }, ownCommand: 10 });
  for (const col of [1, 2, 3]) victim(state, 'enemy', col, 'neutral_infantry');
  for (const col of [1, 2, 3]) {
    dealDamage(state, ctx.cards, unitRef('enemy', 'front', col), 9, [], '马超', 0,
      { side: 'own', row: 'front', col: 0 });
  }
  const inst = state.sides.enemy.lord.statuses!.jin_yan!;
  assert.equal(inst.stacks, 1, '非数字型状态 `mergeStacks` 恒返回 1 —— 次数不会叠加');
  assert.equal(inst.turns, 1, '时长只被覆盖、不累加');
});

/* ============================================================
   三、张飞（含连吼的终止性）
   ============================================================ */

test('张飞 数据：6 费 6/5 传奇，`turn_end` 主吼 + `on_kill` 连吼，两条都**含主公**', () => {
  assert.equal(`${ZF.cost}费 ${ZF.attack}/${ZF.health}`, '6费 6/5');
  assert.equal(ZF.rarity, 'legendary');
  const skills = ZF.skills ?? [];
  assert.equal(skills.length, 2);
  assert.equal(skills[0]!.trigger, 'turn_end');
  assert.equal(skills[1]!.trigger, 'on_kill');
  for (const sk of skills) {
    const eff = (sk.effects ?? [])[0]!;
    assert.equal(eff.action, 'damage');
    assert.equal(eff.value, 1);
    assert.equal(eff.target?.count, 'all');
    assert.equal(eff.target?.filter?.include_lord, true,
      `「${sk.name}」应含敌方主公 —— 旧版「咆哮（入场）」是显式不含的`);
  }
});

test('张飞 燕人咆哮：己方回合结束时对敌方全体（含主公）各 1 点；**没人死就只吼一次**', () => {
  const { state, ctx } = scenario({
    own: { front: ['shu_zhangfei'] }, ownCommand: 10,
    enemy: { front: ['test_champion', null, 'test_champion'] },   // 5/5，1 点打不死
  });
  // ⚠️ **必须喂满双方牌库**：否则对手回合开始抽不到牌会走「粮尽」，主公白掉 1 点，
  // 把"咆哮打到主公 1 点"的断言污染成 2 点（这个坑我踩过一次）。
  state.sides.own.deck = DECK;
  state.sides.enemy.deck = DECK;
  const lordBefore = state.sides.enemy.lord.hp;
  const r = applyAction(state, ctx, { type: 'END_TURN' });
  assert.ok(r.ok, r.error ?? '');

  for (const col of [0, 2]) {
    assert.equal(getUnit(r.state, 'enemy', 'front', col)!.hp, 4, '每个敌方人物各吃 1 点');
  }
  assert.equal(r.state.sides.enemy.lord.hp, lordBefore - 1, '敌方主公也吃 1 点');
  const roars = r.events.filter((e) => e.type === 'SKILL_TRIGGERED'
    && (e as { skillName?: string }).skillName === '燕人咆哮');
  assert.equal(roars.length, 1, '没有任何击杀 → 只吼一次（连吼不该空转）');
});

test('张飞 燕人咆哮：吼死人会**接着吼**（连锁），且连吼次数 = 击杀数', () => {
  const { state, ctx } = scenario({ own: { front: ['shu_zhangfei'] }, ownCommand: 10 });
  state.sides.own.deck = DECK;
  state.sides.enemy.deck = DECK;                       // 同上：避免粮尽干扰主公血量
  for (const col of [1, 2, 3]) victim(state, 'enemy', col, 'neutral_infantry');   // 三个 1 血
  const lordBefore = state.sides.enemy.lord.hp;

  const r = applyAction(state, ctx, { type: 'END_TURN' });
  assert.ok(r.ok, r.error ?? '');
  for (const col of [1, 2, 3]) {
    assert.equal(getUnit(r.state, 'enemy', 'front', col), null, `第 ${col} 列应被吼死`);
  }
  const chain = r.events.filter((e) => e.type === 'SKILL_TRIGGERED'
    && (e as { skillName?: string }).skillName === '燕人咆哮（连吼）');
  assert.equal(chain.length, 3, '每吼死一个就再吼一次');
  assert.equal(r.state.sides.enemy.lord.hp, lordBefore - (1 + 3),
    '男主吼 1 次 + 连吼 3 次，全打在主公身上');
});

test('张飞 燕人咆哮：**终止性** —— 把敌方主公吼死时对局立即结束，不会无限连吼', () => {
  const { state, ctx } = scenario({ own: { front: ['shu_zhangfei'] }, ownCommand: 10 });
  state.sides.own.deck = DECK;
  state.sides.enemy.deck = DECK;
  victim(state, 'enemy', 1, 'neutral_infantry');
  state.sides.enemy.lord.hp = 1;                 // 主公只剩 1 血：男主吼就会打死他

  const r = applyAction(state, ctx, { type: 'END_TURN' });
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.enemy.lord.hp, 0);
  assert.equal(r.state.winner, 'own', '吼死主公 → 立即判胜（checkWinner 终止一切后续结算）');
});

/* ============================================================
   四、黄忠
   ============================================================ */

test('黄忠 数据：5 费 5/5 传奇，战技「百步穿杨」+ 触发「定军山」', () => {
  assert.equal(`${HZ.cost}费 ${HZ.attack}/${HZ.health}`, '5费 5/5');
  assert.equal(HZ.rarity, 'legendary');
  assert.deepEqual(HZ.keywords, ['zhan_ji']);
  const [bai, ding] = HZ.skills ?? [];
  assert.equal(bai!.kind, 'active');
  assert.equal(bai!.frequency, 'once_per_turn');
  // ⭐ ADR-159 定稿：基础 3 点 + 「要害」1 点（条件：所选是主公 或 已受伤）
  assert.equal(bai!.effects?.[0]?.value, 3, '基础一箭 3 点（特种兵是 2 点，顶级武将再加一档）');
  assert.equal(bai!.effects?.[1]?.value, 1, '要害加成 +1 点');
  assert.deepEqual(bai!.effects?.[1]?.condition?.any_of, [
    { chosen_lord: true }, { chosen_damaged: true },
  ], '加成条件＝所选目标是主公 或 已受伤（chosen_* 条件，不是选择器试探）');
  assert.equal(bai!.effects?.[0]?.target?.filter?.include_lord, true,
    '⭐ 关键：必须把主公并进候选池 —— 否则会掉进 2 费先登弩手（指定 2 点含主公）的射程之下');
  assert.equal(ding!.trigger, 'on_kill');
  assert.equal(ding!.effects?.[0]?.condition?.victim_type, 'general', '成长只认武将');
});

/**
 * 造一个「血厚、可控血量」的靶子，并可选在别处再放一个**已受伤**的单位。
 * 后者专门用来抓 `mode:'choose'` 的兜底陷阱（见下面那条测试）。
 */
function hzBoard(opts: { hp: number; maxHp: number; extraWounded?: boolean }) {
  const { state, ctx } = scenario({
    own: { front: ['shu_huangzhong'] }, ownCommand: 10,
    enemy: { front: ['test_champion', null, 'test_champion'] },
  });
  state.sides.own.deck = DECK;
  state.sides.enemy.deck = DECK;
  const t = getUnit(state, 'enemy', 'front', 0)!;
  t.hp = opts.hp; t.maxHp = opts.maxHp; t.baseMaxHp = opts.maxHp;
  if (opts.extraWounded) {
    const w = getUnit(state, 'enemy', 'front', 2)!;
    w.hp = w.maxHp - 1;                                  // 第 2 列：一个受伤的诱饵
  }
  return { state, ctx };
}
const hzFire = (state: ReturnType<typeof scenario>['state'], ctx: ReturnType<typeof scenario>['ctx'], target: unknown) =>
  applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 0, target } as unknown as Action);

test('黄忠 百步穿杨：对**满血**人物 3 点（⭐ 快照回归锁：不可是 4 点）', () => {
  const { state, ctx } = hzBoard({ hp: 8, maxHp: 8 });
  const lordBefore = state.sides.enemy.lord.hp;
  const r = hzFire(state, ctx, { side: 'enemy', row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '');
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 5,
    '⚠️ 满血目标只吃 3 点 —— 若条件不做"技能开始时"的快照，本条会变成 4 点（自己先打出的伤害把自己喂成了"受伤"）');
  assert.equal(r.state.sides.enemy.lord.hp, lordBefore, '打人物时主公不掉血');
});

test('黄忠 百步穿杨：对**已受伤**人物 4 点', () => {
  const { state, ctx } = hzBoard({ hp: 6, maxHp: 8 });
  const r = hzFire(state, ctx, { side: 'enemy', row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '');
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 2, '已受伤目标吃 4 点');
});

test('黄忠 百步穿杨：点名**敌方主公** 4 点（与一切弓兵特种兵拉开差距的地方）', () => {
  const { state, ctx } = hzBoard({ hp: 8, maxHp: 8 });
  const unitBefore = getUnit(state, 'enemy', 'front', 0)!.hp;
  const lordBefore = state.sides.enemy.lord.hp;
  const r = hzFire(state, ctx, { side: 'enemy', lord: true });
  assert.ok(r.ok, r.error ?? '主公必须是合法目标（include_lord: true）');
  assert.equal(r.state.sides.enemy.lord.hp, lordBefore - 4, '主公应吃 4 点');
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, unitBefore, '打主公时人物不掉血');
});

test('黄忠 百步穿杨：场上另有受伤单位时，选满血目标**仍只打他 3 点、不会跑偏**', () => {
  // ⭐ 抓 `mode:'choose'` 的兜底陷阱：`resolveTargets` 在"所选目标不在筛选后的池子里"时会
  // `narrowByMode` → `pool.slice(0, n)`，若拿"受伤过滤器 + choose"去试探所选目标，
  // "目标没受伤"就会**静默变成命中场上第一个受伤的人**。故本卡必须用 `chosen_*` 条件。
  const { state, ctx } = hzBoard({ hp: 8, maxHp: 8, extraWounded: true });
  const bait = getUnit(state, 'enemy', 'front', 2)!;
  const baitBefore = bait.hp;
  const r = hzFire(state, ctx, { side: 'enemy', row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '');
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 5, '所选满血目标吃 3 点');
  assert.equal(getUnit(r.state, 'enemy', 'front', 2)!.hp, baitBefore,
    '⚠️ 诱饵（受伤的第 2 列）**一点伤害都不该吃** —— 跑偏就是兜底陷阱复现');
});

test('黄忠 定军山：击杀**武将** → 永久 +1 攻', () => {
  const { state, ctx } = scenario({ own: { front: ['shu_huangzhong'] }, ownCommand: 10 });
  victim(state, 'enemy', 1, 'shu_zhangfei');                       // 张飞是武将
  dealDamage(state, ctx.cards, unitRef('enemy', 'front', 1), 9, [], '黄忠', 0,
    { side: 'own', row: 'front', col: 0 });
  assert.equal(effectiveAttack(state, 'own', 'front', 0), 6, '5 + 1 = 6');
});

test('黄忠 定军山：击杀**兵种/谋臣**不成长（`victim_type: general` 的边界）', () => {
  for (const id of ['neutral_infantry', 'shu_zhugeliang']) {
    const { state, ctx } = scenario({ own: { front: ['shu_huangzhong'] }, ownCommand: 10 });
    victim(state, 'enemy', 1, id);
    dealDamage(state, ctx.cards, unitRef('enemy', 'front', 1), 9, [], '黄忠', 0,
      { side: 'own', row: 'front', col: 0 });
    assert.equal(effectiveAttack(state, 'own', 'front', 0), 5,
      `击杀 ${id}（非武将）不该成长 —— 对手可以用兵种/谋臣喂他`);
  }
});

test('黄忠 定军山：成长有**硬上限 +3**（5 → 8 攻封顶）', () => {
  const { state, ctx } = scenario({ own: { front: ['shu_huangzhong'] }, ownCommand: 10 });
  for (const col of [1, 2, 3, 4, 5]) victim(state, 'enemy', col, 'shu_zhangfei');
  for (const col of [1, 2, 3, 4, 5]) {
    dealDamage(state, ctx.cards, unitRef('enemy', 'front', col), 9, [], '黄忠', 0,
      { side: 'own', row: 'front', col: 0 });
  }
  assert.equal(effectiveAttack(state, 'own', 'front', 0), 8,
    '连杀 5 个武将也只到 8 攻（attack_max:7 过滤器封顶）');
});
