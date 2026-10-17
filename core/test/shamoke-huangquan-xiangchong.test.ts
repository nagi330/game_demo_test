/**
 * 沙摩柯 / 黄权 / 向宠（ADR-176，设计者 2026-10-17 定稿三连）
 *
 * ## 沙摩柯 · 4 费 3/4 武将（man_zu）—— 战吼**抉择**
 *  ①「弯弓射颅」对一名敌方**武将** 3 点伤害（演义 83 回射甘宁 = **C**）
 *  ②「骨朵冲阵」获得「先攻」＋永久 +1/+1（**永不卡手**的保底分支）
 *  ⚠️ 先攻用**状态**形式：`hasTrait` 会把状态并入特性 ⇒ 当回合即可攻击。
 *
 * ## 黄权 · 2 费 1/3 谋臣 —— 光环〈闭境待清〉
 *  敌方**手牌中的所有人**物卡统率 +1（**离场即失效**）。
 *  ⭐ 史料 A：「可但**閉境**，以待河清」＋「權**閉城堅守**」。
 *
 * ## 向宠 · 2 费 1/4 谋臣（架盾）—— 光环〈行阵和睦〉
 *  与向宠**相邻**的其他友方人物生命上限 +1（同列前后排 ＋ 左右相邻列）。
 *  ⭐ 史料 A：「秭歸之敗，**寵營特完**」＋《出师表》「必能使**行陣和睦**，優劣得所」。
 *  ⚠️ 必加 `exclude_source`：否则同列判定会把他自己算进去（1/5）。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { scenario, TEST_CARDS } from './fixtures.ts';
import { applyAction } from '../src/engine.ts';
import { getUnit, makeUnit, setUnit } from '../src/state.ts';
import { dealDamage, drawCard, unitRef } from '../src/mutate.ts';
import { canAttack } from '../src/rules.ts';
import { createRng } from '../src/rng.ts';
import type { CardDef } from '../src/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL: CardDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));
for (const c of ALL) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push({ ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] });
}

const GEN: CardDef = {
  id: 'test_three_gen', name: '敌将', faction: 'wei', type: 'general', cost: 3,
  attack: 2, health: 8, keywords: [], memo: '',
} as unknown as CardDef;
const MATE: CardDef = {
  id: 'test_three_mate', name: '友军', faction: 'shu', type: 'general', cost: 2,
  attack: 2, health: 5, keywords: [], memo: '',
} as unknown as CardDef;
TEST_CARDS.push(GEN, MATE);

type S = ReturnType<typeof scenario>['state'];
type C = ReturnType<typeof scenario>['ctx'];
type B = { state: S; ctx: C; rng: ReturnType<typeof createRng> };

const costMods = (state: S, side: 'own' | 'enemy') =>
  state.sides[side].hand.map((h) => h.mods.filter((m) => m.kind === 'cost').reduce((n, m) => n + (m.value ?? 0), 0));

/* ============================ 沙摩柯 ============================ */

test('沙摩柯 形态：4 费 3/4、保留 man_zu；战吼是**抉择**，两分支各就位', () => {
  const c = ALL.find((x) => x.id === 'shu_shamoke')!;
  assert.equal(c.cost, 4); assert.equal(c.attack, 3); assert.equal(c.health, 4);
  assert.deepEqual(c.tags ?? ['man_zu'] as never, ['man_zu'] as never, '仍能吃孟获「蛮王」的蛮族加成');
  const sk = c.skills![0]!;
  assert.equal(sk.trigger, 'on_play');
  assert.equal(sk.modes?.length, 2, '两个分支');
  const [a, b] = sk.modes!;
  assert.equal(a!.effects![0]!.action, 'damage');
  assert.equal(a!.effects![0]!.target?.filter?.type, 'general', '分支①只打**武将**');
  assert.equal(a!.effects![0]!.value, 3);
  assert.equal(b!.effects![0]!.action, 'apply_status');
  assert.equal((b!.effects![0] as { status?: string }).status, 'xian_gong_status');
  assert.equal(b!.effects![1]!.action, 'modify');
  assert.equal(b!.effects![1]!.attack, 1); assert.equal(b!.effects![1]!.health, 1);
});

test('⭐ 沙摩柯 分支①：对敌方武将 3 点伤害', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_shamoke'] });
  ctx.cards.set(GEN.id, GEN);
  setUnit(state, 'enemy', 'front', 0, makeUnit(GEN, 0, 31));
  const r = applyAction(state, ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0, modeIndex: 0,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.ok(r.ok, `应能打出：${r.error}`);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 5, '8 → 5（3 点伤害）');
});

test('⭐ 沙摩柯 分支②：变 4/5 先攻，且**当回合就能攻击**', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_shamoke'] });
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0, modeIndex: 1 });
  assert.ok(r.ok, `应能打出：${r.error}`);
  const u = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(u.atk, 4, '3 → 4');
  assert.equal(u.maxHp, 5, '4 → 5');
  assert.ok(u.statuses.xian_gong_status, '获得先攻状态');
  const gate = canAttack(r.state, 'own', 'front', 0);
  assert.equal(gate.ok, true, '⭐ 先攻（状态形态）→ 当回合即可攻击');
});

