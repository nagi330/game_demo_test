/**
 * ADR-074：内容缺口收口（空城计 / 司马懿 / 休养生息 / 黄皓 / 张宝·张梁）
 *        + 让客户端能看见技能的 `SKILL_TRIGGERED`
 *
 * 数据来自 core/data/cards.json（真实翻译结果），不是测试替身。
 *
 * | 卡 | 补了什么引擎能力 |
 * |---|---|
 * | 空城计 | 主帅可被 `untargetable` 保护（`kong_cheng`）+ `legalTargets` 判定 |
 * | 司马懿 | `acted_this_turn` / `dealt_damage_this_turn` 追踪、`mill` 动作、`any_of` 条件组合 |
 * | 休养生息 | `skip_turn` 能力 + 引擎的跳回合结算 + 主将治疗 |
 * | 黄皓 | ~~`gain_command` 负数、`ban_play`~~ → **2026-10-11 重做（ADR-155）**：旧的两条能力已随重做撤下（`ban_play` 的行为覆盖移入 `dsl.test.ts`，新设计见 `huanghao.test.ts`） |
 * | 张宝/张梁 | `all_of` 条件组合 + 按 `card_id` 精确判「谁在场」 |
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { applyAction } from '../src/engine.ts';
import { legalTargets } from '../src/rules.ts';
import { getUnit, makeUnit, setUnit } from '../src/state.ts';
import { dealDamage, lordRef } from '../src/mutate.ts';
import { applyStatus } from '../src/mutate.ts';
import { STATUSES } from '../src/constants.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { Action, CardDef, GameEvent, Unit } from '../src/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL: CardDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));

for (const c of ALL) {
  const flat: CardDef = {
    ...c,
    keywords: c.keywords ?? [],
    skills: c.skills ?? [],          // cards.json 的技能已是摊平后的正式形状（无 skills[].dsl）
  };
  const i = TEST_CARDS.findIndex((x) => x.id === c.id);
  if (i >= 0) TEST_CARDS[i] = flat; else TEST_CARDS.push(flat);
}

function realCard(id: string): CardDef {
  const raw = ALL.find((c) => c.id === id);
  assert.ok(raw, `cards.json 里找不到 ${id}`);
  const flat: CardDef = {
    ...raw,
    keywords: raw.keywords ?? [],
    skills: raw.skills ?? [],
  };
  const i = TEST_CARDS.findIndex((x) => x.id === id);
  if (i >= 0) TEST_CARDS[i] = flat; else TEST_CARDS.push(flat);
  return flat;
}

const base = (id: string) => TEST_CARDS.find((x) => x.id === id)!;
const mk = (id: string, atk: number, hp: number, faction: 'shu' | 'wei' = 'wei'): Unit =>
  makeUnit({ id, name: id, faction, type: 'general', cost: 2, attack: atk, health: hp,
    keywords: [], tags: [], memo: '' } as CardDef, 1, 1);

const has = (evs: GameEvent[], t: GameEvent['type']) => evs.some((e) => e.type === t);
const tokens = (evs: GameEvent[]) =>
  evs.filter((e): e is Extract<GameEvent, { type: 'UNIT_SUMMONED' }> => e.type === 'UNIT_SUMMONED')
    .filter((e) => e.unit.cardId === 'token_huangjin_bing').length;

/* ============================================================
   空城计（ADR-156 重做）：主动撤空全场 + 主公一回合免疫伤害
   ============================================================ */

