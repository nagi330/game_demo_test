/**
 * 触发技的 `frequency` 闸门（ADR-168）
 *
 * ## 修的是什么
 *
 * `frequency`（`once_per_turn` | `unlimited` | `once`）此前**只在三处生效**：
 * 主动技、免死（`on_lethal`）、友军攻击（`on_ally_attack`，且是**写死在派发器里**的）。
 * 通用触发派发器 `runUnitTrigger` 与 `after_attack` 的内联循环**根本没有闸门**
 * ⇒ 在 `on_damaged`／`after_attack` 上写 `frequency: once` **静默失效**（变成"每次"）。
 * `docs/gdd/17-troop-system-rework.md` 早就把它记成「暂时无解」，本次因为关兴／张苞的
 * 「首次」语义才补上。
 *
 * ## 三条必须钉住的边界
 *
 * ① **不写 `frequency` ＝ 不限次**（维持历史行为）—— 池内 200+ 张卡的行为不能被动到；
 * ② **条件不成立不消耗额度** —— 「伙伴不在场时才发动」不能把"每局一次"白烧掉；
 * ③ **`once_per_turn` 跨回合重置**（重置由引擎在回合切换时做，见 `engine.ts` 的 `skillUsesThisTurn = {}`）。
 *
 * ⚠️ 驱动方式：`on_damaged` **不是 `dealDamage` 派发的**，而是 `resolveAttack`
 * （`effects.ts` 第 16 步）与引擎在动作结算后统一派发 —— 所以这里用**真实攻击**驱动，
 * 与实机路径一致（直接调 `dealDamage` 会测不到任何触发技）。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { scenario, TEST_CARDS } from './fixtures.ts';
import { getUnit, makeUnit, setUnit } from '../src/state.ts';
import { resolveAttack } from '../src/effects.ts';
import { createRng } from '../src/rng.ts';
import type { CardDef, SkillDef } from '../src/types.ts';

/** 合成卡：受击/攻击后永久 +1 攻 —— 攻击力就是"触发了几次"的计数器 */
function mkCard(id: string, frequency?: SkillDef['frequency'], trigger = 'on_damaged', condition?: unknown): CardDef {
  return {
    id, name: id, faction: 'shu', type: 'general', cost: 3, attack: 3, health: 20,
    keywords: [], memo: '',
    skills: [{
      id: 's', name: '计数', kind: 'trigger', trigger,
      ...(frequency ? { frequency } : {}),
      effects: [{ action: 'modify', attack: 1, target: { source: true }, ...(condition ? { condition } : {}) }],
    }],
  } as unknown as CardDef;
}

const ONCE = 'test_freq_once';
const TURN = 'test_freq_turn';
const NONE = 'test_freq_none';
const COND = 'test_freq_cond';
const AFTER = 'test_freq_after';
const MARKER = 'test_freq_marker';
const FOE = 'test_freq_foe';

TEST_CARDS.push(
  mkCard(ONCE, 'once'),
  mkCard(TURN, 'once_per_turn'),
  mkCard(NONE),
  mkCard(COND, 'once', 'on_damaged', { exists: { side: 'ally', filter: { card_id: MARKER } } }),
  mkCard(AFTER, 'once', 'after_attack'),
  { id: MARKER, name: MARKER, faction: 'shu', type: 'general', cost: 1, attack: 0, health: 3, keywords: [], memo: '' } as unknown as CardDef,
  // 木桩：1 攻打不动 20 血，50 血扛得住反击
  { id: FOE, name: '木桩', faction: 'wei', type: 'troop', cost: 1, attack: 1, health: 50, keywords: [], memo: '' } as unknown as CardDef,
);

/** 己方 front.0 = 被测单位；敌方 front.0 = 木桩 */
function board(id: string, withMarker = false) {
  const { state, ctx } = scenario({});
  setUnit(state, 'own', 'front', 0, makeUnit(ctx.cards.get(id)!, 0, 1));
  setUnit(state, 'enemy', 'front', 0, makeUnit(ctx.cards.get(FOE)!, 0, 2));
  if (withMarker) setUnit(state, 'own', 'front', 1, makeUnit(ctx.cards.get(MARKER)!, 0, 3));
  return { state, ctx, rng: createRng(7) };
}

