/**
 * 「火攻挂灼烧」全局规则（ADR-134）
 *
 * ## 规则
 *
 * **任何卡牌/技能打出的火攻（火属性伤害）都对该次伤害的目标挂 1 层「灼烧」** ——
 * 取代此前"只有荀攸/陆逊/董卓三张卡显式施加"的做法。
 *
 * | 项 | 口径 |
 * |---|---|
 * | 挂在哪 | **效果层**（`effects.ts` 的 `case 'damage'`，`damage_type === 'fire'` 时） |
 * | 每次几层 | **每个火攻效果各 +1 层**；同一张卡的多段火攻**各算一次**（蒙冲斗舰 4 段 = 4 层） |
 * | 层数含义 | 该方**回合开始**受 N 点火伤（N = 层数），**永久、不封顶**（ADR-132 的机制不变） |
 * | DoT 跳伤 | **不挂层**（本文件最关键的一条，见 §三） |
 * | 伤害被减到 0 | **仍然挂层**（"火攻打出去了"即挂）；只有"进不了目标池"与 `immune_debuff` 能挡住 |
 * | 主公 | 照常吃**当次**火伤（ADR-087），但**不吃灼烧层**（`dot_fire` 只结算场上单位，见 §四） |
 *
 * ## ⚠️ 为什么必须挂在效果层（本规则唯一的实现硬约束）
 *
 * 灼烧自己的回合开始跳伤（`mutate.resolveTurnStartDamage`）**也是火属性**
 * —— ADR-108 为「藤甲·遇火即燃」特意如此。若把挂层写进 `dealDamage`（按 `damageType`
 * 判断），跳伤就会**自己给自己叠层**：每回合 +1 层、伤害每回合 +1，**无限增长**。
 * DoT 跳伤 / 水困行动税 / 中毒削上限 / 藤甲反伤全都**绕过效果层**直接调 `dealDamage`，
 * 所以挂在效果层能从**结构上**排除它们 —— §三 的两条用例把这一点钉死。
 *
 * ## 写法约定
 *
 * · 断言一律读 `applyAction` / `resolveAttack` 返回后的状态（`applyAction` 返回克隆）。
 * · 只用 core 的确定性 Rng（`scenario({ seed })`）；火攻的 50% 追加段用**定点种子**
 *   （seed 1 = 不追加，seed 7 = 追加），不做统计抖动测试。
 * · 双方牌库都填满 —— 空牌库会在每个回合开始触发粮尽伤害，污染主公血量断言。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { applyAction } from '../src/engine.ts';
import { resolveAttack } from '../src/effects.ts';
import { applyStatus, removeStatus, unitRef } from '../src/mutate.ts';
import { createRng } from '../src/rng.ts';
import { getUnit, makeUnit, nextUidSeq, setUnit, statusStacks } from '../src/state.ts';
import { scenario, TEST_CARDS } from './fixtures.ts';
import type { CardDef, EngineContext, GameEvent, MatchState, Side, Unit } from '../src/types.ts';

/* ============================================================
   夹具
   ============================================================ */

const ALL: CardDef[] = JSON.parse(
  readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'),
);

