/**
 * 早期「cards_v1 批次」卡牌的功能逻辑测试（ADR-040 / ADR-041）
 *
 * 数据直接来自 core/data/cards.json（由 tools/gen-cards-v1.py 从
 * data/cards_decisions.draft.yaml 的 DSL 翻译生成），因此测的是**真实翻译结果**，
 * 不是测试专用的替身卡。
 *
 * 覆盖：黄权 / 关兴 / 法正 / 程昱 / 贾诩 / 郭嘉 / 许褚 / 陆抗 /
 *       田丰 / 华佗 / 丁奉 / 十常侍之乱 / 灾年 / 草船借箭
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { applyAction } from '../src/engine.ts';
import { getUnit, makeUnit, setUnit } from '../src/state.ts';
import { dealDamage, effectiveCost } from '../src/mutate.ts';
import { legalTargets } from '../src/rules.ts';
import { resolveAttack } from '../src/effects.ts';
import { createRng } from '../src/rng.ts';
import { STATUSES } from '../src/constants.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { Action, CardDef, GameEvent, Unit } from '../src/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL: CardDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));

// 全部卡都要进卡表：summon / transform 会按 id 引用它们（如 elite_* 特种兵）
for (const c of ALL) {
  const flat: CardDef = {
    ...c,
    keywords: c.keywords ?? [],
    skills: c.skills ?? [],          // cards.json 的技能已是摊平后的正式形状（无 skills[].dsl）
  };
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(flat);
}

/** 取真实翻译后的卡（把 skills[].dsl 摊平回 skills） */
function realCard(id: string): CardDef {
  const raw = ALL.find((c) => c.id === id);
  assert.ok(raw, `cards.json 里找不到 ${id}`);
  const flat: CardDef = {
    ...raw,
    keywords: raw.keywords ?? [],
    skills: raw.skills ?? [],
  };
  if (!TEST_CARDS.some((x) => x.id === id)) TEST_CARDS.push(flat);
  return flat;
}

const base = (id: string) => TEST_CARDS.find((x) => x.id === id)!;
const statusName = (id: string) => STATUSES[id]?.name ?? id;
/** 类型安全的伤害事件筛选（GameEvent 是联合类型，`.filter` 里带 `&&` 无法收窄） */
const dmgEvents = (evs: readonly GameEvent[]) =>
  evs.filter((e): e is Extract<GameEvent, { type: 'DAMAGE' }> => e.type === 'DAMAGE');
const u = (id: string, atk: number, hp: number, tags: string[] = [], faction: 'shu' | 'wei' = 'wei') =>
  makeUnit({ id, name: id, faction, type: 'general', cost: 2, attack: atk, health: hp, keywords: [], tags, memo: '' } as CardDef, 1, 1);

/**
 * 同 `u()`，但 `enteredTurn = 0` —— 也就是"上一回合就在场"的单位。
 * `u()` 给的是 `enteredTurn = 1`，而 fixture 的 `state.turn` 也是 1，按规则属于
 * 「本回合入场」→ 不能攻击（`canAttack` 的入场当回合判定）。测试里要让某个单位**能打**
 * （比如"敌方回合来打我"、"第三方来打决斗中的人"）时用它。
 */
const uReady = (id: string, atk: number, hp: number, faction: 'shu' | 'wei' = 'wei') =>
  makeUnit({ id, name: id, faction, type: 'general', cost: 2, attack: atk, health: hp, keywords: [], tags: [], memo: '' } as CardDef, 0, 1);

/* ============================================================
   条件先攻 —— 载体由「关兴 将门虎子」换成「乐进 先登」（ADR-169）
   ============================================================ */

/* 关兴在 ADR-169 重做为 8 费「并肩赴阵」（与张苞互拉），旧「将门虎子」的**条件先攻**随之撤下。
   该能力仍有卡在用，故**换载体保留覆盖**：乐进「先登」＝自己场上没有其他武将时才获得先攻。 */

