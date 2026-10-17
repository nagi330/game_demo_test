/**
 * 庞统「连环」＝ 随机释放三张计策战法（ADR-162）
 *
 * ## 设计者定稿（原话）
 *
 * 「让其随机释放三个 + 阵亡的抽 2 卡的效果……总之就做到一个**不需要消耗费用**，
 *   **随机选三个计策卡打出去**，需要指定 Target 的就**随机**就好。」
 *
 * ## 本文件钉死的四件事
 *
 * ① **不消耗任何东西** —— 不碰手牌、不碰牌库、不付统率、不进弃牌堆；
 * ② **需要指定目标的一律随机** —— 这是本机制的核心（否则 `mode:'choose'` 会走兜底，
 *    变成"永远打合法池里的第一个"，静默且可预测）；
 * ③ **`count:'all'` 的群体效果仍然是全体** —— `mode` 不影响 `count:'all'`；
 * ④ ⭐ **作用在己方身上的计策会打到自己人** —— **有意保留的风险**（设计者口径"随机就好"），
 *    本文件把它**钉成文档**而不是当成 bug。
 *
 * ## 历史背景
 *
 * 「连环」是**演义**说法（毛本第 47 回「庞统巧授连环计」，**C**）——
 * 正史里连船是**曹操自己的部署**，被**黄盖**看破（卷五十四周瑜传正文
 * 「操军船舰，首尾相接，可烧而走也」）；连演义第 57 回都借孙权之口否认过。
 * 已写进卡面 `note`，此处不重复。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { applyAction } from '../src/engine.ts';
import { getUnit } from '../src/state.ts';
import { dealDamage, unitRef } from '../src/mutate.ts';
import { TEST_CARDS, loadTestData, scenario } from './fixtures.ts';
import type { Action, CardDef, GameEvent } from '../src/types.ts';

const REAL: CardDef[] = JSON.parse(
  readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'),
);
const real = (id: string): CardDef => {
  const c = REAL.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
};

const PT = real('shu_pangtong');
for (const c of [PT, real('neutral_infantry')]) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) TEST_CARDS.push(c);
}
/** ⚠️ `test_champion` 是**夹具卡**（不在 `cards.json` 里），只能从夹具卡表取 —— `real()` 会抛错 */
const CHAMPION = loadTestData().cards.get('test_champion')!;

/** 搭一个**卡池受控**的场面：替换 `ctx.cards`，让"随机释放"的结果空间可枚举 */
function setup(poolIds: string[], opts: { enemyCount?: number } = {}) {
  const { state, ctx } = scenario({
    own: { front: ['shu_pangtong'] }, ownCommand: 10,
    enemy: { front: ['test_champion', 'test_champion', 'test_champion'] },
  });
  state.sides.own.deck = Array.from({ length: 12 }, () => 'neutral_infantry');
  state.sides.enemy.deck = Array.from({ length: 12 }, () => 'neutral_infantry');
  state.sides.own.hand = [{ card: PT, mods: [] }];
  const keep = opts.enemyCount ?? 3;
  for (let col = 0; col < 3; col++) {
    if (col >= keep) { state.sides.enemy.rows.front[col] = null; continue; }
    const u = getUnit(state, 'enemy', 'front', col)!;
    u.hp = 20; u.maxHp = 20; u.baseMaxHp = 20;      // 血厚，不会被 3 张计策打死
  }
  const cards = new Map<string, CardDef>([
    ['shu_pangtong', PT], ['neutral_infantry', real('neutral_infantry')],
    ['test_champion', CHAMPION],
  ]);
  for (const id of poolIds) cards.set(id, real(id));
  ctx.cards = cards;
  return { state, ctx };
}

const playPT = (state: ReturnType<typeof setup>['state'], ctx: ReturnType<typeof setup>['ctx']) =>
  applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 3 } as Action);

const casts = (events: GameEvent[]) =>
  events.filter((e): e is Extract<GameEvent, { type: 'CARD_AUTO_CAST' }> => e.type === 'CARD_AUTO_CAST');

/* ============================================================
   一、数据形态
   ============================================================ */

