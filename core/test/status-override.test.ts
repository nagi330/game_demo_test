/**
 * 规则覆盖 `override_status`（ADR-142）：兀突骨「藤甲统率」
 *
 * ## 为什么需要它（而不是"多加几层藤甲"）
 *
 * 藤甲的**减伤**和**怕火**由**同一个层数**驱动：
 *
 *     reducePhysical = capStacks(u.statuses, 'reduce_physical')   // 物理 −N
 *     vulnerableFire = capStacks(u.statuses, 'vulnerable_fire')   // 遇火 +N
 *
 * 所以"把藤甲加强到 −2"若靠加层数，会**连带**把「遇火 +1」变成「遇火 +2」。
 * 而设计者要的是 **物理 −2 且不再怕火** —— 只能**覆盖档位**：
 *
 *     override_status { status: teng_jia, caps: { reduce_physical: 2, vulnerable_fire: 0 } }
 *
 * ## 三条语义（本文件逐条钉死）
 *
 * 1. **仅当该状态存在于目标身上时才生效** —— 净化掉藤甲 ⇒ 覆盖失效；
 *    重新获得藤甲 ⇒ 覆盖**自动恢复**（覆盖挂在实例上、每次结算现读，不是一次性改写数据）。
 * 2. **绝对值覆盖**，不是增减量（`vulnerable_fire: 0` 就是彻底关掉"遇火"）。
 * 3. **幂等** —— 同一 (状态, 档位) 反复触发只留一条。
 *
 * ## 覆盖范围（设计口径）
 *
 * 兀突骨的「藤甲统率」是**战吼**：只覆盖**结算那一刻**在**己方场上**（带藤甲）与**手牌里**的藤甲兵。
 * 之后才上场的藤甲兵不在覆盖内 —— 与孟获「蛮王」的"当前手牌上的"是同一套**快照**口径。
 */
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

import { applyAction } from '../src/engine.ts';
import { applyStatus, dealDamage, removeStatus, unitRef } from '../src/mutate.ts';
import { capValue, getUnit, makeUnit, setUnit, statusStacks } from '../src/state.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { Action, CardDef, GameEvent, MatchState, Side, Unit } from '../src/types.ts';

/* ============================================================
   夹具
   ============================================================ */

/** 从 core/data/cards.json 读真实卡（防夹具与数据漂移） */
const REAL_CARDS: CardDef[] = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cards.json'), 'utf8'),
);
const realCard = (id: string): CardDef => {
  const c = REAL_CARDS.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
};

const TENGJIA = realCard('shu_tengjiabing');   // 3 费 2/4 盾兵·架盾；光环自挂 1 层藤甲

/** 兀突骨（设计稿形状）：战吼给场上带藤甲的 + 手牌里的藤甲兵套「藤甲强化」 */
const WUTUGU: CardDef = {
  id: 'test_wutugu', name: '兀突骨', faction: 'shu', type: 'general', cost: 5, attack: 3, health: 6,
  keywords: [], tags: ['man_zu'], gender: 'male', memo: '测试：藤甲统率',
  skills: [{
    id: 'teng_jia_tongling', name: '藤甲统率', kind: 'trigger', trigger: 'on_play',
    effects: [
      // 场上：筛"身上有藤甲的己方角色"（引擎已有 has_status 筛选，全池有先例）
      { action: 'override_status', status: 'teng_jia', caps: { reduce_physical: 2, vulnerable_fire: 0 },
        target: { side: 'ally', filter: { type: 'character', has_status: 'teng_jia' }, count: 'all' } },
      // 手牌：手牌没有状态，所以按卡 id 筛（成员变多时建议改 tag，见设计文档）
      { action: 'override_status', status: 'teng_jia', caps: { reduce_physical: 2, vulnerable_fire: 0 },
        target: { side: 'ally', zone: 'hand', filter: { card_id: 'shu_tengjiabing' }, count: 'all' } },
    ],
  }],
} as CardDef;

for (const c of [WUTUGU, TENGJIA]) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);
}

