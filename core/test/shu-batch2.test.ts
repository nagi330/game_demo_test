/**
 * 蜀国第二批 14 张 · **数据驱动**的真实卡测试
 *
 * 覆盖：廖化（落单先攻）/ 木鹿大王（象兵统领＝+1/+1 且「象阵」概率 50% → 100%）/ 带来洞主（召唤）/
 * 金环三结（亡语反噬）/ 吴懿（主公披坚 + 魏延联动）/ 谯周（双方武将 −1）/ 柳隐（免死）/
 * 糜竺（统率 + 亡语抽牌）/ 刘巴（弃一抽二）/ 邓芝（落后多抽）/ 伊籍（拼点干扰）/
 * 孙乾（群雄发现）/ 向朗（三选一）/ 李严（拼点赌博）。
 *
 * ⚠️ 概率相关的两处（象阵 50%、拼点）用**固定种子遍历**验证，而不是"跑一次看着像"：
 *   · 象阵：没有木鹿时应当"有的种子落空"，有木鹿时**每个种子都震慑**；
 *   · 拼点：按 `CLASH.won` 事件分流，**两条分支的效果都要观察到**（否则等于只测了一半）。
 */
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

import { applyAction } from '../src/engine.ts';
import { recomputeAuras, runEffects } from '../src/effects.ts';
import { killUnit } from '../src/mutate.ts';
import { effectiveAttack } from '../src/rules.ts';
import { getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import { generateOptions } from '../src/ai/options.ts';
import { profileFor } from '../src/ai/profile.ts';
import type { Action, CardDef, GameEvent, MatchState } from '../src/types.ts';

const REAL: CardDef[] = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cards.json'), 'utf8'),
);
const real = (id: string): CardDef => {
  const c = REAL.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
};
const IDS = ['shu_liaohua', 'shu_muludawang', 'shu_dailaidongzhu', 'shu_jinhuansanjie', 'shu_wuyi',
  'shu_qiaozhou', 'shu_liuyin', 'shu_mizhu', 'shu_liuba', 'shu_dengzhi', 'shu_yiji', 'shu_sunqian',
  'shu_xianglang', 'shu_liyan', 'token_manzu_bubing', 'shu_xiangbing', 'shu_weiyan', 'shu_wangping',
  'wei_piliche', 'neutral_infantry', 'neutral_shieldman', 'neutral_archer', 'neutral_cavalry',
  'qun_yuanshao', 'qun_huatuo'];
for (const id of IDS) if (!TEST_CARDS.some((x) => x.id === id)) TEST_CARDS.push(real(id));

type Ctx = Parameters<typeof applyAction>[1];
/** 放一张真实卡上场（enteredTurn = -1 → 可攻击） */
function place(state: MatchState, id: string, side: 'own' | 'enemy', col: number, row: 'front' | 'back' = 'front') {
  const u = makeUnit(real(id), 0, nextUidSeq(state));
  u.enteredTurn = -1;
  setUnit(state, side, row, col, u);
  return u;
}
const attack = (state: MatchState, ctx: Ctx, from: number, to: number) =>
  applyAction(state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: from }, to: { kind: 'unit', row: 'front', col: to },
  } as Action);
/** 给单位抬高血上限（`applyMods` 会按 baseMaxHp 重算，三个字段都要动） */
const beef = (u: { hp: number; maxHp: number; baseMaxHp: number }, n: number) => {
  u.baseMaxHp = n; u.maxHp = n; u.hp = n;
};
const play = (state: MatchState, ctx: Ctx, col = 0) =>
  applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col } as Action);

/* ============================================================
   1. 数据形态总表（一次核完 15 张）
   ============================================================ */