test('庞统 数据：7 费 1/5 精英；战吼 cast_random 三张计策 + 亡语抽 2', () => {
  assert.equal(`${PT.cost}费 ${PT.attack}/${PT.health}`, '7费 1/5');
  assert.equal(PT.rarity, 'elite');
  const [lh, fz] = PT.skills ?? [];
  assert.equal(lh!.trigger, 'on_play');
  const eff = (lh!.effects ?? [])[0]!;
  assert.equal(eff.action, 'cast_random');
  assert.equal(eff.count, 3, '三张');
  assert.equal(eff.pool?.type, 'tactic');
  assert.deepEqual(eff.pool?.factions, ['neutral', 'qun'], '只取公共计策牌（不含蜀国专属）');
  assert.equal(fz!.trigger, 'on_death');
  assert.equal((fz!.effects ?? [])[0]?.value, 2, '亡语抽 2');
});

/* ============================================================
   二、连锁：释放数量 / 池子 / 不消耗资源
   ============================================================ */

test('连环：恰好释放 3 张，且**全部来自受控池**', () => {
  const { state, ctx } = setup(['tactic_tuntian', 'tactic_bishijixu']);
  const r = playPT(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  const list = casts(r.events);
  assert.equal(list.length, 3, `应恰好释放 3 张，实际 ${list.length}`);
  for (const e of list) {
    assert.ok(['tactic_tuntian', 'tactic_bishijixu'].includes(e.card.id),
      `释放的卡应来自受控池，实际是 ${e.card.id}`);
  }
});

test('⭐ 连环：**不消耗手牌、牌库与统率**', () => {
  // 池子里只放「避实击虚」（纯伤害、不抽牌），于是"释放"不会顺带改变手牌/牌库 ——
  // 任何数量变化都只可能来自 cast_random 自己。
  const { state, ctx } = setup(['tactic_bishijixu']);
  const handBefore = state.sides.own.hand.length;
  const deckBefore = state.sides.own.deck.length;
  const cmdBefore = state.sides.own.command.cur;
  const discardBefore = state.sides.own.discard.length;

  const r = playPT(state, ctx);
  assert.ok(r.ok, r.error ?? '');

  assert.equal(r.state.sides.own.deck.length, deckBefore,
    '牌库一张都不该少 —— 释放的卡不是从牌库里抽出来的');
  assert.equal(r.state.sides.own.hand.length, handBefore - 1,
    '手牌只少了打出的庞统本人');
  assert.equal(r.state.sides.own.discard.length, discardBefore,
    '被释放的卡不进弃牌堆');
  assert.equal(r.state.sides.own.command.cur, cmdBefore - PT.cost,
    `统率只扣庞统自己的 ${PT.cost} 费，三张计策分文不取`);
});

test('连环：只取**公共计策牌** —— 蜀国专属计策（以及魏吴）不进池', () => {
  // 池子口径是 `factions: [neutral, qun]`。蜀国目前只有 1 张计策卡（元戎弩射），
  // 正好拿它当反例 —— 这条同时钉死设计决定：**蜀国专属计策暂不纳入池子**
  //（纳入会让强度随内容增长漂移，须另行留档）。
  const shuTactic = REAL.find((c) => c.type === 'tactic' && c.faction === 'shu');
  assert.ok(shuTactic, '卡表里应有蜀国计策卡可作反例');
  // 反例卡若真被释放，会出现它的名字 —— 用一个能造成可见伤害的池子 + 蜀国卡做对照
  const { state, ctx } = setup(['tactic_bishijixu']);
  ctx.cards.set(shuTactic!.id, { ...shuTactic!, keywords: shuTactic!.keywords ?? [], skills: shuTactic!.skills ?? [] });
  for (let seed = 1; seed <= 12; seed++) {
    const b = setup(['tactic_bishijixu']);
    b.ctx.cards.set(shuTactic!.id, { ...shuTactic!, keywords: [], skills: shuTactic!.skills ?? [] });
    b.state.rngState = seed;
    for (const e of casts(playPT(b.state, b.ctx).events)) {
      assert.notEqual(e.card.id, shuTactic!.id,
        `蜀国专属计策「${shuTactic!.name}」不该进池（factions 只写 neutral/qun）`);
    }
  }
  void state; void ctx;
});

test('连环：池子里没有计策时**安全空转**（不崩、不静默改状态）', () => {
  const { state, ctx } = setup([]);
  const deckBefore = state.sides.own.deck.length;
  const r = playPT(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(casts(r.events).length, 0, '空池 → 一张都不释放');
  assert.equal(r.state.sides.own.deck.length, deckBefore);
});

/* ============================================================
   三、目标随机（本机制的核心）
   ============================================================ */

test('⭐ 连环：需要指定目标的计策 —— 目标**随机**，不是永远打第一个', () => {
  // 「火攻」的两段伤害都是 `mode: 'choose'`。改造前没人传目标时它会走兜底
  // （`narrowByMode` → `pool.slice(0,1)`），**永远打第 0 列**；现在应随机。
  const hit = new Set<string>();
  for (let seed = 1; seed <= 24; seed++) {
    const { state, ctx } = setup(['tactic_huogong'], { enemyCount: 3 });
    state.rngState = seed;
    const r = playPT(state, ctx);
    assert.ok(r.ok, r.error ?? '');
    for (let col = 0; col < 3; col++) {
      const u = getUnit(r.state, 'enemy', 'front', col);
      if (u && u.hp < 20) hit.add(String(col));
    }
  }
  assert.ok(hit.size >= 2,
    `24 个种子下应至少命中过 2 个不同的敌人（证明是随机而非固定打第一个），实际命中 ${[...hit].sort().join(',')}`);
});

test('连环：`count: all` 的群体计策仍然是**全体**（mode 不影响 all）', () => {
  const { state, ctx } = setup(['tactic_wanjianqifa'], { enemyCount: 3 });
  const r = playPT(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  for (let col = 0; col < 3; col++) {
    const u = getUnit(r.state, 'enemy', 'front', col)!;
    assert.ok(u.hp < 20, `第 ${col} 列也应吃到「万箭齐发」—— count:'all' 不受 mode:'random' 影响`);
  }
});

test('⭐ 连环：作用在**己方**的计策会打到自己人 —— 有意保留的风险（非 bug）', () => {
  // 「空城计」是 `return_to_hand(side: ally, count: 'all')` —— 己方全场回手。
  // 随机释放它 = 把自己的场面撤空。设计者口径「需要指定 Target 的就随机就好」，
  // 这条风险**被接受并保留**；本测试的作用是**把它钉成已知行为**，免得日后被当成 bug 改掉。
  const { state: s0, ctx: c0 } = setup(['tactic_kongchengji'], { enemyCount: 3 });
  const ownBefore = s0.sides.own.rows.front.filter(Boolean).length;
  const r = playPT(s0, c0);
  assert.ok(r.ok, r.error ?? '');
  const ownAfter = r.state.sides.own.rows.front.filter(Boolean).length;
  assert.equal(ownAfter, 0,
    `「空城计」会把己方全场收回手牌（${ownBefore} → ${ownAfter}）—— 这是随机释放的已知代价`);
  assert.ok(r.state.sides.own.hand.length >= 1, '被收回的人物进了手牌');
});

/* ============================================================
   三·补：两条**没有真实卡覆盖**的分支（用合成卡钉住）
   ============================================================ */

/** 合成计策 A：效果写在**技能内**（现有真实计策的效果都在卡级，故这条分支没人用） */
const TACTIC_SKILL_EFFECTS: CardDef = {
  id: 't_cast_skill_effects', name: '合成技效计策', faction: 'neutral', type: 'tactic',
  cost: 1, keywords: [], memo: '',
  skills: [{ id: 'x', name: '技效', kind: 'trigger', trigger: 'on_play',
    effects: [{ action: 'damage', value: 3, target: { side: 'enemy', filter: { type: 'character' }, count: 'all' } }] }],
};

/** 合成计策 B：用 `modes` 抉择 —— 随机释放时应**随机挑一个分支** */
const TACTIC_MODES: CardDef = {
  id: 't_cast_modes', name: '合成抉择计策', faction: 'neutral', type: 'tactic',
  cost: 1, keywords: [], memo: '',
  skills: [{ id: 'y', name: '抉择', kind: 'trigger', trigger: 'on_play', modes: [
    { name: '甲案', effects: [{ action: 'damage', value: 1, target: { side: 'enemy', filter: { type: 'character' }, count: 'all' } }] },
    { name: '乙案', effects: [{ action: 'damage', value: 4, target: { side: 'enemy', filter: { type: 'character' }, count: 'all' } }] },
  ] }],
};

test('连环：效果写在**技能内**的计策也能被释放（现有真实计策的效果都在卡级，这条分支没人用）', () => {
  // ⚠️ 池子里**只放这一张**：抽取是**有放回**的，2 张池子抽 3 次并不保证两张都出现
  //（三次全同一张的概率 1/8），所以不能断言"必然出现"，只能把池子收成一张。
  const { state, ctx } = setup([]);
  ctx.cards.set(TACTIC_SKILL_EFFECTS.id, TACTIC_SKILL_EFFECTS);
  const r = playPT(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  const list = casts(r.events);
  assert.equal(list.length, 3);
  for (const e of list) assert.equal(e.card.id, TACTIC_SKILL_EFFECTS.id);
  // 技能内那条是「对敌方全体 3 点」×3 张 = 每人 9 点 → 20 血应剩 11
  for (let col = 0; col < 3; col++) {
    assert.equal(getUnit(r.state, 'enemy', 'front', col)?.hp, 11,
      `第 ${col} 列应吃 3 张 × 3 点 —— 证明**写在技能内**的 effects 真的被执行了`);
  }
});

test('连环：带 `modes` 抉择的计策 —— **随机挑一个分支**执行', () => {
  const dmg = new Set<number>();
  for (let seed = 1; seed <= 24; seed++) {
    const { state, ctx } = setup([]);
    ctx.cards.set(TACTIC_MODES.id, TACTIC_MODES);
    state.rngState = seed;
    const deckBefore = state.sides.own.deck.length;
    const r = playPT(state, ctx);
    assert.ok(r.ok, r.error ?? '');
    assert.equal(r.state.sides.own.deck.length, deckBefore, '抉择计策也不该动牌库');
    const hp = getUnit(r.state, 'enemy', 'front', 0)?.hp ?? 20;
    dmg.add(20 - hp);                     // 3 张全同一分支时：1×3=3 或 4×3=12
  }
  assert.ok(dmg.size >= 2, `24 个种子下应出现过不同的抉择分支结果，实际只有 ${[...dmg].join(',')}`);
});

/* ============================================================
   四、确定性 + 亡语
   ============================================================ */

test('连环：同一 seed 两次结果**完全一致**（确定性 RNG，回放可复现）', () => {
  const run = () => {
    const { state, ctx } = setup(['tactic_tuntian', 'tactic_bishijixu', 'tactic_huogong']);
    state.rngState = 20261011;
    return casts(playPT(state, ctx).events).map((e) => e.card.id).join('|');
  };
  assert.equal(run(), run());
});

test('连环：不同 seed 的释放序列**会变**（否则"随机"名不副实）', () => {
  const seq = new Set<string>();
  for (let seed = 1; seed <= 20; seed++) {
    const { state, ctx } = setup(['tactic_tuntian', 'tactic_bishijixu', 'tactic_huogong', 'tactic_mantianguohai']);
    state.rngState = seed;
    seq.add(casts(playPT(state, ctx).events).map((e) => e.card.id).join('|'));
  }
  assert.ok(seq.size >= 3, `20 个种子应产出多种序列，实际只有 ${seq.size} 种`);
});

test('亡语：庞统阵亡时己方抽 2 张', () => {
  const { state, ctx } = setup(['tactic_tuntian'], { enemyCount: 1 });
  const r = playPT(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  const deckBefore = r.state.sides.own.deck.length;
  const me = getUnit(r.state, 'own', 'front', 3)!;
  assert.equal(me.hp, 5);
  // 直接致死（走真实 killUnit 路径 → 触发 on_death）。
  // ⚠️ 不用"让敌方来打"：敌方单位是刚摆上去的，有召唤失调，ATTACK 会被判「动作不合法」。
  dealDamage(r.state, ctx.cards, unitRef('own', 'front', 3), 99, [], '测试', 0);
  assert.equal(getUnit(r.state, 'own', 'front', 3), null, '庞统应已阵亡');
  assert.equal(r.state.sides.own.deck.length, deckBefore - 2, '亡语应抽 2 张');
});