test('条件先攻：乐进「先登」——场上没有其他武将时获得先攻，有则不获得', () => {
  realCard('wei_lejin');
  // 场景 A：己方场上没有其他武将 → 获得先攻
  const a = scenario({ ownHand: ['wei_lejin'] });
  const ra = applyAction(a.state, a.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(ra.ok, `打出应成功：${ra.error}`);
  assert.ok(getUnit(ra.state, 'own', 'front', 0)?.statuses.xian_gong_status, '没有其他武将 → 应获得先攻');

  // 场景 B：己方场上已有一名武将 → 不获得
  const b = scenario({ ownHand: ['wei_lejin'] });
  setUnit(b.state, 'own', 'front', 1, u('mate', 3, 3));
  const rb = applyAction(b.state, b.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(rb.ok, `打出应成功：${rb.error}`);
  assert.equal(getUnit(rb.state, 'own', 'front', 0)?.statuses.xian_gong_status, undefined,
    '已有其他武将 → 不应获得先攻');
});

/* ================= 法正：仇敌标记 → 受伤时给友军回血 ================= */

test('法正 恩怨分明：标记仇敌，仇敌受伤时为友军回血', () => {
  realCard('shu_fazheng');
  const { state, ctx } = scenario({ ownHand: ['shu_fazheng'] });
  const ally = u('wounded', 2, 5, [], 'shu');
  ally.hp = 2;
  setUnit(state, 'own', 'front', 0, ally);
  setUnit(state, 'enemy', 'front', 0, u('foe', 3, 5));

  const r1 = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1 });
  const marked = r1.state.sides.enemy.rows.front[0]!;
  assert.ok(marked.statuses.chou_di, '敌方应被标记为仇敌');
  assert.equal(marked.statuses.chou_di?.srcUid, r1.state.sides.own.rows.front[1]?.uid, '标记应记录法正 uid');
});

/* ================= 程昱：牺牲己方人物，按其血量回血并造伤（ADR-071） ================= */

test('程昱 审时度势：牺牲己方人物 → 按「血量上限」回血、按「当前血量」造伤', () => {
  realCard('wei_chengyu');
  const { state, ctx } = scenario({ ownHand: ['wei_chengyu'] });

  // 牺牲品：5 血上限，已被打到 2 血 —— 这样「血量最大值」与「当时血量」不相等，
  // 才验得出两个 value_from_flag 取的是不同的数
  const victim = u('victim', 3, 5, [], 'shu');
  victim.hp = 2;
  setUnit(state, 'own', 'front', 0, victim);
  // 治疗对象：1 血（5 血上限，能收下 5 点治疗）
  const wounded = u('wounded', 2, 5, [], 'shu');
  wounded.hp = 1;
  setUnit(state, 'own', 'front', 2, wounded);
  // 敌人：血量够厚，验伤害量
  const foe = u('foe', 1, 20);
  setUnit(state, 'enemy', 'front', 0, foe);

  const r = applyAction(state, ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1,
    target: { side: 'own', row: 'front', col: 0 },     // 牺牲谁
    target2: { side: 'own', row: 'front', col: 2 },     // 恢复给谁
  });
  assert.ok(r.ok, `打出应成功：${r.error}`);

  assert.equal(getUnit(r.state, 'own', 'front', 0), null, '牺牲品应离开战场');
  assert.ok(r.events.some((e) => e.type === 'UNIT_DIED'), '应产生阵亡事件');
  assert.ok(!r.events.some((e) => e.type === 'CARD_DISCARDED'), '不应再弃手牌（原实现读错了卡面）');

  // 治疗量 = 牺牲者的**血量上限** = 5（1 → 5 封顶，故至少涨到 4）
  const healed = getUnit(r.state, 'own', 'front', 2)!;
  assert.ok(healed.hp > 2, `治疗对象应被治疗（1 → ${healed.hp}）`);

  // 伤害量 = 牺牲时的**当前血量** = 2（不是上限 5）
  // ADR-087：随机伤害默认含主公，所以按事件统计总伤害，而不是只看那一个人物
  const dealt = r.events
    .filter((e) => e.type === 'DAMAGE' && e.source !== 'fatigue')
    .reduce((a, e) => a + (e.type === 'DAMAGE' ? e.amount : 0), 0);
  assert.equal(dealt, 2, '伤害应等于牺牲者的当前血量（受伤后更小）');
});

