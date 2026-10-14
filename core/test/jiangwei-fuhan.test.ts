/**
 * 姜维「复汉」公开判胜技 ＋ 引擎新原语 `fallen` / `has_fallen`（ADR-160）
 *
 * ## 设计者定稿
 *
 * - **姜维**：6 费 **4/6**、`legendary`；「智勇双全」攻击 +1；「智勇双全（策略）」**战吼**连抽计策。
 * - **「复汉」（公开判胜技）**：己方回合开始时，若
 *   ① 敌方「**钟会**」处于**己方控制**、② 敌方「**邓艾**」**已阵亡**、③ **己方主公血量 ≤ 10**
 *   → **己方直接获胜**。
 *
 * ## 为什么需要 `has_fallen`
 *
 * ②「已阵亡」与「现在不在场上」**不是一回事**：没被打出的卡和已阵亡的卡在场上都看不见。
 * 用「场上没有邓艾」代替会**提前判胜**（本文件第 ② 组测试专门抓这个）。
 * 标记机制（`apply_status` 的 `on_death` 载荷）也替代不了它 —— 载荷执行时 `ctx.source` 是空的，
 * 没法把"邓艾已亡"记回姜维身上，也就撑不起「A 已亡 **且** B 在我方」这种**跨时间合取**。
 *
 * ## 历史背景（写测试时也别忘）
 *
 * 史实里这条计策**失败了**：钟会犹豫、部下泄变，姜维与钟会皆死
 * （「姜维率会左右战，手杀五六人，众既格斩维」）。三个条件正好是史实的三个零件 ——
 * **钟会归我**（「乃诡说会曰」）／**邓艾已除**（钟会诬陷，邓艾被囚车押走）／**姜维还活着**（他在场才会检查）。
 * 凑齐即"改写历史"。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { applyAction } from '../src/engine.ts';
import { canAttack, effectiveAttack } from '../src/rules.ts';
import { dealDamage, unitRef } from '../src/mutate.ts';
import { getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { Action, CardDef } from '../src/types.ts';

const REAL: CardDef[] = JSON.parse(
  readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'),
);
const real = (id: string): CardDef => {
  const c = REAL.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
};

const JW = real('shu_jiangwei');
for (const c of [JW, real('wei_zhonghui'), real('wei_dengai'), real('neutral_infantry'),
  real('tactic_huogong'), real('tactic_wanjianqifa'), real('tactic_bishi_ruiqi')]) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);
}
const DECK = Array.from({ length: 12 }, () => 'neutral_infantry');

/** 姜维在场、双方牌库喂满（避免「粮尽」干扰主公血量断言） */
function board() {
  const { state, ctx } = scenario({ own: { front: ['shu_jiangwei'] }, ownCommand: 10 });
  state.sides.own.deck = DECK;
  state.sides.enemy.deck = DECK;
  return { state, ctx };
}

/** 让某张卡上场后立刻阵亡（走真实 killUnit 路径 → 记入 fallen） */
function killOnBoard(state: ReturnType<typeof board>['state'], ctx: ReturnType<typeof board>['ctx'],
  id: string, col: number, side: 'own' | 'enemy' = 'enemy') {
  const u = makeUnit(real(id), 0, nextUidSeq(state));
  u.hp = 1; u.maxHp = 1; u.baseMaxHp = 1;
  setUnit(state, side, 'front', col, u);
  dealDamage(state, ctx.cards, unitRef(side, 'front', col), 9, [], '测试', 0,
    { side: 'own', row: 'front', col: 0 });
}

/** 推进一整轮，回到我方回合开始（触发 turn_start） */
function nextOwnTurn(state: ReturnType<typeof board>['state'], ctx: ReturnType<typeof board>['ctx']) {
  const a = applyAction(state, ctx, { type: 'END_TURN' });
  assert.ok(a.ok, a.error ?? '');
  const b = applyAction(a.state, ctx, { type: 'END_TURN' });
  assert.ok(b.ok, b.error ?? '');
  return b.state;
}

/* ============================================================
   一、数据形态
   ============================================================ */

test('姜维 数据：6 费 4/6 传奇；攻击 +1 / 战吼连抽 / 复汉判胜 三条技能', () => {
  assert.equal(`${JW.cost}费 ${JW.attack}/${JW.health}`, '6费 4/6');
  assert.equal(JW.rarity, 'legendary');
  const [zhi, ce, fu] = JW.skills ?? [];
  assert.equal(zhi!.trigger, 'on_attack', '第一条：攻击时 +1');
  assert.equal(ce!.trigger, 'on_play', '第二条：**战吼**（由 on_card_played 改来）');
  assert.equal(ce!.effects?.[0]?.action, 'draw_until');
  assert.equal(ce!.effects?.[0]?.until_not_type, 'tactic');
  assert.equal(fu!.name, '复汉');
  assert.equal(fu!.trigger, 'turn_start', '判胜时机：己方回合开始（留出对手一整回合的反制窗口）');
});

