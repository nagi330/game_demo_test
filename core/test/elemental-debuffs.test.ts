/**
 * 三系元素 debuff：火 · 灼烧 / 水 · 水困 / 毒 · 中毒（ADR-132）
 *
 * ## 三系节奏（设计者定案：三个时点**刻意错开**，让玩家一眼分清挨的是哪一种）
 *
 * | 系 | 状态 | 时机 | 公式 | 层数 | 时长 |
 * |---|---|---|---|---|---|
 * | 火 | `zhuo_shao` 灼烧 | 该方**回合开始**（回合第一步，早于统率回满/抽牌/任何行动） | 受 N 点**火**伤 | N = 层数，不封顶 | **永久** |
 * | 水 | `shui_kun` 水困 | **行动时**（普攻 / 主动技结算后） | 受 2^(阶段-1) 点**水**伤（1/2/4/8…，无上限）；**不行动 = 完全不受伤** | 层数＝阶段，不封顶 | **永久** |
 * | 毒 | `zhong_du` 中毒 | 该方**回合结束** | **永久降低 N 点生命上限**（不造成伤害） | N = 层数，不封顶 | **永久** |
 *
 * 三系都可被净化（`kind: 'debuff'` → 华佗「青囊」的 `remove_kind: debuff` 按类驱散）。
 * 中毒的削上限**不可逆**：净化只能止住，已削的不恢复。
 *
 * ## 本文件的写法约定
 *
 * · 断言一律读 `r.state`（`applyAction` 返回的是**克隆**后的状态，改原 state 无效 —— ADR-108 踩过）。
 * · 需要"整回合节奏"的用例走 `applyAction({type:'END_TURN'})` 真实换手，
 *   而不是手工调结算函数 —— 手调只能验引擎，验不了"挂在哪一步"。
 * · 只用 core 的确定性 Rng；不引入任何随机（GDD 12）。
 */
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

import { applyAction, unitSkillTargetPlan } from '../src/engine.ts';
import { applyStatus, removeStatus, resolveTurnEndStatuses, resolveTurnStartDamage, unitRef } from '../src/mutate.ts';
import { getUnit, makeUnit, setUnit, statusStacks } from '../src/state.ts';
import { STATUSES } from '../src/constants.ts';
import { scenario } from './fixtures.ts';
import type { CardDef, GameEvent, MatchState, Side, Unit } from '../src/types.ts';

/* ============================================================
   夹具
   ============================================================ */

/** 高血沙包：够挨很多回合的元素伤害（测试专用，不是正式卡） */
const SANDBAG: CardDef = {
  id: 'test_element_sandbag', name: '沙包', faction: 'wei', type: 'troop',
  cost: 2, attack: 2, health: 20, troopKind: 'infantry', keywords: [], memo: '测试',
};

/** 连击单位：一个回合能行动两次（验证"多次行动多次收税"） */
const LIANJI: CardDef = {
  id: 'test_element_lianji', name: '连击手', faction: 'shu', type: 'troop',
  cost: 2, attack: 1, health: 20, troopKind: 'infantry', keywords: ['lian_ji'], memo: '测试',
};

/** 带主动技的单位：验证"主动技"这个水困挂点 */
const CASTER: CardDef = {
  id: 'test_element_caster', name: '术士', faction: 'shu', type: 'strategist',
  cost: 2, attack: 0, health: 20, keywords: [],
  skills: [{
    id: 'test_zap', name: '雷击', kind: 'active', cost: 1, frequency: 'once_per_turn',
    target: { side: 'enemy', filter: { type: 'character' }, count: 1, mode: 'choose' },
    effects: [{ action: 'damage', value: 1 }],
  }],
  memo: '测试',
};

/** 摆一个单位在该方第 3 格（默认高血沙包） */
function board(side: Side = 'enemy', card: CardDef = SANDBAG) {
  const { state, ctx } = scenario({});
  ctx.cards.set(card.id, card);
  const u = makeUnit(card, 0, 901);
  setUnit(state, side, 'front', 3, u);
  return {
    state, ctx, unit: u,
    get: (s: MatchState = state): Unit | null => getUnit(s, side, 'front', 3),
  };
}

/** 从 core/data/cards.json 读一张**真实卡**（防内联夹具与数据漂移） */
const REAL_CARDS: CardDef[] = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cards.json'), 'utf8'),
);
function realCard(id: string): CardDef {
  const c = REAL_CARDS.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
}

/** 走 prototype 的卡面渲染，取出减益徽章 HTML（层数＝徽章上的数字） */
function badgeHTML(status: { id: string; name: string; stacks: number; kind: string }): string {
  const window = { Core: { KEYWORDS: {} }, CardRender: undefined as unknown };
  const document = {
    createElement: () => ({ className: '', dataset: {} as Record<string, string>, innerHTML: '' }),
  };
  const source = readFileSync(new URL('../../prototype/card-render.js', import.meta.url), 'utf8');
  runInNewContext(source, { window, document });
  const R = window.CardRender as { mini: (c: object, o?: object) => { innerHTML: string } };
  const unit = { id: 'u1', name: '沙包', faction: 'wei', type: 'troop', cost: 2, atk: 2, hp: 6, maxHp: 20, kw: [] };
  return R.mini(unit, { statuses: [status] }).innerHTML;
}

