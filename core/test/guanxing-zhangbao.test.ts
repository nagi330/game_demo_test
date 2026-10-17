/**
 * 关兴／张苞「小关张」互拉二人组（ADR-169 · 设计者 2026-10-17 定稿第二版）
 *
 * ## 这版的设计内核：**把"会死"变成收益**
 *
 * 关兴 **7 费 5/5 先攻**：先攻让他当回合就构成威胁（对手必须处理），
 * 而"处理他"恰恰是你想要的 —— **亡语**把张苞拉出来。
 * 张苞 **8 费 5/5 架盾**：**战吼**落地即兑现（披坚＋拉关兴），**不可打断**、永不空放。
 * 两人形成**一死一生**的循环。
 *
 * ## 与上一版的关键差异（都写进测试了）
 *
 * | | 上一版 | 这一版 |
 * |---|---|---|
 * | 关兴触发 | `after_attack`（打完还活着）→ 可被**一击必杀/不打他**打断 | **亡语**（死了就触发）→ **不可打断** |
 * | 张苞触发 | `on_damaged`（受伤并存活）→ 可被一击必杀掐断 | **战吼**（落地即给）→ **不可打断** |
 * | 关兴先攻 | 无（怕"下场即拉人"） | **有**（先攻只让他成为当回合威胁，拉人仍要靠死 → 互动窗口还在） |
 *
 * ## 引擎
 *
 * 全部现成：`on_death`／`on_play`／`deploy_from_hand`（ADR-149）／`apply_status sheng_dun_status`（披坚）
 * ／`discover`（`value: -2` → 入手减 2 费，`effects.ts` → `engine.ts` 的 `costModifier`）。
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
import { dealDamage, unitRef } from '../src/mutate.ts';
import { createRng } from '../src/rng.ts';
import type { CardDef } from '../src/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL: CardDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));
for (const c of ALL) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push({ ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] });
}

const DUMMY: CardDef = {
  id: 'test_pair_dummy', name: '木桩', faction: 'wei', type: 'troop', cost: 1,
  attack: 1, health: 40, keywords: [], memo: '',
} as unknown as CardDef;
TEST_CARDS.push(DUMMY);

type S = ReturnType<typeof scenario>['state'];
type C = ReturnType<typeof scenario>['ctx'];
type B = { state: S; ctx: C; rng: ReturnType<typeof createRng> };

const onField = (state: S, side: 'own' | 'enemy', cardId: string) =>
  allUnits(state, side).find((r) => r.unit.cardId === cardId) ?? null;
const handCard = (state: S, cardId: string) => state.sides.own.hand.find((h) => h.card.id === cardId) ?? null;

/** 己方手牌 = 传入的卡；敌方 front.0 = 木桩 */
function board(ownHand: string[]): B {
  const { state, ctx } = scenario({ ownHand });
  ctx.cards.set(DUMMY.id, DUMMY);
  setUnit(state, 'enemy', 'front', 0, makeUnit(DUMMY, 0, 99));
  return { state, ctx, rng: createRng(11) };
}