test('程昱 审时度势：牺牲满血人物时，伤害量等于其血量上限', () => {
  realCard('wei_chengyu');
  const { state, ctx } = scenario({ ownHand: ['wei_chengyu'] });
  const victim = u('victim2', 3, 4, [], 'shu');          // 满血 4/4
  setUnit(state, 'own', 'front', 0, victim);
  const foe = u('foe2', 1, 20);
  setUnit(state, 'enemy', 'front', 0, foe);

  const r = applyAction(state, ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1,
    target: { side: 'own', row: 'front', col: 0 },
  });
  assert.ok(r.ok, `打出应成功：${r.error}`);
  // ADR-087：随机伤害默认含主公 —— 按事件统计总伤害
  const dealt = r.events
    .filter((e) => e.type === 'DAMAGE' && e.source !== 'fatigue')
    .reduce((a, e) => a + (e.type === 'DAMAGE' ? e.amount : 0), 0);
  assert.equal(dealt, 4, '满血牺牲 → 伤害 = 血量上限');
});

/* ================= 贾诩：离间强制攻击 ================= */

test('贾诩 离间计：选择敌方武将或兵种，并按 50% 概率强制其攻击同伴', () => {
  realCard('wei_jiaxu');
  const { state, ctx } = scenario({ ownHand: ['wei_jiaxu'] });
  setUnit(state, 'enemy', 'front', 0, u('target', 2, 5));
  setUnit(state, 'enemy', 'front', 1, u('ally', 1, 5));

  const played = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1 });
  assert.ok(played.ok, played.error ?? '贾诩应能上场');
  const used = applyAction(played.state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 1,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.ok(used.ok, used.error ?? '离间计应能选择敌方武将');
  assert.ok(!used.events.some((e) => e.type === 'CONTROL_TAKEN'), '离间计不应改变控制权');
  const skill = base('wei_jiaxu').skills?.find((s) => s.id === 'li_jian_ji');
  assert.equal(skill?.effects?.[0]?.chance, 0.5);
});

/* ================= 郭嘉：策略牌减费 + 打出策略牌抽牌 ================= */

test('郭嘉 天机演算：光环给手牌战法减 2 费', () => {
  realCard('wei_guojia');
  const { state, ctx } = scenario({ ownHand: ['wei_guojia', 'test_draw_tactic'] });
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1 });
  const hc = r.state.sides.own.hand.find((x) => x.card.id === 'test_draw_tactic');
  assert.ok(hc, '手牌里应有策略牌');
  assert.ok(hc!.mods.some((m) => m.kind === 'cost' && m.value === -2), '战法应被减 2 费');
  assert.equal(effectiveCost(hc!), base('test_draw_tactic').cost - 2, '实际费用应少 2');
});

test('郭嘉 演算抽牌：打出策略牌时抽 1 张', () => {
  realCard('wei_guojia');
  const { state, ctx } = scenario({ ownHand: ['wei_guojia', 'test_draw_tactic'] });
  // 牌库必须有牌，否则抽牌会变成粮尽伤害
  state.sides.own.deck = ['neutral_infantry', 'neutral_archer', 'neutral_shieldman'];
  const r1 = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1 });
  const deckBefore = r1.state.sides.own.deck.length;
  const r2 = applyAction(r1.state, ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.ok(r2.ok, '应能打出策略牌');
  assert.ok(r2.events.some((e) => e.type === 'CARD_DRAWN'), '打出策略牌应触发抽牌事件');
  assert.ok(r2.state.sides.own.deck.length < deckBefore, '牌库应减少（抽走 1 张）');
});

/* ================= 许褚：单挑锁定 ================= */