const SHAPE: Array<[string, string, number, number, number, string]> = [
  ['shu_liaohua', '廖化', 3, 2, 4, 'general'],
  ['shu_muludawang', '木鹿大王', 5, 3, 5, 'general'],
  ['shu_dailaidongzhu', '带来洞主', 3, 2, 3, 'general'],
  ['shu_jinhuansanjie', '金环三结', 3, 3, 2, 'general'],
  ['shu_wuyi', '吴懿', 4, 4, 4, 'general'],
  ['shu_qiaozhou', '谯周', 3, 1, 3, 'strategist'],
  ['shu_liuyin', '柳隐', 5, 3, 7, 'general'],
  ['shu_mizhu', '糜竺', 2, 0, 3, 'strategist'],
  ['shu_liuba', '刘巴', 3, 1, 3, 'strategist'],
  ['shu_dengzhi', '邓芝', 4, 1, 4, 'strategist'],
  ['shu_yiji', '伊籍', 3, 1, 3, 'strategist'],
  ['shu_sunqian', '孙乾', 3, 1, 3, 'strategist'],
  ['shu_xianglang', '向朗', 3, 1, 4, 'strategist'],
  ['shu_liyan', '李严', 5, 3, 5, 'general'],
  ['token_manzu_bubing', '蛮族步兵', 0, 1, 1, 'token'],
];

test('数据：15 张（含衍生物）费用 / 属性 / 类型 / 卡名 / memo', () => {
  for (const [id, name, cost, atk, hp, type] of SHAPE) {
    const c = real(id);
    assert.equal(c.name, name, id);
    assert.equal(c.cost, cost, `${name} 费用`);
    assert.equal(`${c.attack}/${c.health}`, `${atk}/${hp}`, `${name} 属性`);
    assert.equal(c.type, type, `${name} 类型`);
    assert.ok(name.length <= 4, `${name} 卡名 ≤ 4 字`);
    assert.ok((c.memo ?? '').length > 0, `${name} 必须填 memo`);
  }
});

test('数据：标签与关键词（南蛮覆盖面 + 象兵补 man_zu）', () => {
  for (const id of ['shu_muludawang', 'shu_dailaidongzhu', 'shu_jinhuansanjie', 'token_manzu_bubing']) {
    assert.deepEqual(real(id).tags, ['man_zu'], `${real(id).name} 应挂 man_zu`);
  }
  assert.deepEqual(real('shu_xiangbing').tags, ['man_zu'], '象兵补 man_zu（ADR-150）——才吃孟获/木鹿');
  assert.deepEqual(real('shu_liaohua').keywords, ['xian_gong'], '廖化先攻是卡面关键词');
  assert.deepEqual(real('shu_jinhuansanjie').keywords, ['xian_gong']);
  assert.deepEqual(real('shu_liuyin').keywords, ['jia_dun']);
});

/* ============================================================
   2. 廖化：落单才强
   ============================================================ */

test('廖化「独先锋」：单独在场 4/5；有其它友军回落 2/4', () => {
  const { state, ctx } = scenario({});
  place(state, 'shu_liaohua', 'own', 0);
  recomputeAuras(state, ctx.cards as never, { int: () => 0 } as never, []);   // 光环要先重算
  const alone = `${effectiveAttack(state, 'own', 'front', 0)}/${getUnit(state, 'own', 'front', 0)!.maxHp}`;
  place(state, 'neutral_infantry', 'own', 1);
  recomputeAuras(state, ctx.cards as never, { int: () => 0 } as never, []);
  const withAlly = `${effectiveAttack(state, 'own', 'front', 0)}/${getUnit(state, 'own', 'front', 0)!.maxHp}`;
  assert.equal(alone, '4/5');
  assert.equal(withAlly, '2/4');
});

/* ============================================================
   3. 木鹿大王：象兵统领（+1/+1 且概率 50% → 100%）
   ============================================================ */

test('木鹿「象兵统领」：场上的象兵 +1/+1，并挂上 proc_chance 覆盖', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_muludawang'] });
  place(state, 'shu_xiangbing', 'own', 0);
  state.sides.own.command.cur = 10;
  const r = play(state, ctx, 4);
  assert.ok(r.ok, r.error ?? '');
  const x = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(effectiveAttack(r.state, 'own', 'front', 0), 4, '场上象兵 3 → 4 攻');
  assert.equal(x.maxHp, 7, '6 → 7 血');
  const rule = x.mods.find((m) => m.kind === 'rule' && m.rule?.cap === 'proc_chance');
  assert.ok(rule, '象兵身上应有 proc_chance 覆盖');
  assert.equal(rule!.rule!.value, 1);
  assert.equal(rule!.rule!.statusId, undefined, 'ADR-150：这是**无状态**覆盖（象兵身上没有代表概率的状态）');
});

