/**
 * 特种兵升变的**统率费用**（ADR-133）。
 *
 * 规则（设计者给定，唯一真源是引擎的 `upgradeCommandCost`）：
 *
 *     d = 目标特种兵卡的 `cost`（印刷费用） − 该单位**当前卡**的 `cost`
 *     升变统率费用 = max(0, d − 1)
 *
 *   · `d ≤ 1` → **0 费**＝设计者口径的「**自然升级**」（只要进度条件满足就能升）；
 *   · `d = 2` → **1 统率**；
 *   · `d = 3` → 2 统率（公式推演，当前卡池暂无此档）。
 *
 * 三条硬约束（本文件逐条钉死）：
 *   ① **判定在扣费之前**：统率不够 → 动作被拒（带明确 reason），**不扣统率、不换形态、不派发战吼**；
 *   ② 合法时**先扣统率再换形态**；扣的数额 = `upgradeStatus()` 宣告的 `commandCost`（两处同源）；
 *   ③ `ready` 只表示**进度条件**是否满足，与统率够不够**正交**（`commandCost` / `affordable` 是另外的字段）。
 *
 * 数值一律走 `core/data/cards.json` 的**真实卡数据**（ADR-113 的教训：夹具漂移会让数据改了测试照样全绿）；
 * 只有"卡池里目前没有的 d = 3 档"用一张显式标注的合成卡补测。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction, upgradeCommandCost, upgradeStatus } from '../src/engine.ts';
import { getUnit, hasTrait, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { scenario } from './fixtures.ts';
import type { CardDef, Side, Unit } from '../src/types.ts';

const allCards: CardDef[] = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const real = (id: string): CardDef => {
  const card = allCards.find((c) => c.id === id);
  assert.ok(card, `真实卡数据里应有 ${id}`);
  return card;
};

/** 四张基础兵（升变起点）—— 按 id 硬取，不靠"第一个同兵种"去猜 */
const BASE: Record<string, string> = {
  infantry: 'neutral_infantry',
  shield: 'neutral_shieldman',
  archer: 'neutral_archer',
  cavalry: 'neutral_cavalry',
};

function setup(command = 10) {
  const s = scenario({ ownCommand: command });
  for (const c of allCards) s.ctx.cards.set(c.id, c);
  return s;
}

function place(s: ReturnType<typeof setup>, id: string, col = 0, side: Side = 'own'): Unit {
  const u = makeUnit(real(id), 0, nextUidSeq(s.state));
  setUnit(s.state, side, 'front', col, u);
  return u;
}

/** 把进度直接推到"条件已满足"（升变费用是本次新增的维度，进度本身不是本文件的被测对象） */
function markReady(u: Unit): void {
  u.upgradeProgress = {
    damage: 2, shieldSurvival: 2, basicKills: 2, characterKills: 1, heroHits: 1,
  };
}

/** 无关的敌方靶子：让带指向性战吼的目标形态有合法目标可结算 */
function dummy(s: ReturnType<typeof setup>, col = 3): Unit {
  return place(s, 'shu_bai_erbing', col, 'enemy');
}

/** 一张显式标注的合成卡：当前卡池没有 d = 3 这一档，用它验证公式而不是查表 */
const d3Target: CardDef = {
  id: 'test_d3_troop', name: '测试四费步兵', faction: 'neutral', type: 'troop',
  cost: 4, attack: 4, health: 4, troopKind: 'infantry', upgradeFrom: 'infantry', memo: '测试用：d = 3 → 2 统率',
};

/* =====================================================================
   ① 公式本身：只按印刷费用差，不硬编码、不按兵种写特例
   ===================================================================== */

test('费用公式 max(0, d − 1)：d ≤ 1 是「自然升级」（0 统率）、d = 2 收 1、d = 3 收 2', () => {
  const one = { cost: 1 } as CardDef;
  assert.equal(upgradeCommandCost(one, { cost: 1 } as CardDef), 0, 'd = 0 → 自然升级（0 统率）');
  assert.equal(upgradeCommandCost(one, { cost: 2 } as CardDef), 0, 'd = 1 → 自然升级（0 统率）');
  assert.equal(upgradeCommandCost(one, { cost: 3 } as CardDef), 1, 'd = 2 → 1 统率');
  assert.equal(upgradeCommandCost(one, { cost: 4 } as CardDef), 2, 'd = 3 → 2 统率');
  assert.equal(upgradeCommandCost({ cost: 2 } as CardDef, { cost: 5 } as CardDef), 2, 'd = 3（盾兵线口径同式）');
  assert.equal(upgradeCommandCost(undefined, { cost: 2 } as CardDef), 1, '拿不到当前卡时按 0 费算，d = 2');
});