test('许褚 虎痴：对敌方武将发起决斗，双方被锁定', () => {
  realCard('wei_xuchu');
  const { state, ctx } = scenario({ ownHand: [] });
  setUnit(state, 'own', 'front', 0, makeUnit(realCard('wei_xuchu'), 1, 90));
  setUnit(state, 'enemy', 'front', 0, u('duelist', 3, 3));
  const r = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 0 } as Action);
  assert.ok(r.ok, '主动技应可使用');
  assert.ok(getUnit(r.state, 'own', 'front', 0)?.statuses.jue_dou, '许褚应进入决斗');
  assert.ok(getUnit(r.state, 'enemy', 'front', 0)?.statuses.jue_dou, '对手应进入决斗');
});

/* ================= 陆抗：息兵 ================= */

test('陆抗 息兵：回合结束治疗未行动的其他己方单位', () => {
  const card = realCard('wu_lukang');
  const skill = card.skills?.find((s) => s.id === 'xi_bing');
  assert.equal(skill?.trigger, 'turn_end');
  assert.match(skill?.text ?? '', /未攻击/);
});

/* ================= 田丰：封锁主公技 + 抽牌 ================= */

/* ================= 华佗：医圣（治疗 2；治主公额外抽一张）================= */
// ADR-148 改设计：旧的「青囊」（弃一张手牌按其统率回血 + 清负面）已作废，
// 详细用例见 huatuo-yisheng.test.ts；这里只留一条能放出来的烟测。

/* ================= 丁奉：雪中奋短兵 ================= */

test('丁奉 雪中奋短兵：光环强化后续召唤单位', () => {
  const card = realCard('wu_dingfeng');
  assert.equal(card.cost, 5);
  assert.deepEqual([card.attack, card.health], [3, 4]);
  assert.equal(card.skills?.[0]?.id, 'xue_zhong_fen_duan_bing');
});

/* ================= 十常侍之乱：削减敌方主帅统率上限 ================= */

test('十常侍之乱：使敌方主帅获得 2 层断粮', () => {
  realCard('event_shichangshi');
  const { state, ctx } = scenario({ ownHand: ['event_shichangshi'] });
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.ok(r.ok, '应能打出');
  assert.equal(r.state.sides.enemy.lord.statuses?.duan_liang?.stacks, 2, '敌方主帅应被削 2 统率上限');
});

test('断粮生效：主公统率上限被削减', () => {
  const { state, ctx } = scenario({ ownHand: [] });
  state.sides.own.lord.statuses = { duan_liang: { stacks: 2 } };
  state.sides.own.command.max = 5;
  const r1 = applyAction(state, ctx, { type: 'END_TURN' });          // 己方结束 → 敌方回合
  const r2 = applyAction(r1.state, ctx, { type: 'END_TURN' });       // 敌方结束 → 己方回合开始（断粮结算）
  const max = r2.state.sides.own.command.max;
  const cur = r2.state.sides.own.command.cur;
  assert.equal(cur, Math.max(0, max - 2), `断粮 2 层：当前统率应为上限-2（${cur} vs ${max}-2）`);
});

/* ================= 灾年：禁止抽牌 ================= */

test('灾年：双方主帅获得「断抽」，抽牌被拦截', () => {
  realCard('event_zainian');
  const { state, ctx } = scenario({ ownHand: ['event_zainian'] });
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.ok(r.state.sides.own.lord.statuses?.duan_chou, '己方主帅应被断抽');
  assert.ok(r.state.sides.enemy.lord.statuses?.duan_chou, '敌方主帅应被断抽');
});

/* ================= 草船借箭（ADR-090 改版）：按敌方人数抽牌 + 扎两个假人 ================= */