test('沙摩柯 分支①：敌方没有武将时无合法目标，平稳空转', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_shamoke'] });
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0, modeIndex: 0 });
  assert.ok(r.ok, `应能打出：${r.error}`);
  assert.ok(getUnit(r.state, 'own', 'front', 0), '沙摩柯正常上场');
});

/* ============================ 黄权 ============================ */

test('黄权 形态：2 费 1/3 谋臣；光环给**敌方手牌中的人物卡** +1 统率', () => {
  const c = ALL.find((x) => x.id === 'shu_huangquan')!;
  assert.equal(c.type, 'strategist');
  assert.equal(c.cost, 2); assert.equal(c.attack, 1); assert.equal(c.health, 3);
  const sk = c.skills![0]!;
  assert.equal(sk.kind, 'aura');
  const ef = sk.effects![0]!;
  assert.equal(ef.action, 'cost_modifier');
  assert.equal(ef.value, 1);
  assert.equal(ef.target?.side, 'enemy');
  assert.equal(ef.target?.zone, 'hand');
  assert.equal(ef.target?.filter?.type, 'character');
});

test('⭐ 黄权：敌方手牌的**人物卡** +1，**战法卡不受影响**', () => {
  const { state, ctx } = scenario({
    ownHand: ['shu_huangquan'],
    enemyHand: ['neutral_infantry', 'neutral_archer', 'tactic_huogong'],
  });
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r.ok, `应能打出：${r.error}`);
  const mods = r.state.sides.enemy.hand.map((h) => ({
    type: h.card.type,
    delta: h.mods.filter((m) => m.kind === 'cost').reduce((n, m) => n + (m.value ?? 0), 0),
  }));
  for (const m of mods) {
    if (m.type === 'tactic') assert.equal(m.delta, 0, '战法卡不涨价');
    else assert.equal(m.delta, 1, `${m.type} 人物卡应 +1`);
  }
});

test('⭐ 黄权：**离场即失效**（阵亡后光环修正被清除）', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_huangquan'], enemyHand: ['neutral_infantry'] });
  const r1 = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r1.ok);
  assert.deepEqual(costMods(r1.state, 'enemy'), [1], '在场时 +1');

  const evs: import('../src/types.ts').GameEvent[] = [];
  dealDamage(r1.state, ctx.cards, unitRef('own', 'front', 0), 99, evs, '测试', 0);
  assert.equal(getUnit(r1.state, 'own', 'front', 0), null);
  assert.deepEqual(costMods(r1.state, 'enemy'), [0], '离场后修正消失');
});

test('⭐ 黄权：对手**抽到**的人物卡也立刻 +1（drawCard 会触发光环重算）', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_huangquan'], enemyHand: ['neutral_infantry'] });
  const r1 = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r1.ok);
  assert.deepEqual(costMods(r1.state, 'enemy'), [1]);

  r1.state.sides.enemy.deck.push('neutral_archer');
  drawCard(r1.state, ctx.cards, 'enemy', []);
  assert.deepEqual(costMods(r1.state, 'enemy'), [1, 1], '新抽到的人物卡立刻吃到 +1');
});

/* ============================ 向宠 ============================ */

test('向宠 形态：2 费 1/4 谋臣、卡面关键词「架盾」；光环是**相邻**＋**排除自己**', () => {
  const c = ALL.find((x) => x.id === 'shu_xiangchong')!;
  assert.equal(c.type, 'strategist');
  assert.equal(c.cost, 2); assert.equal(c.attack, 1); assert.equal(c.health, 4);
  assert.deepEqual(c.keywords, ['jia_dun']);
  const ef = c.skills![0]!.effects![0]!;
  assert.equal(ef.action, 'modify');
  assert.equal(ef.health, 1);
  const f = ef.target?.filter!;
  assert.equal(f.type, 'character');
  assert.equal(f.adjacent_to, 'self');
  assert.equal(f.exclude_source, true, '⚠️ 否则同列判定会把向宠自己算进去');
  assert.equal(ef.target?.count, 'all');
});

test('⭐ 向宠：左右相邻列与同列后排 +1 生命；远处与**自己**不受影响', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_xiangchong'] });
  ctx.cards.set(MATE.id, MATE);
  // ⚠️ 棋盘是 **8 列 × 1 排**（BOARD.ROWS = ['front']）：col1 相邻、col4 隔两列不相邻
  setUnit(state, 'own', 'front', 1, makeUnit(MATE, 0, 41));
  setUnit(state, 'own', 'front', 3, makeUnit(MATE, 0, 43));
  setUnit(state, 'own', 'front', 4, makeUnit(MATE, 0, 42));

  // 向宠打进 front.col2 —— 上场即触发光环重算
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 2 });
  assert.ok(r.ok, `向宠应能打出：${r.error}`);
  const self = getUnit(r.state, 'own', 'front', 2)!;
  assert.equal(self.maxHp, 4, '⚠️ 向宠自己不受光环影响（不是 1/5）');
  assert.equal(getUnit(r.state, 'own', 'front', 1)!.maxHp, 6, '左邻 5 → 6');
  assert.equal(getUnit(r.state, 'own', 'front', 3)!.maxHp, 6, '右邻 5 → 6');
  assert.equal(getUnit(r.state, 'own', 'front', 4)!.maxHp, 5, '隔两列 → 不变');
});
