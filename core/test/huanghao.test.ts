/**
 * 黄皓重做（ADR-155）—— 3 费 1/3 精英：谗言（拼点弃牌）＋ 覆国（不对称亡语直伤）
 *
 * ## 设计者定稿
 *
 * 「3 费 1/3 拼点弃牌，阵亡时对对方主公 4 点伤害，**己方主公减半**（＝2 点）。」
 * 「有条件的弃对方随机手牌，也有可能自己会弃，然后阵亡也会对主公造成伤害。」
 *
 * ## 三条要钉死的机制
 *
 * ① **拼点是本作唯一被认可的随机形式**（GDD 12 规则二/四：可读、可对冲，不直接造成伤害或击杀）。
 *    ⚠️ `roll` 模式判据是 `a >= b` —— **平局算我方赢**，实际胜率 **21/36 ≈ 58.3%**，不是五五开。
 * ② **亡语是玩家可控的**（设计者原话：「对方普通攻击、**己方主动去撞**……都有可能」）：
 *    黄皓是 1 攻谋臣，而 ADR-051 取消了「谋臣不能普攻」→ 他可以**主动撞死自己**来触发亡语。
 *    这条是本卡能不能用的关键，所以单独占一条用例。
 * ③ **亡语是不对称的**（敌 4 / 己 2）：对称直伤只改变对局速度、不改变血量差，
 *    等于把触发时机交给对手（对手只在自己领先时才动手杀他）。不对称后对手杀他才是净亏。
 *
 * ## 为什么用真实卡 + 种子循环
 *
 * 拼点是随机分支，沿用 `shu-batch2.test.ts`（伊籍/李严）的口径：**循环种子直到两条分支都观察到**，
 * 并直接读 `CLASH` 事件的 `won` / `mine` / `theirs`，而不是去猜 RNG 实现。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { applyAction } from '../src/engine.ts';
import { canAttack } from '../src/rules.ts';
import { killUnit } from '../src/mutate.ts';
import { getUnit } from '../src/state.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { CardDef } from '../src/types.ts';

const REAL: CardDef[] = JSON.parse(
  readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'),
);
const real = (id: string): CardDef => {
  const c = REAL.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
};

const HH = real('shu_huanghao');
// ⚠️ 只推真实卡。`test_champion`（5/5 先攻）是 **fixtures.ts 的内联夹具卡**，
// 不在 `cards.json` 里 —— 它本来就随 `TEST_CARDS` 一起加载，不需要也不能用 `real()` 取。
if (!TEST_CARDS.some((x) => x.id === HH.id)) TEST_CARDS.push(HH);

interface ClashEvent { type: 'CLASH'; won: boolean; mine: number; theirs: number }

/** 打出黄皓，返回结算结果与拼点事件 */
function playHH(seed: number, opts: { ownExtra?: string[]; enemyHand?: string[] } = {}) {
  const { state, ctx } = scenario({
    ownHand: ['shu_huanghao', ...(opts.ownExtra ?? [])],
    enemyHand: opts.enemyHand ?? ['neutral_infantry', 'neutral_archer', 'neutral_shieldman'],
    ownCommand: 10,
    seed,
  });
  const before = {
    own: state.sides.own.hand.length,
    foe: state.sides.enemy.hand.length,
  };
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '黄皓应能打出');
  const clash = r.events.find((e) => e.type === 'CLASH') as ClashEvent | undefined;
  assert.ok(clash, '应产生拼点事件');
  return { r, clash: clash!, before };
}

/* ============================================================
   1. 数据形态（防漂移）
   ============================================================ */