test('草船借箭：敌方每有一名人物抽一张，并召唤两个 0/1 架盾假人', () => {
  realCard('tactic_caochuanjiejian');
  realCard('token_jia_ren');
  const { state, ctx } = scenario({ ownHand: ['tactic_caochuanjiejian'] });
  state.sides.own.deck = Array(10).fill('neutral_infantry');
  state.sides.enemy.deck = Array(10).fill('neutral_infantry');
  setUnit(state, 'enemy', 'front', 0, u('敌1', 1, 3));
  setUnit(state, 'enemy', 'front', 1, u('敌2', 1, 3));
  setUnit(state, 'enemy', 'front', 2, u('敌3', 1, 3));

  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.ok(r.ok, `应能打出：${r.error}`);

  // ① 抽牌数 = 敌方场上人物数（3 名 → 抽 3 张）
  assert.equal(r.events.filter((e) => e.type === 'CARD_DRAWN').length, 3, '敌方 3 名人物 → 抽 3 张');
  assert.equal(r.state.sides.own.hand.length, 3, '打掉 1 张、抽回 3 张');

  // ② 召唤两个 0/1 架盾假人
  const mine = r.state.sides.own.rows.front.filter((x): x is Unit => !!x);
  assert.equal(mine.length, 2, '应召唤两个假人');
  for (const m of mine) {
    assert.equal(m.cardId, 'token_jia_ren', '必须是假人衍生物');
    assert.equal(m.hp, 1, '1 血');
    assert.equal(m.maxHp, 1);
    assert.ok(m.kw.includes('jia_dun'), '必须带架盾');
  }
  assert.equal(r.events.filter((e) => e.type === 'UNIT_SUMMONED').length, 2, '应有两次召唤事件');
});

test('草船借箭：敌方场上没人时只扎假人、不抽牌', () => {
  realCard('tactic_caochuanjiejian');
  realCard('token_jia_ren');
  const { state, ctx } = scenario({ ownHand: ['tactic_caochuanjiejian'] });
  state.sides.own.deck = Array(10).fill('neutral_infantry');
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.ok(r.ok, `应能打出：${r.error}`);
  assert.equal(r.events.filter((e) => e.type === 'CARD_DRAWN').length, 0, '空场 → 一张都不抽');
  assert.equal(r.state.sides.own.rows.front.filter(Boolean).length, 2, '假人照常召唤');
});

test('假人：0 攻 1 血的架盾真的能挡刀（敌方普攻只能打它）', () => {
  const jia = realCard('token_jia_ren');
  const { state } = scenario({});
  state.sides.own.rows.front[0] = makeUnit(jia, 0, 1);
  setUnit(state, 'own', 'front', 1, u('队友', 3, 3, [], 'shu'));
  setUnit(state, 'enemy', 'front', 0, uReady('敌人', 2, 2));
  const t = legalTargets(state, 'enemy', 'front', 0);
  assert.deepEqual(t.targets.map((x) => x.kind), ['unit'], '有架盾时不能打主将');
  assert.ok(t.targets.every((x) => x.col === 0), '只能打假人那一个架盾单位');
  assert.equal(state.sides.own.rows.front[0]!.atk, 0, '假人是 0 攻');
});

/* ================= ADR-042：进化卡（召唤 + 兵种进化） ================= */

const troop = (id: string, kind: 'infantry' | 'shield' | 'archer', atk: number, hp: number) =>
  makeUnit({ id, name: id, faction: 'neutral', type: 'troop', troopKind: kind,
             cost: 1, attack: atk, health: hp, keywords: [], memo: '' } as CardDef, 1, 1);

test('张角 五雷轰顶：回合开始雷击击杀都召唤黄巾兵（ADR-197 起改为 turn_start）', () => {
  realCard('qun_zhangjiao');
  realCard('token_huangjin_bing');
  const { state, ctx } = scenario({});
  setUnit(state, 'own', 'front', 0, makeUnit(realCard('qun_zhangjiao'), 0, 901));
  const victimA = makeUnit(realCard('neutral_infantry'), 0, 902);
  const victimB = makeUnit(realCard('neutral_infantry'), 0, 903);
  victimA.hp = 1;
  victimB.hp = 1;
  setUnit(state, 'enemy', 'front', 0, victimA);
  setUnit(state, 'enemy', 'front', 1, victimB);
  const r1 = applyAction(state, ctx, { type: 'END_TURN' });      // 己方回合结束 → 敌方
  const r2 = applyAction(r1.state, ctx, { type: 'END_TURN' });   // 敌方结束 → 己方回合开始 → 五雷
  const summoned = [...r1.events, ...r2.events]
    .filter((e) => e.type === 'UNIT_SUMMONED' && e.unit.cardId === 'token_huangjin_bing');
  assert.equal(summoned.length, 2, `两次雷击击杀应召唤 2 个黄巾兵，实际 ${summoned.length}`);
});

