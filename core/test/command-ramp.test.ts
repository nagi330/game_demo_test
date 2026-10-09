/**
 * `gain_command` 的两种模式（ADR-139，蒋琬「足食」）
 *
 * ## 问题
 *
 * 缺省的 `gain_command` 只加**本回合可用统率** `cur`，而且**夹在本回合上限内**：
 *
 *     cmd.cur = Math.min(cmd.max, cmd.cur + value)
 *
 * 而回合开始的第一件事就是把 `cur` **回满到上限**（`startTurn`）。两者叠加的结果是：
 * **「回合开始时统率 +1」在缺省模式下收益恒为 0** —— 加的那 1 点立刻被回满覆盖。
 * 所以"每回合 +1 统率"这类成长型后勤技**必须**用 `permanent: true`（抬 `max`）。
 *
 * ## 语义
 *
 * | 写法 | 效果 | 用途 |
 * |---|---|---|
 * | `gain_command` | 只 `cur`，夹在 `max` 内，回合末清零 | 黄皓「谮言」−1、一次性爆发费用 |
 * | `gain_command` + `permanent: true` | `max` 与 `cur` 一起涨，封顶 `COMMAND.MAX`（10） | 蒋琬「足食」、永久 ramp |
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { runTriggerSkills } from '../src/effects.ts';
import { createRng } from '../src/rng.ts';
import { makeUnit, setUnit } from '../src/state.ts';
import { COMMAND } from '../src/constants.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { CardDef, GameEvent } from '../src/types.ts';

/* ---------- 夹具 ---------- */

const mkRamp = (id: string, permanent: boolean, value = 1): CardDef => ({
  id, name: permanent ? '足食' : '临时', faction: 'shu', type: 'strategist',
  cost: 2, attack: 1, health: 3, keywords: [], gender: 'male', memo: '测试',
  skills: [{
    id: `${id}_sk`, name: permanent ? '足食' : '临时统率', kind: 'trigger', trigger: 'turn_start',
    effects: [{ action: 'gain_command', value, ...(permanent ? { permanent: true } : {}) }],
  }],
} as CardDef);

const RAMP = mkRamp('test_cmd_ramp', true);
const TEMP = mkRamp('test_cmd_temp', false);
for (const c of [RAMP, TEMP]) if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);

/** 摆一个带 ramp 技的单位，返回 state/ctx */
function board(card: CardDef = RAMP) {
  const { state, ctx } = scenario({});
  setUnit(state, 'own', 'front', 0, makeUnit(card, 0, 931));
  return { state, ctx };
}

const fireTurnStart = (state: ReturnType<typeof board>['state'], ctx: ReturnType<typeof board>['ctx']) => {
  const events: GameEvent[] = [];
  runTriggerSkills(state, ctx.cards, 'own', 'turn_start', createRng(1), events);
  return events;
};

/* ---------- 用例 ---------- */

test('缺省模式：只加本回合 cur，且**夹在 max 以内**', () => {
  const { state, ctx } = board(TEMP);
  state.sides.own.command = { cur: 3, max: 5 };
  const events = fireTurnStart(state, ctx);
  assert.equal(state.sides.own.command.cur, 4, '3 + 1 = 4');
  assert.equal(state.sides.own.command.max, 5, '缺省模式不动上限');
  assert.equal(events.some((e) => e.type === 'COMMAND_MAX_CHANGED'), false, '不该发"上限改变"事件');
});

test('缺省模式在 cur 已满时（＝回合开始那一刻）**收益为 0** —— 这正是要修的坑', () => {
  const { state, ctx } = board(TEMP);
  state.sides.own.command = { cur: 5, max: 5 };   // 回合开始刚回满
  fireTurnStart(state, ctx);
  assert.equal(state.sides.own.command.cur, 5, '5 + 1 被夹回 5：加了等于没加');
});

test('permanent: true → max 与 cur 一起 +1，并发 COMMAND_MAX_CHANGED', () => {
  const { state, ctx } = board(RAMP);
  state.sides.own.command = { cur: 5, max: 5 };
  const events = fireTurnStart(state, ctx);
  assert.equal(state.sides.own.command.max, 6, '上限永久 +1');
  assert.equal(state.sides.own.command.cur, 6, '本回合可用值同步 +1（不然这回合白涨）');
  const ev = events.find((e) => e.type === 'COMMAND_MAX_CHANGED');
  assert.ok(ev && ev.type === 'COMMAND_MAX_CHANGED' && ev.delta === 1 && ev.max === 6,
    '事件应带新上限与实际增量（客户端显示"统率上限 +1"）');
});

test('permanent: true 封顶 COMMAND.MAX，超出部分不生效', () => {
  const { state, ctx } = board(RAMP);
  state.sides.own.command = { cur: COMMAND.MAX, max: COMMAND.MAX };
  const events = fireTurnStart(state, ctx);
  assert.equal(state.sides.own.command.max, COMMAND.MAX, `上限不得超过 ${COMMAND.MAX}`);
  const ev = events.find((e) => e.type === 'COMMAND_MAX_CHANGED');
  assert.ok(ev && ev.type === 'COMMAND_MAX_CHANGED' && ev.delta === 0,
    '已经封顶时 delta = 0（用来判断"这一涨有没有实际发生"）');
});

test('permanent + value 可为负（对称写法），但 max 不会低于 0', () => {
  const down = mkRamp('test_cmd_down', true, -2);
  if (!TEST_CARDS.some((x) => x.id === down.id)) TEST_CARDS.push(down);
  const { state, ctx } = board(down);
  state.sides.own.command = { cur: 1, max: 1 };
  fireTurnStart(state, ctx);
  assert.equal(state.sides.own.command.max, 0, 'max 夹在 0（不为负）');
  assert.equal(state.sides.own.command.cur, 0, 'cur 跟着降到 0');
});

test('蒋琬式成长：连续 3 个回合开始各 +1 → 上限 5 → 8', () => {
  const { state, ctx } = board(RAMP);
  state.sides.own.command = { cur: 5, max: 5 };
  for (let i = 1; i <= 3; i++) {
    fireTurnStart(state, ctx);
    assert.equal(state.sides.own.command.max, 5 + i, `第 ${i} 个回合上限应为 ${5 + i}`);
  }
});
