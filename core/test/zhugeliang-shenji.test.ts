/**
 * 诸葛亮重做（ADR-156）—— 7 费 1/7，「神机妙算」：**每回合**从牌库三选一
 *
 * ## 设计者定稿
 *
 * 「当前的 common 下的诸葛亮使用**神机妙算**，改成 **7 费 1/7**，
 *   然后**每自己回合开始时**可以随机三张选一张到手牌。」
 * 「**不需要自伤**。」
 * 「运筹帷幄／事必躬亲两条留着后面**不同时期或重大历史事件下的特殊诸葛亮人物**。」
 *
 * ## 为什么这张卡不是战吼
 *
 * 设计者明确「战吼这种下场时只触发一次的效果都太弱了」—— 传奇定位要的是**持续型引擎**。
 * 所以 `trigger: turn_start`（每回合都发生），而不是 `on_play`。
 *
 * ## 一条引擎语义必须钉住
 *
 * `discover` 是**从整个牌库**按过滤器随机抽 `count` 张展示、由玩家经 `CHOOSE_DISCOVER` 选一张；
 * 它**不是"看牌库顶三张"** —— `scry` 只能整体移动牌，没有交互式选取。
 * 所以卡面文案写的是「从己方牌库中随机展示三张牌」，不是"查看牌库顶三张"。
 *
 * ## 顺带钉死一个已修的 bug
 *
 * 旧卡的「空城之计」是**光环 + 施加一次性状态（披坚）**，而光环在 `recomputeAuras` 里
 * 先整体清空再重挂 → **己方每阵亡一个单位，盾就补满一次**（实测连挡两刀）。
 * 全池 14 张"光环挂状态"的卡里只有披坚是一次性消耗型，所以这个坑一直没暴露。
 * 现在那条技能已整条移出本卡（空城计独立成 `tactic_kongchengji`，见 ADR-156）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { applyAction } from '../src/engine.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { CardDef, GameEvent } from '../src/types.ts';

const REAL: CardDef[] = JSON.parse(
  readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'),
);
const real = (id: string): CardDef => {
  const c = REAL.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
};

const ZGL = real('shu_zhugeliang');
if (!TEST_CARDS.some((x) => x.id === ZGL.id)) TEST_CARDS.push(ZGL);

// ⚠️ 牌库要给够：每回合「正常抽 1 张 + 神机妙算再拿 1 张」＝ 2 张，
// 牌库见底会走「粮尽」，`discover` 找不到候选就安静跳过 —— 那样"每回合都触发"会被误判成失败。
const DECK = Array.from({ length: 16 }, (_, i) =>
  ['neutral_infantry', 'neutral_archer', 'neutral_shieldman'][i % 3]!);
for (const id of ['neutral_infantry', 'neutral_archer', 'neutral_shieldman']) {
  const c = real(id);
  if (!TEST_CARDS.some((x) => x.id === id)) TEST_CARDS.push(c);
}

/** 摆好诸葛亮并给足牌库；返回起始 state */
function board(seed = 1) {
  const { state, ctx } = scenario({ own: { front: ['shu_zhugeliang'] }, seed });
  state.sides.own.deck = [...DECK];
  state.sides.enemy.deck = [...DECK];
  return { state, ctx };
}

/** 走完"结束回合 → 对手结束回合"，回到我方回合开始（触发时机就在这里） */
function toMyTurnStart(seed = 1) {
  const { state, ctx } = board(seed);
  const r1 = applyAction(state, ctx, { type: 'END_TURN' });
  assert.ok(r1.ok, r1.error ?? '');
  const r2 = applyAction(r1.state, ctx, { type: 'END_TURN' });
  assert.ok(r2.ok, r2.error ?? '');
  return { state: r2.state, ctx, events: r2.events };
}

/* ============================================================
   1. 数据形态（防漂移）
   ============================================================ */

test('数据：诸葛亮 7 费 1/7，只剩「神机妙算」一条持续型引擎', () => {
  assert.equal(`${ZGL.cost}费 ${ZGL.attack}/${ZGL.health}`, '7费 1/7');
  assert.equal(ZGL.type, 'strategist');
  assert.equal((ZGL.skills ?? []).length, 1, '旧的两条技能（运筹帷幄 / 空城之计）都应已移出');

  const sk = (ZGL.skills ?? [])[0]!;
  assert.equal(sk.id, 'shen_ji_miao_suan');
  assert.equal(sk.name, '神机妙算');
  assert.equal(sk.kind, 'trigger');
  assert.equal(sk.trigger, 'turn_start',
    '必须是 turn_start（每回合都发生）—— 设计者明确「只触发一次的战吼太弱」');
  const eff = (sk.effects ?? [])[0]!;
  assert.equal(eff.action, 'discover');
  assert.equal(eff.count, 3);
  assert.equal(eff.discover_to, 'hand');
});