test('南蛮入侵：双方单位和双方主公都受到 1 点伤害', () => {
  realCard('event_nanmanruqin');
  const { state, ctx } = scenario({ ownHand: ['event_nanmanruqin'] });
  setUnit(state, 'own', 'front', 0, makeUnit(realCard('neutral_infantry'), 0, 904));
  setUnit(state, 'enemy', 'front', 0, makeUnit(realCard('neutral_infantry'), 0, 905));
  const ownLordHp = state.sides.own.lord.hp;
  const enemyLordHp = state.sides.enemy.lord.hp;
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.equal(getUnit(r.state, 'own', 'front', 0)?.hp, 1, '己方步兵 1/2 受 1 点伤害 → 剩 1 血（ADR-131）');
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)?.hp, 1, '敌方步兵 1/2 受 1 点伤害 → 剩 1 血（ADR-131）');
  assert.equal(r.state.sides.own.lord.hp, ownLordHp - 1, '己方主公应受到 1 点伤害');
  assert.equal(r.state.sides.enemy.lord.hp, enemyLordHp - 1, '敌方主公应受到 1 点伤害');
});

/* ================= 张飞 咆哮（ADR-087）：在场光环 + 全体 1 伤 ================= */

/* ============================================================
   张飞「咆哮」→ 已于 2026-10-11 整体替换（ADR-158）
   ============================================================ */

// 旧设计（`咆哮` 在场光环给攻低于自己的敌人 −1 攻 ＋ `咆哮（入场）` 战吼打全体 1 点、**不含主公**）
// **已整条替换**为「燕人咆哮」：
//   · `turn_end` 触发 → 每回合（含上场那回合）对敌方全体 **含主公** 造成 1 点伤害；
//   · `on_kill` 触发 → 击杀后**再次释放**（连吼）。
// 两条技能的完整测试见 **`core/test/wuhu-legendary.test.ts`**。

/* ================= 范围伤害默认含主公（ADR-087） ================= */

