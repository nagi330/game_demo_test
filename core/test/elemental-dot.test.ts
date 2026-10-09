/**
 * 属性伤害自动挂 DoT：火→灼烧 / 水→水困 / 毒→中毒（ADR-134 火；**ADR-138 扩展水、毒**）
 *
 * ## 这条规则是什么
 *
 * **对敌方**打出的**属性伤害效果**（`damage_type: fire | water | poison`），
 * 打完就对**该次伤害的目标**各挂 1 层对应 DoT —— 与伤害数值无关（3 点也只 +1 层），
 * 同一张卡的多段属性伤害**各算一次**。
 *
 * ## 三条必须钉死的边界（都是 ADR-134 踩出来的）
 *
 * 1. **只对敌人**：打自己人 / 打自身不挂（蒙冲斗舰对自身的 2 点火伤只掉血）。
 * 2. **只挂场上单位**：主公不吃 DoT 层（三个 DoT 都只在场上单位结算，主公挂了是"永不结算的徽章"）。
 * 3. **DoT 自己的跳伤不挂层**：规则挂在**效果层**，而 DoT 跳伤绕过效果层直接调 `dealDamage`
 *    —— 否则每回合自我叠层、无限增长。
 *
 * ## 三系叠加语义（由状态定义的 `stack_mode` 决定，代码里不特判）
 *
 * | 状态 | stack_mode | 重复挂层的效果 |
 * |---|---|---|
 * | 灼烧 `zhuo_shao` | add（默认） | 每次火攻 +1 层、不封顶 |
 * | 中毒 `zhong_du` | add（默认） | 每次毒攻 +1 层（永久削生命上限） |
 * | 水困 `shui_kun` | **max** | 只保证"至少有 1 层（阶段 1）"，**不会加速阶段** |
 */
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

import { applyAction } from '../src/engine.ts';
import { resolveTurnEndStatuses, resolveTurnStartDamage, unitRef } from '../src/mutate.ts';
import { getUnit, makeUnit, setUnit, statusStacks } from '../src/state.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { Action, CardDef, GameEvent, MatchState, Side, Unit } from '../src/types.ts';

/* ============================================================
   夹具：四张"纯属性伤害"测试卡（不放正式卡池）
   ============================================================ */

const mk = (id: string, name: string, effects: CardDef['skills'] extends undefined ? never : object[]): CardDef => ({
  id, name, faction: 'shu', type: 'general', cost: 1, attack: 1, health: 2,
  keywords: [], gender: 'male', memo: '测试', skills: [{
    id: `${id}_sk`, name: '测试技', kind: 'trigger', trigger: 'on_play', effects,
  }],
} as CardDef);

/** 对**敌方全体**打水伤 */
const WATER_ALL = mk('test_water_all', '水淹', [
  { action: 'damage', value: 2, damage_type: 'water', target: { side: 'enemy', filter: { type: 'character' }, count: 'all' } },
]);
/** 对**敌方全体**打毒伤 */
const POISON_ALL = mk('test_poison_all', '毒雾', [
  { action: 'damage', value: 1, damage_type: 'poison', target: { side: 'enemy', filter: { type: 'character' }, count: 'all' } },
]);
/** 对**己方全体**打水伤（打自己人：不该挂层） */
const WATER_SELF = mk('test_water_self', '自灌', [
  { action: 'damage', value: 1, damage_type: 'water', target: { side: 'ally', filter: { type: 'character' }, count: 'all' } },
]);
/** 对**敌方主公**打水伤（主公：不该挂层） */
const WATER_LORD = mk('test_water_lord', '灌城', [
  { action: 'damage', value: 1, damage_type: 'water', target: { side: 'enemy', lord: true } },
]);
/** 对敌方全体打**火**伤（回归对照） */
const FIRE_ALL = mk('test_fire_all', '火攻', [
  { action: 'damage', value: 1, damage_type: 'fire', target: { side: 'enemy', filter: { type: 'character' }, count: 'all' } },
]);
/** 对**敌方全体**打**物**伤（不该挂任何一个 DoT） */
const PHYS_ALL = mk('test_phys_all', '乱射', [
  { action: 'damage', value: 1, target: { side: 'enemy', filter: { type: 'character' }, count: 'all' } },
]);

