/**
 * 蜀国本轮改动（21 张）的**真实对局**验收（ADR-165~178）
 *
 * 不是单卡单测，而是让**两个 AI 真的打完整局**：双方卡组各放 1 张本轮改动的全部人物，
 * 用多个 seed 跑完整对局，验证：
 *   ① 不崩、能正常分出胜负（或到回合上限）；
 *   ② **回放完全一致**（同一 seed 重放全部动作 → 状态逐字节相同，非确定性会被抓出来）；
 *   ③ **覆盖率**：本轮改动的 21 张卡在对局里确实被 AI 打出过（不是"数据改了但没人用"）；
 *   ④ 新引擎路径在真实对局里真的跑到了：`DISCOVER_OPTIONS`（诸葛亮 5 选 3）、`CONTROL_TAKEN`（简雍夺控）。
 *
 * ⚠️ 覆盖率断言取 ≥15/21（不写死 21）—— 具体哪几张被抽到取决于 seed 与 AI 决策，
 * 写死会让这个测试变成"运气测试"。当前实测（seed 11/22/33）= 21/21。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { applyAction, startMatch } from '../src/engine.ts';
import { chooseAction } from '../src/ai/index.ts';
import { loadData } from '../src/loader.ts';
import { setupMatch } from '../src/setup.ts';
import type { Action, EngineContext, GameEvent, MatchState } from '../src/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f: string) => JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8'));
const unwrap = <T,>(v: unknown): T[] =>
  (Array.isArray(v) ? v as T[] : ((v as { cards?: T[]; heroes?: T[] }).cards ?? (v as { heroes?: T[] }).heroes ?? []));

const data = loadData(
  { cards: unwrap(read('cards.json')), heroes: unwrap(read('heroes.json')) },
  { own: 'shu_liubei', enemy: 'wei_caocao' },
);

/** 本轮改动的全部蜀国人物（ADR-165~178） */
const CHANGED = [
  'shu_dongjue', 'shu_liufeng', 'shu_chendao', 'shu_guanping', 'shu_madai', 'shu_zhoucang',
  'shu_guanxing', 'shu_shamoke', 'shu_weiyan', 'shu_zhangbao', 'shu_machao', 'shu_zhangfei',
  'shu_zhaoyun', 'shu_guanyu', 'shu_xiangchong', 'shu_huangquan', 'shu_jianyang', 'shu_mifang',
  'shu_pangtong', 'shu_zhugeliang', 'shu_huangzhong',
] as const;
const FILLERS = ['neutral_infantry', 'neutral_archer', 'neutral_shieldman'];
const decks = () => {
  const d: string[] = [...CHANGED];
  let i = 0;
  while (d.length < 30) d.push(FILLERS[i++ % FILLERS.length]!);
  return d;
};

type Run = { state: MatchState; log: Action[]; events: GameEvent[]; actions: number; rejected: number };

function playGame(seed: number): Run {
  const { state: base } = setupMatch({
    seed, cards: data.cards, lords: data.lords,
    decks: { own: decks(), enemy: decks() }, mulliganIndices: { own: [], enemy: [] },
  });
  const ctx: EngineContext = { cards: data.cards, lords: data.lords };
  let state: MatchState = startMatch(base, ctx).state;
  const log: Action[] = [];
  const events: GameEvent[] = [];
  let actions = 0;
  let rejected = 0;
  while (!state.winner && state.turn <= 40 && actions < 3000) {
    const a: Action = chooseAction(state, ctx) ?? { type: 'END_TURN' };
    const r = applyAction(state, ctx, a);
    if (!r.ok) {
      rejected += 1;
      state = applyAction(state, ctx, { type: 'END_TURN' }).state;
      continue;
    }
    events.push(...r.events);
    state = r.state;
    log.push(a);
    actions += 1;
  }
  return { state, log, events, actions, rejected };
}

function replay(run: Run, seed: number): MatchState {
  const { state: base } = setupMatch({
    seed, cards: data.cards, lords: data.lords,
    decks: { own: decks(), enemy: decks() }, mulliganIndices: { own: [], enemy: [] },
  });
  const ctx: EngineContext = { cards: data.cards, lords: data.lords };
  let state: MatchState = startMatch(base, ctx).state;
  for (const a of run.log) {
    const r = applyAction(state, ctx, a);
    if (r.ok) state = r.state;
  }
  return state;
}

const playedNames = new Set<string>();
const allEvents: GameEvent[] = [];

for (const seed of [11, 22, 33]) {
  test(`真实对局 seed=${seed}：能打完、回放一致、无异常`, () => {
    const run = playGame(seed);
    for (const e of run.events) {
      allEvents.push(e);
      if (e.type === 'CARD_PLAYED') playedNames.add(e.card.name);
    }
    assert.ok(run.actions > 20, `对局太短（${run.actions} 个动作），可能中途卡死`);
    assert.ok(run.state.winner !== null || run.state.turn > 40 || run.actions >= 3000,
      '对局既没分胜负、也没到回合上限 —— 疑似死循环');
    assert.equal(JSON.stringify(replay(run, seed)), JSON.stringify(run.state),
      '⭐ 回放必须逐字节一致（存在非确定性）');
  });
}

test('⭐ 覆盖率：本轮改动的 21 张卡在真实对局里都被打出过（≥15，实测 21）', () => {
  const hit = CHANGED.filter((id) => {
    const c = data.cards.get(id);
    return c && playedNames.has(c.name);
  });
  assert.ok(hit.length >= 15,
    `改动卡出镜太少：${hit.length}/21（${hit.map((id) => data.cards.get(id)!.name).join('、')}）`);
});

test('⭐ 新引擎路径在真实对局里跑到了：诸葛亮 5 选 3（DISCOVER_OPTIONS）＋ 简雍夺控（CONTROL_TAKEN）', () => {
  assert.ok(allEvents.some((e) => e.type === 'DISCOVER_OPTIONS'),
    '应至少出现一次"发现待选"事件（诸葛亮「隆中对」/其他发现类卡）');
  assert.ok(allEvents.some((e) => e.type === 'CONTROL_TAKEN'),
    '应至少出现一次"控制权转移"（简雍「同舆归命」）');
});