/** 摆场：可放置单位、可放手牌 */
function board(opts: { units?: Array<{ card: CardDef; col: number }>; hand?: string[] } = {}) {
  const { state, ctx } = scenario({ ownHand: opts.hand ?? [] });
  for (const { card, col } of opts.units ?? []) setUnit(state, 'own', 'front', col, makeUnit(card, 0, 960 + col));
  return { state, ctx };
}

/** 造成 N 点指定属性的伤害，返回实际掉血 */
function hit(state: MatchState, ctx: ReturnType<typeof board>['ctx'], col: number, amount: number,
  type: 'physical' | 'fire'): number {
  const u = getUnit(state, 'own', 'front', col)!;
  u.hp = u.maxHp;                        // 每次测量前回满：一个用例里量多次，别把单位打死了
  const before = u.hp;
  dealDamage(state, ctx.cards, unitRef('own', 'front', col), amount, [], '测试', 0, undefined, undefined, type);
  return before - getUnit(state, 'own', 'front', col)!.hp;
}

const rulesOf = (u: Unit) => u.mods.filter((m) => m.kind === 'rule');

/* ============================================================
   1. 基线：藤甲兵的原始藤甲
   ============================================================ */

test('基线：真实藤甲兵自带 1 层藤甲 —— 物理 −1、遇火 +1', () => {
  const { state, ctx } = board({ units: [{ card: TENGJIA, col: 2 }] });
  const u = getUnit(state, 'own', 'front', 2)!;
  applyStatus(state, unitRef('own', 'front', 2), 'teng_jia', 1, []);   // 光环正常会在入场时挂上
  assert.equal(statusStacks(u, 'teng_jia'), 1);
  assert.equal(capValue(u, 'reduce_physical'), 1, '减伤 = 层数');
  assert.equal(capValue(u, 'vulnerable_fire'), 1, '遇火 = 同一个层数');

  assert.equal(hit(state, ctx, 2, 3, 'physical'), 2, '3 点物理 → 掉 2（−1）');
  assert.equal(hit(state, ctx, 2, 2, 'fire'), 3, '2 点火 → 掉 3（+1）');
});

/* ============================================================
   2. 覆盖之后：物理 −2 且不再怕火
   ============================================================ */

test('藤甲强化：物理减伤 −2（层数仍然只有 1）', () => {
  const { state, ctx } = board({ units: [{ card: TENGJIA, col: 2 }] });
  applyStatus(state, unitRef('own', 'front', 2), 'teng_jia', 1, []);
  const u = getUnit(state, 'own', 'front', 2)!;
  u.mods.push({ id: 'r1', kind: 'rule', rule: { statusId: 'teng_jia', cap: 'reduce_physical', value: 2 } });

  assert.equal(statusStacks(u, 'teng_jia'), 1, '层数没变 —— 加强不是靠加层');
  assert.equal(capValue(u, 'reduce_physical'), 2);
  assert.equal(hit(state, ctx, 2, 5, 'physical'), 3, '5 点物理 → 掉 3（−2）');
});

test('藤甲强化：**不再怕火**（vulnerable_fire 覆盖为 0）', () => {
  const { state, ctx } = board({ units: [{ card: TENGJIA, col: 2 }] });
  applyStatus(state, unitRef('own', 'front', 2), 'teng_jia', 1, []);
  const u = getUnit(state, 'own', 'front', 2)!;
  u.mods.push({ id: 'r2', kind: 'rule', rule: { statusId: 'teng_jia', cap: 'vulnerable_fire', value: 0 } });

  assert.equal(capValue(u, 'vulnerable_fire'), 0, '绝对值覆盖：0 = 彻底关掉（不是 +0 增量）');
  assert.equal(hit(state, ctx, 2, 2, 'fire'), 2, '2 点火 → 掉 2（不再 +1）');
  assert.equal(hit(state, ctx, 2, 3, 'physical'), 2, '减伤仍是原始的 −1（这条覆盖只管火）');
});