test('木鹿「象兵统领」：**手牌的象兵**同样 +1/+1 且带覆盖（打出后随牌进场）', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_muludawang', 'shu_xiangbing'] });
  state.sides.own.command.cur = 10;
  const r = play(state, ctx, 4);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.own.hand.length, 1, '手里还剩象兵');
  const hc = r.state.sides.own.hand[0]!;
  const mods = hc.mods;
  assert.equal(mods.filter((m) => m.kind === 'attack').reduce((s, m) => s + (m.value ?? 0), 0), 1, '手牌 +1 攻');
  assert.equal(mods.filter((m) => m.kind === 'health').reduce((s, m) => s + (m.value ?? 0), 0), 1, '手牌 +1 血');
  const rule = mods.find((m) => m.kind === 'rule' && m.rule?.cap === 'proc_chance');
  assert.ok(rule, '手牌上也带着覆盖（打出后搬进单位 mods）');
});

test('象阵概率：50% 掷骰落空就不震慑；挂上 proc_chance 覆盖后必中', () => {
  const eff = real('shu_xiangbing').skills![0]!.effects![0]!;
  const fire = (withOverride: boolean, roll: number): boolean => {
    const { state, ctx } = scenario({});
    const x = place(state, 'shu_xiangbing', 'own', 0);
    place(state, 'wei_piliche', 'enemy', 3);
    if (withOverride) x.mods.push({ id: 'p', kind: 'rule', rule: { cap: 'proc_chance', value: 1 } });
    const evs: GameEvent[] = [];
    runEffects(state, ctx.cards as never, [eff] as never,
      { side: 'own', source: x, attackTarget: { kind: 'unit', side: 'enemy', row: 'front', col: 3 } } as never,
      { next: () => roll, int: () => 0 } as never, evs);
    return (getUnit(state, 'enemy', 'front', 3)!.statuses['zhen_she']?.stacks ?? 0) > 0;
  };
  assert.equal(fire(false, 0.9), false, '卡面 50%：掷出 0.9 → 落空');
  assert.equal(fire(false, 0.1), true, '卡面 50%：掷出 0.1 → 命中');
  assert.equal(fire(true, 0.9), true, '有覆盖 → 掷出 0.9 也必中（100%）');
  assert.equal(fire(true, 0.999), true, '有覆盖 → 极端值也必中');
});

/* ============================================================
   4. 带来洞主 / 金环三结
   ============================================================ */

test('带来洞主「引援」：召唤 2 个 1/1 蛮族步兵', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_dailaidongzhu'] });
  state.sides.own.command.cur = 10;
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  const units = [...r.state.sides.own.rows.front, ...r.state.sides.own.rows.back].filter(Boolean);
  const tokens = units.filter((u) => u!.cardId === 'token_manzu_bubing');
  assert.equal(tokens.length, 2);
  assert.equal(tokens[0]!.atk, 1);
  assert.equal(tokens[0]!.maxHp, 1);
  assert.deepEqual(tokens[0]!.tags, ['man_zu']);
});

test('金环三结「奋突」：亡语对击杀者 2 点', () => {
  const { state, ctx } = scenario({});
  const killer = place(state, 'shu_wangping', 'enemy', 0);
  beef(killer, 20);
  const me = place(state, 'shu_jinhuansanjie', 'own', 0);
  me.hp = 0;
  killUnit(state, ctx.cards, { side: 'own', row: 'front', col: 0, unit: me } as never,
    [] as never, { side: 'enemy', row: 'front', col: 0 });
  assert.equal(getUnit(state, 'enemy', 'front', 0)!.hp, 18);
});

/* ============================================================
   5. 吴懿：主公披坚 + 魏延联动
   ============================================================ */

test('吴懿「合众」：主公获得披坚；场上有魏延则双方各 +1/+1', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_wuyi'], own: { front: ['shu_weiyan'] } });
  state.sides.own.command.cur = 10;
  const before = effectiveAttack(state, 'own', 'front', 0);
  const r = play(state, ctx, 1);
  assert.ok(r.ok, r.error ?? '');
  assert.ok((r.state.sides.own.lord.statuses?.sheng_dun_status?.stacks ?? 0) >= 1, '主公拿到披坚');
  assert.equal(effectiveAttack(r.state, 'own', 'front', 0), before + 1, '魏延 +1 攻');
  assert.equal(effectiveAttack(r.state, 'own', 'front', 1), 5, '吴懿 4 → 5 攻');
  assert.equal(getUnit(r.state, 'own', 'front', 1)!.maxHp, 5, '吴懿 4 → 5 血（`{source:true}` 只加自己）');
});