test('数据：黄皓 3 费 1/3 精英，战吼拼点 + 亡语不对称直伤', () => {
  assert.equal(`${HH.cost}费 ${HH.attack}/${HH.health}`, '3费 1/3');
  assert.equal(HH.type, 'strategist');
  assert.equal(HH.gender, 'male');
  assert.equal(HH.rarity, 'elite');

  const chan = (HH.skills ?? []).find((s) => s.id === 'chan_yan');
  assert.ok(chan, '应有「谗言」');
  assert.equal(chan!.kind, 'trigger');
  assert.equal(chan!.trigger, 'on_play', '谗言是战吼');
  const acts = (chan!.effects ?? []).map((e) => e.action);
  assert.deepEqual(acts, ['clash', 'discard', 'discard'], '一次拼点 + 两条分支弃牌');

  const fg = (HH.skills ?? []).find((s) => s.id === 'fu_guo');
  assert.ok(fg, '应有「覆国」');
  assert.equal(fg!.kind, 'trigger');
  assert.equal(fg!.trigger, 'on_death', '覆国是亡语');
  const dmgs = (fg!.effects ?? []).filter((e) => e.action === 'damage');
  assert.deepEqual(
    dmgs.map((e) => [e.value, e.target?.side, e.target?.lord]),
    [[4, 'enemy', true], [2, 'self', true]],
    '敌方主公 4 点、己方主公 2 点（减半）—— 不对称是有意的',
  );

  // 旧的 `pending/ban_play` 空文案与永久封锁都已随重做删除
  const banned = (HH.skills ?? []).some((s) =>
    (s.effects ?? []).some((e) => e.action === 'ban_play'));
  assert.equal(banned, false, '不该再有 ban_play（旧版是**永久封锁**，违反随机性规则③）');
});

/* ============================================================
   2. 谗言：拼点两条分支
   ============================================================ */

test('谗言：拼点胜 → 敌方随机弃 1 张，己方手牌只少了打出的黄皓', () => {
  let sawWin = false;
  for (let seed = 1; seed <= 30 && !sawWin; seed += 1) {
    const { r, clash, before } = playHH(seed, { ownExtra: ['neutral_infantry'] });
    if (!clash.won) continue;
    sawWin = true;
    assert.equal(r.state.sides.enemy.hand.length, before.foe - 1, '敌方应被弃 1 张');
    assert.equal(r.state.sides.own.hand.length, before.own - 1,
      '己方只少了打出的那张，**不该**被弃牌');
  }
  assert.ok(sawWin, '30 个种子内应至少赢一次');
});

test('谗言：拼点败 → **双方各**随机弃 1 张', () => {
  let sawLose = false;
  for (let seed = 1; seed <= 30 && !sawLose; seed += 1) {
    const { r, clash, before } = playHH(seed, { ownExtra: ['neutral_infantry'] });
    if (clash.won) continue;
    sawLose = true;
    assert.equal(r.state.sides.enemy.hand.length, before.foe - 1, '敌方被弃 1 张');
    assert.equal(r.state.sides.own.hand.length, before.own - 2,
      '己方被弃 1 张 + 打出黄皓 1 张 = 少 2 张 —— 这就是"反受其累"');
  }
  assert.ok(sawLose, '30 个种子内应至少输一次');
});

test('谗言：**平局算我方赢**（`a >= b`，胜率 21/36 ≈ 58.3%，不是五五开）', () => {
  let ties = 0;
  let tieWon = 0;
  let wins = 0;
  for (let seed = 1; seed <= 60; seed += 1) {
    const { clash } = playHH(seed);
    if (clash.won) wins += 1;
    if (clash.mine === clash.theirs) {
      ties += 1;
      if (clash.won) tieWon += 1;
    }
  }
  assert.ok(ties > 0, `60 个种子里应出现平局（实测 ${ties} 次）`);
  assert.equal(tieWon, ties, '平局必须一律判为我方胜');
  assert.ok(wins > 30 && wins < 40,
    `60 局里胜场应接近 58%（21/36），实测 ${wins} —— 若接近 30 说明平局判据被改成了 a > b`);
});

/* ============================================================
   3. 覆国：不对称亡语直伤
   ============================================================ */

