/**
 * 诸葛瞻 × 诸葛尚「同赴」（ADR-149）—— **数据驱动**的真实卡测试
 *
 * ## 设计者要什么
 *
 * 「一个人上场时，如果另一个在手牌就**直接也上场**；不在手牌就**召唤到手牌**；
 *   同时上场两人**互相 +1/+1**」
 * —— 两张卡因此**必然凑齐**：抽到任一张就推进组合，不再依赖"同时抽到两张"。
 *
 * ## 引擎怎么表达
 *
 * · 一起上场：**新动作 `deploy_from_hand`**（把手牌里按 `card_id` 找到的那张**免费**搬上场，
 *   不消耗统率、不产生第二张牌；手牌里没有时装作没事发生）。
 * · 落到手牌：`discover` + `filter: {card_id}`（候选池恰好一张 → 必然到手；
 *   牌库没有时安静跳过）。
 * · 互相 +1/+1：各自一条**光环**，条件用 `exists` + `card_id` 认对方（**不需要 tag**，
 *   先例：关平「勇武」按 `card_id` 认关羽）。
 *
 * ⚠️ 两个效果**都不加"互斥条件"**（DSL 没有否定）：手牌有尚 → 他上场；牌库若是还有第二张 →
 *   再拿一张到手。这是有意的（两副本都带时收益更大），且链条自然终止（下面有测试锁住）。
 */
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

import { applyAction } from '../src/engine.ts';
import { recomputeAuras } from '../src/effects.ts';
import { killUnit } from '../src/mutate.ts';
import { effectiveAttack } from '../src/rules.ts';
import { getUnit, makeUnit, setUnit, statusStacks } from '../src/state.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { Action, CardDef } from '../src/types.ts';

const REAL: CardDef[] = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cards.json'), 'utf8'),
);
const real = (id: string): CardDef => {
  const c = REAL.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
};

const ZHAN = real('shu_zhugezhan');      // 4 费 2/5
const SHANG = real('shu_zhugeshang');    // 4 费 3/4
const FILLER = real('neutral_infantry');
for (const c of [ZHAN, SHANG, FILLER]) if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);

const play = (state: Parameters<typeof applyAction>[0], ctx: Parameters<typeof applyAction>[1],
  row: 'front' | 'back' = 'front', col = 0) =>
  applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row, col } as Action);

/* ============================================================
   1. 数据
   ============================================================ */

test('数据：两张都是 4 费，技能名与三条效果齐全', () => {
  assert.equal(ZHAN.name, '诸葛瞻');
  assert.equal(`${ZHAN.cost}费 ${ZHAN.attack}/${ZHAN.health}`, '4费 2/5');
  assert.equal(SHANG.name, '诸葛尚');
  assert.equal(`${SHANG.cost}费 ${SHANG.attack}/${SHANG.health}`, '4费 3/4');
  for (const c of [ZHAN, SHANG]) {
    const names = (c.skills ?? []).map((s) => s.name);
    assert.deepEqual(names, ['同赴', '同心', '死节'].length ? names : names);
    assert.ok(names.includes('同赴'), `${c.name} 应有「同赴」`);
    assert.ok(names.includes('同心'), `${c.name} 应有「同心」`);
  }
  assert.deepEqual((ZHAN.skills ?? []).map((s) => s.name), ['同赴', '同心', '绵竹']);
  assert.deepEqual((SHANG.skills ?? []).map((s) => s.name), ['同赴', '同心', '死节']);
  assert.equal(ZHAN.keywords?.length ?? 0, 0, '不带关键词（不引入新 tag）');
});

/* ============================================================
   2. 路径 A：另一张在**手牌** → 一起上场（免费）
   ============================================================ */

test('打出诸葛瞻（手牌有诸葛尚）→ 诸葛尚一起上场，且**不额外花统率**', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_zhugezhan', 'shu_zhugeshang'] });
  state.sides.own.command.cur = 6;
  const before = state.sides.own.command.cur;

  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  assert.ok(getUnit(r.state, 'own', 'front', 0), '诸葛瞻在场上');
  assert.ok(getUnit(r.state, 'own', 'front', 1), '诸葛尚被一起带上场（前军第 2 格）');
  assert.equal(getUnit(r.state, 'own', 'front', 1)!.name, '诸葛尚');
  assert.equal(r.state.sides.own.hand.length, 0, '两张都离开了手牌');
  assert.equal(r.state.sides.own.command.cur, before - ZHAN.cost!, '只为诸葛瞻付了 4 费');
});

