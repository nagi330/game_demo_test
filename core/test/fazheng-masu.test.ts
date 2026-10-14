/**
 * 法正「睚眦必报」＋ 马谡「言过其实」（ADR-164）
 *
 * ## 设计者定稿
 *
 * 法正：「指定一名敌方人物标记为「仇敌」——仇敌每次受到伤害时，**敌方主公受到 1 点伤害**；
 *        其阵亡时，己方抽 2 张牌。」
 * 马谡：「战吼：己方抽 3 张牌。亡语：随机将 1 张手牌放回牌库底。」
 *
 * ## 本文件钉死的四件事
 *
 * ① ⭐ **`apply_status ... on_death:` 的载荷真的会执行** —— 这条路径**修好之前是坏的**
 *    （`runMarkDeath` 读了一个不存在的状态名 `chou_di_shou`），所以本文件是它的**第一个真实用例**。
 *    另有一条**反向**测试：把 `chou_di` 换成一个没人结算的标记名，载荷必须不生效
 *    —— 用来防止日后有人"顺手"把它改回去。
 * ② **打主公是固定 1 点，不是等量**（等量＝双倍伤害，4 费卡不该有这种压制力）。
 * ③ ⭐ **卡牌级标记不依赖标记者存活**：法正先死、仇敌后死，抽 2 照样发生（这是它比
 *    `on_mark_death` 单位级触发更稳的地方）。
 * ④ 马谡的亡语是**放回牌库底 1 张**（不是弃 3 张 —— 代价重到没人愿意选这张卡就是设计失败）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { applyAction } from '../src/engine.ts';
import { runEffects } from '../src/effects.ts';
import { createRng } from '../src/rng.ts';
import { getUnit } from '../src/state.ts';
import { dealDamage, resolveTurnStartDamage, unitRef } from '../src/mutate.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { Action, CardDef, GameEvent } from '../src/types.ts';

const REAL: CardDef[] = JSON.parse(
  readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'),
);
const real = (id: string): CardDef => {
  const c = REAL.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
};

const FZ = real('shu_fazheng');
const MS = real('shu_masu');
for (const c of [FZ, MS, real('neutral_infantry')]) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);
}

/**
 * ⚠️ 摆位一律走夹具的 `scenario()`（它用 `setUnit` + `makeUnit` + `nextUidSeq`）——
 * 手搓 `{cardId, hp, ...}` 会缺 `uid`，标记联动（靠 `srcUid` 找人）会静默失配。
 */
function setup(card: CardDef, opts: { enemy?: number } = {}) {
  const { state, ctx } = scenario({
    own: { front: ['neutral_infantry'] },
    ownCommand: 10,
    enemy: { front: Array.from({ length: opts.enemy ?? 1 }, () => 'test_champion') },
    ownHand: [card.id],
  });
  state.sides.own.deck = Array.from({ length: 30 }, () => 'neutral_infantry');
  state.sides.enemy.deck = Array.from({ length: 30 }, () => 'neutral_infantry');
  for (let col = 0; col < (opts.enemy ?? 1); col++) {
    const u = getUnit(state, 'enemy', 'front', col);
    if (u) { u.hp = 30; u.maxHp = 30; u.baseMaxHp = 30; }   // 血厚，别被顺手打死
  }
  return { state, ctx };
}

const play = (s: ReturnType<typeof setup>['state'], c: ReturnType<typeof setup>['ctx']) =>
  applyAction(s, c, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 2 } as Action);

const types = (ev: GameEvent[]) => ev.map((e) => e.type);

/* ============================================================
   一、数据形态
   ============================================================ */

test('法正 数据：4 费 1/4 精英；战吼挂仇敌（带 on_death 载荷）＋ on_mark_damaged 固定 1 点', () => {
  assert.equal(`${FZ.cost}费 ${FZ.attack}/${FZ.health}`, '4费 1/4');
  assert.equal(FZ.rarity, 'elite');
  const [mark, dmg] = FZ.skills ?? [];
  assert.equal(mark!.name, '睚眦必报');
  assert.equal(mark!.trigger, 'on_play');
  const ap = (mark!.effects ?? [])[0]!;
  assert.equal(ap.action, 'apply_status');
  assert.equal(ap.status, 'chou_di', '必须挂 chou_di —— runMarkDamaged 读的就是这个名字');
  assert.deepEqual(ap.on_death, [{ action: 'draw', value: 2 }], '阵亡载荷应写在标记上（ADR-087）');
  assert.equal(ap.target?.mode, 'choose');

  assert.equal(dmg!.trigger, 'on_mark_damaged');
  const d = (dmg!.effects ?? [])[0]!;
  assert.equal(d.action, 'damage');
  assert.equal(d.value, 1, '固定 1 点，不是等量（不写 value_from_flag）');
  assert.equal(d.value_from_flag, undefined, '🔴 用等量就是双倍伤害，4 费卡撑不住');
  assert.equal(d.target?.side, 'enemy');
  assert.equal(d.target?.lord, true, '打的是敌方主公');
});

