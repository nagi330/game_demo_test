/**
 * 蜀国新增 11 将（2026-10-08 定稿）—— **数据驱动**的端到端验证
 *
 * 这一批卡的效果已由 `menghuo-recall` / `status-override` / `hand-to-deck` 等文件
 * 用**测试夹具**验过（夹具形状＝设计稿）。本文件的不同之处是：
 * **一切从 `core/data/cards.json` 的真实卡出发** —— 夹具与数据一旦漂移（改数值、改选择器、
 * 漏字段），这里立刻红。设计基线见 `docs/shu_new_generals_design_2026_10_08_v0.md` §1。
 */
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

import { applyAction, unitSkillTargetPlan } from '../src/engine.ts';
import { recomputeAuras, runTriggerSkills } from '../src/effects.ts';
import { applyStatus, dealDamage, killUnit, unitRef } from '../src/mutate.ts';
import { canUseLordSkill, canUseUnitSkill } from '../src/rules.ts';
import { createRng } from '../src/rng.ts';
import { capValue, getUnit, makeUnit, setUnit, statusStacks } from '../src/state.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { Action, CardDef, GameEvent, MatchState, Side, Unit } from '../src/types.ts';

/* ============================================================
   夹具：全部读真实卡
   ============================================================ */

const REAL: CardDef[] = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cards.json'), 'utf8'),
);
const real = (id: string): CardDef => {
  const c = REAL.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
};

const IDS = ['shu_wangping', 'shu_wutugu', 'shu_menghuo', 'shu_duosi', 'shu_luoxian', 'shu_fuqian',
  'shu_jiangwan', 'shu_feiyi', 'shu_dongyun', 'shu_yanyan', 'shu_yangyi'] as const;
for (const id of [...IDS, 'shu_wudangfeijun', 'shu_tengjiabing', 'shu_shamoke']) {
  const c = real(id);
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);
}

/** 摆场：手牌 + 可选单位（col 从 0 起；打出的卡固定放 col 4） */
function setup(opts: { hand?: string[]; units?: Array<{ id: string; col: number; side?: Side }> } = {}) {
  const { state, ctx } = scenario({ ownHand: opts.hand ?? [] });
  for (const u of opts.units ?? []) {
    setUnit(state, u.side ?? 'own', 'front', u.col, makeUnit(real(u.id), 0, 970 + u.col));
  }
  return { state, ctx };
}

const play = (state: MatchState, ctx: ReturnType<typeof setup>['ctx'], cardIndex = 0, col = 4) =>
  applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex, row: 'front', col } as Action);
const at = (s: MatchState, col: number, side: Side = 'own'): Unit | null => getUnit(s, side, 'front', col);
const hp = (s: MatchState, col: number, side: Side = 'own') => at(s, col, side)!.hp;
/** 打一下（可指定属性），返回实际掉血；每次测量前回满，避免把单位量死 */
function strike(s: MatchState, ctx: ReturnType<typeof setup>['ctx'], col: number, n: number,
  type: 'physical' | 'fire', side: Side = 'own'): number {
  const u = at(s, col, side)!;
  u.hp = u.maxHp;
  const before = u.hp;
  dealDamage(s, ctx.cards, unitRef(side, 'front', col), n, [], '测试', 0, undefined, undefined, type);
  return before - at(s, col, side)!.hp;
}

/* ============================================================
   0. 数据本身：11 张卡的数值 / 类型 / 标签 / 关键词
   ============================================================ */

test('数据：11 张卡的数值、类型、标签、关键词与设计稿一致', () => {
  const want: Array<[string, string, string, number, number, number, string[], string[]]> = [
    // id, 名, type, 费, 攻, 血, tags, keywords
    ['shu_wangping', '王平', 'general', 4, 3, 4, [], []],
    ['shu_wutugu', '兀突骨', 'general', 5, 3, 6, ['man_zu'], []],
    ['shu_menghuo', '孟获', 'general', 8, 4, 7, ['man_zu'], []],
    ['shu_duosi', '朵思大王', 'general', 4, 2, 5, ['man_zu'], []],
    ['shu_luoxian', '罗宪', 'general', 4, 2, 6, [], ['jia_dun']],
    ['shu_fuqian', '傅佥', 'general', 4, 4, 4, [], []],
    ['shu_jiangwan', '蒋琬', 'strategist', 4, 1, 4, [], []],
    ['shu_feiyi', '费祎', 'strategist', 4, 1, 4, [], []],
    ['shu_dongyun', '董允', 'strategist', 3, 1, 4, [], []],
    ['shu_yanyan', '严颜', 'general', 3, 2, 6, [], ['jia_dun']],
    ['shu_yangyi', '杨仪', 'strategist', 4, 1, 4, [], []],
  ];
  for (const [id, name, type, cost, atk, health, tags, keywords] of want) {
    const c = real(id);
    assert.equal(c.name, name, id);
    assert.equal(c.type, type, `${name} 类型`);
    assert.equal(c.cost, cost, `${name} 费用`);
    assert.equal(c.attack, atk, `${name} 攻击`);
    assert.equal(c.health, health, `${name} 生命`);
    assert.deepEqual(c.tags ?? [], tags, `${name} 标签`);
    assert.deepEqual(c.keywords ?? [], keywords, `${name} 关键词`);
    assert.ok(c.memo, `${name} 必须有 memo（AGENTS 要求）`);
  }
});