const indexOfEvent = (events: GameEvent[], pred: (e: GameEvent) => boolean): number => events.findIndex(pred);

/* ============================================================
   火 · 灼烧 `zhuo_shao` —— 该方**回合开始**受 N 点火伤
   ============================================================ */

for (const n of [1, 2, 3]) {
  test(`灼烧：该方回合开始时受 ${n} 点火伤（伤害 = 层数）`, () => {
    const { state, ctx, get } = board('enemy');
    get()!.statuses.zhuo_shao = { stacks: n };
    const before = get()!.hp;
    const events: GameEvent[] = [];
    resolveTurnStartDamage(state, ctx.cards, 'enemy', events);
    assert.equal(before - get()!.hp, n, `${n} 层灼烧 → 掉 ${n} 点，实际 ${before - get()!.hp}`);
    assert.ok(events.some((e) => e.type === 'DAMAGE' && e.source === '灼烧'),
      '伤害事件来源应为「灼烧」（回放与飘字靠它区分三系）');
  });
}

test('灼烧：走**火**属性（藤甲「遇火即燃」+1，物理减伤不参与）', () => {
  const { state, ctx, get } = board('enemy');
  get()!.statuses.zhuo_shao = { stacks: 1 };
  get()!.statuses.teng_jia = { stacks: 1 };      // caps: reduce_physical + vulnerable_fire
  const before = get()!.hp;
  resolveTurnStartDamage(state, ctx.cards, 'enemy', []);
  assert.equal(before - get()!.hp, 2,
    '1 点火伤 + 藤甲火易伤 1 = 2；若按物理结算会被 reduce_physical 减成 0');
});

test('灼烧：在该方回合的**第一步**结算 —— 早于回合事件与抽牌', () => {
  const { state, ctx, get } = board('enemy');
  get()!.statuses.zhuo_shao = { stacks: 2 };
  const r = applyAction(state, ctx, { type: 'END_TURN' });      // 我方结束 → 敌方回合开始
  assert.equal(r.ok, true, r.error ?? '结束回合应成立');
  const ev = r.events ?? [];
  const burn = indexOfEvent(ev, (e) => e.type === 'DAMAGE' && e.source === '灼烧');
  const turnStart = indexOfEvent(ev, (e) => e.type === 'TURN_START' && e.side === 'enemy');
  // 夹具的牌库是空的：敌方"抽牌"这一步会以粮尽伤害的形式出现，两者都算"该回合已开始行动"
  const draw = indexOfEvent(ev, (e) => (e.type === 'CARD_DRAWN' || e.type === 'FATIGUE') && e.side === 'enemy');
  assert.ok(burn >= 0, '应发生灼烧伤害');
  assert.ok(turnStart >= 0 && draw >= 0, `敌方回合应正常开始并抽牌（turnStart=${turnStart}, draw=${draw}）`);
  assert.ok(burn < turnStart, `灼烧必须早于回合事件（burn=${burn}, turnStart=${turnStart}）`);
  assert.ok(burn < draw, `灼烧必须早于抽牌（burn=${burn}, draw=${draw}）`);
});

test('灼烧：1 血单位在回合开始即阵亡 —— 本回合**无法行动**', () => {
  const { state, ctx, get } = board('enemy');
  get()!.hp = 1;
  get()!.statuses.zhuo_shao = { stacks: 1 };
  const r = applyAction(state, ctx, { type: 'END_TURN' });
  assert.equal(getUnit(r.state, 'enemy', 'front', 3), null, '回合开始被烧死 → 已移出战场');
  assert.ok((r.events ?? []).some((e) => e.type === 'UNIT_DIED' && e.side === 'enemy'), '应有阵亡事件');
  const atk = applyAction(r.state, ctx, { type: 'ATTACK', from: { row: 'front', col: 3 }, to: { kind: 'lord' } });
  assert.equal(atk.ok, false, '已阵亡 → 该格本回合无法行动（攻击被拒）');
});

test('灼烧：永久 —— 多个回合每回合都结算，状态不消失', () => {
  const { state, ctx, get } = board('enemy');
  get()!.statuses.zhuo_shao = { stacks: 1 };
  const before = get()!.hp;
  let s = state;
  for (let i = 0; i < 2; i++) {
    s = applyAction(s, ctx, { type: 'END_TURN' }).state;   // own 结束 → enemy 回合开始：烧
    s = applyAction(s, ctx, { type: 'END_TURN' }).state;   // enemy 结束 → own 回合开始
  }
  assert.equal(before - get(s)!.hp, 2, '两个敌方回合各烧 1 点');
  assert.ok(get(s)!.statuses.zhuo_shao, '永久状态不该消失');
  assert.equal(get(s)!.statuses.zhuo_shao.turns, undefined, '永久 = 无剩余回合数（不吃回合到期）');
});