// 真实卡都要进卡表：`scenario` 只认 TEST_CARDS，而召唤/变形会按 id 引用别的卡
for (const c of ALL) {
  const flat: CardDef = { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(flat);
}

function realCard(id: string): CardDef {
  const c = ALL.find((x) => x.id === id);
  assert.ok(c, `cards.json 里找不到 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
}

/** 高血木人：够挨好几回合的跳伤（测试专用，不是正式卡） */
const DUMMY: CardDef = {
  id: 'test_fire_dummy', name: '木人', faction: 'wei', type: 'general',
  cost: 2, attack: 0, health: 30, keywords: [], memo: '测试用沙包',
};

interface Table { state: MatchState; ctx: EngineContext }

/** 搭一张可控的桌面：牌库填满（否则粮尽会打到主公） */
function setup(opts: { seed?: number; ownHand?: string[] } = {}): Table {
  const s = scenario({ seed: opts.seed ?? 1, ownHand: opts.ownHand ?? [] });
  s.state.sides.own.deck = Array(30).fill('neutral_infantry');
  s.state.sides.enemy.deck = Array(30).fill('neutral_infantry');
  return s;
}

/**
 * 摆一个单位。
 *
 * ⚠️ 只调 `hp`（垫血），**不要**动 `maxHp` —— `applyMods` 会按 `baseMaxHp + Σmods`
 * 重算上限并把差值补进 `hp`（`state.ts:297-301`），写 `maxHp` 会让血量凭空变多。
 */
function put(s: Table, side: Side, col: number, hp = 30, card: CardDef = DUMMY): Unit {
  s.ctx.cards.set(card.id, card);
  const u = makeUnit(card, 0, nextUidSeq(s.state));   // enteredTurn 0 = 上一回合就在场
  u.hp = Math.min(hp, u.maxHp);
  setUnit(s.state, side, 'front', col, u);
  return u;
}

const stacksOf = (u: Unit | null | undefined): number => (u ? statusStacks(u, 'zhuo_shao') : 0);
const unitAt = (s: Table, side: Side, col: number): Unit => {
  const u = getUnit(s.state, side, 'front', col);
  assert.ok(u, `${side} 第 ${col} 格应有单位`);
  return u;
};

/** 结束回合（`applyAction` 返回克隆，测试里就地接上） */
function endTurn(s: Table): { state: MatchState; events: GameEvent[] } {
  const r = applyAction(s.state, s.ctx, { type: 'END_TURN' });
  assert.ok(r.ok, r.error ?? '结束回合应成立');
  s.state = r.state;
  return { state: r.state, events: r.events ?? [] };
}

/** 一整轮（我方结束 → 敌方回合开始并结算 → 敌方结束 → 我方回合开始） */
function fullRound(s: Table): void {
  endTurn(s);
  endTurn(s);
}

/* ============================================================
   一、逐张火攻来源都能挂层
   ============================================================ */

test('火攻（计策）：1 点段与 2 点段**各挂 1 层** —— 追加段命中时共 2 层', () => {
  const s = setup({ seed: 7, ownHand: ['tactic_huogong'] });   // seed 7：50% 追加段命中
  put(s, 'enemy', 3);

  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, target: { side: 'enemy', row: 'front', col: 3 },
  });
  assert.ok(r.ok, r.error ?? '火攻应能打出');
  s.state = r.state;

  const v = unitAt(s, 'enemy', 3);
  assert.equal(30 - v.hp, 3, '1 点段 + 2 点段 = 3 点火伤');
  assert.equal(stacksOf(v), 2, '两段火攻各挂 1 层（多段各算一次）');
  assert.equal(v.statuses.zhuo_shao!.turns, undefined, '不写 duration → 永久（不吃回合到期）');
});

test('火攻（计策）：只命中 1 点段时是 1 层 —— 没打出去的段不挂层', () => {
  const s = setup({ seed: 1, ownHand: ['tactic_huogong'] });   // seed 1：追加段不中
  put(s, 'enemy', 3);

  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, target: { side: 'enemy', row: 'front', col: 3 },
  });
  assert.ok(r.ok, r.error ?? '火攻应能打出');
  s.state = r.state;

  const v = unitAt(s, 'enemy', 3);
  assert.equal(30 - v.hp, 1, '只结算了 1 点段');
  assert.equal(stacksOf(v), 1, '50% 没中 → 只有 1 层');
});

test('火烧洛阳（事件）：敌方每个单位各 1 层；主公吃当次火伤但**不挂层**', () => {
  const s = setup({ ownHand: ['event_huoshaoluoyang', 'neutral_infantry'] });
  put(s, 'enemy', 0, 5);
  put(s, 'enemy', 2, 5);

  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.ok(r.ok, r.error ?? '事件应能打出');
  s.state = r.state;

  for (const col of [0, 2]) {
    const u = unitAt(s, 'enemy', col);
    assert.equal(5 - u.hp, 1, `第 ${col} 格应受 1 点火伤`);
    assert.equal(stacksOf(u), 1, `第 ${col} 格应挂 1 层`);
  }
  assert.equal(s.state.sides.enemy.lord.hp, 29,
    '范围火伤默认含主公（ADR-087）—— 主公照常吃当次火伤');
  assert.equal(s.state.sides.enemy.lord.statuses?.zhuo_shao, undefined,
    '主公不吃灼烧层：dot_fire 在回合开始只遍历场上单位，挂了也不会跳伤（ADR-134）');
});

test('潘璋「擒将」：3 点火攻 → 目标挂 1 层', () => {
  const s = setup({ ownHand: ['wu_panzhang'] });
  const v = put(s, 'enemy', 1, 8);
  v.hp = 4;                                   // 「擒将」要求目标已受伤

  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 1 },
  });
  assert.ok(r.ok, r.error ?? '擒将应能打出');
  s.state = r.state;

  const after = unitAt(s, 'enemy', 1);
  assert.equal(4 - after.hp, 3, '3 点火攻');
  assert.equal(stacksOf(after), 1, '1 层灼烧');
});

test('蒙冲斗舰「蒙冲」：只对指定单位造成 1 点水攻，不扩散也不挂灼烧', () => {
  const s = setup({});
  put(s, 'own', 0, 3, realCard('wu_mengchongdoujian'));
  put(s, 'enemy', 2, 10);
  put(s, 'enemy', 3, 10);
  put(s, 'enemy', 4, 10);

  const r = applyAction(s.state, s.ctx, {
    type: 'USE_SKILL', row: 'front', col: 0, target: { side: 'enemy', row: 'front', col: 2 },
  });
  assert.ok(r.ok, r.error ?? '蒙冲应能发动');
  s.state = r.state;

  const [chosen, right1, right2] = [2, 3, 4].map((c) => unitAt(s, 'enemy', c));
  assert.deepEqual([10 - chosen!.hp, 10 - right1!.hp, 10 - right2!.hp], [1, 0, 0],
    '只有指定目标受到 1 点水攻');
  assert.deepEqual([stacksOf(chosen), stacksOf(right1), stacksOf(right2)], [0, 0, 0],
    '水攻不产生灼烧状态');
});

test('黄权「断后」：受创后对敌方全体 1 点火攻 → 每个敌方单位各 1 层', () => {
  const s = setup({});
  put(s, 'own', 2, 3, realCard('shu_huangquan'));
  put(s, 'enemy', 0, 5);
  put(s, 'enemy', 1, 5);
  put(s, 'enemy', 2, 5);                      // 同列的攻击者

  const events: GameEvent[] = [];
  const ok = resolveAttack(
    s.state, s.ctx.cards, 'enemy', { row: 'front', col: 2 },
    { kind: 'unit', row: 'front', col: 2 }, events, createRng(1), { toSide: 'own' },
  );
  assert.ok(ok, '攻击应成立');

  // 断后打的是"敌方全体"，所以连**攻击者自己**也吃 1 点；它另外还挨了黄权的反击 1 点。
  assert.equal(5 - unitAt(s, 'enemy', 0).hp, 1, '敌方第 0 格只吃断后 1 点');
  assert.equal(5 - unitAt(s, 'enemy', 1).hp, 1, '敌方第 1 格只吃断后 1 点');
  assert.equal(5 - unitAt(s, 'enemy', 2).hp, 2, '攻击者吃断后 1 点 + 黄权反击 1 点');
  for (const col of [0, 1, 2]) {
    assert.equal(stacksOf(unitAt(s, 'enemy', col)), 1, `敌方第 ${col} 格应挂 1 层`);
  }
  assert.equal(s.state.sides.enemy.lord.hp, 29, '断后是范围火伤 → 主公也吃 1 点（ADR-087）');
  assert.equal(s.state.sides.enemy.lord.statuses?.zhuo_shao, undefined, '但主公不挂层');
});

test('荀攸「乌巢袭粮」：2 名受伤单位各 1 层 —— **恰好 2 层，不得 4 层**（防双倍）', () => {
  const s = setup({ seed: 1, ownHand: ['wei_xunyou'] });
  const a = put(s, 'enemy', 0, 10);
  const b = put(s, 'enemy', 1, 10);
  a.hp = 5;
  b.hp = 5;                                   // 「乌巢袭粮」只打已受伤的单位

  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '荀攸应能打出');
  s.state = r.state;

  const [A, B] = [unitAt(s, 'enemy', 0), unitAt(s, 'enemy', 1)];
  assert.equal(5 - A.hp, 2, 'A 受 2 点火伤');
  assert.equal(5 - B.hp, 2, 'B 受 2 点火伤');
  assert.equal(stacksOf(A), 1, 'A 恰好 1 层');
  assert.equal(stacksOf(B), 1, 'B 恰好 1 层');
  // 旧实现里卡面自己还有一条 `apply_status: zhuo_shao`；两条叠加 = 每人 2 层（共 4 层）——
  // 那正是 ADR-134 删掉显式施加的原因。
  assert.equal(stacksOf(A) + stacksOf(B), 2, '伤害自带的 1 层是唯一来源（显式施加已删）');
});

test('陆逊「策火流云」：每回合 1 层、**会累积**（第 2 个敌方回合开始烧 2 点）', () => {
  const s = setup({ seed: 1, ownHand: ['wu_luxun'] });
  put(s, 'enemy', 3, 30);

  const played = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(played.ok, played.error ?? '陆逊应能打出');
  s.state = played.state;

  endTurn(s);                                 // 我方回合末：策火流云 → 1 点火伤 + 1 层
  assert.equal(stacksOf(unitAt(s, 'enemy', 3)), 1, '第 1 次结算：1 层');
  assert.equal(s.state.sides.enemy.lord.hp, 29, '陆逊打的是"敌方全体"，主公吃当次 1 点火伤');
  endTurn(s);                                 // 敌方回合开始：烧 1

  assert.equal(30 - unitAt(s, 'enemy', 3).hp, 2, '1 点直伤 + 回合开始烧 1 点');
  assert.equal(stacksOf(unitAt(s, 'enemy', 3)), 1, '跳伤本身不叠层');

  endTurn(s);                                 // 我方回合末：再 1 点火伤 + 1 层（累积到 2）
  assert.equal(stacksOf(unitAt(s, 'enemy', 3)), 2, '第 2 次结算：累积到 2 层');
  endTurn(s);                                 // 敌方回合开始：烧 2

  assert.equal(30 - unitAt(s, 'enemy', 3).hp, 5, '1 + 1 + 1 + 2 = 5 点（跳伤按当时层数）');
  assert.equal(stacksOf(unitAt(s, 'enemy', 3)), 2, '层数不因跳伤变化');
  assert.equal(s.state.sides.enemy.lord.statuses?.zhuo_shao, undefined, '主公始终不挂层');
});

test('董卓「暴虐」（方案乙）：只对敌方男性 1 点火攻（自动挂永久灼烧），女性与主公不受影响', () => {
  const s = setup({ ownHand: ['qun_dongzhuo'] });
  const female = { ...DUMMY, id: 'test_female', name: '女眷', gender: 'female' as const };
  const male = { ...DUMMY, id: 'test_male', name: '男丁', gender: 'male' as const };
  put(s, 'enemy', 0, 10, { ...male, faction: 'wei' });
  put(s, 'enemy', 1, 10, { ...female, faction: 'wei' });
  put(s, 'own', 3, 5, { ...female, id: 'test_female_ally', faction: 'qun' });

  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 4 });
  assert.ok(r.ok, r.error ?? '董卓应能打出');
  s.state = r.state;

  assert.equal(10 - unitAt(s, 'enemy', 0).hp, 1, '敌方男性吃 1 点火攻');
  assert.equal(stacksOf(unitAt(s, 'enemy', 0)), 1, '火攻走统一路径 → 自动挂 1 层永久灼烧');
  assert.equal(unitAt(s, 'enemy', 0).statuses.zhuo_shao!.turns, undefined,
    '没有显式 apply_status（方案乙），层数由全局规则挂上 → 永久');
  assert.equal(unitAt(s, 'enemy', 1).hp, 10, '敌方女性不吃伤害（只对男性生效）');
  assert.equal(stacksOf(unitAt(s, 'enemy', 1)), 0, '敌方女性不挂层');
  assert.equal(s.state.sides.enemy.lord.hp, 30,
    '目标写死 include_lord: false → 主公不吃这 1 点（与方案甲的目标池一致）');
  assert.equal(unitAt(s, 'own', 3).hp, 5, '己方女性不被自己的战吼打到');

  // 永久：走两个完整回合仍在，且每个敌方回合开始各烧 1 点
  fullRound(s);                               // 我方回合末 → 敌方回合开始：烧 1
  assert.equal(stacksOf(unitAt(s, 'enemy', 0)), 1, '永久状态不会自然到期');
  assert.equal(10 - unitAt(s, 'enemy', 0).hp, 2, '1 点直伤 + 第 1 个敌方回合开始烧 1 点');
  fullRound(s);                               // 再来一轮：再烧 1
  assert.equal(10 - unitAt(s, 'enemy', 0).hp, 3, '第 2 个敌方回合再烧 1 点');
  assert.equal(stacksOf(unitAt(s, 'enemy', 0)), 1, '层数仍是 1（跳伤不叠层）');
  assert.equal(stacksOf(unitAt(s, 'enemy', 1)), 0, '敌方女性始终不受影响');
});

/* ============================================================
   二、火攻的边界：免伤 / 免疫 / 不可选中
   ============================================================ */

test('挂层不受"伤害被减到 0"影响：披坚整段免疫，**照样挂 1 层**', () => {
  const s = setup({ seed: 1, ownHand: ['tactic_huogong'] });
  const v = put(s, 'enemy', 3, 10);
  v.statuses.sheng_dun_status = { stacks: 1 };   // 披坚：免疫一次伤害（一次性，触发即消耗）

  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, target: { side: 'enemy', row: 'front', col: 3 },
  });
  assert.ok(r.ok, r.error ?? '火攻应能打出');
  s.state = r.state;

  const after = unitAt(s, 'enemy', 3);
  assert.equal(after.hp, 10, '披坚把这一下整段免疫了（0 伤）');
  assert.equal(after.statuses.sheng_dun_status, undefined, '披坚已被消耗');
  assert.equal(stacksOf(after), 1, '"火攻打出去了"即挂 —— 伤害为 0 也照挂');
});

test('不可选中（免疫 / 翻面）：既不吃伤害，也不挂层', () => {
  const s = setup({ ownHand: ['event_huoshaoluoyang', 'neutral_infantry'] });
  put(s, 'enemy', 0, 10);
  const hidden = put(s, 'enemy', 2, 10);
  hidden.statuses.mian_yi = { stacks: 1 };       // 免疫：immune_debuff + untargetable

  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.ok(r.ok, r.error ?? '事件应能打出');
  s.state = r.state;

  assert.equal(10 - unitAt(s, 'enemy', 0).hp, 1, '普通单位照常吃 1 点火伤');
  assert.equal(stacksOf(unitAt(s, 'enemy', 0)), 1, '普通单位照常挂 1 层');
  assert.equal(unitAt(s, 'enemy', 2).hp, 10, '不可选中的单位根本进不了目标池 → 不吃伤害');
  assert.equal(stacksOf(unitAt(s, 'enemy', 2)), 0, '也不挂层');
  assert.equal(s.state.sides.enemy.lord.hp, 29, '范围火伤仍含主公（证明这一下确实打出去了）');
});

test('免疫负面（immune_debuff）：伤害照吃，但挂层被既有规则挡下（STATUS_BLOCKED）', () => {
  // 卡池里带 `immune_debuff` 的状态（免疫/`mian_yi`）同时带 `untargetable`，正常选目标时
  // 根本选不到它 —— 所以这条分支只有"指定已锁定目标"的路径能触到：普通攻击的
  // `attack_target` 选择器（ADR-130）**不走目标池过滤**。用一张合成卡把这条路径打通。
  const IGNITER: CardDef = {
    id: 'test_fire_igniter', name: '纵火者', faction: 'shu', type: 'general',
    cost: 2, attack: 2, health: 5, keywords: [], memo: '测试：攻击时对被打者挂灼烧',
    skills: [{
      id: 'ignite_on_attack', name: '纵火', kind: 'trigger', trigger: 'on_attack',
      effects: [{ action: 'damage', value: 1, damage_type: 'fire', target: { attack_target: true } }],
    }],
  };
  const s = setup({});
  put(s, 'own', 0, 5, IGNITER);
  const v = put(s, 'enemy', 0, 10);
  v.statuses.mian_yi = { stacks: 1 };

  const events: GameEvent[] = [];
  const ok = resolveAttack(
    s.state, s.ctx.cards, 'own', { row: 'front', col: 0 },
    { kind: 'unit', row: 'front', col: 0 }, events, createRng(1), { toSide: 'enemy' },
  );
  assert.ok(ok, '攻击应成立');

  assert.equal(unitAt(s, 'enemy', 0).hp < 10, true, '免疫负面不挡伤害：目标照吃这一下');
  assert.equal(stacksOf(unitAt(s, 'enemy', 0)), 0, '挂层走 applyStatus → 被 immune_debuff 挡下');
  assert.ok(
    events.some((e) => e.type === 'STATUS_BLOCKED' && e.status === 'zhuo_shao'),
    '应有 STATUS_BLOCKED 事件（沿用引擎既有的"免疫负面"语义，不另造判定）',
  );
});

/* ============================================================
   三、DoT 跳伤**不挂层**（本规则最关键的一条）
   ============================================================ */

test('「只对敌人」：打自己人的火攻不挂层（施法者与己方单位都不中灼烧）', () => {
  // 设计者口径：「**释放的火攻只对敌人**」—— 目标阵营 = 施法方的火伤只掉血、不挂层。
  // 合成一张"对双方全体各 1 点火攻"的卡来把这条判据钉死（判据是"目标阵营 ≠ 施法方"，
  // 不是"目标不是来源单位"：打自己人的 AoE 同样不挂层）。
  const BOTH: CardDef = {
    id: 'test_fire_both', name: '焚尽', faction: 'wei', type: 'tactic',
    cost: 1, memo: '测试：对双方全体各 1 点火攻',
    effects: [{ action: 'damage', value: 1, damage_type: 'fire', target: { side: 'both', count: 'all' } }],
  };
  const s = setup({});
  put(s, 'own', 0, 10);
  put(s, 'own', 2, 10);
  put(s, 'enemy', 1, 10);
  put(s, 'enemy', 3, 10);
  s.state.sides.own.hand = [{ card: BOTH, mods: [] }];
  s.ctx.cards.set(BOTH.id, BOTH);

  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.ok(r.ok, r.error ?? '焚尽应能打出');
  s.state = r.state;

  for (const col of [0, 2]) {
    assert.equal(10 - unitAt(s, 'own', col).hp, 1, `己方第 ${col} 格照吃 1 点火伤`);
    assert.equal(stacksOf(unitAt(s, 'own', col)), 0, `己方第 ${col} 格**不挂层**（只对敌人）`);
  }
  for (const col of [1, 3]) {
    assert.equal(10 - unitAt(s, 'enemy', col).hp, 1, `敌方第 ${col} 格吃 1 点火伤`);
    assert.equal(stacksOf(unitAt(s, 'enemy', col)), 1, `敌方第 ${col} 格挂 1 层`);
  }
});

test('「只对敌人」：施法者自身受火攻（主动技自伤）不中灼烧', () => {
  // 合成一张"对自己 2 点火攻"的主动技：自伤只掉血、绝不给自己挂灼烧。
  const SELF_BURNER: CardDef = {
    id: 'test_fire_self_caster', name: '自焚者', faction: 'wei', type: 'general',
    cost: 2, attack: 0, health: 10, keywords: [], memo: '测试：主动技对自己 2 点火攻',
    skills: [{
      id: 'burn_self', name: '自焚', kind: 'active', frequency: 'once_per_turn',
      effects: [{ action: 'damage', value: 2, damage_type: 'fire', target: { source: true } }],
    }],
  };
  const s = setup({});
  const caster = put(s, 'own', 0, 10, SELF_BURNER);
  const before = caster.hp;

  const r = applyAction(s.state, s.ctx, { type: 'USE_SKILL', row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '自焚应能发动');
  s.state = r.state;

  const after = unitAt(s, 'own', 0);
  assert.equal(before - after.hp, 2, '施法者照吃自己的 2 点火伤');
  assert.equal(stacksOf(after), 0, '施法者自己绝不中灼烧（释放的火攻只对敌人）');
});

test('DoT 跳伤不挂层：同一目标连续 3 个回合，层数**始终不变**、伤害恒等于层数', () => {
  // 若把挂层写进 dealDamage（按 damageType === 'fire' 判断），灼烧的跳伤就会自己给自己叠层：
  // 第 1 回合烧 1（→ 2 层）、第 2 回合烧 2（→ 4 层）…… 指数增长。
  const s = setup({ seed: 7, ownHand: ['tactic_huogong'] });
  put(s, 'enemy', 3, 30);

  const played = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, target: { side: 'enemy', row: 'front', col: 3 },
  });
  assert.ok(played.ok, played.error ?? '火攻应能打出');
  s.state = played.state;
  const stacks = stacksOf(unitAt(s, 'enemy', 3));
  assert.ok(stacks >= 1, '火攻至少挂 1 层（seed 7 下为 2 层）');

  const before = unitAt(s, 'enemy', 3).hp;
  let expected = 0;
  for (let round = 1; round <= 3; round++) {
    endTurn(s);                               // 我方结束 → 敌方回合开始：灼烧结算
    expected += stacks;
    assert.equal(stacksOf(unitAt(s, 'enemy', 3)), stacks,
      `第 ${round} 个回合：层数必须**不变**（跳伤不计入挂层）`);
    assert.equal(before - unitAt(s, 'enemy', 3).hp, expected,
      `第 ${round} 个回合：伤害应恒等于层数（${stacks}）`);
    endTurn(s);                               // 敌方结束 → 我方回合开始
  }
  assert.equal(expected, 3 * stacks, '3 个回合的跳伤累计 = 层数 × 3');
});

test('DoT 跳伤不挂层（藤甲）：跳伤是火属性（+1 易伤），层数仍然不变', () => {
  // 藤甲「遇火即燃」是 ADR-108 有意让"火属性"进入受伤侧的理由，也是"不能把挂层放进
  // dealDamage"的最强证据：跳伤自己就是火属性，按属性挂层必然自我叠层。
  const s = setup({});
  const v = put(s, 'enemy', 3, 30);
  v.statuses.teng_jia = { stacks: 1 };         // reduce_physical + vulnerable_fire
  applyStatus(s.state, unitRef('enemy', 'front', 3), 'zhuo_shao', 2, []);

  for (let round = 1; round <= 3; round++) {
    endTurn(s);
    assert.equal(stacksOf(unitAt(s, 'enemy', 3)), 2, `第 ${round} 个回合：层数不变`);
    assert.equal(30 - unitAt(s, 'enemy', 3).hp, round * 3,
      `第 ${round} 个回合：2 层 + 藤甲火易伤 1 = 每回合 3 点`);
    endTurn(s);
  }
});

/* ============================================================
   四、层数 = 伤害、永久、净化、不封顶
   ============================================================ */

test('层数 = 每回合伤害，且**永久**：3 层连续 3 个回合每回合 3 点，状态不消失', () => {
  const s = setup({});
  put(s, 'enemy', 3, 30);
  applyStatus(s.state, unitRef('enemy', 'front', 3), 'zhuo_shao', 3, []);

  for (let round = 1; round <= 3; round++) {
    endTurn(s);
    assert.equal(30 - unitAt(s, 'enemy', 3).hp, round * 3, `第 ${round} 个回合应烧 3 点`);
    assert.equal(stacksOf(unitAt(s, 'enemy', 3)), 3, '永久状态不会自然到期');
    endTurn(s);
  }
  assert.equal(unitAt(s, 'enemy', 3).statuses.zhuo_shao!.turns, undefined, '永久 = 无剩余回合数');
});

test('净化后停止：驱散层数后不再结算', () => {
  const s = setup({});
  put(s, 'enemy', 3, 30);
  applyStatus(s.state, unitRef('enemy', 'front', 3), 'zhuo_shao', 3, []);

  const removed = removeStatus(s.state, unitRef('enemy', 'front', 3), 'zhuo_shao', []);
  assert.equal(removed, 3, '净化移除全部层数');
  endTurn(s);
  assert.equal(unitAt(s, 'enemy', 3).hp, 30, '净化后不再掉血');
  assert.equal(stacksOf(unitAt(s, 'enemy', 3)), 0, '状态已不在');
});

test('层数不封顶：连续施加 5 次 = 5 层，回合开始烧 5 点', () => {
  const s = setup({});
  put(s, 'enemy', 3, 30);
  for (let i = 0; i < 5; i++) {
    applyStatus(s.state, unitRef('enemy', 'front', 3), 'zhuo_shao', 1, []);
  }
  assert.equal(stacksOf(unitAt(s, 'enemy', 3)), 5, '施加 5 次 = 5 层（无 max_stacks）');
  endTurn(s);
  assert.equal(30 - unitAt(s, 'enemy', 3).hp, 5, '伤害 = 层数 = 5');
});

/* ============================================================
   五、数据收口（防漂移）
   ============================================================ */

test('卡牌收口：荀攸/陆逊**不再**显式施加灼烧（否则伤害自带 1 层 + 显式 1 层 = 双倍）', () => {
  for (const [id, skillName] of [['wei_xunyou', '乌巢袭粮'], ['wu_luxun', '策火流云']] as const) {
    const card = realCard(id);
    const skill = (card.skills ?? []).find((x) => x.name === skillName);
    assert.ok(skill, `${card.name} 应有「${skillName}」`);
    const explicit = (skill!.effects ?? []).filter((e) => e.status === 'zhuo_shao');
    assert.equal(explicit.length, 0,
      `${card.name}「${skillName}」的火伤已由全局规则自动挂层，不该再写 apply_status: zhuo_shao`);
    // 火伤本身还在（数值未动）
    assert.ok((skill!.effects ?? []).some((e) => e.action === 'damage' && e.damage_type === 'fire'),
      `${card.name}「${skillName}」的直伤应仍是 damage_type: fire`);
  }
});

test('卡牌收口：董卓「暴虐」采用**方案乙**（1 点火攻走统一路径），不再有显式施加', () => {
  const card = realCard('qun_dongzhuo');
  const skill = (card.skills ?? []).find((x) => x.name === '暴虐');
  assert.ok(skill, '董卓应有「暴虐」');
  assert.equal((skill!.effects ?? []).some((e) => e.status === 'zhuo_shao'), false,
    '方案乙：显式 apply_status: zhuo_shao 已删（设计者定案；方案甲已被否决）');
  const fire = (skill!.effects ?? []).filter((e) => e.action === 'damage' && e.damage_type === 'fire');
  assert.equal(fire.length, 1, '改为一整段火攻伤害（对敌方全体男性）');
  assert.equal(fire[0]!.value, 1, '数值 1 点（与方案甲的"1 层"对齐）');
  assert.equal(fire[0]!.duration, undefined, 'damage 没有 duration —— 灼烧时长由状态定义决定（永久）');
  assert.equal(fire[0]!.target?.filter?.gender, 'male', '只对男性');
  assert.equal(fire[0]!.target?.filter?.include_lord, false,
    '显式排除主公：与方案甲的目标池一致（否则 ADR-087 的范围默认会把主公也算进来）');
  assert.match((card as CardDef & { note?: string }).note ?? '', /方案（甲）已被设计者否决/,
    '卡面 note 必须留档"方案甲已否决、最终方案乙"');
});

test('卡牌收口：没有任何卡面文案再把灼烧写成"N 回合"的限时状态', () => {
  const offenders: string[] = [];
  for (const card of ALL) {
    const texts = [card.memo ?? '', ...(card.skills ?? []).map((x) => x.text ?? '')];
    for (const t of texts) {
      if (!t.includes('灼烧')) continue;
      if (/(?:\d|[一二三四五])\s*回合\s*的?\s*灼烧|灼烧[^。；]{0,6}?(?:\d|[一二三四五])\s*回合/.test(t)) {
        offenders.push(`${card.name}：${t}`);
      }
    }
  }
  assert.deepEqual(offenders, [],
    `灼烧已一律永久（ADR-134），这些文案仍写着限时灼烧：\n${offenders.join('\n')}`);
});

test('卡牌收口：每张会打出火攻的卡，卡面文案都写明"挂灼烧"', () => {
  const offenders: string[] = [];
  for (const card of ALL) {
    const fireHits = (card.skills ?? []).flatMap((x) => x.effects ?? [])
      .filter((e) => e.action === 'damage' && e.damage_type === 'fire');
    if (!fireHits.length) continue;
    const texts = [card.memo ?? '', ...(card.skills ?? []).map((x) => x.text ?? '')].join('｜');
    if (!texts.includes('灼烧')) offenders.push(`${card.name}（${card.id}）`);
  }
  assert.deepEqual(offenders, [],
    `这些卡打的是火攻，但卡面没写它会挂灼烧（ADR-134 全局规则）：\n${offenders.join('、')}`);
});