/* ============================================================
   1. 王平：战吼增益无当飞军（场上 + 手牌）／亡语再召唤一个
   ============================================================ */

test('王平：战吼给场上与手牌里的无当飞军各 +1/+1，亡语再召唤一个', () => {
  const { state, ctx } = setup({
    hand: ['shu_wangping', 'shu_wudangfeijun'],
    units: [{ id: 'shu_wudangfeijun', col: 0 }],
  });
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');

  assert.equal(at(r.state, 0)!.atk, 1, '场上的 0/2 无当飞军 → 1/3');
  assert.equal(at(r.state, 0)!.maxHp, 3);
  const inHand = r.state.sides.own.hand.find((h) => h.card.id === 'shu_wudangfeijun')!;
  const atkMod = inHand.mods.filter((m) => m.kind === 'attack').reduce((s, m) => s + (m.value ?? 0), 0);
  assert.equal(atkMod, 1, '手牌里的无当飞军也 +1 攻（打出时结算）');

  // 王平阵亡 → 亡语召唤一个无当飞军
  const before = r.state.sides.own.rows.front.filter(Boolean).length;
  const events: GameEvent[] = [];
  const wang = at(r.state, 4)!;
  killUnit(r.state, ctx.cards, { side: 'own', row: 'front', col: 4, unit: wang }, events);
  assert.equal(r.state.sides.own.rows.front.filter(Boolean).length, before,
    '死一个、召一个 → 场上数量不变');
  assert.ok(r.state.sides.own.rows.front.some((u) => u?.cardId === 'shu_wudangfeijun'),
    '亡语确实召唤了无当飞军');
});

/* ============================================================
   2. 兀突骨：真实藤甲兵被强化成「物理 −2、不怕火」
   ============================================================ */

test('兀突骨：真实藤甲兵被强化为物理 −2 且不再怕火（场上 + 手牌两条路）', () => {
  const { state, ctx } = setup({
    hand: ['shu_wutugu', 'shu_tengjiabing'],
    units: [{ id: 'shu_tengjiabing', col: 0 }],
  });
  applyStatus(state, unitRef('own', 'front', 0), 'teng_jia', 1, []);
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');

  const onBoard = at(r.state, 0)!;
  assert.equal(capValue(onBoard, 'reduce_physical'), 2, '场上藤甲兵：减伤 −2');
  assert.equal(capValue(onBoard, 'vulnerable_fire'), 0, '场上藤甲兵：不再怕火');
  assert.equal(strike(r.state, ctx, 0, 5, 'physical'), 3, '5 点物理 → 掉 3');
  assert.equal(strike(r.state, ctx, 0, 2, 'fire'), 2, '2 点火 → 掉 2（不再 +1）');

  const inHand = r.state.sides.own.hand.find((h) => h.card.id === 'shu_tengjiabing')!;
  assert.equal(inHand.mods.filter((m) => m.kind === 'rule').length, 2, '手牌里的藤甲兵带 2 条覆盖');

  const r2 = applyAction(r.state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 3 } as Action);
  assert.ok(r2.ok, r2.error ?? '');
  assert.equal(capValue(at(r2.state, 3)!, 'reduce_physical'), 2, '手牌带来的覆盖跟着进场');
});

/* ============================================================
   3. 孟获：蛮王（战吼，不含自己）＋ 七擒（阵亡回手）
   ============================================================ */