test('灼烧：被净化后不再结算', () => {
  const { state, ctx, get } = board('enemy');
  get()!.statuses.zhuo_shao = { stacks: 3 };
  const removed = removeStatus(state, unitRef('enemy', 'front', 3), 'zhuo_shao', []);
  assert.equal(removed, 3, '净化应移除全部层数');
  const before = get()!.hp;
  resolveTurnStartDamage(state, ctx.cards, 'enemy', []);
  assert.equal(get()!.hp, before, '净化后不再掉血');
});

test('灼烧：连续施加会叠层，且**不封顶**', () => {
  const { state, ctx, get } = board('enemy');
  for (let i = 0; i < 5; i++) applyStatus(state, unitRef('enemy', 'front', 3), 'zhuo_shao', 1, []);
  assert.equal(statusStacks(get()!, 'zhuo_shao'), 5, '施加 5 次 = 5 层（无 max_stacks、不封顶）');
  assert.equal(get()!.statuses.zhuo_shao.turns, undefined, '永久');
  const before = get()!.hp;
  resolveTurnStartDamage(state, ctx.cards, 'enemy', []);
  assert.equal(before - get()!.hp, 5, '伤害 = 层数（5 层烧 5 点）');
});

test('灼烧：层数与卡面徽章一致（徽章显示 N → 实际结算 N）', () => {
  const { state, ctx, get } = board('enemy');
  get()!.statuses.zhuo_shao = { stacks: 3 };
  const def = STATUSES.zhuo_shao!;
  // 与 prototype/battlefield.engine.js 的 statusList 同源：id / name / stacks / kind 四项
  const html = badgeHTML({
    id: 'zhuo_shao', name: def.name, stacks: get()!.statuses.zhuo_shao.stacks, kind: def.kind,
  });
  assert.match(html, /灼烧3/, '徽章必须把层数写在名字后面（card-render：stacks > 1 时拼接）');
  const before = get()!.hp;
  resolveTurnStartDamage(state, ctx.cards, 'enemy', []);
  assert.equal(before - get()!.hp, 3, '结算的伤害必须等于徽章上的数字 3');
});

/* ============================================================
   水 · 水困 `shui_kun` —— **只有行动**才受 2^(阶段-1) 点水伤
   ============================================================ */

for (const [stage, dmg] of [[1, 1], [2, 2], [3, 4]] as const) {
  test(`水困：阶段 ${stage} 行动时受 ${dmg} 点水伤（2^(阶段-1)，无上限）`, () => {
    const { state, ctx, get } = board('enemy');
    get()!.statuses.shui_kun = { stacks: stage };
    state.active = 'enemy';
    const before = get()!.hp;
    // 打我方主公：主将不反击，掉的血只可能来自水困行动税（ADR-116 的老办法）
    const r = applyAction(state, ctx, { type: 'ATTACK', from: { row: 'front', col: 3 }, to: { kind: 'lord' } });
    assert.equal(r.ok, true, r.error ?? '攻击应成立');
    assert.equal(before - get(r.state)!.hp, dmg,
      `阶段 ${stage} → ${dmg} 点，实际 ${before - get(r.state)!.hp}`);
    assert.ok((r.events ?? []).some((e) => e.type === 'DAMAGE' && e.source === '水困'),
      '应有来源为「水困」的伤害事件');
  });
}

test('水困：**不行动就不受伤** —— 回合末没有水伤（与灼烧/中毒的关键区别）', () => {
  const { state, ctx, get } = board('enemy');
  get()!.statuses.shui_kun = { stacks: 3 };
  const before = get()!.hp;
  const r = applyAction(state, ctx, { type: 'END_TURN' });        // own 结束 → enemy 回合开始
  assert.equal(get(r.state)!.hp, before, '敌方回合**开始**不结算水伤');
  const r2 = applyAction(r.state, ctx, { type: 'END_TURN' });      // enemy 结束 → 回合末结算
  assert.equal(get(r2.state)!.hp, before, '敌方回合**结束**也没有水伤 —— 不行动 = 完全不受水伤');
  assert.ok(!(r2.events ?? []).some((e) => e.type === 'DAMAGE' && e.source === '水困'),
    '整回合不该出现水困伤害事件');
  assert.equal(statusStacks(get(r2.state)!, 'shui_kun'), 4, '但阶段照常推进（3 → 4）');
});