for (const c of [WATER_ALL, POISON_ALL, WATER_SELF, WATER_LORD, FIRE_ALL, PHYS_ALL]) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);
}

/** 摆场景：己方手牌一张卡，敌方第 2 格一个沙包；返回"打出去"的结果 */
function play(card: CardDef, opts: { sandbagHp?: number; sandbagStatuses?: Record<string, { stacks: number }> } = {}) {
  const { state, ctx } = scenario({ ownHand: [card.id] });
  const bag = makeUnit({ ...(TEST_CARDS.find((c) => c.id === 'test_element_sandbag') ?? SANDBAG) }, 0, 902);
  bag.hp = bag.maxHp;
  if (opts.sandbagStatuses) bag.statuses = { ...bag.statuses, ...opts.sandbagStatuses } as Unit['statuses'];
  setUnit(state, 'enemy', 'front', 2, bag);
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 4 } as Action);
  assert.ok(r.ok, `${card.name} 应能打出：${r.error}`);
  return {
    state: r.state, events: r.events as GameEvent[],
    bag: (): Unit | null => getUnit(r.state, 'enemy', 'front', 2),
  };
}

/** 高血沙包（够挨很多回合） */
const SANDBAG: CardDef = {
  id: 'test_element_sandbag', name: '沙包', faction: 'wei', type: 'troop',
  cost: 2, attack: 2, health: 20, troopKind: 'infantry', keywords: [], memo: '测试',
};
if (!TEST_CARDS.some((c) => c.id === SANDBAG.id)) TEST_CARDS.push(SANDBAG);

/** 带主动技的术士：验证"行动税"这个挂点（行动税在主动技后结算） */
const CASTER: CardDef = {
  id: 'test_dot_caster', name: '术士', faction: 'shu', type: 'strategist',
  cost: 2, attack: 0, health: 20, keywords: [],
  skills: [{
    id: 'test_dot_zap', name: '雷击', kind: 'active', cost: 1, frequency: 'once_per_turn',
    target: { side: 'enemy', filter: { type: 'character' }, count: 1, mode: 'choose' },
    effects: [{ action: 'damage', value: 1 }],
  }],
  memo: '测试',
};
if (!TEST_CARDS.some((c) => c.id === CASTER.id)) TEST_CARDS.push(CASTER);

/** 从 core/data/cards.json 读真实卡（防内联夹具与数据漂移） */
const REAL_CARDS: CardDef[] = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cards.json'), 'utf8'),
);
const realCard = (id: string): CardDef => {
  const c = REAL_CARDS.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
};

/* ============================================================
   水 · 水困
   ============================================================ */

test('水攻命中敌人 → 自动挂 1 层水困（永久、无 turns）', () => {
  const { bag, events } = play(WATER_ALL);
  assert.equal(statusStacks(bag()!, 'shui_kun'), 1, '水攻应挂 1 层水困');
  assert.equal(bag()!.statuses.shui_kun!.turns, undefined,
    '水困是**永久**状态（ADR-132）：自动挂层不能写 turns，否则回合末就被清掉');
  assert.ok(events.some((e) => e.type === 'STATUS_APPLIED' && e.status === 'shui_kun'),
    '应有 STATUS_APPLIED 事件（客户端靠它弹徽章）');
});

test('水攻打**自己人** → 不挂水困', () => {
  const { state, ctx } = scenario({ ownHand: [WATER_SELF.id] });
  const ally = makeUnit(SANDBAG, 0, 903);
  setUnit(state, 'own', 'front', 3, ally);
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 4 } as Action);
  assert.ok(r.ok, r.error ?? '');
  const self = getUnit(r.state, 'own', 'front', 3)!;
  assert.equal(self.hp, self.maxHp - 1, '自己人照吃这 1 点水伤');
  assert.equal(statusStacks(self, 'shui_kun'), 0, '打自己人不该挂水困（ADR-134 口径：只对敌人）');
});