test('孟获：蛮王给其它南蛮 +2/+2，但**不含自己**；阵亡后按 −1/−1 收回手牌', () => {
  const { state, ctx } = setup({
    hand: ['shu_menghuo'],
    units: [{ id: 'shu_shamoke', col: 0 }],   // 沙摩柯：真实 man_zu 卡
  });
  state.sides.own.command = { cur: 10, max: 10 };
  const shamokeBefore = at(state, 0)!.atk;
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');

  assert.equal(at(r.state, 4)!.atk, 4, '孟获自己不吃自己的蛮王（4/7 保持不变）');
  assert.equal(at(r.state, 4)!.maxHp, 7);
  // 沙摩柯是光环随蛮族数量成长，基数 +2/+2 后应比原先高
  assert.ok(at(r.state, 0)!.atk > shamokeBefore, `沙摩柯应被增益（${shamokeBefore} → ${at(r.state, 0)!.atk}）`);

  const events: GameEvent[] = [];
  killUnit(r.state, ctx.cards, { side: 'own', row: 'front', col: 4, unit: at(r.state, 4)! }, events);
  const hand = r.state.sides.own.hand;
  assert.equal(hand.length, 1, '孟获回到手牌');
  assert.equal(hand[0]!.card.id, 'shu_menghuo');
  assert.equal(hand[0]!.mods.find((m) => m.kind === 'cost')!.value, -1, '收回代价：−1 费');
  assert.equal(hand[0]!.mods.find((m) => m.kind === 'health')!.value, -1, '收回代价：−1 生命上限');
});

/* ============================================================
   4. 朵思大王：全体毒攻 → 全体中毒
   ============================================================ */

test('朵思大王：毒泉对敌方全体造成 1 点毒攻并自动挂中毒', () => {
  const { state, ctx } = setup({
    hand: ['shu_duosi'],
    units: [
      { id: 'shu_shamoke', col: 0, side: 'enemy' },
      { id: 'shu_wangping', col: 1, side: 'enemy' },
    ],
  });
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  for (const col of [0, 1]) {
    assert.equal(statusStacks(at(r.state, col, 'enemy')!, 'zhong_du'), 1, `第 ${col} 列中毒 1 层`);
    const u = at(r.state, col, 'enemy')!;
    assert.equal(u.hp, u.maxHp - 1, `第 ${col} 列恰好掉 1 点`
      + '（沙摩柯另有"随场上南蛮数成长"的光环，所以不能写死血量）');
  }
  assert.equal(hp(r.state, 1, 'enemy'), 3, '王平 3/4 → 3');
});

/* ============================================================
   5. 罗宪：孤城（单独在场 +2/+2）
   ============================================================ */

test('罗宪：单独在场 4/8，有友军时回到 2/6', () => {
  const { state, ctx } = setup({ hand: ['shu_luoxian'] });
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(`${at(r.state, 4)!.atk}/${at(r.state, 4)!.maxHp}`, '4/8', '孤城生效');

  setUnit(r.state, 'own', 'front', 3, makeUnit(real('shu_wangping'), 0, 999));
  recomputeAuras(r.state, ctx.cards, createRng(1), []);
  assert.equal(`${at(r.state, 4)!.atk}/${at(r.state, 4)!.maxHp}`, '2/6', '来了友军，孤城失效');
});

/* ============================================================
   6. 傅佥 / 严颜：亡语对击杀者
   ============================================================ */

test('傅佥：亡语消灭击杀者', () => {
  const { state, ctx } = setup({
    hand: ['shu_fuqian'],
    units: [{ id: 'shu_shamoke', col: 0, side: 'enemy' }],
  });
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  const events: GameEvent[] = [];
  killUnit(r.state, ctx.cards, { side: 'own', row: 'front', col: 4, unit: at(r.state, 4)! }, events,
    { side: 'enemy', row: 'front', col: 0 });
  assert.equal(at(r.state, 0, 'enemy'), null, '击杀者被一起带走');
});

test('严颜：亡语对击杀者反噬 3 点（架盾是卡面关键词）', () => {
  const { state, ctx } = setup({
    hand: ['shu_yanyan'],
    units: [{ id: 'shu_wangping', col: 0, side: 'enemy' }],   // 3/4，无减伤，扛得住 3 点
  });
  assert.deepEqual(real('shu_yanyan').keywords, ['jia_dun'], '架盾写在卡面上');
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  const before = hp(r.state, 0, 'enemy');
  killUnit(r.state, ctx.cards, { side: 'own', row: 'front', col: 4, unit: at(r.state, 4)! }, [],
    { side: 'enemy', row: 'front', col: 0 });
  assert.equal(before - hp(r.state, 0, 'enemy'), 3, '击杀者挨 3 点');
});

/* ============================================================
   7. 蒋琬：回合开始统率上限 +1
   ============================================================ */