test('水困：**主动技**同样触发行动税（两个挂点都在）', () => {
  const { state, ctx } = scenario({ ownCommand: 10 });
  ctx.cards.set(CASTER.id, CASTER);
  ctx.cards.set(SANDBAG.id, SANDBAG);
  const caster = makeUnit(CASTER, 0, 911);
  caster.statuses.shui_kun = { stacks: 2 };
  setUnit(state, 'own', 'front', 0, caster);
  setUnit(state, 'enemy', 'front', 3, makeUnit(SANDBAG, 0, 912));
  const r = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 0, target: { side: 'enemy', row: 'front', col: 3 },
  });
  assert.equal(r.ok, true, r.error ?? '主动技应能释放');
  const after = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(caster.hp - after.hp, 2, '阶段 2 → 施法者自己也吃 2 点水伤');
  assert.ok((r.events ?? []).some((e) => e.type === 'DAMAGE' && e.source === '水困' && e.target.side === 'own'),
    '行动税应打在使用者身上（不是技能目标）');
});

test('水困：同一回合多次行动**多次收税**（不设每回合上限；连击两次 = 收两次）', () => {
  const { state, ctx, get } = board('enemy', LIANJI);
  get()!.statuses.shui_kun = { stacks: 1 };
  state.active = 'enemy';
  let s = state;
  for (let i = 0; i < 2; i++) {
    const r = applyAction(s, ctx, { type: 'ATTACK', from: { row: 'front', col: 3 }, to: { kind: 'lord' } });
    assert.equal(r.ok, true, r.error ?? `第 ${i + 1} 次攻击应成立（连击）`);
    s = r.state;
  }
  assert.equal(LIANJI.health! - get(s)!.hp, 2,
    '现行为：每个主动行动各收一次税（阶段 1 → 两次共 2 点）。连击/强制攻击单位本就越强，水困正是它的克制');
});

test('水困：**反击**不触发行动税（只有主动行动才扣）', () => {
  const { state, ctx, get } = board('enemy');
  get()!.statuses.shui_kun = { stacks: 3 };
  setUnit(state, 'own', 'front', 0, makeUnit(SANDBAG, 0, 913));
  const before = get()!.hp;
  const r = applyAction(state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 3 },
  });
  assert.equal(r.ok, true, r.error ?? '攻击应成立');
  const lost = before - get(r.state)!.hp;
  assert.equal(lost, SANDBAG.attack,
    `被攻击只掉我方攻击力 ${SANDBAG.attack} 点，反击不吃行动税；实际掉 ${lost}`);
  assert.ok(!(r.events ?? []).some((e) => e.type === 'DAMAGE' && e.source === '水困'),
    '被攻击方不该收到水困伤害');
});

test('水困：阶段在该方**回合末 +1**（施加当回合为阶段 1）', () => {
  const { state, ctx, get } = board('enemy');
  applyStatus(state, unitRef('enemy', 'front', 3), 'shui_kun', 1, []);
  assert.equal(statusStacks(get()!, 'shui_kun'), 1, '刚施加 = 阶段 1');
  const r = applyAction(state, ctx, { type: 'END_TURN' });         // own 结束 → enemy 回合开始
  assert.equal(statusStacks(get(r.state)!, 'shui_kun'), 1, '敌方回合**开始**时不推进');
  const r2 = applyAction(r.state, ctx, { type: 'END_TURN' });       // enemy 结束 → 回合末 +1
  assert.equal(statusStacks(get(r2.state)!, 'shui_kun'), 2, '敌方回合**结束**时 1 → 2');
});

test('水困：永久（无回合上限）—— 多回合后仍在，阶段持续增长', () => {
  const { state, ctx, get } = board('enemy');
  get()!.statuses.shui_kun = { stacks: 1 };
  let s = state;
  for (let i = 0; i < 2; i++) {                                    // 两个完整回合
    s = applyAction(s, ctx, { type: 'END_TURN' }).state;
    s = applyAction(s, ctx, { type: 'END_TURN' }).state;
  }
  assert.equal(statusStacks(get(s)!, 'shui_kun'), 3, '每个自己的回合末 +1：1 → 2 → 3');
  assert.equal(get(s)!.statuses.shui_kun.turns, undefined, '永久 = 无剩余回合数');
});

test('水困：净化后清零 —— 不再推进、行动也不再收税', () => {
  const { state, ctx, get } = board('enemy');
  get()!.statuses.shui_kun = { stacks: 3 };
  assert.equal(removeStatus(state, unitRef('enemy', 'front', 3), 'shui_kun', []), 3);
  state.active = 'enemy';
  const before = get()!.hp;
  const r = applyAction(state, ctx, { type: 'ATTACK', from: { row: 'front', col: 3 }, to: { kind: 'lord' } });
  assert.equal(r.ok, true, r.error ?? '攻击应成立');
  assert.equal(before - get(r.state)!.hp, 0, '净化后行动不再受水伤');
  assert.equal(statusStacks(get(r.state)!, 'shui_kun'), 0);
});