test('全池每一张升变目标都按同一条公式得到 0 / 1 / 2 费（无兵种特例表）', () => {
  const targets = allCards.filter((c) => c.type === 'troop' && c.upgradeFrom);
  assert.ok(targets.length >= 30, `特种兵目标应有 30+ 张，实际 ${targets.length}`);
  const histogram = new Map<number, number>();
  for (const t of targets) {
    const base = real(BASE[t.upgradeFrom as string] as string);
    const expected = Math.max(0, (t.cost ?? 0) - (base.cost ?? 0) - 1);
    assert.equal(upgradeCommandCost(base, t), expected,
      `${t.name}（${t.cost} 费，来自 ${base.cost} 费${base.name}）应按公式得 ${expected}`);
    assert.ok(expected <= 2, `${t.name} 的升变费用不该超过 2 —— 当前卡池最深只到 d = 3`);
    histogram.set(expected, (histogram.get(expected) ?? 0) + 1);
  }
  // 卡池现状：d=1（自然升级）与 d=2（1 统率）两档都有，d=3（2 统率）由合成卡补测
  assert.ok((histogram.get(0) ?? 0) > 0, '卡池应有「自然升级」档（d = 1）');
  assert.ok((histogram.get(1) ?? 0) > 0, '卡池应有 1 统率档（d = 2）');
});

/* =====================================================================
   ② d ≤ 1「自然升级」：升变成功且统率**一点不减**（连 cur = 0 都能升）
   ===================================================================== */

test('d = 1 自然升级：步兵（1 费）→ 虎步军（2 费），统率不减', () => {
  const s = setup(3);
  const u = place(s, 'neutral_infantry');
  markReady(u);
  dummy(s);

  const before = s.state.sides.own.command.cur;
  const declared = upgradeStatus(s.state, s.ctx.cards, 'own', 'front', 0)!
    .options.find((o) => o.card.id === 'shu_hubujun')!;
  assert.equal(declared.commandCost, 0, '步兵 1 费 → 虎步军 2 费：d = 1，费用 0');
  assert.equal(declared.affordable, true, '自然升级永远付得起');

  const r = applyAction(s.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: 'shu_hubujun' });
  assert.ok(r.ok, r.error ?? '自然升级应当成功');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.cardId, 'shu_hubujun');
  assert.equal(r.state.sides.own.command.cur, before, '自然升级档：统率前后完全不变');
});

test('d = 1 自然升级：统率为 0 也能升（费用与"有没有统率"无关）', () => {
  const s = setup(0);
  const u = place(s, 'neutral_infantry');
  markReady(u);
  dummy(s);
  const r = applyAction(s.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: 'shu_hubujun' });
  assert.ok(r.ok, r.error ?? '0 统率也应付得起「自然升级」');
  assert.equal(r.state.sides.own.command.cur, 0, '0 − 0 = 0');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.cardId, 'shu_hubujun');
});

/* =====================================================================
   ③ d = 2 收 1 统率：恰好减 1（用 cur 前后差断言）
   ===================================================================== */

test('d = 2：步兵（1 费）→ 先登死士（3 费），统率恰好减 1', () => {
  const s = setup(5);
  const u = place(s, 'neutral_infantry');
  markReady(u);
  dummy(s);
  const before = s.state.sides.own.command.cur;

  const r = applyAction(s.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: 'qun_xiandengsishi' });
  assert.ok(r.ok, r.error ?? '统率充足时升变应成功');
  assert.equal(before - r.state.sides.own.command.cur, 1, 'd = 2 → 恰好扣 1 点统率');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.cardId, 'qun_xiandengsishi', '形态确实换了');
});

test('d = 2：盾兵（2 费）→ 陷阵营（4 费）同样只收 1 统率', () => {
  const s = setup(5);
  const u = place(s, 'neutral_shieldman');
  markReady(u);
  const before = s.state.sides.own.command.cur;
  const r = applyAction(s.state, s.ctx, {
    type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: 'qun_xianzhenying', modeIndex: 1,
  });
  assert.ok(r.ok, r.error ?? '统率充足时升变应成功');
  assert.equal(before - r.state.sides.own.command.cur, 1, '同一 d 档，换兵种线也是 1 点 —— 费用只看费用差');
});