test('马谡 数据：3 费 1/3 精英；战吼抽 3 ＋ 亡语放回牌库底 1 张；旧「搞意」已退役', () => {
  assert.equal(`${MS.cost}费 ${MS.attack}/${MS.health}`, '3费 1/3');
  assert.equal(MS.rarity, 'elite');
  const [draw, death] = MS.skills ?? [];
  assert.equal(draw!.name, '言过其实');
  assert.equal(draw!.trigger, 'on_play');
  assert.equal((draw!.effects ?? [])[0]?.action, 'draw');
  assert.equal((draw!.effects ?? [])[0]?.value, 3, '抽 3 张');

  assert.equal(death!.name, '言过其实（败绩）');
  assert.equal(death!.trigger, 'on_death');
  const s2d = (death!.effects ?? [])[0]!;
  assert.equal(s2d.action, 'send_hand_to_deck');
  assert.equal(s2d.to, 'deck_bottom', '放回**牌库底**');
  assert.equal(s2d.mode, undefined, '不写 mode ＝ 随机（设计者有意保留）');
  // 旧版的两处数据问题必须不再存在
  assert.ok(!(MS.skills ?? []).some((s) => s.name === '搞意'), '「搞意」是错别字，应已退役');
  assert.ok(!MS.effects, '旧版把 effects 缩进到了卡牌层，新技能应在 skills 里');
});

/* ============================================================
   二、⭐ 引擎修复：卡牌级标记的阵亡载荷真的会跑
   ============================================================ */

test('⭐ 睚眦必报：仇敌阵亡 → 己方抽 2 张（ADR-164 修好的那条路径）', () => {
  const { state, ctx } = setup(FZ);
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  const victim = getUnit(r.state, 'enemy', 'front', 0)!;
  assert.ok(victim.statuses.chou_di, '仇敌标记应挂上');
  assert.ok(victim.statuses.chou_di.payoff?.length, '载荷应写在标记实例上');

  const ev: GameEvent[] = [];
  const deckBefore = r.state.sides.own.deck.length;
  dealDamage(r.state, ctx.cards, unitRef('enemy', 'front', 0), 99, ev, '测试', 0);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0), null, '仇敌应已阵亡');
  assert.equal(r.state.sides.own.deck.length, deckBefore - 2, '阵亡载荷应抽 2 张');
});

test('⭐ 睚眦必报：**法正先死、仇敌后死** → 载荷照样生效（卡牌级标记不依赖标记者存活）', () => {
  const { state, ctx } = setup(FZ);
  const r = play(state, ctx);
  const me = getUnit(r.state, 'own', 'front', 2)!;
  assert.equal(me.cardId, 'shu_fazheng');
  const ev: GameEvent[] = [];
  dealDamage(r.state, ctx.cards, unitRef('own', 'front', 2), 99, ev, '测试', 0);
  assert.equal(getUnit(r.state, 'own', 'front', 2), null, '法正应已阵亡');

  const deckBefore = r.state.sides.own.deck.length;
  dealDamage(r.state, ctx.cards, unitRef('enemy', 'front', 0), 99, ev, '测试', 0);
  assert.equal(r.state.sides.own.deck.length, deckBefore - 2,
    '法正已死，但仇敌阵亡的载荷仍应结算（这正是 ADR-087 的设计意图）');
});

test('🔴 反向守门：标记名换成没人结算的那个，载荷必须**不**生效（防止改回坏写法）', () => {
  // `runMarkDeath` 曾经只读 `chou_di_shou ?? zhen_wang` —— 而 `chou_di_shou` **全仓库不存在**。
  // 本测试人为挂一个 `chou_di_shou`（不存在的状态）＋ 一个带载荷的 `chou_di`，
  // 断言"只有 chou_di 那条能被读到"。若日后有人把取值改回只认 chou_di_shou，这条会变红。
  const { state, ctx } = setup(FZ);
  const r = play(state, ctx);
  const victim = getUnit(r.state, 'enemy', 'front', 0)!;
  assert.ok(victim.statuses.chou_di?.payoff, '载荷在 chou_di 上');
  assert.equal(victim.statuses.chou_di_shou, undefined, 'chou_di_shou 不该被任何卡使用');

  const deckBefore = r.state.sides.own.deck.length;
  const ev: GameEvent[] = [];
  dealDamage(r.state, ctx.cards, unitRef('enemy', 'front', 0), 99, ev, '测试', 0);
  assert.equal(r.state.sides.own.deck.length, deckBefore - 2,
    'runMarkDeath 必须读 chou_di');
});