test('复汉 数据：判胜 = 对敌方主公 9999，条件为「钟会归我 ＋ 邓艾已亡 ＋ 主公≤10」三合一', () => {
  const fu = (JW.skills ?? [])[2]!;
  const eff = (fu.effects ?? [])[0]!;
  assert.equal(eff.action, 'damage');
  assert.equal(eff.value, 9999);
  assert.equal(eff.target?.lord, true);
  const all = eff.condition?.all_of ?? [];
  assert.equal(all.length, 3);
  assert.deepEqual(all[0]?.count?.selector?.filter, { card_id: 'wei_zhonghui' });
  assert.equal(all[0]?.count?.selector?.side, 'ally', '钟会必须在**我方**场上');
  assert.deepEqual(all[1], { has_fallen: { side: 'enemy', card_id: 'wei_dengai' } });
  assert.deepEqual(all[2], { lord_hp: { side: 'self', op: '<=', value: 10 } });
});

/* ============================================================
   二、引擎原语 fallen / has_fallen（ADR-160）
   ============================================================ */

test('fallen：阵亡的卡记进该方的 fallen，双方各自记账', () => {
  const { state, ctx } = board();
  assert.deepEqual(state.sides.enemy.fallen, [], '开局为空');
  killOnBoard(state, ctx, 'wei_dengai', 1);
  killOnBoard(state, ctx, 'neutral_infantry', 2);
  assert.deepEqual(state.sides.enemy.fallen, ['wei_dengai', 'neutral_infantry'], '按阵亡顺序记录');
  assert.deepEqual(state.sides.own.fallen, [], '只记自己的（姜维还活着）');
});

test('fallen：**不去重** —— 同一张卡死两次就记两次（阵亡是不可逆事实的流水）', () => {
  const { state, ctx } = board();
  killOnBoard(state, ctx, 'neutral_infantry', 1);
  killOnBoard(state, ctx, 'neutral_infantry', 2);
  assert.deepEqual(state.sides.enemy.fallen, ['neutral_infantry', 'neutral_infantry']);
});

test('⭐ has_fallen 区分「**死过**」与「**还没上场**」—— 这是它存在的全部理由', () => {
  // 两种情况下，敌方场上都"没有邓艾"，只有 fallen 能区分
  const never = board();
  killOnBoard(never.state, never.ctx, 'neutral_infantry', 1);          // 死了个别的，邓艾没上过场
  const died = board();
  killOnBoard(died.state, died.ctx, 'wei_dengai', 1);                  // 邓艾上场后死掉

  for (const [label, b, want] of [
    ['从未上场', never, false], ['已阵亡', died, true],
  ] as const) {
    const zh = makeUnit(real('wei_zhonghui'), 0, nextUidSeq(b.state));
    setUnit(b.state, 'own', 'front', 2, zh);
    b.state.sides.own.lord.hp = 10;
    const after = nextOwnTurn(b.state, b.ctx);
    assert.equal(after.winner === 'own', want,
      `邓艾「${label}」时 winner 应为 ${want ? 'own' : 'null'}（两者在场上都"看不见"，只能靠 fallen 分辨）`);
  }
});

/* ============================================================
   三、复汉：三条件的行为锁
   ============================================================ */

/** 三条件全满足的场面 */
function ready() {
  const b = board();
  killOnBoard(b.state, b.ctx, 'wei_dengai', 1);
  setUnit(b.state, 'own', 'front', 2, makeUnit(real('wei_zhonghui'), 0, nextUidSeq(b.state)));
  b.state.sides.own.lord.hp = 10;
  return b;
}

test('⭐ 复汉：三条件齐 → 己方回合开始时直接获胜（敌方主公归零）', () => {
  const b = ready();
  const lordBefore = b.state.sides.enemy.lord.hp;
  const after = nextOwnTurn(b.state, b.ctx);
  assert.equal(after.sides.enemy.lord.hp, 0, `敌方主公应从 ${lordBefore} 直接归零`);
  assert.equal(after.winner, 'own', '己方获胜');
});