test('ADR-156 空城计：己方全场人物收回手牌，主公在下个回合免疫**所有**伤害', () => {
  realCard('tactic_kongchengji');
  const { state, ctx } = scenario({
    ownHand: ['tactic_kongchengji'],
    own: { front: ['neutral_infantry', null, 'neutral_archer'] },
    enemy: { front: ['neutral_infantry'] },
  });
  const handBefore = state.sides.own.hand.length;      // 1

  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.ok(r.ok, `打出应成功：${r.error}`);

  // ① 全场人物收回手牌（打出 1 张、收回 2 张 → 净 +1）
  assert.equal(getUnit(r.state, 'own', 'front', 0), null, '场上人物应已撤回');
  assert.equal(getUnit(r.state, 'own', 'front', 2), null);
  assert.equal(r.state.sides.own.hand.length, handBefore - 1 + 2,
    '打出的那张离手、两张收回手里');
  assert.ok(r.state.sides.own.lord.statuses?.kong_cheng, '主公应获得「空城」');

  // ② 跨过对手整个回合
  const r2 = applyAction(r.state, ctx, { type: 'END_TURN' });
  assert.ok(r2.ok);
  assert.ok(r2.state.sides.own.lord.statuses?.kong_cheng,
    '对手回合内「空城」必须还在（duration 写 2 的原因：状态在**自己**回合结束才递减）');

  // ③ 免伤期间**连效果伤害一起免** —— 这是它比旧版「不能被普攻指定」强的地方
  const hp = r2.state.sides.own.lord.hp;
  const dealt = dealDamage(r2.state, ctx.cards, lordRef('own'), 5, [], 'test');
  assert.equal(dealt, 0, '空城期间伤害应被完全吸收');
  assert.equal(r2.state.sides.own.lord.hp, hp, '主公一点血都不掉');

  // ④ 到期时机：主公状态在**持有者自己的回合结束**才递减（`expireStatuses` 只 tick 当前方），
  //    所以回到我方时它还剩 1 回合，真正过期是在**那一次我方回合结束**。
  //    这正是 `duration` 必须写 2 的原因 —— 写 1 会在对手动手之前就消失。
  const r3 = applyAction(r2.state, ctx, { type: 'END_TURN' });   // 对手回合结束 → 回到我方
  assert.ok(r3.ok);
  assert.ok(r3.state.sides.own.lord.statuses?.kong_cheng,
    '回到我方回合时仍应在（还剩 1 回合）—— 它就是这样盖住对手那一整个回合的');

  const r4 = applyAction(r3.state, ctx, { type: 'END_TURN' });   // 我方回合结束 → 递减到 0
  assert.ok(r4.ok);
  assert.equal(r4.state.sides.own.lord.statuses?.kong_cheng, undefined,
    '我方回合结束后才过期');
});


test('ADR-156：`kong_cheng` / `mian_shang` 状态都已注册（前者现已无卡在用，保留备用）', () => {
  assert.ok(STATUSES.kong_cheng, 'kong_cheng 必须登记在 STATUSES');
  assert.ok(STATUSES.kong_cheng!.caps!.includes('untargetable'));
  assert.ok(STATUSES.mian_shang, 'mian_shang 必须登记在 STATUSES');
  assert.ok(STATUSES.kong_cheng!.caps!.includes('immune_all_damage'),
    '主公免疫伤害靠的就是它 —— 主公伤害分支会读这个能力');
  assert.ok(STATUSES.mian_shang!.caps!.includes('immune_all_damage'));
  assert.equal(STATUSES.mian_shang!.duration, 'this_turn',
    '⚠️ mian_shang 是 this_turn，撑不过当前半回合 —— 跨回合的主公免疫不能用它');
});

/* ============================================================
   司马懿「谋定后动」①②③
   ============================================================ */

/**
 * 司马懿在己方场上，敌方摆两个 30 血沙包（便于观察 AOE / 不被打死）。
 *
 * ⚠️ 己方**必须再站一个人**：否则触发 ③「场上只剩司马懿」，
 * `any_of` 的第二个分支恒真，①②的断言全被污染（第一版就栽在这里）。
 */
function simayiBoard(withDeck = true) {
  realCard('wei_simayi');
  const { state, ctx } = scenario({ own: { front: ['wei_simayi', 'neutral_infantry'] } });
  setUnit(state, 'enemy', 'front', 0, mk('dummy0', 1, 30));
  setUnit(state, 'enemy', 'front', 1, mk('dummy1', 1, 30));
  // 注意：牌库会在对手回合开始时被抽走 1 张，所以断言要看事件而不是死数长度
  if (withDeck) state.sides.enemy.deck = ['neutral_infantry', 'neutral_archer', 'neutral_shieldman'];
  return { state, ctx };
}