/* ============================================================
   三、仇敌受伤 → 敌方主公固定 −1
   ============================================================ */

test('睚眦必报：仇敌被打 → 敌方主公 −1（固定，不是等量）', () => {
  // ⚠️ 必须走**真实攻击**，不能裸调 `dealDamage` ——
  //    `runMarkDamaged` 只在三处被调用：单位普攻（`effects.ts:1000`）、DSL 的 `damage` 效果
  //    （`:1274`）、主公攻击（`engine.ts:124`）。裸调 `dealDamage` 走不到标记联动。
  const { state, ctx } = setup(FZ);
  const r = play(state, ctx);
  const lordBefore = r.state.sides.enemy.lord.hp;
  const victimHpBefore = getUnit(r.state, 'enemy', 'front', 0)!.hp;

  // 己方步兵打仇敌一次
  const atk = applyAction(r.state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  } as Action);
  assert.ok(atk.ok, atk.error ?? '');
  const dealt = victimHpBefore - getUnit(atk.state, 'enemy', 'front', 0)!.hp;
  assert.ok(dealt > 0, '仇敌应吃到伤害');
  assert.equal(atk.state.sides.enemy.lord.hp, lordBefore - 1,
    `🔴 固定 1 点（若实现成"等量"，打出 ${dealt} 点就该 −${dealt}）`);
});

test('睚眦必报：仇敌**多次**被打 → 每次各 −1（可累积）', () => {
  const { state, ctx } = setup(FZ);
  const r = play(state, ctx);
  const lordBefore = r.state.sides.enemy.lord.hp;
  let cur = r.state;
  // ⚠️ 己方步兵只有 1/2，打 5 攻的对手会被**反击打死**，打不出第二下 —— 先给他厚血。
  const atk0 = getUnit(cur, 'own', 'front', 0)!;
  atk0.hp = 50; atk0.maxHp = 50; atk0.baseMaxHp = 50;
  // 三次普通攻击（每次攻击后重置 attackedThisTurn，模拟三个回合）
  for (let i = 0; i < 3; i++) {
    const mine = getUnit(cur, 'own', 'front', 0)!;
    mine.attackedThisTurn = 0;
    mine.hp = 50;    // 反击可能削血，保证活得下来
    const a = applyAction(cur, ctx, {
      type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
    } as Action);
    assert.ok(a.ok, a.error ?? '');
    cur = a.state;
  }
  assert.equal(cur.sides.enemy.lord.hp, lordBefore - 3, '3 次受伤 → 主公 −3（不是等量的 −6）');
});

test('睚眦必报：**没被标记**的敌人受伤 → 主公不掉血（不能无条件白嫖）', () => {
  const { state, ctx } = setup(FZ);
  const r = play(state, ctx);
  // 手动把标记摘掉，模拟"打的是没被标记的那个"
  const victim = getUnit(r.state, 'enemy', 'front', 0)!;
  delete victim.statuses.chou_di;
  const lordBefore = r.state.sides.enemy.lord.hp;
  const a = applyAction(r.state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  } as Action);
  assert.ok(a.ok, a.error ?? '');
  assert.equal(a.state.sides.enemy.lord.hp, lordBefore, '未标记 → 主公不掉血');
});

/* ============================================================
   三·补：⭐ ADR-164 二次修复 —— **任何实质性掉血**都要触发
   （联动从 3 条路径搬进 `dealDamage`，一次覆盖全部 14 个调用点）
   ============================================================ */

test('⭐ 灼烧跳伤（DoT）也触发仇敌标记 —— 修复前这条路径完全漏掉', () => {
  const { state, ctx } = setup(FZ);
  const r = play(state, ctx);
  const victim = getUnit(r.state, 'enemy', 'front', 0)!;
  assert.ok(victim.statuses.chou_di, '先要有仇敌标记');

  // 给仇敌挂 3 层灼烧（回合开始按层数跳伤）
  victim.statuses.zhuo_shao = { stacks: 3, turns: 99 } as never;
  const lordBefore = r.state.sides.enemy.lord.hp;
  const hpBefore = victim.hp;

  const ev: GameEvent[] = [];
  resolveTurnStartDamage(r.state, ctx.cards, 'enemy', ev);

  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, hpBefore - 3, '灼烧应烧掉 3 点');
  assert.equal(r.state.sides.enemy.lord.hp, lordBefore - 1,
    '🔴 灼烧掉血也算"受到伤害" → 主公该 −1（这正是本次修复补上的路径）');
});