test('覆国：阵亡时敌方主公 −4、己方主公 −2，且**只打主公不打场上人物**', () => {
  const { state, ctx } = scenario({
    own: { front: ['shu_huanghao'] },
    enemy: { front: ['neutral_shieldman'] },   // 1/2，用来验证它不掉血
  });
  const foeHpBefore = getUnit(state, 'enemy', 'front', 0)!.hp;
  const me = getUnit(state, 'own', 'front', 0)!;
  killUnit(state, ctx.cards, { side: 'own', row: 'front', col: 0, unit: me }, []);

  assert.equal(getUnit(state, 'own', 'front', 0), null, '黄皓应已离场');
  assert.equal(state.sides.enemy.lord.hp, 30 - 4, '敌方主公应 −4');
  assert.equal(state.sides.own.lord.hp, 30 - 2, '己方主公应 −2（减半）');
  assert.equal(getUnit(state, 'enemy', 'front', 0)!.hp, foeHpBefore,
    '亡语目标是主公，场上人物不该被溅射');
});

test('覆国：黄皓可以**主动撞死**自己来触发亡语（1 攻谋臣能攻击，ADR-051）', () => {
  // 这条是设计者点出来的关键路径：「己方主动去撞」—— 亡语由**玩家**决定何时触发，
  // 不必等对手来杀。黄皓 1 攻，打一个 5/5 吃 5 点反击必死。
  const { state, ctx } = scenario({
    own: { front: ['shu_huanghao'] },
    enemy: { front: ['test_champion'] },       // 5/5
  });
  const gate = canAttack(state, 'own', 'front', 0);
  assert.equal(gate.ok, true, `1 攻谋臣应当能攻击（ADR-051），但被拦：${gate.reason ?? ''}`);

  const r = applyAction(state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.ok(r.ok, r.error ?? '攻击应成立');
  assert.equal(getUnit(r.state, 'own', 'front', 0), null, '挨 5 点反击，1/3 应已阵亡');
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 4, '黄皓也打掉了对方 1 点');
  assert.equal(r.state.sides.enemy.lord.hp, 26, '亡语应打到敌方主公');
  assert.equal(r.state.sides.own.lord.hp, 28, '己方主公也应掉了 2 点');
});

test('覆国：对手**普通攻击**打死他也会触发（对手也得吃 4 点）', () => {
  const { state, ctx } = scenario({
    own: { front: ['shu_huanghao'] },
    enemy: { front: ['test_champion'] },
  });
  const r = applyAction(state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.enemy.lord.hp, 26, '杀他 = 自己也掉 4 点');
  assert.equal(r.state.sides.own.lord.hp, 28);
});

/* ============================================================
   4. 代价的边界：它没有"免费"的直伤
   ============================================================ */

test('覆国：4 点是**全池最大单次主公直伤**（追平釜底抽薪），但必须付出己方 −2', () => {
  const lordHits = REAL.flatMap((c) =>
    (c.skills ?? []).flatMap((s) =>
      (s.effects ?? [])
        .filter((e) => e.action === 'damage' && e.target?.lord && (e.target.side ?? 'enemy') === 'enemy')
        .map((e) => ({ n: e.value ?? 0, name: c.name }))));
  const top = Math.max(...lordHits.map((x) => x.n));
  assert.equal(top, 4, `全池最大单次主公直伤应仍是 4（实测 ${top}）`);
  assert.ok(lordHits.some((x) => x.name === '黄皓' && x.n === 4), '黄皓的 4 点应计入');

  // 但它是**亡语**且**自伤 2 点** —— 与"4 费即时、无代价"的釜底抽薪不是一回事
  const selfHit = (HH.skills ?? []).flatMap((s) => s.effects ?? [])
    .find((e) => e.action === 'damage' && e.target?.side === 'self');
  assert.equal(selfHit?.value, 2, '己方主公 −2 是这个 4 点的代价，不能少');
});