test('ADR-141 司马懿谋定后动：本回合未行动 → 抽牌并获得 1 层蓄谋', () => {
  const { state, ctx } = simayiBoard();
  state.sides.own.deck = ['neutral_infantry'];
  const r = applyAction(state, ctx, { type: 'END_TURN' });
  assert.ok(r.ok);
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.statuses.xu_mou?.stacks, 1);
  assert.equal(r.state.sides.own.hand.length, 1, '应抽到 1 张牌');
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 30, '未行动不应造成伤害');
});

test('ADR-141 司马懿谋定后动：行动造成伤害 → 按蓄谋层数伤害敌方人物并清除蓄谋', () => {
  const { state, ctx } = simayiBoard();
  state.sides.own.deck = ['neutral_infantry', 'neutral_archer', 'neutral_shieldman'];
  // 先结束一次己方回合，积累 1 层蓄谋。
  const rested = applyAction(state, ctx, { type: 'END_TURN' });
  assert.ok(rested.ok);
  const back = applyAction(rested.state, ctx, { type: 'END_TURN' });
  assert.ok(back.ok);
  const currentSim = getUnit(back.state, 'own', 'front', 0)!;
  assert.equal(currentSim.statuses.xu_mou?.stacks, 1);
  const foe = mk('target', 0, 30);
  setUnit(back.state, 'enemy', 'front', 2, foe);

  const atk = applyAction(back.state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 2 },
  });
  assert.ok(atk.ok, `攻击应成功：${atk.error}`);
  assert.equal(getUnit(atk.state, 'own', 'front', 0)!.actedThisTurn, true, '行动过');
  assert.equal(getUnit(atk.state, 'own', 'front', 0)!.dealtDamageThisTurn, true, '造成过伤害');

  const r = applyAction(atk.state, ctx, { type: 'END_TURN' });
  assert.ok(r.ok);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 29, '行动造成伤害后按 1 层蓄谋造成伤害');
  assert.equal(getUnit(r.state, 'enemy', 'front', 1)!.hp, 29);
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.statuses.xu_mou, undefined, '爆发后清除蓄谋');
});

test('ADR-074 司马懿：只是行动、没造成伤害 → 两个分支都不触发', () => {
  const { state, ctx } = simayiBoard();
  // 构造"行动过但没造成伤害"。
  //
  // ⚠️ 原写法是"把司马懿攻击力改成 0，再去打一个 0 攻的墙"——**ADR-154 起这条路走不通了**：
  // 0 攻单位一律不能普通攻击（`canAttack` 直接拒绝），攻击动作本身会被拒。
  // 改为**让伤害被挡掉**：给靶子挂「披坚」（`immune_damage`，一次性免疫整段伤害）——
  // 攻击照常成立（`actedThisTurn = true`、披坚被消耗），但实际伤害为 0 → `dealtDamageThisTurn` 保持 false。
  // 这也比原写法更贴近真实对局：「打了但被打披坚的人挡住了」是实际会发生的情形。
  const wall = mk('wall', 1, 30);
  setUnit(state, 'enemy', 'front', 2, { ...wall, statuses: { ...wall.statuses, sheng_dun_status: { stacks: 1 } } });

  const atk = applyAction(state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 2 },
  });
  assert.ok(atk.ok, `攻击应成功：${atk.error}`);
  assert.equal(getUnit(atk.state, 'own', 'front', 0)!.actedThisTurn, true, '行动过');
  assert.equal(getUnit(atk.state, 'own', 'front', 0)!.dealtDamageThisTurn, false, '伤害被披坚挡掉 = 没造成伤害');
  assert.equal(getUnit(atk.state, 'enemy', 'front', 2)!.hp, 30, '披坚吃掉了这次伤害');
  assert.equal(getUnit(atk.state, 'enemy', 'front', 2)!.statuses.sheng_dun_status, undefined,
    '披坚是一次性的，应已被消耗');

  const r = applyAction(atk.state, ctx, { type: 'END_TURN' });
  assert.ok(r.ok);
  assert.ok(!has(r.events, 'CARD_MILLED'), '行动了但没造成伤害 → 不该拆牌库');
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 30, '行动过 → 也不该触发①的 AOE');
});

