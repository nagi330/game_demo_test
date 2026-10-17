/**
 * 简雍「同舆归命」／刘封「拥兵自重」（ADR-171 立、ADR-172/173 修订）
 *
 * ## 简雍 · 4 费 1/4 谋臣
 * 战吼：`take_control` 夺取一名费用 ≤3 的敌方人物 —— **完全归己**（控制权＋归属），
 * 行为**等同于"自己打出的卡"**（设计者 2026-10-17 裁定）。
 * ⭐ 典故 A 级（卷三十八）：「璋遂與雍同輿而載，出城歸命」。
 * ⚠️ 落这张卡时按铁律先修了 `take_control`（ADR-173）：光环重算 / 定点落位 / 重置入场回合 / 注释纠正。
 *
 * ## 刘封 · 4 费 3/4
 * 「拥兵自重」［`turn_end`］本回合没行动 → 永久 +2/+1。见 ADR-172。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { scenario, TEST_CARDS } from './fixtures.ts';
import { applyAction } from '../src/engine.ts';
import { allUnits, getUnit, makeUnit, setUnit } from '../src/state.ts';
import { canAttack } from '../src/rules.ts';
import { createRng } from '../src/rng.ts';
import type { CardDef } from '../src/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL: CardDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));
for (const c of ALL) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push({ ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] });
}

const SMALL: CardDef = {
  id: 'test_steal_small', name: '小将', faction: 'wei', type: 'general', cost: 3,
  attack: 2, health: 5, keywords: [], memo: '',
} as unknown as CardDef;
/** 合成光环卡：己方所有人物 +1 攻（用来验证"偷来之后光环要给己方"） */
const AURA: CardDef = {
  id: 'test_steal_aura', name: '聚众', faction: 'wei', type: 'general', cost: 3,
  attack: 1, health: 5, keywords: [], memo: '',
  skills: [{
    id: 'a', name: '聚众', kind: 'aura', text: '己方所有人物 +1 攻。',
    effects: [{ action: 'modify', attack: 1, target: { side: 'ally', filter: { type: 'character' }, count: 'all' } }],
  }],
} as unknown as CardDef;
const BIG: CardDef = {
  id: 'test_steal_big', name: '大将', faction: 'wei', type: 'general', cost: 5,
  attack: 3, health: 6, keywords: [], memo: '',
} as unknown as CardDef;
TEST_CARDS.push(SMALL, AURA, BIG);

type S = ReturnType<typeof scenario>['state'];
type C = ReturnType<typeof scenario>['ctx'];
type B = { state: S; ctx: C; rng: ReturnType<typeof createRng> };

const onField = (state: S, side: 'own' | 'enemy', cardId: string) =>
  allUnits(state, side).find((r) => r.unit.cardId === cardId) ?? null;

function board(enemy: CardDef): B {
  const { state, ctx } = scenario({ ownHand: ['shu_jianyang'] });
  for (const c of [SMALL, AURA, BIG, enemy]) ctx.cards.set(c.id, c);
  setUnit(state, 'enemy', 'front', 0, makeUnit(enemy, 0, 99));
  return { state, ctx, rng: createRng(7) };
}

const playJianyang = (b: B, target = true) => applyAction(b.state, b.ctx, {
  type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 7,
  ...(target ? { target: { side: 'enemy' as const, row: 'front' as const, col: 0 } } : {}),
});

/* ============================================================
   简雍「同舆归命」
   ============================================================ */

test('简雍 形态：4 费 1/4 谋臣；战吼 `take_control` 偷费用 ≤3 的敌方人物；技能 id/note/flavor 齐备', () => {
  const c = ALL.find((x) => x.id === 'shu_jianyang')!;
  assert.equal(c.type, 'strategist');
  assert.equal(c.cost, 4); assert.equal(c.attack, 1); assert.equal(c.health, 4);
  const sk = c.skills?.[0];
  assert.ok(sk?.id, '⚠️ 旧卡技能 id 是空串');
  assert.equal(sk?.trigger, 'on_play');
  assert.equal(sk?.name, '同舆归命');
  const ef = sk?.effects?.[0];
  assert.equal(ef?.action, 'take_control');
  assert.equal(ef?.target?.side, 'enemy');
  assert.equal(ef?.target?.filter?.type, 'character');
  assert.equal(ef?.target?.filter?.cost_max, 3);
  const withNote = c as CardDef & { note?: string };
  assert.ok((withNote.note ?? '').length > 500);
  assert.ok(c.flavor, 'flavor 用 A 级原文');
});

test('⭐ 行为：偷到己方场上 —— 敌方那边消失、己方这边出现，归属变成己方', () => {
  const b = board(SMALL);
  const r = playJianyang(b);
  assert.ok(r.ok, `简雍应能打出：${r.error}`);
  assert.equal(onField(r.state, 'enemy', SMALL.id), null, '敌方场上已没有它');
  const stolen = onField(r.state, 'own', SMALL.id);
  assert.ok(stolen, '应在己方场上');
  assert.ok(r.events.some((e) => e.type === 'CONTROL_TAKEN'), '应派发 CONTROL_TAKEN 事件');
});

test('⭐ 完全归属＝"等同于自己打出的卡"：当回合**不能攻击**（入场回合被重置）', () => {
  const b = board(SMALL);
  const r = playJianyang(b);
  assert.ok(r.ok);
  const stolen = onField(r.state, 'own', SMALL.id)!;
  const gate = canAttack(r.state, 'own', stolen.row, stolen.col);
  assert.equal(gate.ok, false, '刚归己方（且无先攻）→ 当回合不能攻击，与"自己打出的卡"一致');
});