test('蒋琬：每个己方回合开始，主公统率**上限** +1（永久）', () => {
  const { state, ctx } = setup({ hand: ['shu_jiangwan'] });
  state.sides.own.command = { cur: 5, max: 5 };   // 默认 max=10 已被 COMMAND.MAX 封顶，先压低才看得出 ramp
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  const max0 = r.state.sides.own.command.max;
  assert.equal(max0, 5, '战吼本身不加统率（只有回合开始才加）');
  for (let i = 1; i <= 2; i++) {
    const events: GameEvent[] = [];
    runTriggerSkills(r.state, ctx.cards, 'own', 'turn_start', createRng(1), events);
    assert.equal(r.state.sides.own.command.max, max0 + i, `第 ${i} 次回合开始 → 上限 +${i}`);
  }
});

/* ============================================================
   8. 费祎：回合结束己方全体回 1 血
   ============================================================ */

test('费祎：己方回合结束，己方场上人物各回 1 点', () => {
  const { state, ctx } = setup({
    hand: ['shu_feiyi'],
    units: [{ id: 'shu_shamoke', col: 0 }],
  });
  at(state, 0)!.hp = 1;
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  at(r.state, 0)!.hp = 1;                                   // 再打伤一次
  const events: GameEvent[] = [];
  runTriggerSkills(r.state, ctx.cards, 'own', 'turn_end', createRng(1), events);
  assert.equal(hp(r.state, 0), 2, '沙摩柯 1 → 2');
  assert.ok(events.some((e) => e.type === 'HEAL'), '应产出 HEAL 事件');
});

/* ============================================================
   9. 董允：主公获得「参谋」（主公技次数 +1）
   ============================================================ */

test('董允：战吼让主公获得参谋 —— 主公技一回合能用两次', () => {
  const { state, ctx } = setup({ hand: ['shu_dongyun'] });
  const lord = state.sides.own.lord;
  const before = canUseLordSkill(state, 'own').ok;
  assert.equal(before, true, '开局可以用一次');

  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(statusStacks(r.state.sides.own.lord as unknown as Unit, 'can_mou'), 1,
    '参谋挂在**主公**身上（引擎读的就是它）');

  // 用掉一次主公技后，因为手里还有参谋，仍然可以再用
  const lordState = r.state.sides.own.lord;
  lordState.skillUsedThisTurn = true;
  assert.equal(canUseLordSkill(r.state, 'own').ok, true, '有参谋 → 本回合还能再用一次');
  assert.ok(lord, '主将存在');
});

/* ============================================================
   10. 杨仪：抽二选一（挂起 → 玩家点牌 → 另一张回牌库底）
   ============================================================ */

test('杨仪：战技抽两张、挂起等玩家选，选中的另一张进牌库底', () => {
  const { state, ctx } = setup({ hand: ['shu_yangyi'] });
  state.sides.own.deck = ['neutral_infantry', 'neutral_shieldman', 'neutral_archer'];
  setUnit(state, 'own', 'front', 4, makeUnit(real('shu_yangyi'), 0, 980));
  state.sides.own.hand = [{ card: real('shu_yangyi'), mods: [] }];

  // ⚠️ ADR-145 契约：这个战技**不需要目标**（`choices` 为空）。
  //    原型 UI 曾经因此"点了没反应"（它要求技能必须有可选目标才派发），
  //    池里同类技能共有 8 张（诸葛亮运筹帷幄 / 弓兵放箭 / 曹丕宗室擢用 / 太史慈神射豪 /
  //    鲁肃仗义疏财 / 冀州强弩强弩 / 锦帆军劫营 / 杨仪筹度粮谷）—— 这条断言把契约钉住。
  const plan = unitSkillTargetPlan(state, 'own', 'front', 4);
  assert.deepEqual(plan.choices, [], '无目标技：choices 为空，UI 必须直接派发 USE_SKILL');
  assert.equal(canUseUnitSkill(state, 'own', 'front', 4).ok, true, '无目标技也是"可用"的');

  const r = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 4 } as Action);
  assert.ok(r.ok, r.error ?? '');
  assert.ok(r.state.pendingHandChoice, '抽完两张后挂起选择');
  assert.deepEqual(r.state.pendingHandChoice!.indices, [1, 2],
    '候选＝刚抽到的那两张（不含留在手里的杨仪）');

  const done = applyAction(r.state, ctx, { type: 'CHOOSE_HAND', handIndex: 2 } as Action);
  assert.ok(done.ok, done.error ?? '');
  assert.deepEqual(done.state.sides.own.hand.map((h) => h.card.id),
    ['shu_yangyi', 'neutral_archer'], '留下 archer，另一张回底');
  assert.equal(done.state.sides.own.deck[0], 'neutral_shieldman', '放回的是牌库**底**');
});