const play = (b: B) => applyAction(b.state, b.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
const takeDiscover = (state: S, ctx: C, cardId: string) =>
  applyAction(state, ctx, { type: 'CHOOSE_DISCOVER', cardId });

/** 让一个单位阵亡（走真实的 dealDamage → killUnit → on_death 链路） */
const kill = (b: B, col: number) => dealDamage(b.state, b.ctx.cards, unitRef('own', 'front', col), 99, [], '测试', 0);

/* ============================================================ */

test('数据形态：关兴 7 费 5/5 **先攻**＋亡语；张苞 8 费 5/5 **架盾**＋战吼（披坚＋拉人）；两张各一条技能', () => {
  const gx = ALL.find((c) => c.id === 'shu_guanxing')!;
  const zb = ALL.find((c) => c.id === 'shu_zhangbao')!;

  assert.equal(gx.cost, 7); assert.equal(gx.attack, 5); assert.equal(gx.health, 5);
  assert.ok((gx.keywords ?? []).includes('xian_gong'), '关兴带先攻');
  assert.equal(gx.skills?.length, 1, '这版起每张卡只有一条技能（简单）');
  assert.equal(gx.skills?.[0]?.trigger, 'on_death', '拉人改到亡语 —— 不可被打断');
  assert.deepEqual(gx.skills?.[0]?.effects?.map((e) => e.action), ['deploy_from_hand', 'discover']);

  assert.equal(zb.cost, 8); assert.equal(zb.attack, 5); assert.equal(zb.health, 5);
  assert.ok((zb.keywords ?? []).includes('jia_dun'), '张苞带架盾');
  assert.equal(zb.skills?.[0]?.trigger, 'on_play', '拉人改到战吼 —— 落地即兑现');
  assert.deepEqual(zb.skills?.[0]?.effects?.map((e) => e.action), ['apply_status', 'deploy_from_hand', 'discover']);
  assert.equal(zb.skills?.[0]?.effects?.[0]?.status, 'sheng_dun_status', '战吼先给自己披坚');
});

test('⭐ 关兴有先攻：打出当回合**可以攻击**（先攻＝入场当回合即可行动，ADR-055）', () => {
  const b = board(['shu_guanxing']);
  const r = play(b);
  assert.ok(r.ok, `关兴应能打出：${r.error}`);
  assert.equal(canAttack(r.state, 'own', 'front', 0).ok, true, '有先攻 → 当回合就能行动');
});

test('⭐ 关兴亡语 · 张苞在**手牌**：直接置入战场', () => {
  const b = board(['shu_guanxing', 'shu_zhangbao']);
  b.state.sides.own.deck = [];
  const r = play(b);
  assert.ok(r.ok);
  assert.equal(onField(r.state, 'own', 'shu_zhangbao'), null, '张苞还在手牌里');

  kill({ ...b, state: r.state }, 0);
  assert.equal(onField(r.state, 'own', 'shu_guanxing'), null, '关兴已阵亡');
  const zb = onField(r.state, 'own', 'shu_zhangbao');   // ⚠️ 张苞会占掉关兴留下的格子，不能按格断言
  assert.ok(zb, '手牌里的张苞应被置入战场');
  assert.equal(handCard(r.state, 'shu_zhangbao'), null, '手牌里那张已被搬走');
});

test('⭐ 关兴亡语 · 张苞在**牌库**：置入手牌并**减 2 费**', () => {
  const b = board(['shu_guanxing']);
  b.state.sides.own.deck = ['shu_zhangbao'];
  const r = play(b);
  assert.ok(r.ok);

  kill({ ...b, state: r.state }, 0);
  assert.ok(r.state.pendingDiscover, '牌库分支挂起一次 discover');
  assert.deepEqual(r.state.pendingDiscover!.candidates, ['shu_zhangbao']);

  const picked = takeDiscover(r.state, b.ctx, 'shu_zhangbao');
  assert.ok(picked.ok, `选择应被接受：${picked.error}`);
  assert.equal(picked.state.pendingDiscover, undefined);
  const hc = handCard(picked.state, 'shu_zhangbao');
  assert.ok(hc, '张苞进手牌');
  const costMod = (hc!.mods ?? []).filter((m) => m.kind === 'cost');
  assert.equal(costMod.length, 1, '应有一个费用修正');
  assert.equal(costMod[0]!.value, -2, '⚠️ 统率消耗 −2');
});

test('⭐ 张苞战吼 · 获得披坚 ＋ 关兴在**手牌**时直接上场', () => {
  const b = board(['shu_zhangbao', 'shu_guanxing']);
  b.state.sides.own.deck = [];
  const r = play(b);
  assert.ok(r.ok, `张苞应能打出：${r.error}`);

  const zb = getUnit(r.state, 'own', 'front', 0)!;
  assert.ok(zb.statuses.sheng_dun_status, '战吼先给自己披坚');
  assert.ok(onField(r.state, 'own', 'shu_guanxing'), '手牌里的关兴应被置入战场');
  assert.equal(handCard(r.state, 'shu_guanxing'), null);
});

test('张苞战吼 · 关兴在**牌库**时置入手牌并减 2 费（永不空放）', () => {
  const b = board(['shu_zhangbao']);
  b.state.sides.own.deck = ['shu_guanxing'];
  const r = play(b);
  assert.ok(r.ok);
  assert.ok(r.state.pendingDiscover, '牌库分支挂起 discover');
  const picked = takeDiscover(r.state, b.ctx, 'shu_guanxing');
  assert.ok(picked.ok);
  const hc = handCard(picked.state, 'shu_guanxing');
  assert.ok(hc, '关兴进手牌');
  assert.equal(hc!.mods.filter((m) => m.kind === 'cost')[0]?.value, -2, '统率消耗 −2');
});

test('张苞的披坚真的生效：挡一次伤害后消耗', () => {
  const b = board(['shu_zhangbao']);
  const r = play(b);
  assert.ok(r.ok);
  const hp = getUnit(r.state, 'own', 'front', 0)!.hp;

  dealDamage(r.state, b.ctx.cards, unitRef('own', 'front', 0), 3, [], '测试火攻', 0, undefined, undefined, 'fire');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, hp, '披坚应免疫这一次伤害');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.statuses.sheng_dun_status, undefined, '免疫后消耗');

  dealDamage(r.state, b.ctx.cards, unitRef('own', 'front', 0), 3, [], '第二次', 0, undefined, undefined, 'fire');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, hp - 3, '第二次照常受伤');
});

test('不空放：关兴阵亡时张苞**已在场** → 亡语平稳空转，不崩', () => {
  const b = board([]);
  setUnit(b.state, 'own', 'front', 0, makeUnit(b.ctx.cards.get('shu_guanxing')!, 0, 7));
  setUnit(b.state, 'own', 'front', 1, makeUnit(b.ctx.cards.get('shu_zhangbao')!, 0, 8));

  kill(b, 0);
  assert.equal(getUnit(b.state, 'own', 'front', 0), null, '关兴已阵亡');
  assert.ok(onField(b.state, 'own', 'shu_zhangbao'), '张苞还在场上');
  assert.equal(b.state.pendingDiscover, undefined, '牌库里没有张苞 → 不挂起选择');
});

test('⭐ 一死一生的循环：关兴亡语拉出的张苞会**正常发动战吼**（拿到披坚）', () => {
  const b = board(['shu_guanxing', 'shu_zhangbao']);
  b.state.sides.own.deck = [];
  const r = play(b);
  assert.ok(r.ok);

  kill({ ...b, state: r.state }, 0);
  const zb = onField(r.state, 'own', 'shu_zhangbao');
  assert.ok(zb, '张苞被亡语拉上场');
  assert.ok(zb!.unit.statuses.sheng_dun_status, '⚠️ 被召唤上场的单位也要发动自己的战吼（ADR-121）→ 张苞拿到披坚');
});