test('水困：重复施加**取较大者、不降级**（stack_mode: max）—— 连续施加不会反而削弱', () => {
  const { state, get } = board('enemy');
  const ref = unitRef('enemy', 'front', 3);
  applyStatus(state, ref, 'shui_kun', 2, []);
  assert.equal(statusStacks(get()!, 'shui_kun'), 2);
  applyStatus(state, ref, 'shui_kun', 1, []);
  assert.equal(statusStacks(get()!, 'shui_kun'), 2, '再施加 1 层不应把阶段压回 1');
  applyStatus(state, ref, 'shui_kun', 4, []);
  assert.equal(statusStacks(get()!, 'shui_kun'), 4, '更大的阶段应顶上去');
  applyStatus(state, ref, 'shui_kun', 1, []);
  assert.equal(statusStacks(get()!, 'shui_kun'), 4, '之后的小阶段不降级');
});

/* ============================================================
   毒 · 中毒 `zhong_du` —— 该方**回合结束**永久削 N 点生命上限
   ============================================================ */

for (const n of [1, 2, 3]) {
  test(`中毒：该方回合结束时永久降低 ${n} 点生命上限（不造成伤害）`, () => {
    const { state, ctx, get } = board('enemy');
    get()!.statuses.zhong_du = { stacks: n };
    const beforeMax = get()!.maxHp;
    resolveTurnEndStatuses(state, ctx.cards, 'enemy', []);
    assert.equal(get()!.maxHp, beforeMax - n, `上限 ${beforeMax} → ${beforeMax - n}`);
  });
}

test('中毒：当前生命高于新上限 → **夹到新上限**（不低于 0）', () => {
  const { state, ctx, get } = board('enemy');
  get()!.statuses.zhong_du = { stacks: 3 };
  assert.equal(get()!.hp, 20, '夹具满血');
  resolveTurnEndStatuses(state, ctx.cards, 'enemy', []);
  assert.deepEqual([get()!.maxHp, get()!.hp], [17, 17], '上限 17、当前生命夹到 17');
});

test('中毒：**不造成伤害** —— 当前生命低于新上限时原地不动', () => {
  const { state, ctx, get } = board('enemy');
  get()!.hp = 3;                                   // 20 血上限、只剩 3 血
  get()!.statuses.zhong_du = { stacks: 2 };
  const events: GameEvent[] = [];
  resolveTurnEndStatuses(state, ctx.cards, 'enemy', events);
  assert.equal(get()!.maxHp, 18, '上限 −2');
  assert.equal(get()!.hp, 3, '当前生命 3 < 18 → 不掉血（削上限 ≠ 扣血）');
  assert.deepEqual(events.filter((e) => e.type === 'DAMAGE'), [], '中毒不产生任何伤害事件');
  assert.ok(events.some((e) => e.type === 'STAT_MODIFIED' && e.health === -2 && e.source === '中毒'),
    '应有「中毒」来源的属性修正事件（让玩家看得见上限为什么掉了）');
});

test('中毒：逐回合**累计**削上限（永久，不会自己恢复）', () => {
  const { state, ctx, get } = board('enemy');
  get()!.statuses.zhong_du = { stacks: 2 };
  let s = state;
  for (let i = 0; i < 3; i++) {                    // 三个完整回合
    s = applyAction(s, ctx, { type: 'END_TURN' }).state;   // own → enemy 回合开始
    s = applyAction(s, ctx, { type: 'END_TURN' }).state;   // enemy 回合结束：削 2
  }
  assert.equal(get(s)!.maxHp, 14, '三个敌方回合各削 2 → 上限 20 − 6');
  assert.equal(get(s)!.hp, 14, '当前生命被逐次夹到新上限');
  assert.ok(get(s)!.statuses.zhong_du, '永久状态仍在');
});

test('中毒：永久 —— 净化后**停止**继续削，但**已削的不恢复**', () => {
  const { state, ctx, get } = board('enemy');
  get()!.statuses.zhong_du = { stacks: 2 };
  resolveTurnEndStatuses(state, ctx.cards, 'enemy', []);
  assert.equal(get()!.maxHp, 18, '先削掉 2 点');
  removeStatus(state, unitRef('enemy', 'front', 3), 'zhong_du', []);
  resolveTurnEndStatuses(state, ctx.cards, 'enemy', []);
  assert.equal(get()!.maxHp, 18, '净化后不再削；但已削的 2 点不回来（不可逆）');
  assert.equal(statusStacks(get()!, 'zhong_du'), 0);
});

test('中毒：层数**不封顶**（旧 max_stacks: 3 已删除）', () => {
  const { state, get } = board('enemy');
  for (let i = 0; i < 5; i++) applyStatus(state, unitRef('enemy', 'front', 3), 'zhong_du', 1, []);
  assert.equal(statusStacks(get()!, 'zhong_du'), 5, '施加 5 次 = 5 层');
  assert.equal(STATUSES.zhong_du!.max_stacks, undefined, '状态定义里不应再有 max_stacks');
});