test('反向也成立：打出诸葛尚 → 诸葛瞻一起上场', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_zhugeshang', 'shu_zhugezhan'] });
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(getUnit(r.state, 'own', 'front', 1)?.name, '诸葛瞻');
});

/* ============================================================
   3. 路径 B：另一张在**牌库** → 置入你的手牌
   ============================================================ */

test('打出诸葛瞻（手牌没有、牌库有诸葛尚）→ 诸葛尚进手牌', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_zhugezhan'] });
  state.sides.own.deck = ['shu_zhugeshang', 'neutral_infantry'];
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  const pend = r.state.pendingDiscover;
  assert.ok(pend, '应挂起"发现"');
  assert.deepEqual(pend!.candidates, ['shu_zhugeshang'], 'card_id 过滤后候选**只有**诸葛尚（必然是它）');

  const r2 = applyAction(r.state, ctx, { type: 'CHOOSE_DISCOVER', cardId: 'shu_zhugeshang' } as Action);
  assert.ok(r2.ok, r2.error ?? '');
  assert.equal(r2.state.sides.own.hand.length, 1, '诸葛尚到手');
  assert.equal(r2.state.sides.own.hand[0]!.card.id, 'shu_zhugeshang');
  assert.equal(r2.state.sides.own.deck.length, 1, '牌库里那张被取走（不是凭空复制）');
});

/* ============================================================
   4. 路径 C：两张都不在 → 两个效果各自空转，不卡流程
   ============================================================ */

test('两张都不在（手牌与牌库都没有）→ 安静跳过，不报错、不挂起', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_zhugezhan'] });
  state.sides.own.deck = ['neutral_infantry'];
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.pendingDiscover, undefined, '牌库里没有就不该挂起发现');
  assert.equal(r.state.sides.own.hand.length, 0);
  assert.equal(r.state.sides.own.deck.length, 1, '牌库没被动过');
});

test('两副本都在（手牌一张 + 牌库一张）→ 一张上场、一张到手，链条终止', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_zhugezhan', 'shu_zhugeshang'] });
  state.sides.own.deck = ['shu_zhugeshang'];
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(getUnit(r.state, 'own', 'front', 1)?.name, '诸葛尚', '手牌那张上场了');
  assert.ok(r.state.pendingDiscover, '牌库那张被"发现"到手上');
  const r2 = applyAction(r.state, ctx, { type: 'CHOOSE_DISCOVER', cardId: 'shu_zhugeshang' } as Action);
  assert.equal(r2.state.sides.own.hand[0]!.card.id, 'shu_zhugeshang');
  assert.equal(r2.state.pendingDiscover, undefined, '结算完就没有挂起状态了');
});

/* ============================================================
   5. 「同心」光环：父子同场互相 +1/+1
   ============================================================ */

test('父子同场 → 互相 +1/+1；一方离场 → 加成收回', () => {
  const { state, ctx } = scenario({});
  setUnit(state, 'own', 'front', 0, makeUnit(ZHAN, 0, 900));
  const zhan = getUnit(state, 'own', 'front', 0)!;
  const alone = `${effectiveAttack(state, 'own', 'front', 0)}/${zhan.maxHp}`;

  setUnit(state, 'own', 'front', 1, makeUnit(SHANG, 0, 901));
  recomputeAuras(state, ctx.cards as never, { int: () => 0 } as never, []);
  const bothZ = `${effectiveAttack(state, 'own', 'front', 0)}/${getUnit(state, 'own', 'front', 0)!.maxHp}`;
  const bothS = `${effectiveAttack(state, 'own', 'front', 1)}/${getUnit(state, 'own', 'front', 1)!.maxHp}`;

  state.sides.own.rows.front[1] = null;                    // 儿子离场
  recomputeAuras(state, ctx.cards as never, { int: () => 0 } as never, []);
  const back = `${effectiveAttack(state, 'own', 'front', 0)}/${getUnit(state, 'own', 'front', 0)!.maxHp}`;

  assert.equal(alone, '2/5', '单独：诸葛瞻 2/5');
  assert.equal(bothZ, '3/6', '同场：诸葛瞻 3/6');
  assert.equal(bothS, '4/5', '同场：诸葛尚 4/5');
  assert.equal(back, '2/5', '对方离场后回到 2/5（光环是借来的，不会白嫖）');
});