test('数据（回归锁）：诸葛亮身上**不再有"光环挂一次性状态"** —— 那条已整条移出', () => {
  const auras = (ZGL.skills ?? []).filter((s) => s.kind === 'aura');
  assert.deepEqual(auras, [], '不该再有任何光环技能');
  const applies = (ZGL.skills ?? []).flatMap((s) => s.effects ?? [])
    .filter((e) => e.action === 'apply_status');
  assert.deepEqual(applies, [],
    '不该再施加状态 —— 旧「空城之计」正是"光环 + 披坚"导致护盾被反复补满（ADR-156 §0.1）');
});

/* ============================================================
   2. 神机妙算：每回合开始触发
   ============================================================ */

test('神机妙算：我方回合开始时触发，产生三选一的待选（候选进手牌）', () => {
  const { state, events } = toMyTurnStart();
  const pending = state.pendingDiscover;
  assert.ok(pending, '回合开始应产生待选');
  assert.equal(pending!.side, 'own');
  assert.equal(pending!.destination, 'hand');
  assert.equal(pending!.candidates.length, 3, '应是三选一');
  assert.ok(events.some((e: GameEvent) => e.type === 'SKILL_TRIGGERED'),
    '应发出 SKILL_TRIGGERED（客户端据此播报）');
});

test('神机妙算：待选期间引擎只接受 CHOOSE_DISCOVER（不能跳过）', () => {
  const { state, ctx } = toMyTurnStart();
  assert.ok(state.pendingDiscover, '前提：确实处于待选状态');
  const blocked = applyAction(state, ctx, { type: 'END_TURN' });
  assert.equal(blocked.ok, false, '未选牌就想结束回合应被拦下');
  assert.match(blocked.error ?? '', /选择/, `错误信息应提示先选牌，实际：${blocked.error}`);
});

test('神机妙算：选定后那张牌进手牌，牌库相应减少', () => {
  const { state, ctx } = toMyTurnStart();
  const picked = state.pendingDiscover!.candidates[0]!;
  const handBefore = state.sides.own.hand.length;
  const deckBefore = state.sides.own.deck.length;

  const r = applyAction(state, ctx, { type: 'CHOOSE_DISCOVER', cardId: picked });
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.pendingDiscover, undefined, '选完应立即清空待选');
  assert.equal(r.state.sides.own.hand.length, handBefore + 1, '选中的牌应进手牌');
  assert.equal(r.state.sides.own.deck.length, deckBefore - 1, '牌库相应少一张');
  assert.ok(r.state.sides.own.hand.some((hc) => hc.card.id === picked),
    '进手牌的应当就是我选的那张');
});

test('神机妙算：**每个**我方回合都触发（不是只触发一次）', () => {
  let { state, ctx } = toMyTurnStart();
  let rounds = 0;
  for (let i = 0; i < 2; i += 1) {
    if (!state.pendingDiscover) break;
    rounds += 1;
    const pick = state.pendingDiscover.candidates[0]!;
    const r = applyAction(state, ctx, { type: 'CHOOSE_DISCOVER', cardId: pick });
    assert.ok(r.ok, r.error ?? '');
    // 走完我方回合 → 对手回合 → 回到我方回合开始
    const r1 = applyAction(r.state, ctx, { type: 'END_TURN' });
    assert.ok(r1.ok, r1.error ?? '');
    const r2 = applyAction(r1.state, ctx, { type: 'END_TURN' });
    assert.ok(r2.ok, r2.error ?? '');
    state = r2.state;
  }
  assert.equal(rounds, 2, '连续两个我方回合都应各触发一次 —— 这是"持续型引擎"的判据');
  assert.ok(state.pendingDiscover, '第二个回合同样应产生待选');
});

/* ============================================================
   3. rarity: legendary 档
   ============================================================ */

test('rarity：`legendary` 是本轮新增的合法档位（数据里已可用）', () => {
  const withRarity = REAL.filter((c) => c.rarity !== undefined);
  assert.ok(withRarity.length > 0, '真实卡表里应有带 rarity 的卡');
  for (const c of withRarity) {
    assert.ok(['common', 'elite', 'legendary'].includes(c.rarity!),
      `${c.id} 的 rarity=${c.rarity} 不在白名单里`);
  }
  // 本卡仍是 common（设计者口径：事必躬亲/运筹帷幄留给传奇版本，本卡不动 rarity）
  assert.equal(ZGL.rarity, undefined, '现行诸葛亮保持 common（不写 rarity 字段）');
});
