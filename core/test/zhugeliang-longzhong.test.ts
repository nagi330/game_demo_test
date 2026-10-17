/**
 * 诸葛亮（ADR-178）：8 费 1/8 传奇
 *  ·「隆中对」战吼：从**公共计策池**随机发现 5 张 → 选 **3** 张入手，其余 **2** 张放入牌库
 *  ·「神机妙算」被动：**诸葛亮在场时**，**己方**每释放一张计策 → 对随机一个敌方人物造成
 *    **等同于该计策费用**的伤害（设计者裁定：**只算己方**）
 *
 * 为此本轮给引擎加了三样东西（ADR-178，先改 13 文档再改代码）：
 *  ① `discover` 的 `pool`（池来源）／`picks`（多选）／`rest: 'deck'`（余牌进牌库）；
 *  ② `value_from_played: 'cost'`（取"刚打出的那张牌"的费用）＋ `EffectContext.playedCard`；
 *  ③ "只算己方"用**现成的**技能级 `same_side`，卡牌类型用技能级 `target.filter.type` —— **无需新条件**。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { scenario, TEST_CARDS } from './fixtures.ts';
import { applyAction } from '../src/engine.ts';
import { runCardPlayedTriggers } from '../src/effects.ts';
import { getUnit, makeUnit, setUnit } from '../src/state.ts';
import { createRng } from '../src/rng.ts';
import type { CardDef, GameEvent } from '../src/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL: CardDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));
for (const c of ALL) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push({ ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] });
}
const ZL = ALL.find((c) => c.id === 'shu_zhugeliang')!;
const TUNTIAN = ALL.find((c) => c.id === 'tactic_tuntian')!;

const FOE: CardDef = {
  id: 'test_zl_foe', name: '靶子', faction: 'wei', type: 'general', cost: 2,
  attack: 1, health: 20, keywords: [], memo: '',
} as unknown as CardDef;
TEST_CARDS.push(FOE);

type S = ReturnType<typeof scenario>['state'];
type C = ReturnType<typeof scenario>['ctx'];

test('形态：8 费 1/8 传奇；「隆中对」5 选 3 余 2 进牌库；「神机妙算」same_side＋取刚打出牌的费用', () => {
  assert.equal(`${ZL.cost}费 ${ZL.attack}/${ZL.health}`, '8费 1/8');
  assert.equal(ZL.rarity, 'legendary');

  const [dsc, passive] = ZL.skills!;
  assert.equal(dsc!.name, '隆中对');
  assert.equal(dsc!.trigger, 'on_play');
  const ef = dsc!.effects![0]!;
  assert.equal(ef.action, 'discover');
  assert.equal(ef.count, 5, '展示 5 张');
  assert.equal(ef.picks, 3, '选 3 张');
  assert.equal(ef.rest, 'deck', '其余 2 张放入牌库');
  assert.equal(ef.pool?.type, 'tactic', '候选来自公共计策池');
  assert.equal(ef.discover_to, 'hand');

  assert.equal(passive!.name, '神机妙算');
  assert.equal(passive!.trigger, 'on_card_played');
  assert.equal(passive!.same_side, true, '⭐ 只算己方释放的计策');
  assert.equal(passive!.target?.filter?.type, 'tactic', '只对计策牌触发');
  assert.equal(passive!.effects![0]!.value_from_played, 'cost', '⭐ 伤害 ＝ 该计策的费用');
});

test('⭐「隆中对」：5 选 3，其余 2 张进牌库（牌库来源/池来源都正确）', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_zhugeliang'], ownCommand: 10 });
  const deckBefore = state.sides.own.deck.length;

  const r1 = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r1.ok, `诸葛亮应能打出：${r1.error}`);
  const pending = r1.state.pendingDiscover!;
  assert.ok(pending, '应挂起"发现"等待选择');
  assert.equal(pending.candidates.length, 5, '展示 5 张');
  assert.equal(pending.picks, 3, '要选 3 张');
  assert.equal(pending.fromPool, true, '候选来自公共池');

  // 连选 3 张
  let st = r1.state;
  const chosen: string[] = [];
  for (let i = 0; i < 3; i++) {
    const pick = st.pendingDiscover!.candidates[0]!;
    chosen.push(pick);
    const r = applyAction(st, ctx, { type: 'CHOOSE_DISCOVER', cardId: pick });
    assert.ok(r.ok, `第 ${i + 1} 选应成功：${r.error}`);
    st = r.state;
  }
  assert.equal(st.pendingDiscover, undefined, '选满 3 张后不再挂起');
  for (const id of chosen) {
    assert.ok(st.sides.own.hand.some((h) => h.card.id === id), `选中的 ${id} 应在手牌里`);
  }
  // 其余 2 张进牌库（池来源 ⇒ 牌库里新增 2 张）
  assert.equal(st.sides.own.deck.length, deckBefore + 2, '另外 2 张进牌库');
});

test('⭐「神机妙算」：己方打出一张 3 费计策 → 随机一个敌人吃 3 点（＝该计策费用）', () => {
  const { state, ctx } = scenario({
    own: { front: ['shu_zhugeliang'] }, ownHand: ['tactic_tuntian'], ownCommand: 10,
  });
  ctx.cards.set(FOE.id, FOE);
  setUnit(state, 'enemy', 'front', 0, makeUnit(FOE, 0, 71));

  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1 });
  assert.ok(r.ok, `屯田应能打出：${r.error}`);
  const foe = getUnit(r.state, 'enemy', 'front', 0)!;
  assert.equal(20 - foe.hp, 3, '3 费计策 → 3 点伤害（value_from_played: cost）');
  assert.ok(r.events.some((e) => e.type === 'SKILL_TRIGGERED'
    && (e as { skillName?: string }).skillName === '神机妙算'), '应播报技能触发');
});

test('⭐「神机妙算」只算**己方**：敌方打出计策不触发', () => {
  const { state, ctx } = scenario({ own: { front: ['shu_zhugeliang'] } });
  ctx.cards.set(FOE.id, FOE);
  setUnit(state, 'enemy', 'front', 0, makeUnit(FOE, 0, 72));

  const evs: GameEvent[] = [];
  // playedSide = 'enemy' → same_side 应把诸葛亮挡掉
  runCardPlayedTriggers(state, ctx.cards, TUNTIAN, createRng(2), evs, 'enemy');
  assert.equal(getUnit(state, 'enemy', 'front', 0)!.hp, 20, '敌方放的计策不该触发诸葛亮的被动');
  assert.ok(!evs.some((e) => e.type === 'SKILL_TRIGGERED'
    && (e as { skillName?: string }).skillName === '神机妙算'), '不应播报');
});

test('「神机妙算」：己方打出**非计策**牌不触发', () => {
  const { state, ctx } = scenario({ own: { front: ['shu_zhugeliang'] } });
  ctx.cards.set(FOE.id, FOE);
  setUnit(state, 'enemy', 'front', 0, makeUnit(FOE, 0, 73));

  const evs: GameEvent[] = [];
  const infantry = ALL.find((c) => c.id === 'neutral_infantry')!;
  runCardPlayedTriggers(state, ctx.cards, infantry, createRng(3), evs, 'own');
  assert.equal(getUnit(state, 'enemy', 'front', 0)!.hp, 20, '非计策牌不触发');
});