test('吴懿「合众」：没有魏延 → 只给披坚，自身不加属性', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_wuyi'] });
  state.sides.own.command.cur = 10;
  const r = play(state, ctx);
  assert.ok(r.ok, r.error ?? '');
  assert.ok((r.state.sides.own.lord.statuses?.sheng_dun_status?.stacks ?? 0) >= 1);
  assert.equal(effectiveAttack(r.state, 'own', 'front', 0), 4);
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.maxHp, 4);
});

/* ============================================================
   6. 谯周 / 柳隐
   ============================================================ */

test('谯周「罢兵」：双方**武将** −1；谋臣与兵种不受影响', () => {
  const { state, ctx } = scenario({});
  place(state, 'shu_wangping', 'own', 0);        // 武将 3/4
  place(state, 'shu_mizhu', 'own', 1);           // 谋臣
  place(state, 'neutral_infantry', 'own', 2);    // 兵种
  place(state, 'shu_weiyan', 'enemy', 0);        // 敌方武将 4/4
  place(state, 'shu_qiaozhou', 'own', 4);
  recomputeAuras(state, ctx.cards as never, { int: () => 0 } as never, []);
  assert.equal(effectiveAttack(state, 'own', 'front', 0), 2, '己方武将 −1（含己方＝双刃）');
  assert.equal(effectiveAttack(state, 'enemy', 'front', 0), 3, '敌方武将 −1');
  assert.equal(effectiveAttack(state, 'own', 'front', 1), 0, '谋臣不受影响');
  assert.equal(effectiveAttack(state, 'own', 'front', 2), 1, '兵种不受影响');
});

test('柳隐「坚壁」：第一次致命伤害以 1 点生命存活；第二次真正阵亡', () => {
  const nuke: CardDef = {
    id: 'test_nuke_b2', name: '斩', type: 'tactic', cost: 0, faction: 'neutral',
    effects: [{ action: 'damage', value: 99, target: { side: 'enemy' } }], keywords: [],
  } as CardDef;
  if (!TEST_CARDS.some((c) => c.id === nuke.id)) TEST_CARDS.push(nuke);
  const s0 = scenario({ ownHand: ['test_nuke_b2', 'test_nuke_b2'] });   // 两张：第一发免死、第二发致命
  place(s0.state, 'shu_liuyin', 'enemy', 0);
  const r1 = applyAction(s0.state, s0.ctx, { type: 'PLAY_CARD', cardIndex: 0 } as Action);
  assert.ok(r1.events.some((e: GameEvent) => e.type === 'UNIT_SURVIVED'), '第一次应免死');
  assert.equal(getUnit(r1.state, 'enemy', 'front', 0)?.hp, 1, '以 1 点生命存活');

  const r2 = applyAction(r1.state, s0.ctx, { type: 'PLAY_CARD', cardIndex: 0 } as Action);
  assert.ok(r2.events.some((e: GameEvent) => e.type === 'UNIT_DIED'), '第二次应真的阵亡');
  assert.equal(getUnit(r2.state, 'enemy', 'front', 0), null, '每局只免死一次');
});

/* ============================================================
   8. 糜竺 / 刘巴
   ============================================================ */

test('糜竺「助军」：本回合统率 +2；「倾家」亡语抽 1 张', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_mizhu'] });
  state.sides.own.command = { cur: 5, max: 10 };
  state.sides.own.deck = ['neutral_infantry', 'neutral_shieldman'];
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 } as Action);
  assert.ok(r.ok, r.error ?? '');
  assert.equal(r.state.sides.own.command.cur, 5 - 2 + 2, '花 2 得 2：5 → 3 → 5');
  assert.equal(r.state.sides.own.hand.length, 0);

  const me = getUnit(r.state, 'own', 'front', 0)!;
  me.hp = 0;
  const before = r.state.sides.own.hand.length;
  killUnit(r.state, ctx.cards, { side: 'own', row: 'front', col: 0, unit: me } as never, [] as never);
  assert.equal(r.state.sides.own.hand.length, before + 1, '亡语抽 1 张');
});