test('水攻打**敌方主公** → 只掉血、不挂水困（DoT 只挂场上单位）', () => {
  const { state } = play(WATER_LORD);
  assert.equal(state.sides.enemy.lord.hp, 29, '主公照吃这 1 点水伤');
  assert.equal(Object.keys(state.sides.enemy.lord.statuses ?? {}).includes('shui_kun'), false,
    '主公不挂水困 —— 水困只在场上单位结算，挂上去是个永不结算的徽章');
});

test('水困是 stack_mode: max —— 反复水攻只保证"至少 1 层"，不会加速阶段', () => {
  const first = play(WATER_ALL);
  const stacksAfterFirst = statusStacks(first.bag()!, 'shui_kun');
  const again = play(WATER_ALL, { sandbagStatuses: { shui_kun: { stacks: 3 } } });
  assert.equal(stacksAfterFirst, 1);
  assert.equal(statusStacks(again.bag()!, 'shui_kun'), 3,
    '目标已有阶段 3 时，再吃一次水攻仍是阶段 3（取较大者）—— 阶段只由该方回合结束 +1');
});

test('水困的**行动税**是水属性，但**不会**给自己叠层（DoT 跳伤绕过效果层）', () => {
  // 行动税在 chargeWaterTax 里直接调 dealDamage（damageType='water'）—— 它**绕过效果层**，
  // 所以不会命中"水攻挂水困"这条规则。若哪天有人把规则下沉进 damage 管线，本用例会红。
  const { state, ctx } = scenario({ ownCommand: 10 });
  ctx.cards.set(CASTER.id, CASTER);
  ctx.cards.set(SANDBAG.id, SANDBAG);
  const caster = makeUnit(CASTER, 0, 904);
  caster.statuses.shui_kun = { stacks: 2 };
  setUnit(state, 'own', 'front', 0, caster);
  setUnit(state, 'enemy', 'front', 3, makeUnit(SANDBAG, 0, 913));
  const r = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 0, target: { side: 'enemy', row: 'front', col: 3 },
  } as Action);
  assert.ok(r.ok, r.error ?? '主动技应能释放');
  const after = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(caster.hp - after.hp, 2, '阶段 2 → 施法者自己吃 2 点水伤（行动税）');
  assert.equal(statusStacks(after, 'shui_kun'), 2,
    '行动税的水伤**不该**再挂一层水困 —— 否则每回合自我叠层、无限增长（ADR-134 的核心约束）');
});

/* ============================================================
   毒 · 中毒
   ============================================================ */

test('毒攻命中敌人 → 自动挂 1 层中毒（永久、无 turns）', () => {
  const { bag } = play(POISON_ALL);
  assert.equal(statusStacks(bag()!, 'zhong_du'), 1, '毒攻应挂 1 层中毒');
  assert.equal(bag()!.statuses.zhong_du!.turns, undefined, '中毒是永久状态（ADR-132）');
});

test('中毒是 stack_mode: add —— 第二次毒攻叠到 2 层（永久削上限更狠）', () => {
  const again = play(POISON_ALL, { sandbagStatuses: { zhong_du: { stacks: 1 } } });
  assert.equal(statusStacks(again.bag()!, 'zhong_du'), 2, '毒攻每次各 +1 层');
});

test('中毒的回合末削上限**不会**自我叠层（层数只由毒攻增加）', () => {
  const { state, ctx } = scenario({});
  const bag = makeUnit(SANDBAG, 0, 905);
  setUnit(state, 'enemy', 'front', 2, bag);
  state.sides.enemy.rows.front[2]!.statuses.zhong_du = { stacks: 1 };
  const before = getUnit(state, 'enemy', 'front', 2)!.maxHp;
  resolveTurnEndStatuses(state, ctx.cards, 'enemy', []);
  const u = getUnit(state, 'enemy', 'front', 2)!;
  assert.equal(u.maxHp, before - 1, '1 层中毒 → 削 1 点上限');
  assert.equal(statusStacks(u, 'zhong_du'), 1, '削上限不该把层数加上去（否则指数级恶化）');
});