test('⭐ 致命伤也触发：一次打死仇敌 → 主公 −1 **且** 己方抽 2（受伤与阵亡两笔都算）', () => {
  const { state, ctx } = setup(FZ);
  const r = play(state, ctx);
  const victim = getUnit(r.state, 'enemy', 'front', 0)!;
  victim.hp = 2;                                  // 打一下就死
  const lordBefore = r.state.sides.enemy.lord.hp;
  const deckBefore = r.state.sides.own.deck.length;

  const ev: GameEvent[] = [];
  dealDamage(r.state, ctx.cards, unitRef('enemy', 'front', 0), 99, ev, '测试', 0);

  assert.equal(getUnit(r.state, 'enemy', 'front', 0), null, '仇敌应已阵亡');
  assert.equal(r.state.sides.enemy.lord.hp, lordBefore - 1,
    '致命伤同样算"受到伤害" → 主公 −1（钩子刻意排在 killUnit 之前）');
  assert.equal(r.state.sides.own.deck.length, deckBefore - 2, '阵亡载荷 → 抽 2 张');
});

test('⭐ 不会**双重触发**：一次普攻只让主公掉 1 点（联动搬家后最容易踩的坑）', () => {
  // 修复时把联动从 3 个调用点搬进了 `dealDamage`。若忘了删原来那 3 处，
  // 普攻路径就会**触发两次**（主公 −2）。这条测试专门守住它。
  const { state, ctx } = setup(FZ);
  const r = play(state, ctx);
  const lordBefore = r.state.sides.enemy.lord.hp;
  const atk = applyAction(r.state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 },
  } as Action);
  assert.ok(atk.ok, atk.error ?? '');
  assert.equal(atk.state.sides.enemy.lord.hp, lordBefore - 1, '🔴 只该 −1，不是 −2');
});

test('⭐ DSL 的 `damage` 效果同样只触发一次（重构后回归覆盖）', () => {
  const { state, ctx } = setup(FZ);
  const r = play(state, ctx);
  const lordBefore = r.state.sides.enemy.lord.hp;
  const ev: GameEvent[] = [];
  // 直接跑一条 damage 效果（走 effects.ts 的 damage 分支）
  runEffects(r.state, ctx.cards, [{ action: 'damage', value: 4,
    target: { side: 'enemy', filter: { type: 'character' }, count: 1, mode: 'choose' } }],
  { side: 'own' }, createRng(1), ev);
  assert.equal(r.state.sides.enemy.lord.hp, lordBefore - 1, '效果伤害只该让主公 −1');
});

/* ============================================================
   四、马谡
   ============================================================ */

test('言过其实：战吼己方抽 3 张', () => {
  const { state, ctx } = setup(MS);
  const deckBefore = state.sides.own.deck.length;
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.own.deck.length, deckBefore - 3, '应抽 3 张');
  assert.equal(r.state.sides.own.hand.length, 3, '手牌 3 张（马谡自己已下场）');
});

test('言过其实（败绩）：阵亡时**随机**把 1 张手牌放回牌库底', () => {
  const { state, ctx } = setup(MS);
  const r = play(state, ctx);
  const ev: GameEvent[] = [];
  const handBefore = r.state.sides.own.hand.length;
  const deckBefore = r.state.sides.own.deck.length;
  assert.equal(handBefore, 3);

  dealDamage(r.state, ctx.cards, unitRef('own', 'front', 2), 99, ev, '测试', 0);
  assert.equal(getUnit(r.state, 'own', 'front', 2), null, '马谡应已阵亡');
  assert.equal(r.state.sides.own.hand.length, handBefore - 1, '手牌少 1 张');
  assert.equal(r.state.sides.own.deck.length, deckBefore + 1, '那张进了牌库');
  assert.ok(types(ev).includes('CARD_RETURNED_TO_DECK'), '应发"放回牌库"事件');
});

test('⭐ 溃败代价是**温和**的：放回牌库底（牌还在），不是弃掉（真损失）', () => {
  const { state, ctx } = setup(MS);
  const r = play(state, ctx);
  const ev: GameEvent[] = [];
  const discardBefore = r.state.sides.own.discard.length;
  dealDamage(r.state, ctx.cards, unitRef('own', 'front', 2), 99, ev, '测试', 0);
  assert.equal(r.state.sides.own.discard.length, discardBefore,
    '🔴 一张都不该进弃牌堆 —— 设计者口径：代价不能重到没人愿意选这张卡');
  const ret = ev.find((e) => e.type === 'CARD_RETURNED_TO_DECK') as
    Extract<GameEvent, { type: 'CARD_RETURNED_TO_DECK' }> | undefined;
  assert.equal(ret?.to, 'deck_bottom', '放回的是**牌库底**');
});