test('两条一起（兀突骨的完整效果）：物理 −2、遇火 +0', () => {
  const { state, ctx } = board({ units: [{ card: TENGJIA, col: 2 }] });
  applyStatus(state, unitRef('own', 'front', 2), 'teng_jia', 1, []);
  const u = getUnit(state, 'own', 'front', 2)!;
  u.mods.push({ id: 'r1', kind: 'rule', rule: { statusId: 'teng_jia', cap: 'reduce_physical', value: 2 } });
  u.mods.push({ id: 'r2', kind: 'rule', rule: { statusId: 'teng_jia', cap: 'vulnerable_fire', value: 0 } });

  assert.equal(hit(state, ctx, 2, 5, 'physical'), 3, '物理 5 → 3');
  assert.equal(hit(state, ctx, 2, 2, 'fire'), 2, '火 2 → 2');
});

/* ============================================================
   3. 「仅当状态存在时生效」：净化与恢复
   ============================================================ */

test('净化掉藤甲 → 覆盖**失效**（不会凭空给一个没有藤甲的单位 −2）', () => {
  const { state, ctx } = board({ units: [{ card: TENGJIA, col: 2 }] });
  applyStatus(state, unitRef('own', 'front', 2), 'teng_jia', 1, []);
  const u = getUnit(state, 'own', 'front', 2)!;
  u.mods.push({ id: 'r1', kind: 'rule', rule: { statusId: 'teng_jia', cap: 'reduce_physical', value: 2 } });
  u.mods.push({ id: 'r2', kind: 'rule', rule: { statusId: 'teng_jia', cap: 'vulnerable_fire', value: 0 } });
  assert.equal(capValue(u, 'reduce_physical'), 2);

  removeStatus(state, unitRef('own', 'front', 2), 'teng_jia', []);
  assert.equal(capValue(u, 'reduce_physical'), 0, '没有藤甲 → 覆盖不生效');
  assert.equal(hit(state, ctx, 2, 3, 'physical'), 3, '3 点物理全额吃下');
  assert.equal(hit(state, ctx, 2, 2, 'fire'), 2, '没有藤甲也没有怕火');
});

test('重新获得藤甲 → 覆盖**自动恢复**（覆盖是现读的，不是一次性改写）', () => {
  const { state, ctx } = board({ units: [{ card: TENGJIA, col: 2 }] });
  const u = getUnit(state, 'own', 'front', 2)!;
  u.mods.push({ id: 'r1', kind: 'rule', rule: { statusId: 'teng_jia', cap: 'reduce_physical', value: 2 } });

  assert.equal(capValue(u, 'reduce_physical'), 0, '还没有藤甲时不生效');
  applyStatus(state, unitRef('own', 'front', 2), 'teng_jia', 1, []);
  assert.equal(capValue(u, 'reduce_physical'), 2, '藤甲一上身，覆盖立刻按 2 结算');
  assert.equal(hit(state, ctx, 2, 4, 'physical'), 2, '4 点物理 → 掉 2');
});

/* ============================================================
   4. 卡片走完整流程：兀突骨战吼（场上 + 手牌）
   ============================================================ */

test('兀突骨战吼：己方**场上**带藤甲的单位被强化（物理 −2、不怕火）', () => {
  const { state, ctx } = board({ units: [{ card: TENGJIA, col: 1 }], hand: ['test_wutugu'] });
  state.sides.own.command = { cur: 10, max: 10 };
  applyStatus(state, unitRef('own', 'front', 1), 'teng_jia', 1, []);

  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 4 } as Action);
  assert.ok(r.ok, r.error ?? '');
  const u = getUnit(r.state, 'own', 'front', 1)!;
  assert.equal(rulesOf(u).length, 2, '两条覆盖（减伤 + 免火）');
  assert.equal(capValue(u, 'reduce_physical'), 2);
  assert.equal(capValue(u, 'vulnerable_fire'), 0);
  assert.equal(hit(r.state, ctx, 1, 5, 'physical'), 3, '物理 5 → 3');
  assert.equal(hit(r.state, ctx, 1, 2, 'fire'), 2, '火 2 → 2');
});