/* ============================================================
   火（回归）与物伤（负向）
   ============================================================ */

test('火攻仍然挂灼烧（ADR-134 回归）', () => {
  const { bag } = play(FIRE_ALL);
  assert.equal(statusStacks(bag()!, 'zhuo_shao'), 1);
});

test('**物理**伤害不挂任何 DoT（普通攻击与无属性效果伤害都不挂）', () => {
  const { bag } = play(PHYS_ALL);
  assert.equal(statusStacks(bag()!, 'zhuo_shao'), 0);
  assert.equal(statusStacks(bag()!, 'shui_kun'), 0);
  assert.equal(statusStacks(bag()!, 'zhong_du'), 0);
});

test('伤害被**减免到 0** 也照挂（披坚免伤：打出去了就挂）', () => {
  const { bag } = play(WATER_ALL, { sandbagStatuses: { sheng_dun_status: { stacks: 1 } } });
  assert.equal(bag()!.hp, bag()!.maxHp, '披坚把这一下整段免疫（0 伤）');
  assert.equal(statusStacks(bag()!, 'shui_kun'), 1, '伤害为 0 也照挂 —— 判据是"打出去了"，不是"掉了多少血"');
});

/* ============================================================
   真实卡数据（防夹具与数据漂移）
   ============================================================ */

test('真实卡：无当飞军「毒箭」= 1 层中毒（不再显式施加，靠毒攻自动挂）', () => {
  const wudang = realCard('shu_wudangfeijun');
  const dujian = (wudang.skills ?? []).find((s) => s.name === '毒箭')!;
  const { state, ctx } = scenario({ ownCommand: 10 });
  const src = makeUnit(wudang, 0, 906);
  setUnit(state, 'own', 'front', 4, src);
  const bag = makeUnit(SANDBAG, 0, 907);
  setUnit(state, 'enemy', 'front', 2, bag);
  const r = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 4, target: { side: 'enemy', row: 'front', col: 2 }, skillId: dujian.id,
  } as Action);
  assert.ok(r.ok, `毒箭应能使用：${r.error}`);
  const hit = getUnit(r.state, 'enemy', 'front', 2)!;
  assert.equal(hit.hp, (SANDBAG.health ?? 20) - 1, '毒攻造成 1 点伤害（削上限在对方回合末结算，不是立刻）');
  assert.equal(hit.maxHp, (SANDBAG.health ?? 20), '中毒削上限要等该方回合结束，此刻上限不变');
  assert.equal(statusStacks(hit, 'zhong_du'), 1, '毒箭每次只挂 **1 层**（显式那条已删，否则是 2 层）');
});

test('真实卡：关羽「水淹七军」= 全体各 1 层水困（显式 + 自动不会变 2 层）', () => {
  const guanyu = realCard('shu_guanyu');
  // scenario 的手牌按 TEST_CARDS 查表，所以真实卡要先注册进夹具
  if (!TEST_CARDS.some((c) => c.id === guanyu.id)) TEST_CARDS.push(guanyu);
  const { state, ctx } = scenario({ ownHand: [guanyu.id] });
  for (const col of [1, 2, 3]) setUnit(state, 'enemy', 'front', col, makeUnit(SANDBAG, 0, 910 + col));
  // 水淹七军是**战吼**（on_play）：走打出流程，不是 USE_SKILL
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 4 } as Action);
  assert.ok(r.ok, `关羽应能打出：${r.error}`);
  for (const col of [1, 2, 3]) {
    const u = getUnit(r.state, 'enemy', 'front', col)!;
    assert.equal(statusStacks(u, 'shui_kun'), 1, `第 ${col} 列应恰好 1 层水困（max 语义，不会翻倍）`);
    assert.equal(u.hp, (SANDBAG.health ?? 20) - 1, `第 ${col} 列应吃到 1 点水伤`);
  }
});