test('d = 3：步兵（1 费）→ 合成 4 费兵收 2 统率（卡池暂无此档，验公式不是查表）', () => {
  const s = setup(3);
  s.ctx.cards.set(d3Target.id, d3Target);
  const u = place(s, 'neutral_infantry');
  markReady(u);
  dummy(s);
  const option = upgradeStatus(s.state, s.ctx.cards, 'own', 'front', 0)!
    .options.find((o) => o.card.id === d3Target.id)!;
  assert.equal(option.commandCost, 2, 'd = 3 → 2 统率');

  const before = s.state.sides.own.command.cur;
  const r = applyAction(s.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: d3Target.id });
  assert.ok(r.ok, r.error ?? '统率充足时升变应成功');
  assert.equal(before - r.state.sides.own.command.cur, 2, 'd = 3 → 恰好扣 2 点统率');
});

/* =====================================================================
   ④ 统率不足：拒绝 + 明确 reason + 不扣 / 不换形态 / 不派发战吼
   ===================================================================== */

test('统率不足（cur = 0，需 1）：拒绝、带 reason、统率不变、形态不变', () => {
  const s = setup(0);
  const u = place(s, 'neutral_infantry');
  markReady(u);
  dummy(s);
  const before = { cardId: u.cardId, atk: u.atk, hp: u.hp, maxHp: u.maxHp, kw: [...u.kw] };

  const r = applyAction(s.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: 'qun_xiandengsishi' });
  assert.equal(r.ok, false, '统率不足 → 升变必须被拒');
  assert.match(r.error ?? '', /统率值不足/, `reason 应说明统率不足，实际：${r.error}`);
  assert.match(r.error ?? '', /需要 1/, 'reason 要带上这次升变需要的统率数');
  assert.match(r.error ?? '', /当前 0/, 'reason 要带上当前统率');
  const rejected = r.events.find((e) => e.type === 'REJECTED');
  assert.ok(rejected, '被拒的动作要派发 REJECTED 事件');
  assert.equal((rejected as { reason?: string }).reason, r.error, 'REJECTED.reason 与 error 一致');

  assert.equal(r.state.sides.own.command.cur, 0, '被拒 → 不扣统率');
  const after = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(after.cardId, before.cardId, '被拒 → 不换形态');
  assert.deepEqual([after.atk, after.hp, after.maxHp], [before.atk, before.hp, before.maxHp], '被拒 → 属性原样');
  assert.deepEqual(after.kw, before.kw, '被拒 → 关键词原样');
});

test('统率不足（cur = 1，但 d = 3 需 2）：同样被拒且不扣', () => {
  const s = setup(1);
  s.ctx.cards.set(d3Target.id, d3Target);
  const u = place(s, 'neutral_infantry');
  markReady(u);
  dummy(s);
  const r = applyAction(s.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: d3Target.id });
  assert.equal(r.ok, false, '1 < 2 → 被拒（不是"先扣成负数"或"免费放行"）');
  assert.match(r.error ?? '', /统率值不足（升变需要 2，当前 1）/, `reason 与实际相符：${r.error}`);
  assert.equal(r.state.sides.own.command.cur, 1, '不扣统率');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.cardId, 'neutral_infantry', '不换形态');
});

/* =====================================================================
   ⑤ 失败后重试：补足统率再升 → 成功
   ===================================================================== */

test('升变失败后补足统率重试能成功（被拒不消耗任何东西）', () => {
  const s = setup(0);
  const u = place(s, 'neutral_infantry');
  markReady(u);
  dummy(s);

  const denied = applyAction(s.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: 'qun_xiandengsishi' });
  assert.equal(denied.ok, false, '0 统率 → 先被拒一次');
  assert.equal(getUnit(denied.state, 'own', 'front', 0)!.cardId, 'neutral_infantry');
  assert.equal(upgradeStatus(denied.state, s.ctx.cards, 'own', 'front', 0)!.ready, true,
    '被拒不影响进度条件：重试时依旧 ready');

  denied.state.sides.own.command.cur = 1;   // 补足统率（模拟下一回合 / 统率增长）
  const retry = applyAction(denied.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: 'qun_xiandengsishi' });
  assert.ok(retry.ok, retry.error ?? '补足统率后重试应当成功');
  assert.equal(getUnit(retry.state, 'own', 'front', 0)!.cardId, 'qun_xiandengsishi');
  assert.equal(retry.state.sides.own.command.cur, 0, '重试成功后只扣这一次的 1 点');
});