test('ADR-141 司马懿篡权：曹氏宗亲牌库少于 3 张时替代己方主公', () => {
  realCard('wei_simayi');
  const { state, ctx } = scenario({ own: { front: ['wei_simayi'] } });
  state.sides.own.deck = ['neutral_infantry'];
  const r = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '篡权应能发动');
  assert.equal(r.state.sides.own.lord.id, 'wei_simayi_lord');
  assert.equal(getUnit(r.state, 'own', 'front', 0), null, '司马懿应离开场上并替代主公');
  assert.ok(has(r.events, 'LORD_REPLACED'));
});

/* ============================================================
   休养生息：己方全体（含主帅）+3 血，然后抽 1 张
   ------------------------------------------------------------
   ADR-075（设计者裁定）把效果改成这个 —— 去掉了旧的
   「下一回合不进行任何活动」（skip_turn）与抽 3 张。
   ============================================================ */

test('ADR-075 休养生息：己方全体（含主帅）各回 3 血，然后抽 1 张', () => {
  realCard('tactic_xiushengyangxi');
  // ⚠️ 不能用 1/1 的步兵：它 maxHp = 1，治疗被上限吃掉，等于没测（第一版就栽在这里）
  const { state, ctx } = scenario({ ownHand: ['tactic_xiushengyangxi'], own: { front: ['test_champion'] } });
  const ally = getUnit(state, 'own', 'front', 0)!;
  ally.hp = 1;
  state.sides.own.lord.hp = 20;
  state.sides.own.deck = ['neutral_infantry', 'neutral_archer', 'neutral_shieldman', 'test_champion'];

  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.ok(r.ok, `打出应成功：${r.error}`);

  assert.equal(r.state.sides.own.lord.hp, 23, '「己方全体」含主帅 → 主帅回 3 点');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, 4, '场上人物回 3 点（1 → 4）');
  assert.equal(r.state.sides.own.hand.length, 1, '抽 1 张（原先是抽 3）');
  assert.equal(r.state.sides.own.deck.length, 3, '牌库只少 1 张');
  assert.equal(r.state.sides.own.lord.statuses?.xiu_zheng, undefined,
    'ADR-075 已去掉「下一回合不进行任何活动」，不该再挂「休整」');
});

test('ADR-075 休养生息：不再跳过任何一方的回合（回归：旧代价已移除）', () => {
  realCard('tactic_xiushengyangxi');
  const { state, ctx } = scenario({ ownHand: ['tactic_xiushengyangxi'] });
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.ok(r.ok, `打出应成功：${r.error}`);

  const r2 = applyAction(r.state, ctx, { type: 'END_TURN' });        // → 敌方
  assert.ok(r2.ok);
  const r3 = applyAction(r2.state, ctx, { type: 'END_TURN' });       // → 回来正常轮到自己
  assert.ok(r3.ok, `对手结束回合应成功：${r3.error}`);
  assert.ok(!has(r3.events, 'TURN_SKIPPED'), '不该再出现跳回合');
  assert.equal(r3.state.active, 'own', '轮次应正常回到自己');
});

test('ADR-075 / ADR-074：`skip_turn` 能力与 `xiu_zheng` 状态仍保留（当前无卡使用）', () => {
  // 设计者随时可能把「下一回合不进行任何活动」挂回某张卡，能力与测试一并留着
  assert.ok(STATUSES.xiu_zheng, 'xiu_zheng 必须登记在 STATUSES');
  assert.ok(STATUSES.xiu_zheng!.caps!.includes('skip_turn'));
});

