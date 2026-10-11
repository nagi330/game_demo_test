/**
 * 黄月英「机巧出阵」× 三个机械（ADR-152）—— **数据驱动**的真实卡测试
 *
 * ## 设计者定稿
 *
 * 「5 费 1/2 精英，一次召唤三个机械：一个 2/1 先攻的弩机、一个 0/2 架盾的壁障、
 *   一个 0/2 每回合抽 1 的木牛流马（**无论卡组里带没带，这个是黄月英自己造出来的**）」
 *
 * ## 三条关键机制（本文件逐条钉死）
 *
 * ① **`summon` 是"凭空造一份新实例"**，与卡组里带没带这张牌无关 ——
 *    与高顺/公孙瓒/马腾召唤基础兵（`neutral_shieldman` 等**真实可入组的卡**）同构。
 *    `shu_muniuliuma` 同时是**可入组的机械牌**（`type: machine`，同名上限 1），
 *    所以"卡组里那 1 张"与"黄月英现造的这份"可以同时在场上，不冲突。
 * ② **召唤失调**（ADR-057）：新入场单位当回合不能攻击，**例外是先攻与战吼**。
 *    机械哨兵带「先攻」→ 黄月英落地当回合它就能咬人；这是整套连招的节奏点。
 * ③ **木牛流马的「运粮」是 `turn_end` 触发**，只在自己的回合结束结算
 *    （不是战吼、不是战技、也不是敌方回合结束）。
 *
 * ## 为什么要从 `core/data/cards.json` 读真实卡
 *
 * 与 `troop-special.test.ts` / `zhuge-pair.test.ts` 同一口径：**不用内联夹具**。
 * 内联夹具会与 `data/cards.yaml` 悄悄漂移 —— 数据改了测试照样全绿却毫无覆盖
 *（详见 ADR-113 ⑤ 记录的那次夹具漂移事故）。
 */
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

import { applyAction } from '../src/engine.ts';
import { canAttack, effectiveAttack, legalTargets } from '../src/rules.ts';
import { getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { BOARD } from '../src/constants.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { CardDef, MatchState, Row } from '../src/types.ts';

const REAL: CardDef[] = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cards.json'), 'utf8'),
);
const real = (id: string): CardDef => {
  const c = REAL.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
};

const HY = real('shu_huangyueying');        // 5 费 1/2 精英
const SB = real('token_jixie_shaobing');    // 2/1 先攻
const SW = real('token_jixie_shouwei');     // 0/2 架盾
const MN = real('shu_muniuliuma');          // 2 费 0/2 机械（可入组）
const FILLER = real('neutral_infantry');    // 对照组：没有先攻的普通单位

for (const c of [HY, SB, SW, MN, FILLER]) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);
}

/** 在己方场上按 cardId 找一个单位（召唤位置是随机的，不能假定列号） */
function findOwn(state: MatchState, cardId: string) {
  for (let col = 0; col < BOARD.COLS; col++) {
    const unit = getUnit(state, 'own', 'front', col);
    if (unit?.cardId === cardId) return { unit, col };
  }
  return undefined;
}

/** 己方场上的单位总数 */
function countOwn(state: MatchState): number {
  let n = 0;
  for (let col = 0; col < BOARD.COLS; col++) if (getUnit(state, 'own', 'front', col)) n += 1;
  return n;
}

/** 最后一个空格（放对照单位用） */
function freeCol(state: MatchState): number {
  for (let col = BOARD.COLS - 1; col >= 0; col -= 1) {
    if (!getUnit(state, 'own', 'front', col)) return col;
  }
  throw new Error('己方场上没有空格');
}

/**
 * 打出黄月英并返回结算后的 state。
 * ⚠️ `scenario()` 的牌库默认是**空的** —— 不补牌库的话抽牌会变成「粮尽」伤害，
 * 木牛流马那条测试就会去测粮尽而不是测抽牌。
 */
function playHY(extra: Partial<Parameters<typeof scenario>[0]> = {}) {
  const { state, ctx } = scenario({ ownHand: ['shu_huangyueying'], ownCommand: 10, ...extra });
  state.sides.own.deck = ['neutral_infantry', 'neutral_infantry', 'neutral_infantry'];
  state.sides.enemy.deck = ['neutral_infantry', 'neutral_infantry'];
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '黄月英应能打出');
  return { state: r.state, ctx };
}