/* =====================================================================
   ⑥ 同一回合多个候选：免费档与收费档只受统率约束、互不误伤
   ===================================================================== */

test('同一回合：先升自然升级档（虎步军）再升收费档（先登死士），两者都成功', () => {
  const s = setup(1);                       // 只够付收费档 1 点
  const free = place(s, 'neutral_infantry', 0);
  const paid = place(s, 'neutral_infantry', 1);
  markReady(free);
  markReady(paid);
  dummy(s, 3);

  const a = applyAction(s.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: 'shu_hubujun' });
  assert.ok(a.ok, a.error ?? '自然升级档应先成功');
  assert.equal(a.state.sides.own.command.cur, 1, '自然升级不花统率 → 收费档的机会还在');

  const b = applyAction(a.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 1, toCardId: 'qun_xiandengsishi' });
  assert.ok(b.ok, b.error ?? '自然升级档升完后，收费档仍应付得起');
  assert.equal(b.state.sides.own.command.cur, 0, '收费档扣掉最后 1 点');
  assert.equal(getUnit(b.state, 'own', 'front', 0)!.cardId, 'shu_hubujun');
  assert.equal(getUnit(b.state, 'own', 'front', 1)!.cardId, 'qun_xiandengsishi');
});

test('同一回合：先升收费档花光统率，自然升级档照样能升；再升收费档才被拒', () => {
  const s = setup(1);
  const free = place(s, 'neutral_infantry', 0);
  const paid = place(s, 'neutral_infantry', 1);
  const paid2 = place(s, 'neutral_infantry', 2);
  markReady(free);
  markReady(paid);
  markReady(paid2);
  dummy(s, 3);

  const a = applyAction(s.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 1, toCardId: 'qun_xiandengsishi' });
  assert.ok(a.ok, a.error ?? '先升收费档');
  assert.equal(a.state.sides.own.command.cur, 0, '统率被花光');

  const b = applyAction(a.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: 'shu_hubujun' });
  assert.ok(b.ok, b.error ?? '统率同为 0 也不该拦住自然升级档（两者只受统率约束、互不误伤）');

  const c = applyAction(b.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 2, toCardId: 'qun_xiandengsishi' });
  assert.equal(c.ok, false, '第二个收费档在 0 统率下被拒 —— 约束来自统率，不是"每回合只能升一次"');
  assert.match(c.error ?? '', /统率值不足/);
});

/* =====================================================================
   ⑦ ready 与费用正交；upgradeStatus 宣告的费用 = 引擎实扣
   ===================================================================== */

test('ready 只管进度条件：进度满了但付不起时 ready 仍为 true、affordable 为 false', () => {
  const s = setup(0);
  const u = place(s, 'neutral_infantry');
  u.upgradeProgress = { damage: 1, shieldSurvival: 0, basicKills: 0, characterKills: 0, heroHits: 0 };
  let st = upgradeStatus(s.state, s.ctx.cards, 'own', 'front', 0)!;
  assert.equal(st.ready, false, '进度没满 → ready = false');
  assert.deepEqual(st.options, [], '进度没满时不给候选（连费用也不宣告）');

  u.upgradeProgress.damage = 2;
  st = upgradeStatus(s.state, s.ctx.cards, 'own', 'front', 0)!;
  assert.equal(st.ready, true, '进度满了 → ready = true，**不因统率不足而变成 false**');
  const paid = st.options.find((o) => o.card.id === 'qun_xiandengsishi')!;
  const free = st.options.find((o) => o.card.id === 'shu_hubujun')!;   // 自然升级档
  assert.equal(paid.commandCost, 1, '候选自带本次费用');
  assert.equal(paid.affordable, false, '0 统率 → 付不起（单独一个字段，不与 ready 混）');
  assert.equal(free.commandCost, 0);
  assert.equal(free.affordable, true, '自然升级档在 0 统率下依然付得起');
});