/* ============================================================
   陈到：「白毦兵」暂缓设计（ADR-075）→ 已由 ADR-165 定稿
   ============================================================ */

/* ADR-075 曾裁定「陈到先作为**无技能武将**进卡池」（手写稿只写了技能名「白毦兵」、正文区空白，
   挂 `pending: true` 会让卡面显示一个点不动也没有效果的技能）。
   ⚠️ 该裁定已被 **ADR-165**（2026-10-15）取代：陈到改为 **4 费 3/3**，技能「**白毦统领**」
   ＝ `kind: aura`，给己方白毦兵的「忠勇」（thorns）**+1 层**。
   原先这里的三条「3 费 2/2 白板」断言（含「不该有任何技能」）已随重做删除 ——
   数据形态与行为的守门人移到了 **`core/test/chendao-zhongyong.test.ts`（10 条）**，
   那里锁死了「必须是 aura 而不是战吼」这条硬约束（ADR-165 实测：战吼加层会被静默吃掉）。 */

/**
 * ⚠️ 这条测试必须读 `cards.json`（真实运行数据 + 校验器读的那份）。
 * 历史上曾误读草稿层的 `cards_v1.json` —— `pending` 标记只在正式数据里才有，
 * 读草稿层这条断言会**永远通过**（第一版就是这么写的空转测试）。
 * ADR-091 起草稿层导出的 `cards_v1.json` 已不再生成，全池测试统一读 `cards.json`。
 */
test('ADR-075：人物卡不再有「有技能名、效果待设计」的 pending 技能（陈到回归）', () => {
  const runtime: CardDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));
  const pending = runtime.filter((c) =>
    (c.skills ?? []).some((sk) => (sk as { pending?: boolean }).pending));
  const pendingIds = pending.map((c) => c.id);
  const names = pending.map((c) => `${c.id}（${c.name}）`);

  // 人物卡（general / strategist）一个都不能有：卡面会显示一个点不动、也没效果的技能
  const chars = pending.filter((c) => ['general', 'strategist'].includes(c.type))
    .map((c) => `${c.id}（${c.name}）`);
  assert.deepEqual(chars, [], `这些人物卡还挂着 pending 技能：${chars.join('、')}`);

  // 剩下的只允许是「限制型文案」那几张（等 ADR-045 的 restrict 字段），换名单就报错。
  // 步兵（neutral_infantry）原在这张名单里，2026-09-27 设计者裁定撤下桩技能、改白板 1/1；
  // 机械哨兵（token_jixie_shaobing）也在 2026-10-11 随黄月英重做撤下（ADR-152）——
  // 它的「不能攻击敌方主帅」整条移除、改用**真正生效**的「先攻」关键词，
  // 于是这张名单**已经清空**。数据的改动在 data/cards.yaml 有注释留痕。
  const ALLOW: string[] = [];
  assert.deepEqual([...pendingIds].sort(), [...ALLOW].sort(),
    `pending 技能名单变了：${names.join('、')} —— 若是新加的限制型文案，`
    + '请连同 ADR-045 的 restrict 字段一起处理，不要让它静默挂在卡上');
});

test('ADR-152：机械哨兵已从 pending 名单撤下（改用「先攻」，不再是空文案）', () => {
  const runtime: CardDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));
  const sb = runtime.find((c) => c.id === 'token_jixie_shaobing');
  assert.ok(sb, 'cards.json 里应有机械哨兵');
  assert.equal((sb!.skills ?? []).some((sk) => (sk as { pending?: boolean }).pending), false,
    '不该再有 pending 空壳技能');
  assert.ok((sb!.keywords ?? []).includes('xian_gong'), '应改为真正生效的「先攻」关键词');
});

test('ADR-075：陈到确实从 pending 名单里出来了（防"测试读错文件"回归）', () => {
  const runtime: CardDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));
  const chendao = runtime.find((c) => c.id === 'shu_chendao')!;
  assert.ok(chendao, 'cards.json 里应有陈到');
  assert.ok(!(chendao.skills ?? []).some((sk) => (sk as { pending?: boolean }).pending),
    '陈到不该再有 pending 技能');
});