test('兀突骨战吼：**手牌**里的藤甲兵带上覆盖，打出后照样生效', () => {
  const { state, ctx } = board({ hand: ['test_wutugu', 'shu_tengjiabing'] });
  state.sides.own.command = { cur: 10, max: 10 };

  const r1 = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 4 } as Action);
  assert.ok(r1.ok, r1.error ?? '');
  const inHand = r1.state.sides.own.hand.find((h) => h.card.id === 'shu_tengjiabing')!;
  assert.equal(inHand.mods.filter((m) => m.kind === 'rule').length, 2, '手牌上带着 2 条覆盖');

  // 打出这张被强化过的藤甲兵（它的光环会给自己挂 1 层藤甲）
  const r2 = applyAction(r1.state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 } as Action);
  assert.ok(r2.ok, r2.error ?? '');
  const u = getUnit(r2.state, 'own', 'front', 0)!;
  assert.equal(statusStacks(u, 'teng_jia'), 1, '自带 1 层藤甲');
  assert.equal(capValue(u, 'reduce_physical'), 2, '手牌带来的覆盖跟着进场了');
  assert.equal(capValue(u, 'vulnerable_fire'), 0);
  assert.equal(hit(r2.state, ctx, 0, 5, 'physical'), 3, '物理 5 → 3');
  assert.equal(hit(r2.state, ctx, 0, 2, 'fire'), 2, '火 2 → 2');
});

test('幂等：同一 (状态, 档位) 反复触发只留一条覆盖', () => {
  const { state, ctx } = board({ units: [{ card: TENGJIA, col: 1 }], hand: ['test_wutugu', 'test_wutugu'] });
  state.sides.own.command = { cur: 10, max: 10 };
  applyStatus(state, unitRef('own', 'front', 1), 'teng_jia', 1, []);

  let s = state;
  for (let i = 0; i < 2; i++) {
    const r = applyAction(s, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 3 + i } as Action);
    assert.ok(r.ok, r.error ?? '');
    s = r.state;                         // ⚠️ applyAction 返回克隆，必须串起来（ADR-108 的教训）
  }
  const u = getUnit(s, 'own', 'front', 1)!;
  assert.equal(rulesOf(u).length, 2, '两次战吼后仍是 2 条（每档位一条），没堆成一串');
  assert.equal(capValue(u, 'reduce_physical'), 2);
});

test('战吼是**快照**：之后才上场的藤甲兵不在覆盖内（与孟获「蛮王」同一口径）', () => {
  const { state, ctx } = board({ hand: ['test_wutugu', 'shu_tengjiabing'] });
  state.sides.own.command = { cur: 10, max: 10 };
  const r1 = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 4 } as Action);
  assert.ok(r1.ok, r1.error ?? '');

  // 另找一张没被战吼覆盖过的藤甲兵（直接造一个入场单位，模拟"之后才来的"）
  setUnit(r1.state, 'own', 'front', 3, makeUnit(TENGJIA, 0, 999));
  applyStatus(r1.state, unitRef('own', 'front', 3), 'teng_jia', 1, []);
  const late = getUnit(r1.state, 'own', 'front', 3)!;
  assert.equal(rulesOf(late).length, 0, '不在覆盖范围内');
  assert.equal(capValue(late, 'reduce_physical'), 1, '仍是原始的 −1');
  assert.equal(capValue(late, 'vulnerable_fire'), 1, '仍是原始的 +1');
});

/* ============================================================
   5. 不回归：没有覆盖时与 capStacks 完全等价
   ============================================================ */

test('没有覆盖的单位：capValue === 层数（对既有卡零影响）', () => {
  const { state } = board({ units: [{ card: TENGJIA, col: 2 }] });
  const u = getUnit(state, 'own', 'front', 2)!;
  applyStatus(state, unitRef('own', 'front', 2), 'teng_jia', 3, []);
  assert.equal(capValue(u, 'reduce_physical'), 3);
  assert.equal(capValue(u, 'vulnerable_fire'), 3);
  assert.equal(capValue(u, 'thorns'), 0, '没有的状态 = 0');
  assert.equal(rulesOf(u).length, 0);
});