test('upgradeStatus().commandCost 与引擎实扣一致（同源，不各写一份公式）', () => {
  const cases: Array<[string, string]> = [   // [基础兵, 目标]
    ['neutral_infantry', 'shu_hubujun'],          // d = 1 → 0（自然升级）
    ['neutral_infantry', 'qun_xiandengsishi'],    // d = 2 → 1
    ['neutral_shieldman', 'qun_xianzhenying'],    // d = 2 → 1
    ['neutral_archer', 'qun_xiandengnushou'],     // d = 1 → 0（自然升级）
    ['neutral_cavalry', 'shu_xiliangtieqi'],      // d = 1 → 0（自然升级：3 费骑兵 → 4 费铁骑）
  ];
  for (const [baseId, targetId] of cases) {
    const s = setup(6);
    const u = place(s, baseId);
    markReady(u);
    dummy(s);
    const declared = upgradeStatus(s.state, s.ctx.cards, 'own', 'front', 0)!
      .options.find((o) => o.card.id === targetId);
    assert.ok(declared, `${baseId} → ${targetId} 应在候选里`);
    const before = s.state.sides.own.command.cur;
    const r = applyAction(s.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: targetId });
    assert.ok(r.ok, r.error ?? `${baseId} → ${targetId} 应升变成功`);
    assert.equal(before - r.state.sides.own.command.cur, declared.commandCost,
      `${baseId} → ${targetId}：实扣 ${before - r.state.sides.own.command.cur} 必须等于宣告的 ${declared.commandCost}`);
  }
});

/* =====================================================================
   ⑧ 回归：升变照旧派发新形态战吼（含抉择 modeIndex）—— 别被新门控弄坏
   ===================================================================== */

test('回归：付费升变仍派发新形态战吼，抉择按 modeIndex 选分支（架盾 2/7 / 先攻 4/5）', () => {
  const shield = setup(5);
  const u0 = place(shield, 'neutral_shieldman');
  markReady(u0);
  const r0 = applyAction(shield.state, shield.ctx, {
    type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: 'qun_xianzhenying', modeIndex: 0,
  });
  assert.ok(r0.ok, r0.error ?? '升变应成功');
  const a = getUnit(r0.state, 'own', 'front', 0)!;
  assert.deepEqual([a.atk, a.maxHp, a.hp], [2, 7, 7], 'modeIndex 0：架盾分支 2/7');
  assert.ok(hasTrait(a, 'jia_dun'), '架盾由战吼授予');
  assert.equal(r0.state.sides.own.command.cur, 4, '这次升变同时扣了 1 统率（5 → 4）');

  const shield2 = setup(5);
  const u1 = place(shield2, 'neutral_shieldman');
  markReady(u1);
  const r1 = applyAction(shield2.state, shield2.ctx, {
    type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: 'qun_xianzhenying', modeIndex: 1,
  });
  assert.ok(r1.ok, r1.error ?? '升变应成功');
  const b = getUnit(r1.state, 'own', 'front', 0)!;
  assert.deepEqual([b.atk, b.maxHp, b.hp], [4, 5, 5], 'modeIndex 1：先攻分支 4/5');
  assert.ok(hasTrait(b, 'xian_gong'), '先攻由战吼授予');
  assert.equal(r1.state.sides.own.command.cur, 4, '抉择分支不影响费用（费用只看卡面费用差）');
});

test('回归：带指向性战吼的「自然升级」照旧结算（步兵 → 虎步军「越水」挂上水困）', () => {
  const s = setup(2);
  const u = place(s, 'neutral_infantry');
  markReady(u);
  dummy(s, 3);
  // 升变会重算光环 → 目标的 maxHp 会回到卡面值，所以只按"前后差"断言伤害
  const hpBefore = getUnit(s.state, 'enemy', 'front', 3)!.hp;
  const r = applyAction(s.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: 'shu_hubujun' });
  assert.ok(r.ok, r.error ?? '升变应成功');
  assert.equal(r.state.sides.own.command.cur, 2, '自然升级档：统率没动');
  const hit = getUnit(r.state, 'enemy', 'front', 3)!;
  assert.equal(hit.statuses.shui_kun?.stacks, 1, '新形态的指向性战吼照旧结算（走 narrowByMode 兜底目标）');
  assert.equal(hpBefore - hit.hp, 1, '越水的 1 点水攻也照旧');
});