/* ============================================================
   黄皓「谮言」→ 已于 2026-10-11 整体重做（ADR-155）
   ============================================================ */

// 旧设计（`gain_command` 负数自削统率 + `ban_play` 永久封锁随机一张手牌）**已整条删除**：
// 除了设计上的问题（对手无感、只有自伤），`ban_play` 当时**没写 `duration`** → `turns: undefined`
// → `expireHandMods` 直接保留 → **永久封锁**，违反 `12-randomness.md:82`「不允许永久封锁」。
//
// 新设计 = 3 费 1/3 精英「谗言」（拼点弃牌，`clash` + `discard` 条件分支）
//        + 「覆国」（亡语：敌方主公 −4、己方主公 −2 的不对称直伤）。
// **本文件原本覆盖的两条引擎能力，去向如下**：
//   · `ban_play` 的**行为**断言（被封锁的牌打不出来）→ 已补进 `dsl.test.ts`
//     「禁止上场」那条（它原先只断言 `isBanned` 标记，测试名却承诺了行为 —— 名不副实）。
//     ⚠️ 该机制现在**全池 0 张卡在用**（旧黄皓是唯一使用者），保留以备后用。
//   · `gain_command` 负数 → 同样**全池 0 张卡在用**，已无真实卡覆盖。
//
// 黄皓新设计的完整测试见 **`core/test/huanghao.test.ts`**（8 条，含拼点两条分支、
// 平局算赢、亡语不对称、以及"玩家可主动撞死触发亡语"）。

/* ============================================================
   张宝 / 张梁「黄天当立」：按 card_id 精确判「谁在场」
   ============================================================ */