test('中毒：上限被削到 0 → 按阵亡处理（hp 夹到 0，走既有 hp ≤ 0 约定）', () => {
  const TINY: CardDef = { ...SANDBAG, id: 'test_element_tiny', name: '脆皮', health: 2 };
  const { state, ctx, get } = board('enemy', TINY);
  get()!.statuses.zhong_du = { stacks: 2 };
  const events: GameEvent[] = [];
  resolveTurnEndStatuses(state, ctx.cards, 'enemy', events);
  assert.equal(getUnit(state, 'enemy', 'front', 3), null, '上限 2 − 2 = 0 → 阵亡并移出战场');
  assert.ok(events.some((e) => e.type === 'UNIT_DIED'), '应有阵亡事件');

  // 边界另一侧：上限还剩 1 点 → 活着（不误杀）
  const NEAR: CardDef = { ...SANDBAG, id: 'test_element_near', name: '濒死', health: 3 };
  const near = board('enemy', NEAR);
  near.get()!.statuses.zhong_du = { stacks: 2 };
  resolveTurnEndStatuses(near.state, near.ctx.cards, 'enemy', []);
  assert.deepEqual([near.get()!.maxHp, near.get()!.hp], [1, 1], '上限 3 − 2 = 1 → 以 1/1 存活');
});

test('中毒：主公免疫 —— 真实卡「毒箭」的目标池不含主公', () => {
  const wudang = realCard('shu_wudangfeijun');
  const skill = (wudang.skills ?? []).find((s) => s.name === '毒箭');
  assert.ok(skill, '无当飞军应有「毒箭」');
  assert.ok(skill!.target, '毒箭的目标选择器写在技能级');
  assert.ok(!skill!.target!.filter?.include_lord,
    '选择器不得写 include_lord（ADR-117：只有场上单位会中毒，主公免疫）');
  assert.equal(skill!.target!.filter?.type, 'character', '毒箭只选「人物」类目标');

  // 端到端：敌方场上有人物时，目标池里只有人物、没有主公
  const { state, ctx } = board('enemy');
  ctx.cards.set(wudang.id, wudang);
  setUnit(state, 'own', 'front', 0, makeUnit(wudang, 0, 921));
  const targets = unitSkillTargetPlan(state, 'own', 'front', 0).choices.flatMap((c) => c.targets);
  assert.ok(targets.length > 0, '敌方有人物时应能选中');
  assert.ok(targets.every((t) => t.kind === 'unit'),
    `目标池混入了主公：${JSON.stringify(targets.filter((t) => t.kind !== 'unit'))}`);
});

/* ============================================================
   三系同场：同一回合内的三个时点
   ============================================================ */

test('三系节奏：同一回合「回合开始＝灼烧 → 行动时＝水困 → 回合结束＝中毒」', () => {
  const { state, ctx, get } = board('enemy');
  const u = get()!;
  u.statuses.zhuo_shao = { stacks: 2 };            // 火：回合开始，掉 2
  u.statuses.shui_kun = { stacks: 1 };             // 水：行动时，阶段 1 → 掉 1
  u.statuses.zhong_du = { stacks: 1 };             // 毒：回合结束，上限 −1

  // ① 我方结束回合 → 敌方回合开始：灼烧先结算
  const r0 = applyAction(state, ctx, { type: 'END_TURN' });
  assert.equal(r0.ok, true, r0.error ?? '结束回合应成立');
  assert.equal(get(r0.state)!.hp, 18, '① 回合开始：被烧 2 点');
  assert.equal(get(r0.state)!.maxHp, 20, '① 此时上限还没动（毒在回合末）');

  // ② 敌方行动（打我方主公）：水困收税，阶段 1 → 1 点
  const r1 = applyAction(r0.state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 3 }, to: { kind: 'lord' },
  });
  assert.equal(r1.ok, true, r1.error ?? '攻击应成立');
  assert.equal(get(r1.state)!.hp, 17, '② 行动时：被水困收 1 点');
  assert.equal(get(r1.state)!.maxHp, 20, '② 上限仍未动');

  // ③ 敌方结束回合：削上限 + 水困阶段推进
  const r2 = applyAction(r1.state, ctx, { type: 'END_TURN' });
  assert.equal(r2.ok, true, r2.error ?? '结束回合应成立');
  assert.equal(get(r2.state)!.maxHp, 19, '③ 回合结束：上限 −1');
  assert.equal(get(r2.state)!.hp, 17, '削到 19 仍高于当前生命 17 → 不掉血');
  assert.equal(statusStacks(get(r2.state)!, 'shui_kun'), 2, '③ 水困阶段同时 +1（下回合行动要 2 点）');
});

/* ============================================================
   净化与数据收口
   ============================================================ */