/* ============================================================
   6. 各自的两条亡语
   ============================================================ */

test('诸葛瞻亡语「绵竹」：场上与手牌里的人物各 +1 攻', () => {
  const { state, ctx } = scenario({ ownHand: ['neutral_infantry'] });
  setUnit(state, 'own', 'front', 1, makeUnit(FILLER, 0, 902));
  const zhan = makeUnit(ZHAN, 0, 903);
  zhan.hp = 0;
  setUnit(state, 'own', 'front', 0, zhan);
  killUnit(state, ctx.cards, { side: 'own', row: 'front', col: 0, unit: zhan } as never, [] as never);

  assert.equal(effectiveAttack(state, 'own', 'front', 1), FILLER.attack! + 1, '场上 +1 攻');
  const hm = (state.sides.own.hand[0]!.mods ?? [])
    .filter((m) => m.kind === 'attack').reduce((s, m) => s + (m.value ?? 0), 0);
  assert.equal(hm, 1, '手牌 +1 攻');
});

test('诸葛尚亡语「死节」：对击杀者造成 3 点伤害', () => {
  const { state, ctx } = scenario({});
  const killer = makeUnit(FILLER, 0, 904);
  // 步兵本身只有 1 血；`applyMods` 会按 baseMaxHp 重算上限并把血夹回去，所以三个字段都要抬
  killer.baseMaxHp = 20;
  killer.maxHp = 20;
  killer.hp = 20;
  setUnit(state, 'enemy', 'front', 0, killer);
  const shang = makeUnit(SHANG, 0, 905);
  shang.hp = 0;
  setUnit(state, 'own', 'front', 0, shang);
  killUnit(state, ctx.cards, { side: 'own', row: 'front', col: 0, unit: shang } as never,
    [] as never, { side: 'enemy', row: 'front', col: 0 });

  assert.equal(getUnit(state, 'enemy', 'front', 0)!.hp, 20 - 3, '击杀者吃 3 点');
});

/* ============================================================
   7. deploy_from_hand 的通用行为（新动作本身的边界）
   ============================================================ */

test('deploy_from_hand：手牌上的数值修正随牌进场（与 playCard 同口径）', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_zhugezhan', 'shu_zhugeshang'] });
  state.sides.own.hand[1]!.mods = [{ id: 'x', kind: 'attack', value: 2 }, { id: 'y', kind: 'health', value: 1 }];
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  const shang = getUnit(r.state, 'own', 'front', 1)!;
  assert.equal(effectiveAttack(r.state, 'own', 'front', 1), SHANG.attack! + 2 + 1, '3 + 手牌 +2 攻 + 同心 +1 = 6');
  assert.equal(shang.maxHp, SHANG.health! + 1 + 1, '4 + 手牌 +1 血 + 同心 +1 = 6');
});

test('deploy_from_hand：场上满了就**不动手牌**（宁可空转，也不吞牌）', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_zhugezhan', 'shu_zhugeshang'] });
  for (const row of ['front', 'back'] as const) {
    for (let c = 0; c < 8; c++) {
      if (state.sides.own.rows[row][c]) continue;
      setUnit(state, 'own', row, c, makeUnit(FILLER, 0, 910 + c));
    }
  }
  setUnit(state, 'own', 'front', 3, null);                 // 只留一个空格给诸葛瞻自己
  const r = play(state, ctx, 'front', 3);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.own.hand.length, 1, '诸葛尚还在手里（没被吞）');
  assert.equal(r.state.sides.own.hand[0]!.card.id, 'shu_zhugeshang');
});

test('deploy_from_hand 不消耗统率、也不产生新牌（对照 summon 的"凭空造一个"）', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_zhugezhan', 'shu_zhugeshang'] });
  state.sides.own.command.cur = 4;
  const r = play(state, ctx);
  assert.equal(r.state.sides.own.command.cur, 0, '4 费刚好花完，没有再扣');
  assert.equal(r.state.sides.own.hand.length + 2, 2, '手牌两张都没了（不是复制）');
  assert.equal(getUnit(r.state, 'own', 'front', 1)?.cardId, 'shu_zhugeshang');
});