test('`PLAY_CARD.handIndex` 的约定 = **出牌后**的手牌下标（调用方负责换算）', () => {
  // 手牌 [刘巴, 步兵, 盾兵, 弓兵, 骑兵]：刘巴离手后，步兵在 0、…、骑兵在 3。
  // 传 handIndex: 3 → 应当弃**骑兵**（出牌后的第 4 张）。
  // UI/AI 侧的换算是：玩家点第 4 张（出牌前 index 4）→ 传 3；这条测试锁住引擎这一侧的语义。
  const filler = ['neutral_infantry', 'neutral_shieldman', 'neutral_archer', 'neutral_cavalry'];
  const { state, ctx } = scenario({ ownHand: ['shu_liuba', ...filler] });
  state.sides.own.command.cur = 10;
  state.sides.own.deck = [];
  const r = applyAction(state, ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0, handIndex: 3,
  } as Action);
  assert.ok(r.ok, r.error ?? '');
  assert.deepEqual(r.state.sides.own.discard.map((c) => c.id), ['neutral_cavalry'],
    'handIndex 是出牌后的下标：3 → 骑兵');
});

test('刘巴「直百」：弃**指定的那张**手牌，再抽 2 张', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_liuba', 'neutral_infantry'] });
  state.sides.own.command.cur = 10;
  state.sides.own.deck = ['neutral_shieldman', 'neutral_archer', 'neutral_cavalry'];
  const r = applyAction(state, ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0, handIndex: 1,   // 指定弃「步兵」
  } as Action);
  assert.equal(r.state.sides.own.deck.length, 1, '抽了 2 张（牌库 3 → 1）');
  assert.ok(r.ok, r.error ?? '');
  assert.deepEqual(r.state.sides.own.discard.map((c) => c.id), ['neutral_infantry'], '弃的正是指定的那张');
  assert.equal(r.state.sides.own.hand.length, 2, '抽 2 张到手');
  assert.equal(r.state.sides.own.deck.length, 1);
});

/* ============================================================
   9. 邓芝 / 伊籍 / 孙乾 / 向朗 / 李严
   ============================================================ */

test('邓芝「唇齿」：主公不落后时抽 1；落后时抽 2', () => {
  const run = (ownHp: number, enemyHp: number): number => {
    const { state, ctx } = scenario({ ownHand: ['shu_dengzhi'] });
    state.sides.own.command.cur = 10;
    state.sides.own.deck = ['neutral_infantry', 'neutral_shieldman', 'neutral_archer'];
    state.sides.own.lord.hp = ownHp;
    state.sides.enemy.lord.hp = enemyHp;
    const r = play(state, ctx);
    assert.ok(r.ok, r.error ?? '');
    return r.state.sides.own.hand.length;
  };
  assert.equal(run(30, 20), 1, '领先 → 抽 1');
  assert.equal(run(10, 30), 2, '落后 → 抽 2');
});

test('伊籍「机辩」：拼点胜 → 敌方两张手牌统率 +1；败 → 己方抽 1 张', () => {
  let sawWin = false; let sawLose = false;
  for (let seed = 1; seed <= 20 && !(sawWin && sawLose); seed++) {
    const { state, ctx } = scenario({ ownHand: ['shu_yiji'], enemyHand: ['neutral_infantry', 'neutral_archer'], seed });
    state.sides.own.command.cur = 10;
    state.sides.own.deck = ['neutral_infantry', 'neutral_shieldman'];
    const handBefore = state.sides.own.hand.length;
    const r = play(state, ctx);
    assert.ok(r.ok, r.error ?? '');
    const clash = r.events.find((e: GameEvent) => e.type === 'CLASH') as { won: boolean } | undefined;
    assert.ok(clash, '应有拼点事件');
    if (clash!.won) {
      sawWin = true;
      const cost = r.state.sides.enemy.hand.flatMap((hc) => hc.mods)
        .filter((m) => m.kind === 'cost').reduce((a, m) => a + (m.value ?? 0), 0);
      assert.ok(cost > 0, `胜：敌方手牌应被加价（实测 +${cost}）`);
    } else {
      sawLose = true;
      assert.equal(r.state.sides.own.hand.length, handBefore, '败：抽 1 张（打出的那张已离手，抽 1 补回）');
    }
  }
  assert.ok(sawWin && sawLose, `两条分支都要观察到（胜=${sawWin} 败=${sawLose}）`);
});