test('净化：三系都是 debuff，按类驱散（华佗「青囊」remove_kind: debuff）能一起清掉', () => {
  for (const id of ['zhuo_shao', 'shui_kun', 'zhong_du']) {
    assert.equal(STATUSES[id]!.kind, 'debuff',
      `${id} 必须是 debuff，否则「按类别驱散」的净化会漏掉它`);
  }
  const huatuo = realCard('qun_huatuo');
  const qingnang = (huatuo.skills ?? []).find((s) => (s.effects ?? []).some((e) => e.action === 'remove_status'));
  assert.ok(qingnang, '华佗「青囊」应有 remove_status');
  assert.ok((qingnang!.effects ?? []).some((e) => e.action === 'remove_status' && e.remove_kind === 'debuff'),
    '青囊按 remove_kind: debuff 批量驱散 —— 三系都在这条覆盖面里');

  const { state, get } = board('enemy');
  const ref = unitRef('enemy', 'front', 3);
  applyStatus(state, ref, 'zhuo_shao', 2, []);
  applyStatus(state, ref, 'shui_kun', 1, []);
  applyStatus(state, ref, 'zhong_du', 1, []);
  for (const id of ['zhuo_shao', 'shui_kun', 'zhong_du']) removeStatus(state, ref, id, []);
  assert.deepEqual(
    [statusStacks(get()!, 'zhuo_shao'), statusStacks(get()!, 'shui_kun'), statusStacks(get()!, 'zhong_du')],
    [0, 0, 0], '三系应被一起清空',
  );
});

test('真实卡数据：水困/中毒的 apply_status **不带 duration**（写了会把永久变回限时）', () => {  // ADR-116 的教训：卡牌 YAML 的字段写错（turns vs duration）能一路静默通过，
  // 只有"从卡牌数据出发"的测试才抓得到。ADR-132 把三者都改成永久，
  // 于是反向也要钉住：**不许再出现 duration**。
  //
  // ⚠️ ADR-138 更新：水/毒的「打出去就挂」也全局化到效果层了，所以**毒箭不再显式施加中毒**
  //（显式 1 层 + 自动 1 层 = 每次 2 层，与本卡文案不符）。仍显式施加的只剩下面两张，
  // 其中虎步军的选择器**含主公**（自动规则只挂场上单位），保留显式那条是有意的。
  const cases: Array<[string, string, string]> = [
    ['shu_hubujun', '越水', 'shui_kun'],
    ['shu_guanyu', '水淹七军', 'shui_kun'],
  ];
  for (const [cardId, skillName, statusId] of cases) {
    const card = realCard(cardId);
    const skill = (card.skills ?? []).find((s) => s.name === skillName);
    assert.ok(skill, `${card.name} 应有「${skillName}」`);
    const eff = (skill!.effects ?? []).find((e) => e.status === statusId);
    assert.ok(eff, `${card.name}「${skillName}」应施加 ${statusId}`);
    assert.equal(eff!.duration, undefined,
      `${card.name}「${skillName}」的 ${statusId} 是**永久**状态，不该写 duration（写了会变成限时）`);
    assert.equal((eff as unknown as Record<string, unknown>).turns, undefined,
      'apply_status 的字段是 duration，不是 turns —— turns 会被静默忽略');
  }
  // 毒箭改为**只打毒伤**，挂层交给全局规则（ADR-138）—— 不许有人再把显式那条加回来
  const dujian = (realCard('shu_wudangfeijun').skills ?? []).find((s) => s.name === '毒箭')!;
  assert.equal((dujian.effects ?? []).some((e) => e.status === 'zhong_du'), false,
    '毒箭不该再显式施加中毒：毒攻伤害会自动挂 1 层，显式那条会变成 2 层');
});

test('真实卡数据：禁用（jin_yong）仍是 1 回合 —— 水淹七军只把水困改成永久，没动禁技', () => {
  const guanyu = realCard('shu_guanyu');
  const skill = (guanyu.skills ?? []).find((s) => s.name === '水淹七军')!;
  const jin = (skill.effects ?? []).find((e) => e.status === 'jin_yong');
  assert.equal(jin?.duration, 1, '禁用一回合不变（这两条是各自独立的时长）');
});

test('状态时机表：三系各自挂在正确的 cap 上（引擎只认 cap、不认状态 id）', () => {
  assert.deepEqual(STATUSES.zhuo_shao!.caps, ['dot_fire'], '灼烧：回合开始的火伤');
  assert.deepEqual(STATUSES.zhong_du!.caps, ['shrink_max_hp'], '中毒：回合末削上限');
  assert.deepEqual(STATUSES.shui_kun!.caps, ['damage_on_action', 'stage_up'], '水困：行动税 + 阶段推进');
  assert.equal(STATUSES.shui_kun!.stack_mode, 'max', '水困重复施加取较大者');
  assert.equal(STATUSES.zhuo_shao!.duration, 'permanent');
  assert.equal(STATUSES.zhong_du!.duration, 'permanent');
  assert.equal(STATUSES.shui_kun!.duration, 'permanent', '三系都是永久状态');
});