test('目标受限：费用 >3 的敌方人物不能选（无合法目标时平稳空转）', () => {
  const b = board(BIG);
  const r = playJianyang(b, false);
  assert.ok(r.ok, `没有合法目标时也应能打出：${r.error}`);
  assert.ok(onField(r.state, 'enemy', BIG.id), '5 费的大将偷不动');
  assert.equal(onField(r.state, 'own', BIG.id), null);
});

test('⭐ 偷来之后光环**重新归属**（转移后立刻重算）', () => {
  const b = board(AURA);
  // 己方也放一个白板，用来看"己方是否吃到偷来的光环"
  const mate = makeUnit(SMALL, 0, 55);
  setUnit(b.state, 'own', 'front', 0, mate);
  const beforeAtk = getUnit(b.state, 'own', 'front', 0)!.atk;

  const r = playJianyang(b);
  assert.ok(r.ok, `简雍应能打出：${r.error}`);
  assert.ok(onField(r.state, 'own', AURA.id), '光环单位已归己方');
  const afterAtk = getUnit(r.state, 'own', 'front', 0)!.atk;
  assert.equal(afterAtk, beforeAtk + 1, '⚠️ 偷来的光环应当作用于**己方**单位（转移后必须重算光环）');
});

test('己方满场：偷不到也不崩（等同于"打不出卡"）', () => {
  const b = board(SMALL);
  // 己方摆满 7 个白板，简雍打进第 8 格 → 场上没有空位再放偷来的人
  for (let c = 0; c < 7; c++) setUnit(b.state, 'own', 'front', c, makeUnit(SMALL, 0, 100 + c));
  const r = playJianyang(b);
  assert.ok(r.ok, `满场时也应能打出简雍：${r.error}`);
  assert.ok(onField(r.state, 'enemy', SMALL.id), '没有空位 → 偷不到，敌方单位还在');
});

/* ============================================================
   刘封「拥兵自重」
   ============================================================ */

type LF = { state: S; ctx: C; rng: ReturnType<typeof createRng> };

function lfBoard(): LF {
  const { state, ctx } = scenario({ own: { front: ['shu_liufeng'] } });
  ctx.cards.set(SMALL.id, SMALL);
  setUnit(state, 'enemy', 'front', 0, makeUnit(SMALL, 0, 99));
  return { state, ctx, rng: createRng(3) };
}

const endTurn = (b: LF, state: S = b.state) => applyAction(state, b.ctx, { type: 'END_TURN' });

test('刘封 形态：4 费 3/4；回合结束技 —— 本回合没行动就永久 +2/+1', () => {
  const c = ALL.find((x) => x.id === 'shu_liufeng')!;
  assert.equal(c.cost, 4); assert.equal(c.attack, 3); assert.equal(c.health, 4);
  assert.deepEqual(c.keywords ?? [], [], '没有先攻（打出当回合攻击不了 —— 那一回合结束就会成长一次）');
  const sk = c.skills?.[0];
  assert.equal(sk?.trigger, 'turn_end');
  assert.equal(sk?.name, '拥兵自重');
  const ef = sk?.effects?.[0];
  assert.equal(ef?.action, 'modify');
  assert.equal(ef?.attack, 2); assert.equal(ef?.health, 1);
  assert.deepEqual(ef?.condition, { acted_this_turn: false });
});

test('⭐ 刘封 没行动：回合结束 → 永久 +2/+1（3/4 → 5/5）', () => {
  const b = lfBoard();
  const r = endTurn(b);
  assert.ok(r.ok, `结束回合应成功：${r.error}`);
  const lf = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(lf.atk, 5);
  assert.equal(lf.maxHp, 5);
});

test('⭐ 刘封 行动过（攻击过）：回合结束**不成长**', () => {
  const b = lfBoard();
  const r1 = applyAction(b.state, b.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.ok(r1.ok, `攻击应成功：${r1.error}`);
  const r2 = endTurn(b, r1.state);
  assert.ok(r2.ok);
  assert.equal(getUnit(r2.state, 'own', 'front', 0)!.atk, 3, '攻击过 → 本回合不成长');
});

test('⭐ 刘封 累积：连续两个"不动"回合 → +4/+2（3/4 → 7/6）', () => {
  const b = lfBoard();
  const r1 = endTurn(b);
  const r2 = endTurn(b, r1.state);
  const r3 = endTurn(b, r2.state);
  assert.ok(r3.ok);
  const lf = getUnit(r3.state, 'own', 'front', 0)!;
  assert.equal(lf.atk, 7, '3 → 7');
  assert.equal(lf.maxHp, 6, '4 → 6');
});

test('刘封 打出当回合：没有先攻、攻击不了 → 回合结束立刻成长一次', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_liufeng'] });
  ctx.cards.set(SMALL.id, SMALL);
  setUnit(state, 'enemy', 'front', 0, makeUnit(SMALL, 0, 99));
  const r1 = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1 });
  assert.ok(r1.ok, `刘封应能打出：${r1.error}`);
  const r2 = applyAction(r1.state, ctx, { type: 'END_TURN' });
  assert.ok(r2.ok);
  assert.equal(getUnit(r2.state, 'own', 'front', 1)!.atk, 5, '打出当回合就成长（3 → 5）');
});