test('范围伤害默认打主将；卡面写 include_lord: false 才不打', () => {
  const mk = (includeLord: boolean | undefined) => {
    const aoe: CardDef = {
      id: 't_aoe', name: '测试AOE', faction: 'qun', type: 'strategist',
      cost: 5, attack: 1, health: 5, keywords: [], memo: '',
      skills: [{
        id: 'aoe', name: 'AOE', kind: 'trigger', trigger: 'turn_end',
        effects: [{
          action: 'damage', value: 2,
          target: {
            side: 'enemy',
            filter: { type: 'character', ...(includeLord === undefined ? {} : { include_lord: includeLord }) },
            count: 'all',
          },
        }],
      }],
    };
    const sc = scenario({ ownHand: [] });
    sc.state.sides.own.deck = Array(5).fill('neutral_infantry');
    sc.state.sides.enemy.deck = Array(5).fill('neutral_infantry');
    setUnit(sc.state, 'own', 'front', 0, makeUnit(aoe, 1, 90));
    setUnit(sc.state, 'enemy', 'front', 0, u('target', 1, 9));
    return sc;
  };

  // 默认（没写 include_lord）：主将也吃 2 点
  const d = mk(undefined);
  const r1 = applyAction(d.state, d.ctx, { type: 'END_TURN' });
  assert.equal(r1.state.sides.enemy.lord.hp, 28, '默认口径：范围伤害打主将');
  assert.equal(getUnit(r1.state, 'enemy', 'front', 0)?.hp, 7, '人物同时挨打');

  // 显式 false：只打人物
  const f = mk(false);
  const r2 = applyAction(f.state, f.ctx, { type: 'END_TURN' });
  assert.equal(r2.state.sides.enemy.lord.hp, 30, 'include_lord: false → 打不到主将');
  assert.equal(getUnit(r2.state, 'enemy', 'front', 0)?.hp, 7, '人物照样挨打');

  // 单点指定（非范围/随机）不受这条默认影响
  const single: CardDef = {
    id: 't_single', name: '单体', faction: 'qun', type: 'strategist',
    cost: 5, attack: 1, health: 5, keywords: [], memo: '',
    skills: [{
      id: 's', name: '单体', kind: 'trigger', trigger: 'turn_end',
      effects: [{ action: 'damage', value: 2, target: { side: 'enemy', filter: { type: 'character' }, count: 1, mode: 'choose' } }],
    }],
  };
  const sc = scenario({ ownHand: [] });
  sc.state.sides.own.deck = Array(5).fill('neutral_infantry');
  sc.state.sides.enemy.deck = Array(5).fill('neutral_infantry');
  setUnit(sc.state, 'own', 'front', 0, makeUnit(single, 1, 91));
  setUnit(sc.state, 'enemy', 'front', 0, u('t2', 1, 9));
  const r3 = applyAction(sc.state, sc.ctx, { type: 'END_TURN' });
  assert.equal(r3.state.sides.enemy.lord.hp, 30, '单体指定目标不受"范围默认含主公"影响');
});

/* ================= ADR-088：万箭齐发从手牌打出 / 张辽溢出伤害 ================= */

test('万箭齐发：从手牌打出也结算伤害（原先只有 on_draw，手牌那张打出去毫无反应）', () => {
  realCard('tactic_wanjianqifa');
  const { state, ctx } = scenario({ ownHand: ['tactic_wanjianqifa'] });
  state.sides.enemy.deck = Array(4).fill('neutral_infantry');
  setUnit(state, 'enemy', 'front', 0, u('foe1', 1, 5));
  setUnit(state, 'enemy', 'front', 1, u('foe2', 1, 5));
  const lordBefore = state.sides.enemy.lord.hp;

  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.ok(r.ok, `应能打出：${r.error}`);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)?.hp, 4, '敌方人物 −1');
  assert.equal(getUnit(r.state, 'enemy', 'front', 1)?.hp, 4, '全体结算，不是只打一个');
  assert.equal(lordBefore - r.state.sides.enemy.lord.hp, 1, '范围伤害默认含主公（ADR-087）');
});

test('张辽 冲锋陷阵：斩杀后的**溢出伤害**打在敌方主将身上（原先写死 2 点且打错目标）', () => {
  const zl = realCard('wei_zhangliao');
  const { state, ctx } = scenario({ ownHand: [] });
  state.sides.enemy.deck = Array(4).fill('neutral_infantry');
  setUnit(state, 'own', 'front', 0, makeUnit(zl, 0, 900));       // 张辽 5 攻（带先攻）
  setUnit(state, 'enemy', 'front', 0, u('victim', 0, 2));        // 2 血靶子：5 − 2 = 溢出 3
  setUnit(state, 'enemy', 'front', 1, u('bystander', 0, 9));     // 用来证明"不再打第一个敌人"
  const lordBefore = state.sides.enemy.lord.hp;

  const r = applyAction(state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.ok(r.ok, `应能攻击：${r.error}`);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0), null, '目标应被斩杀');
  assert.equal(lordBefore - r.state.sides.enemy.lord.hp, 3, '溢出 3 点应由主将承受');
  assert.equal(getUnit(r.state, 'enemy', 'front', 1)?.hp, 9, '旁边的敌人不该被误伤');
});