/* ============================================================
   1. 数据形态（防漂移）
   ============================================================ */

test('数据：黄月英 5 费 1/2 精英，战吼一次召唤三个机械', () => {
  assert.equal(`${HY.cost}费 ${HY.attack}/${HY.health}`, '5费 1/2');
  assert.equal(HY.type, 'strategist');
  assert.equal(HY.gender, 'female');
  assert.equal(HY.rarity, 'elite', '设计者定稿：精英卡');

  const sk = (HY.skills ?? []).find((s) => s.id === 'ji_qiao_chu_zhen');
  assert.ok(sk, '应有「机巧出阵」');
  assert.equal(sk!.kind, 'trigger');
  assert.equal(sk!.trigger, 'on_play', '是战吼');
  const summons = (sk!.effects ?? []).filter((e) => e.action === 'summon');
  assert.deepEqual(
    summons.map((e) => (e as { unit?: string }).unit),
    ['token_jixie_shaobing', 'token_jixie_shouwei', 'shu_muniuliuma'],
    '三条 summon，分别指向哨兵 / 守卫 / 木牛流马',
  );
  assert.equal(sk!.text, '战吼：召唤「机械哨兵」「机械守卫」与「木牛流马」各一个。');
});

test('数据：两个衍生物不再是空壳占位，且都归蜀', () => {
  assert.equal(`${SB.attack}/${SB.health}`, '2/1');
  assert.deepEqual(SB.keywords, ['xian_gong'], '哨兵靠「先攻」落地即可攻击');
  assert.equal(`${SW.attack}/${SW.health}`, '0/2');
  assert.deepEqual(SW.keywords, ['jia_dun'], '守卫是纯墙');

  for (const c of [SB, SW]) {
    assert.equal(c.type, 'token');
    assert.equal(c.faction, 'shu', `${c.name} 应归蜀（她造的）`);
    assert.equal(c.cost, 0);
    // 旧版挂的是 `pending: true` 的「不能攻击敌方主帅」空文案（ADR-045 至今无 restrict 字段承载）
    const pendingLike = (c.skills ?? []).some((s) => (s as { pending?: boolean }).pending);
    assert.equal(pendingLike, false, `${c.name} 不该再有 pending 空壳技能`);
    assert.equal((c.skills ?? []).length, 0, `${c.name} 只靠关键词，不挂空技能`);
  }
});

/* ============================================================
   2. 战吼：一次造三个
   ============================================================ */

test('战吼：一次召唤哨兵 + 守卫 + 木牛流马（三个都在场上）', () => {
  const { state } = playHY();
  assert.equal(getUnit(state, 'own', 'front', 0)?.cardId, 'shu_huangyueying', '本体在 col 0');
  assert.ok(findOwn(state, 'token_jixie_shaobing'), '应有机械哨兵');
  assert.ok(findOwn(state, 'token_jixie_shouwei'), '应有机械守卫');
  assert.ok(findOwn(state, 'shu_muniuliuma'), '应有木牛流马');
  assert.equal(countOwn(state), 4, '本体 + 3 个机械');
});

test('木牛流马：卡组里没带也能召唤出来，且**不消耗牌库**（summon 是凭空造）', () => {
  const { state } = playHY();
  assert.equal(state.sides.own.hand.length, 0, '手牌已空（只有黄月英那张）');
  assert.equal(state.sides.own.deck.includes('shu_muniuliuma'), false, '牌库里并没有木牛流马');
  assert.ok(findOwn(state, 'shu_muniuliuma'), '但它仍然在场上 —— 是黄月英现造的');
  assert.equal(state.sides.own.deck.length, 3, '牌库一张没少（不是从牌库取来的）');
});

/* ============================================================
   3. 机械哨兵：先攻＝召唤失调的例外（ADR-057）
   ============================================================ */