type B = ReturnType<typeof board>;
const atkOf = (s: B['state']) => getUnit(s, 'own', 'front', 0)!.atk;
let board0: B;

/** 让木桩打被测单位 n 次（每次都是一次完整的普通攻击 → 派发一次 on_damaged） */
function foeHits(state: B['state'], ctx: B['ctx'], rng: B['rng'], n: number) {
  for (let i = 0; i < n; i++) {
    const a = getUnit(state, 'enemy', 'front', 0)!;
    a.attackedThisTurn = 0;                    // 测试驱动，不走回合闸门
    resolveAttack(state, ctx.cards, 'enemy', { row: 'front', col: 0 }, { kind: 'unit', row: 'front', col: 0 }, [], rng, { toSide: 'own' });
  }
}

/* ============================================================ */

test('`once`：受击三次只发动一次（修前会发动三次）', () => {
  board0 = board(ONCE);
  foeHits(board0.state, board0.ctx, board0.rng, 3);
  assert.equal(atkOf(board0.state), 4, '3 → 4（只 +1，不是 +3）');
});

test('`once_per_turn`：同一回合内多次受击只发动一次', () => {
  board0 = board(TURN);
  foeHits(board0.state, board0.ctx, board0.rng, 3);
  assert.equal(atkOf(board0.state), 4, '同一回合只 +1');
});

test('`once_per_turn` 跨回合重置（引擎在回合切换时清空 skillUsesThisTurn）', () => {
  board0 = board(TURN);
  foeHits(board0.state, board0.ctx, board0.rng, 2);
  assert.equal(atkOf(board0.state), 4);
  // 模拟引擎的回合切换（engine.ts：`ref.unit.skillUsesThisTurn = {}`）
  getUnit(board0.state, 'own', 'front', 0)!.skillUsesThisTurn = {};
  foeHits(board0.state, board0.ctx, board0.rng, 1);
  assert.equal(atkOf(board0.state), 5, '新回合可以再发动一次');
});

test('⭐ 不写 frequency ＝ 不限次（池内 200+ 张卡的既有行为，不得被动到）', () => {
  board0 = board(NONE);
  foeHits(board0.state, board0.ctx, board0.rng, 3);
  assert.equal(atkOf(board0.state), 6, '3 → 6（每次都发动）');
});

test('⭐ 条件不成立时不消耗「每局一次」的额度', () => {
  board0 = board(COND, false);
  foeHits(board0.state, board0.ctx, board0.rng, 2);
  assert.equal(atkOf(board0.state), 3, '条件不成立 → 不发动');

  // 补上标记单位 → 条件成立，此时才应该发动（额度没被前面白烧掉）
  setUnit(board0.state, 'own', 'front', 1, makeUnit(board0.ctx.cards.get(MARKER)!, 0, 9));
  foeHits(board0.state, board0.ctx, board0.rng, 1);
  assert.equal(atkOf(board0.state), 4, '条件成立后仍能发动');

  foeHits(board0.state, board0.ctx, board0.rng, 1);
  assert.equal(atkOf(board0.state), 4, '之后不再发动（once 已用掉）');
});

test('`after_attack` 上的 `once` 也生效（此前这条路径完全没有闸门）', () => {
  board0 = board(AFTER);
  const swing = () => {
    const u = getUnit(board0.state, 'own', 'front', 0)!;
    u.attackedThisTurn = 0;
    resolveAttack(board0.state, board0.ctx.cards, 'own', { row: 'front', col: 0 }, { kind: 'unit', row: 'front', col: 0 }, [], board0.rng, { toSide: 'enemy' });
  };
  swing();
  assert.equal(atkOf(board0.state), 4, '第一次攻击后发动');
  swing();
  assert.equal(atkOf(board0.state), 4, '第二次攻击不再发动（once）');
});