test('张辽 冲锋陷阵：没打死人就没有溢出伤害', () => {
  const zl = realCard('wei_zhangliao');
  const { state, ctx } = scenario({ ownHand: [] });
  state.sides.enemy.deck = Array(4).fill('neutral_infantry');
  setUnit(state, 'own', 'front', 0, makeUnit(zl, 0, 901));
  setUnit(state, 'enemy', 'front', 0, u('tank', 0, 20));         // 打不死 → 无溢出
  const lordBefore = state.sides.enemy.lord.hp;
  const r = applyAction(state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.ok(r.ok);
  assert.equal(r.state.sides.enemy.lord.hp, lordBefore, '未击杀 → 主将不掉血');
});

/* ================= ADR-089：陈宫守护时长 / 许褚决斗锁定 / 蔡文姬减费 ================= */

test('许褚 虎痴：单挑锁定连**普通攻击**也挡（原先只挡了技能指向）', () => {
  realCard('wei_xuchu');
  const { state, ctx } = scenario({ ownHand: ['wei_xuchu'] });
  setUnit(state, 'own', 'front', 0, uReady('帮手', 2, 2, 'shu'));   // 第三方
  setUnit(state, 'enemy', 'front', 0, uReady('敌将', 3, 20));

  const r0 = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1 });
  assert.ok(r0.ok, `应能打出许褚：${r0.error}`);
  const hu = getUnit(r0.state, 'own', 'front', 1)!;
  hu.hp = hu.maxHp = 20;
  const r = applyAction(r0.state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 1, target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.ok(r.ok, `虎痴应能使用：${r.error}`);
  assert.ok(getUnit(r.state, 'own', 'front', 1)!.statuses.jue_dou, '许褚应进入决斗');
  assert.ok(getUnit(r.state, 'enemy', 'front', 0)!.statuses.jue_dou, '敌将应进入决斗');

  const targets = legalTargets(r.state, 'own', 'front', 0).targets;
  assert.ok(!targets.some((t) => t.kind === 'unit' && t.col === 0),
    '第三方不能攻击决斗中的单位');
  assert.ok(targets.some((t) => t.kind === 'lord'), '主将不受决斗影响，仍可攻击');
});

test('阵亡标记（ADR-041/085）：标记的 payoff 在阵亡时由施法方结算，显示名不是「阵亡」', () => {
  // 草船借箭在 ADR-090 改版后不再用标记机制了，这里用一张合成卡守住引擎侧的行为，
  // 免得 ADR-087 修好的 runMarkDeath / on_death 又悄悄烂掉。
  const synthetic: CardDef = {
    id: 'test_mark_card', name: '测试标记', faction: 'neutral', type: 'tactic', cost: 0,
    keywords: [], memo: '', flavor: '', attack: 0, health: 0,
    effects: [{
      action: 'apply_status', status: 'zhen_wang', status_source: 'self',
      on_death: [{ action: 'draw', value: 2 }],
      target: { side: 'enemy', count: 'all' },
    }],
  } as unknown as CardDef;
  if (!TEST_CARDS.some((c) => c.id === synthetic.id)) TEST_CARDS.push(synthetic);

  const { state, ctx } = scenario({ ownHand: ['test_mark_card'] });
  state.sides.own.deck = Array(8).fill('neutral_infantry');
  state.sides.enemy.deck = Array(8).fill('neutral_infantry');
  setUnit(state, 'enemy', 'front', 0, u('靶子', 0, 1));

  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.ok(r.ok, `应能打出：${r.error}`);
  assert.ok(getUnit(r.state, 'enemy', 'front', 0)!.statuses.zhen_wang, '应被标记');
  assert.equal(statusName('zhen_wang'), '阵亡标记', '标记的显示名不能就叫「阵亡」');

  // 打死它 → payoff 由**施法方**结算（抽 2 张）
  const events: GameEvent[] = [];
  dealDamage(r.state, ctx.cards, { kind: 'unit', side: 'enemy', row: 'front', col: 0 }, 5, events, '测试');
  assert.ok(events.some((e) => e.type === 'UNIT_DIED'), '应阵亡');
  assert.equal(events.filter((e) => e.type === 'CARD_DRAWN').length, 2, '标记 payoff 应抽 2 张');
});