test('机械哨兵：召唤当回合即可攻击（「先攻」），对照组无先攻则不能', () => {
  const { state } = playHY();
  const sb = findOwn(state, 'token_jixie_shaobing');
  assert.ok(sb, '应有机械哨兵');
  assert.equal(sb!.unit.enteredTurn, state.turn, '它确实是**本回合**入场的（否则测不到召唤失调）');

  const gate = canAttack(state, 'own', 'front', sb!.col);
  assert.equal(gate.ok, true, `带先攻的哨兵应能立刻攻击，但被拦：${gate.reason ?? ''}`);

  // 对照组：同一回合手动放一个**没有先攻**的单位 → 召唤失调
  const col = freeCol(state);
  setUnit(state, 'own', 'front', col, makeUnit(FILLER, state.turn, nextUidSeq(state)));
  const ctrl = canAttack(state, 'own', 'front', col);
  assert.equal(ctrl.ok, false, '对照组（无先攻）本回合入场应不能攻击');
  assert.match(ctrl.reason ?? '', /本回合入场/, '拦截理由应是召唤失调');
});

/* ============================================================
   4. 木牛流马：军械「无法普通攻击」+ 回合末抽 1
   ============================================================ */

test('木牛流马：按 ADR-119「军械无法普通攻击」—— jin_gong 光环真的生效', () => {
  const { state } = playHY();
  const mn = findOwn(state, 'shu_muniuliuma');
  assert.ok(mn, '应有木牛流马');
  const gate = canAttack(state, 'own', 'front', mn!.col);
  assert.equal(gate.ok, false, '军械不该能普攻');
  assert.match(gate.reason ?? '', /无法普通攻击/);
});

test('木牛流马「运粮」：己方回合结束抽 1 张；敌方回合结束**不抽**', () => {
  const { state, ctx } = playHY();
  const hand0 = state.sides.own.hand.length;   // 0
  const deck0 = state.sides.own.deck.length;   // 3

  const r1 = applyAction(state, ctx, { type: 'END_TURN' });   // 己方回合结束
  assert.ok(r1.ok, r1.error ?? '结束回合应成立');
  assert.equal(r1.state.sides.own.hand.length, hand0 + 1, '己方回合结束应抽 1 张');
  assert.equal(r1.state.sides.own.deck.length, deck0 - 1, '牌库相应少 1 张');

  const hand1 = r1.state.sides.own.hand.length;
  const r2 = applyAction(r1.state, ctx, { type: 'END_TURN' }); // 敌方回合结束 → 我方回合开始
  assert.ok(r2.ok, r2.error ?? '结束回合应成立');
  // 这一次 +1 **只**来自"我方回合开始的常规抽牌"；木牛流马在敌方回合结束**不该**再触发
  assert.equal(r2.state.sides.own.hand.length, hand1 + 1,
    '敌方回合结束不该触发我方木牛流马 —— turn_end 只认持有者自己的回合');
});

/* ============================================================
   5. 机械守卫：0 攻纯墙，嘲讽真的生效
   ============================================================ */

test('机械守卫：0 攻 0/2 架盾 —— 敌方普攻只能打它', () => {
  const { state } = playHY({ enemy: { front: [null, 'neutral_infantry'] } });
  const sw = findOwn(state, 'token_jixie_shouwei');
  assert.ok(sw, '应有机械守卫');
  assert.equal(effectiveAttack(state, 'own', 'front', sw!.col), 0, '0 攻：即使宣告攻击也打不出伤害');

  const res = legalTargets(state, 'enemy', 'front', 1);
  assert.ok(res.targets.length > 0, `敌方应有合法攻击目标，但：${res.why ?? ''}`);
  assert.equal(res.targets.length, 1, '架盾在场时，合法目标应**只有**守卫一个');
  const t = res.targets[0]!;
  assert.equal(t.kind, 'unit');
  const picked = getUnit(state, 'own', t.row as Row, (t as { col: number }).col);
  assert.equal(picked?.cardId, 'token_jixie_shouwei', '被锁定为目标的必须是带架盾的守卫');
});

/* ============================================================
   6. 「三个都是 0–2 血的小身板」—— 这是它的代价（防止有人日后偷偷加血）
   ============================================================ */

test('数值代价：三个召唤物的血量总和 ≤ 5，且都以 1–2 点伤害即可清掉', () => {
  const total = [SB, SW, MN].reduce((n, c) => n + (c.health ?? 0), 0);
  assert.equal(total, 5, '1 + 2 + 2 = 5');
  for (const c of [SB, SW, MN]) {
    assert.ok((c.health ?? 99) <= 2, `${c.name} 应保持 ≤2 血（它的强度全部建立在"很容易被解"上）`);
  }
});