test('李严「督运」：拼点胜 → 本回合统率 +6；败 → 自身永久 −2/−2', () => {
  let sawWin = false; let sawLose = false;
  for (let seed = 1; seed <= 20 && !(sawWin && sawLose); seed++) {
    const { state, ctx } = scenario({ ownHand: ['shu_liyan'], seed });
    state.sides.own.command = { cur: 5, max: 10 };
    const r = play(state, ctx);
    assert.ok(r.ok, r.error ?? '');
    const clash = r.events.find((e: GameEvent) => e.type === 'CLASH') as { won: boolean } | undefined;
    assert.ok(clash, '应有拼点事件');
    const me = getUnit(r.state, 'own', 'front', 0)!;
    if (clash!.won) {
      sawWin = true;
      assert.equal(r.state.sides.own.command.cur, 0 + 6, '花 5 后 +6 = 6（本回合临时统率）');
      assert.equal(effectiveAttack(r.state, 'own', 'front', 0), 3, '赢了不该掉属性');
    } else {
      sawLose = true;
      assert.equal(effectiveAttack(r.state, 'own', 'front', 0), 1, '败：3 → 1 攻');
      assert.equal(me.maxHp, 3, '败：5 → 3 血上限');
    }
  }
  assert.ok(sawWin && sawLose, `两条分支都要观察到（胜=${sawWin} 败=${sawLose}）`);
});

test('AI：会为「战吼要弃手牌」的卡枚举下手（下标已换算成"出牌后"）', () => {
  const { state, ctx: ctx0 } = scenario({ ownHand: ['shu_liuba', 'neutral_infantry', 'neutral_archer'] });
  state.sides.own.command.cur = 10;
  const w = profileFor(state, 'own', ctx0).weights;
  const opts = generateOptions(state, w).filter((o) => o.kind === 'play');
  const liuba = opts.filter((o) => o.action.type === 'PLAY_CARD' && o.action.cardIndex === 0);
  assert.ok(liuba.length > 0, 'AI 应当考虑打出刘巴');
  const withHand = liuba.filter((o) => typeof (o.action as { handIndex?: number }).handIndex === 'number');
  assert.ok(withHand.length > 0, '应当枚举"弃哪一张"的候选，而不是只给一个不下手的选项');
  for (const o of withHand) {
    const hi = (o.action as { handIndex: number }).handIndex;
    assert.ok(hi >= 0 && hi < 2, `换算后的下标必须落在"出牌后"的 2 张手牌内，实测 ${hi}`);
  }
});

test('孙乾「通使」：只发现群雄牌；牌库没有群雄牌时安静跳过', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_sunqian'] });
  state.sides.own.command.cur = 10;
  state.sides.own.deck = ['qun_yuanshao', 'neutral_infantry', 'shu_wangping', 'qun_huatuo'];
  const r = play(state, ctx);
  const pend = r.state.pendingDiscover;
  assert.ok(pend, '应挂起发现');
  assert.ok(pend!.candidates.every((id) => id.startsWith('qun_')), `候选只能是群雄：${pend!.candidates}`);

  const none = scenario({ ownHand: ['shu_sunqian'] });
  none.state.sides.own.command.cur = 10;
  none.state.sides.own.deck = ['neutral_infantry', 'shu_wangping'];
  const r2 = play(none.state, none.ctx);
  assert.ok(r2.ok, r2.error ?? '');
  assert.equal(r2.state.pendingDiscover, undefined, '牌库没有群雄牌 → 不挂起、不报错');
});

test('向朗「藏书」：从牌库三选一（候选 = min(3, 牌库)）', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_xianglang'] });
  state.sides.own.command.cur = 10;
  state.sides.own.deck = ['neutral_infantry', 'neutral_shieldman', 'neutral_archer', 'neutral_cavalry'];
  const r = play(state, ctx);
  const pend = r.state.pendingDiscover;
  assert.ok(pend, '应挂起发现');
  assert.equal(pend!.candidates.length, 3, '三选一');
  const r2 = applyAction(r.state, ctx, { type: 'CHOOSE_DISCOVER', cardId: pend!.candidates[0]! } as Action);
  assert.ok(r2.ok, r2.error ?? '');
  assert.equal(r2.state.sides.own.hand.length, 1, '选的那张到手');
  assert.equal(r2.state.sides.own.deck.length, 3, '牌库少一张');
});