test('复汉：**钟会不在我方**时不判胜（他还替曹魏打工）', () => {
  const b = board();
  killOnBoard(b.state, b.ctx, 'wei_dengai', 1);
  b.state.sides.own.lord.hp = 10;
  const after = nextOwnTurn(b.state, b.ctx);
  assert.equal(after.winner, null);
  assert.equal(after.sides.enemy.lord.hp, 30);
});

test('复汉：**邓艾尚未阵亡**时不判胜', () => {
  const b = ready();
  b.state.sides.enemy.fallen.length = 0;      // 把"邓艾已亡"这条事实抹掉
  const after = nextOwnTurn(b.state, b.ctx);
  assert.equal(after.winner, null, '缺一个零件就不该赢');
});

test('复汉：己方主公 **11 血**时不判胜（阈值边界）', () => {
  const b = ready();
  b.state.sides.own.lord.hp = 11;
  assert.equal(nextOwnTurn(b.state, b.ctx).winner, null);
  // 对照：10 血恰好满足
  const b2 = ready();
  b2.state.sides.own.lord.hp = 10;
  assert.equal(nextOwnTurn(b2.state, b2.ctx).winner, 'own');
});

test('⭐ 复汉：**顺序无关** —— 邓艾先死、钟会后来才归我，照样能判胜', () => {
  // 这正是 `has_fallen`（持久事实）与"标记载荷"（只在阵亡那一刻求值一次）的关键差别
  const b = board();
  killOnBoard(b.state, b.ctx, 'wei_dengai', 1);          // ① 先除掉邓艾
  b.state.sides.own.lord.hp = 10;                        // ③ 主公已残
  assert.equal(nextOwnTurn(b.state, b.ctx).winner, null, '此时钟会还没归我 → 不赢');
  setUnit(b.state, 'own', 'front', 2, makeUnit(real('wei_zhonghui'), 0, nextUidSeq(b.state)));  // ② 之后才策反
  const after = nextOwnTurn(b.state, b.ctx);
  assert.equal(after.winner, 'own', '零件补齐后，下一回合开始即判胜');
});

test('复汉：**姜维不在场**时不检查（判胜技长在他身上）', () => {
  const b = ready();
  setUnit(b.state, 'own', 'front', 0, null);             // 姜维离场
  assert.equal(nextOwnTurn(b.state, b.ctx).winner, null);
});

test('⭐ 复汉：敌方主公挂「披坚」时**被挡下** —— 这是有意的反制手段', () => {
  const b = ready();
  // ⚠️ `Lord.statuses` 是**惰性初始化**的（`mutate.ts:596` 的 `lord.statuses = lord.statuses ?? {}`）
  // —— 直接赋值前得先把它建出来，否则 undefined 上写属性会崩。
  b.state.sides.enemy.lord.statuses = { sheng_dun_status: { stacks: 1 } };
  const after = nextOwnTurn(b.state, b.ctx);
  assert.notEqual(after.winner, 'own', '「披坚」吸收一次伤害 → 判胜被挡下');
  assert.ok(after.sides.enemy.lord.hp > 0, '主公应还活着');
});

/* ============================================================
   四、智勇双全（两条）
   ============================================================ */

test('智勇双全：普通攻击确实打出 5 点（4 基础 + 1）', () => {
  const { state, ctx } = scenario({
    own: { front: ['shu_jiangwei'] }, ownCommand: 10, enemy: { front: ['test_champion'] },
  });
  state.sides.own.deck = DECK;
  state.sides.enemy.deck = DECK;
  const t = getUnit(state, 'enemy', 'front', 0)!;
  t.hp = 20; t.maxHp = 20; t.baseMaxHp = 20;
  const gate = canAttack(state, 'own', 'front', 0);
  assert.ok(gate.ok, gate.reason ?? '');
  const r = applyAction(state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  } as Action);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 15, '4 攻 +「智勇双全」1 = 5');
});

test('智勇双全（策略）：战吼连抽 —— 牌库顶连续计策牌会一路抽下去', () => {
  const { state, ctx } = scenario({
    ownHand: ['shu_jiangwei'], ownCommand: 10, enemy: { front: ['neutral_infantry'] },
  });
  state.sides.own.deck = [
    'neutral_infantry', 'neutral_infantry', 'neutral_infantry',   // 牌库底
    'tactic_wanjianqifa', 'tactic_bishi_ruiqi',                   // 牌库顶：两张计策
  ];
  state.sides.enemy.deck = DECK;
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 } as Action);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.own.deck.length, 2, '应连抽 3 张（2 计策 + 1 非计策后停）');
});