test('灼烧：连续两回合施加会叠层 —— 第 3 个回合开始烧 2 点', () => {
  const { state, ctx, get } = board('enemy');
  let s = state;
  const ref = unitRef('enemy', 'front', 3);
  applyStatus(s, ref, 'zhuo_shao', 1, []);                       // 第 1 次火攻命中：1 层
  s = applyAction(s, ctx, { type: 'END_TURN' }).state;           // own 结束 → enemy 回合开始：烧 1
  assert.equal(get(s)!.hp, 19, '第 1 个回合开始烧 1 点');
  s = applyAction(s, ctx, { type: 'END_TURN' }).state;           // enemy 结束 → own 回合
  assert.ok(get(s)!.statuses.zhuo_shao, '永久状态不会在回合末消失');

  applyStatus(s, ref, 'zhuo_shao', 1, []);                       // 第 2 次火攻命中：叠到 2 层
  assert.equal(statusStacks(get(s)!, 'zhuo_shao'), 2, '第二次施加应叠层');
  s = applyAction(s, ctx, { type: 'END_TURN' }).state;           // own 结束 → enemy 回合开始：烧 2
  assert.equal(get(s)!.hp, 17, '第 2 个回合开始烧 2 点（伤害 = 新的层数）');
});

test('灼烧：真实卡数据：三张火卡与全局「火攻挂灼烧」规则一致（ADR-134 修订本条）', () => {
  // ⚠️ **旧假设已过期**（ADR-132 时期）：本条原先断言"三张卡各自显式施加灼烧，且实例时长 1/1/2 回合"。
  // ADR-134 把「对敌方释放的火攻各 +1 层」全局化到**效果层**后，三张卡**都不再**显式施加灼烧
  // （荀攸/陆逊：否则"伤害自带 1 层 + 显式 1 层 = 双倍"；董卓：设计者定案改走**方案乙**的统一路径），
  // 灼烧一律**永久**（没有任何 duration）。行为层面的逐张验证在 `test/fire-ignite.test.ts`。
  const cases: Array<[string, string]> = [
    ['wei_xunyou', '乌巢袭粮'],
    ['wu_luxun', '策火流云'],
    ['qun_dongzhuo', '暴虐'],
  ];
  for (const [cardId, skillName] of cases) {
    const card = realCard(cardId);
    const skill = (card.skills ?? []).find((s) => s.name === skillName);
    assert.ok(skill, `${card.name} 应有「${skillName}」`);
    assert.equal((skill!.effects ?? []).some((e) => e.status === 'zhuo_shao'), false,
      `${card.name}（${skillName}）不该再写 apply_status: zhuo_shao —— 火攻由全局规则挂层（ADR-134）`);
  }
  // 董卓是方案乙：只留一段 1 点火攻（灼烧由它自动带上）
  const baonue = (realCard('qun_dongzhuo').skills ?? []).find((s) => s.name === '暴虐')!;
  const fire = (baonue.effects ?? []).filter((e) => e.action === 'damage' && e.damage_type === 'fire');
  assert.equal(fire.length, 1, '董卓「暴虐」：1 段火攻（对敌方全体男性）');
  assert.equal(fire[0]!.value, 1, '1 点');
  assert.equal(STATUSES.zhuo_shao!.duration, 'permanent',
    '状态定义本身是永久（无回合限制）：不写 duration 的施加永不自然到期，只能被净化');
});

test('真实卡数据：没有卡面文案再把灼烧写成「回合结束」结算（ADR-132 改到回合开始）', () => {
  // 文案与实现漂移是本项目反复踩过的坑（ADR-116 的回合数漂移）。
  // 灼烧时机改到回合开始后，"XX 回合结束时再失去 1 点生命"这类描述必须一起改。
  const offenders: string[] = [];
  for (const card of REAL_CARDS) {
    const texts = [card.memo ?? '', ...(card.skills ?? []).map((s) => s.text ?? '')];
    for (const t of texts) {
      if (!t.includes('灼烧')) continue;
      if (/回合结束[^。；]*灼烧|灼烧[^。；]*回合结束/.test(t)) offenders.push(`${card.name}：${t}`);
    }
  }
  assert.deepEqual(offenders, [],
    `这些卡面文案仍把灼烧写成回合结束结算（实际是回合开始）：\n${offenders.join('\n')}`);
});

test('真实卡数据：火卡的直伤仍是 fire 属性（董卓只挂灼烧、没有直伤，故不在此列）', () => {
  for (const cardId of ['wei_xunyou', 'wu_luxun']) {
    const card = realCard(cardId);
    const fireHits = (card.skills ?? []).flatMap((s) => s.effects ?? [])
      .filter((e) => e.action === 'damage' && e.damage_type === 'fire');
    assert.ok(fireHits.length > 0, `${card.name} 的直伤应标 damage_type: fire`);
  }
});