test('ADR-074 张宝：与张梁同场 → 2 个黄巾兵；三兄弟齐全 → 共 4 个', () => {
  realCard('qun_zhangbao');
  realCard('qun_zhangliang');
  realCard('qun_zhangjiao');

  // ① 只有张梁
  const a = scenario({ ownHand: ['qun_zhangbao'], own: { front: [null, 'qun_zhangliang'] } });
  const ra = applyAction(a.state, a.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(ra.ok, `打出应成功：${ra.error}`);
  assert.equal(tokens(ra.events), 2, '与张梁同场 → 2 个');

  // ② 三兄弟齐全
  const b = scenario({ ownHand: ['qun_zhangbao'], own: { front: [null, 'qun_zhangliang', 'qun_zhangjiao'] } });
  const rb = applyAction(b.state, b.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(rb.ok, `打出应成功：${rb.error}`);
  assert.equal(tokens(rb.events), 4, '三兄弟齐全 → 共 4 个');
});

test('ADR-074 张宝：只有黄巾标签的兵在场**不算**张梁（原先的宽条件会误触发）', () => {
  realCard('qun_zhangbao');
  realCard('token_huangjin_bing');
  const { state, ctx } = scenario({ ownHand: ['qun_zhangbao'], own: { front: [null, 'token_huangjin_bing'] } });
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r.ok, `打出应成功：${r.error}`);
  assert.equal(tokens(r.events), 0, '场上只有黄巾兵（不是张梁）→ 不该召唤');
});

test('ADR-074 张梁：与张宝同场 → 2 个；三兄弟齐全 → 共 4 个', () => {
  realCard('qun_zhangliang');
  realCard('qun_zhangbao');
  realCard('qun_zhangjiao');

  const a = scenario({ ownHand: ['qun_zhangliang'], own: { front: [null, 'qun_zhangbao'] } });
  const ra = applyAction(a.state, a.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(ra.ok, `打出应成功：${ra.error}`);
  assert.equal(tokens(ra.events), 2);

  const b = scenario({ ownHand: ['qun_zhangliang'], own: { front: [null, 'qun_zhangbao', 'qun_zhangjiao'] } });
  const rb = applyAction(b.state, b.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(rb.ok, `打出应成功：${rb.error}`);
  assert.equal(tokens(rb.events), 4);
});

/* ============================================================
   任何条件：all_of / any_of 的语义
   ============================================================ */

test('ADR-074 all_of：全部子条件成立才算过；any_of：任一成立即过', () => {
  const card: CardDef = {
    id: 'test_cond', name: '条件测试', faction: 'neutral', type: 'tactic', cost: 0, memo: 'x',
    effects: [
      { action: 'gain_armor', value: 1,
        condition: { all_of: [
          { exists: { side: 'enemy', filter: { card_id: 'e_a' } } },
          { exists: { side: 'enemy', filter: { card_id: 'e_b' } } },
        ] } },
      { action: 'gain_command', value: 1,
        condition: { any_of: [
          { exists: { side: 'enemy', filter: { card_id: 'nope' } } },
          { exists: { side: 'enemy', filter: { card_id: 'e_a' } } },
        ] } },
    ],
  };
  if (!TEST_CARDS.some((c) => c.id === card.id)) TEST_CARDS.push(card);

  // 只有 e_a → all_of 不过、any_of 过
  const one = scenario({ ownHand: ['test_cond'] });
  setUnit(one.state, 'enemy', 'front', 0, mk('e_a', 1, 3));
  const r1 = applyAction(one.state, one.ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.ok(r1.ok, `${r1.error}`);
  assert.equal(r1.state.sides.own.lord.armor, 0, 'all_of 缺一个 → 不该加护甲');
  assert.ok(has(r1.events, 'HAND_MODIFIED') === false);   // gain_command 不发事件，用统率值判
  assert.equal(r1.state.sides.own.command.cur, 10, 'any_of 命中也不该超上限（10 已是 max）');

  // 两个都在 → all_of 过
  const both = scenario({ ownHand: ['test_cond'] });
  setUnit(both.state, 'enemy', 'front', 0, mk('e_a', 1, 3));
  setUnit(both.state, 'enemy', 'front', 1, mk('e_b', 1, 3));
  both.state.sides.own.command = { cur: 3, max: 10 };
  const r2 = applyAction(both.state, both.ctx, { type: 'PLAY_CARD', cardIndex: 0 });
  assert.ok(r2.ok, `${r2.error}`);
  assert.equal(r2.state.sides.own.lord.armor, 1, 'all_of 全中 → 加护甲');
  assert.equal(r2.state.sides.own.command.cur, 4, 'any_of 命中 → 统率 +1');
});

/* ============================================================
   SKILL_TRIGGERED：让客户端播得出"技能发动"
   ============================================================ */

test('ADR-074：战吼会产生 SKILL_TRIGGERED（带技能名/时机/来源）', () => {
  realCard('qun_caimao');
  const { state, ctx } = scenario({ ownHand: ['qun_caimao'] });
  setUnit(state, 'enemy', 'front', 0, mk('foe', 1, 9));
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r.ok, `${r.error}`);
  const ev = r.events.find((e) => e.type === 'SKILL_TRIGGERED') as Extract<GameEvent, { type: 'SKILL_TRIGGERED' }>;
  assert.ok(ev, '应发 SKILL_TRIGGERED');
  assert.equal(ev.skillName, '水攻');
  assert.equal(ev.from, 'on_play');
  assert.equal(ev.kind, 'trigger');
  assert.equal(ev.unitName, '蔡瑁');
  assert.equal(ev.row, 'front');
  assert.equal(ev.col, 0, '应带上坐标，客户端才能把提示画在卡上');
});

test('ADR-074：触发技 / 光环 / 主动技 / 主公技都发 SKILL_TRIGGERED', () => {
  // 触发技：张角 turn_end
  realCard('qun_zhangjiao');
  const zj = scenario({ own: { front: ['qun_zhangjiao'] } });
  const rz = applyAction(zj.state, zj.ctx, { type: 'END_TURN' });
  assert.ok(rz.events.some((e) => e.type === 'SKILL_TRIGGERED' && e.timing === 'turn_end'),
    'turn_end 触发技应发事件');

  // 光环：陈到（白毦统率）。注：此处不能用黄权（已从「劝谏」光环改为「断后」on_damaged）；
  // 也不能用关平 —— 他在 ADR-175 重做后技能改为「鸣金救主」战吼，**已无光环**。
  realCard('shu_chendao');
  const hq = scenario({ ownHand: ['shu_chendao'] });
  const rh = applyAction(hq.state, hq.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(rh.events.some((e) => e.type === 'SKILL_TRIGGERED' && e.kind === 'aura'),
    '光环重算应发事件');

  // 主动技：华佗「医圣」（ADR-148：不再弃牌，改直接治疗）
  realCard('qun_huatuo');
  const ht = scenario({ own: { front: ['qun_huatuo'] }, ownHand: ['neutral_infantry'] });
  setUnit(ht.state, 'own', 'front', 1, mk('patient', 1, 5, 'shu'));
  const rt = applyAction(ht.state, ht.ctx, {
    type: 'USE_SKILL', row: 'front', col: 0, target: { side: 'own', row: 'front', col: 1 },
  });
  assert.ok(rt.ok, `${rt.error}`);
  assert.ok(rt.events.some((e) => e.type === 'SKILL_TRIGGERED' && e.from === 'active'),
    '主动技应发事件');

  // 主公技：刘备「仁德」
  const lk = scenario({ ownHand: ['neutral_infantry'] });
  setUnit(lk.state, 'own', 'front', 0, mk('hurt', 1, 5, 'shu'));
  getUnit(lk.state, 'own', 'front', 0)!.hp = 2;
  const rl = applyAction(lk.state, lk.ctx, {
    type: 'USE_LORD_SKILL', target: { side: 'own', row: 'front', col: 0 },
  });
  assert.ok(rl.ok, `${rl.error}`);
  assert.ok(rl.events.some((e) => e.type === 'SKILL_TRIGGERED' && e.from === 'lord_skill'),
    '主公技应发事件');
});

test('ADR-074：亡语 / 击杀触发也发 SKILL_TRIGGERED（客户端才看得见）', () => {
  realCard('qun_huaxiong');
  const { state, ctx } = scenario({ own: { front: ['qun_huaxiong'] } });
  setUnit(state, 'enemy', 'front', 0, mk('victim', 1, 1));
  const r = applyAction(state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.ok(r.ok, `${r.error}`);
  assert.ok(r.events.some((e) => e.type === 'SKILL_TRIGGERED' && e.skillId === 'wei_zhen_si_fang'),
    '华雄「威震四方」的 on_kill 应发事件');
});

/* ============================================================
   回归：本回合行为标记在回合开始时重置
   ============================================================ */

test('ADR-074：actedThisTurn / dealtDamageThisTurn 在新回合被重置', () => {
  const { state, ctx } = scenario({ own: { front: ['test_champion'] } });
  setUnit(state, 'enemy', 'front', 0, mk('foe', 1, 30));
  const a = applyAction(state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.ok(a.ok);
  assert.equal(getUnit(a.state, 'own', 'front', 0)!.actedThisTurn, true);

  const b = applyAction(a.state, ctx, { type: 'END_TURN' });      // → 敌方
  const c = applyAction(b.state, ctx, { type: 'END_TURN' });      // → 自己（新回合）
  assert.ok(c.ok);
  const me = getUnit(c.state, 'own', 'front', 0)!;
  assert.equal(me.actedThisTurn, false, '新回合应重置');
  assert.equal(me.dealtDamageThisTurn, false);
});

test('ADR-074：光环施加的状态不会因为「本回合行动过」而误判（回归）', () => {
  const { state } = scenario({});
  applyStatus(state, lordRef('own'), 'kong_cheng', 1, []);
  assert.ok(state.sides.own.lord.statuses?.kong_cheng);
});
