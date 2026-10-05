/**
 * 群雄特种兵精修（ADR-119）：费用下限落地 ＋ 先登死士重做。
 *
 * 两条口径：
 * ① **费用下限**（ADR-112）：特种兵费用 ≥ 对应基础兵费用 + 1
 *    （基础兵：步兵 1 / 盾兵 2 / 弓兵 2 / 骑兵 3 费）。本文件只钉**群雄 8 张**。
 *    ⚠️ 全池**不能**直接套一条通用断言：ADR-112 明确豁免了中立 3 张（白马义从 1/2、
 *    陷阵盾兵 2/2、西凉铁骑 2/1）与蜀国连弩士 —— 它们是"下限 + 总价值"的例外，
 *    逐张重定由设计者另行过（见 docs/troop-todo-checklist.md §3）。
 * ② **先登死士重做**：2 费 4/3「亡语随机对敌方角色 2 点」→
 *    **3 费 3/3「亡语对敌方主公 3 点」**，且**不加先攻**。
 *
 * 所有断言都走 `core/data/cards.json` 的**真实卡数据**，不用内联 CardDef 夹具
 * —— ADR-113 踩过：夹具漂移会让数据改了测试照样全绿。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
import { recomputeAuras } from '../src/effects.ts';
import { dealDamage, unitRef } from '../src/mutate.ts';
import { createRng } from '../src/rng.ts';
import { allUnits, getUnit, hasTrait, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { scenario } from './fixtures.ts';
import type { CardDef, Side } from '../src/types.ts';

const cards: CardDef[] = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const real = (id: string): CardDef => {
  const card = cards.find((c) => c.id === id);
  assert.ok(card, id);
  return card;
};

/** 四类基础兵的本体 id —— 用 id 硬取，不用"第一个 neutral 同兵种"去猜 */
const BASE_TROOP: Record<string, string> = {
  infantry: 'neutral_infantry',
  shield: 'neutral_shieldman',
  archer: 'neutral_archer',
  cavalry: 'neutral_cavalry',
};

function setup() {
  const s = scenario({});
  for (const c of cards) s.ctx.cards.set(c.id, c);
  return s;
}

function place(s: ReturnType<typeof setup>, id: string, side: Side = 'own', col = 0) {
  const u = makeUnit(real(id), 0, nextUidSeq(s.state));
  setUnit(s.state, side, 'front', col, u);
  return u;
}

/* =====================================================================
   一、费用下限（ADR-112 / ADR-119）
   ===================================================================== */

test('群雄特种兵费用 ≥ 对应基础兵 + 1', () => {
  const expected: Array<[string, number]> = [
    ['qun_xiandengsishi', 3],   // 步兵（原 2 费 4/3 → 3 费 3/3）
    ['qun_huangjinlishi', 3],   // 步兵（ADR-121 定 3 费 2/2；下限 ≥2 仍满足）
    ['qun_fudunshi', 3],        // 盾兵（原 2 费 → ADR-125 定 3 费 1/6 伏楯士「俱起」）
    ['qun_xianzhenying', 4],    // 盾兵（原 2 费 → ADR-126 定 4 费 3/6 破盾墙）
    ['qun_baimayicong', 4],     // 骑兵（原 2 费）
    ['qun_xiliangtieqi', 4],    // 骑兵（原 2 费）
    ['qun_wuhuantuqi', 4],      // 骑兵（ADR-128 由弓兵改回骑兵：突骑本就是骑兵）
    ['qun_xiandengnushou', 2],  // 弓兵（ADR-129 显式豁免：2 费，先例蜀·连弩士）
  ];
  // ADR-112 明文豁免：这些特种兵**按设计者裁定**可以等于基础兵费用
  // （先例：蜀·连弩士 2 费弓兵）。豁免必须**逐张点名**，不能放宽断言。
  const FLOOR_EXEMPT = new Set(['qun_xiandengnushou']);
  for (const [id, cost] of expected) {
    const c = real(id);
    const base = real(BASE_TROOP[c.troopKind!]!);
    assert.equal(c.cost, cost, `${c.name} 费用应定为 ${cost}`);
    if (FLOOR_EXEMPT.has(id)) {
      assert.ok((c.cost ?? 0) >= (base.cost ?? 0),
        `${c.name} 虽获豁免，也不该比基础${base.name}更便宜`);
      continue;
    }
    assert.ok((c.cost ?? 0) >= (base.cost ?? 0) + 1,
      `${c.name}（${c.cost} 费）必须 ≥ 基础${base.name}（${base.cost} 费）+ 1`);
  }
});

test('群雄 8 张特种兵逐张实算合规（不依赖上一条的清单）', () => {
  const qun = cards.filter((c) => c.faction === 'qun' && c.type === 'troop' && c.upgradeFrom);
  assert.equal(qun.length, 8, '群雄特种兵应为 8 张');
  const EXEMPT = new Set(['qun_xiandengnushou']);   // ADR-129：设计者显式豁免的 2 费弓兵
  for (const c of qun) {
    const base = real(BASE_TROOP[c.troopKind!]!);
    if (EXEMPT.has(c.id)) {
      assert.equal(c.cost, base.cost, '豁免项应与基础兵同价（不能更便宜）');
      continue;
    }
    assert.ok((c.cost ?? 0) > (base.cost ?? 0),
      `${c.name}（${c.cost} 费）必须贵于基础${base.name}（${base.cost} 费）—— 升级形态不该更便宜`);
  }
});

/* =====================================================================
   二、先登死士：数据形态（防漂移）
   ===================================================================== */

test('先登死士：3 费 3/2、带先攻、亡语指定敌方主公 2 点', () => {
  const c = real('qun_xiandengsishi');
  assert.deepEqual([c.cost, c.attack, c.health], [3, 3, 2],
    '3 费 3/2：属性 5 点低于 3 费基准 7，缺口由先攻＋亡语补回（给先攻必须付费）');
  assert.ok((c.keywords ?? []).includes('xian_gong'),
    '先攻＝入场当回合即可攻击；「4/3＋先攻」已被定价为 4 费（蜀西凉铁骑），故这里把 4/3 砍到 3/2 来换');

  const sk = (c.skills ?? []).find((s) => s.trigger === 'on_death');
  assert.ok(sk, '亡语技能必须在');
  assert.equal(sk!.kind, 'trigger');
  assert.ok(sk!.text && sk!.text.includes('主公'),
    '卡面文案必须写明「对敌方主公」—— 旧版只有 memo，卡面只显示技能名「死士」，玩家看不到任何效果说明');

  const eff = sk!.effects![0]!;
  assert.equal(eff.action, 'damage');
  assert.equal(eff.value, 2, '2 点（先攻已花掉 1 点额度，亡语随之从 3 点降到 2 点）');
  assert.equal(eff.target?.lord, true, '确定性指向敌方主公');
  assert.equal(eff.target?.mode, undefined, '不再是随机角色池');
  assert.equal(eff.target?.filter, undefined, '没有 filter，避免退回「随机敌方角色（含主公）」的旧口径');
});

/* =====================================================================
   三、先登死士：结算行为
   ===================================================================== */

test('先登死士：阵亡只打敌方主公 2 点，不误伤场上单位', () => {
  const s = setup();
  place(s, 'qun_xiandengsishi');
  const bystander = place(s, 'wei_suwei_hushi', 'enemy', 0);
  dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 0), 99, [], '测试');
  assert.equal(getUnit(s.state, 'own', 'front', 0), null, '先登死士已阵亡');
  assert.equal(s.state.sides.enemy.lord.hp, 28, '亡语 2 点打敌方主公');
  assert.equal(bystander.hp, bystander.maxHp, '旁边的敌方单位不掉血 —— 不再是随机打角色');
  assert.equal(s.state.sides.own.lord.hp, 30, '不会打到自己主公');
});

test('先登死士：被技能伤害打死同样触发亡语（不挑死法）', () => {
  const s = setup();
  place(s, 'qun_xiandengsishi');
  dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 0), 2, [], '战技');
  assert.equal(s.state.sides.enemy.lord.hp, 28);
});

test('先登死士：带先攻，从手牌打出当回合即可攻击', () => {
  const s = setup();
  s.state.sides.own.hand = [{ card: real('qun_xiandengsishi'), mods: [] }];
  s.state.sides.own.command.cur = 9;
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '出牌应成功');
  const atk = applyAction(r.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'lord' },
  });
  assert.ok(atk.ok, atk.error ?? '先攻单位应能在入场当回合攻击');
  assert.equal(atk.state.sides.enemy.lord.hp, 27, '3 攻打主公 3 点');
});

test('先登死士：由 1 费步兵升变而来，回满血并因先攻返还一次普攻（ADR-100）', () => {
  const s = setup();
  const u = place(s, 'neutral_infantry');
  u.upgradeProgress = { damage: 2, shieldSurvival: 0, basicKills: 0, characterKills: 0, heroHits: 0 };
  u.attackedThisTurn = 1;
  u.hp = 1;
  const r = applyAction(s.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: 'qun_xiandengsishi' });
  assert.ok(r.ok, r.error ?? '升变应成功');
  const after = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(after.cardId, 'qun_xiandengsishi');
  assert.deepEqual([after.atk, after.hp, after.maxHp], [3, 2, 2], '按目标形态满血（ADR-099）—— 先登死士是 3/2');
  assert.equal(after.attackedThisTurn, 0,
    '带先攻 → 升变返还本回合已消耗的普攻机会（ADR-100）：步兵打满 2 伤升变后，当回合还能再打一次 2 点');
});

test('先登死士：敌方主公带披坚时亡语被免疫一次，披坚消耗后恢复', () => {
  const s = setup();
  place(s, 'qun_xiandengsishi');
  s.state.sides.enemy.lord.statuses = { sheng_dun_status: { stacks: 1 } };
  dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 0), 99, [], '测试');
  assert.equal(s.state.sides.enemy.lord.hp, 30, '披坚免疫整段 2 点');
  assert.equal(s.state.sides.enemy.lord.statuses.sheng_dun_status, undefined, '披坚被消耗');
});

/* =====================================================================
   四、黄巾力士 ＋ 黄巾众：**永久**成长（ADR-121，设计者定稿）
   —— 2 费 2/1 亡语召唤两个黄巾兵；黄巾兵与力士落地时按当时的己方
      统领数（力士另有 +1 一档）永久 +N/+N，**统领阵亡也不缩回**
   ===================================================================== */

test('两个标签的边界：统领只认三兄弟，「黄巾众」只认黄巾兵与力士', () => {
  for (const id of ['qun_zhangjiao', 'qun_zhangbao', 'qun_zhangliang']) {
    assert.ok((real(id).tags ?? []).includes('huang_jin_tongling'), `${id} 是统领`);
    assert.ok(!(real(id).tags ?? []).includes('huang_jin_zhong'),
      `${id} 不是「黄巾众」—— 否则统领上场会给自己加属性`);
  }
  for (const id of ['token_huangjin_bing', 'qun_huangjinlishi']) {
    assert.ok((real(id).tags ?? []).includes('huang_jin_zhong'), `${id} 属于黄巾众`);
    assert.ok(!(real(id).tags ?? []).includes('huang_jin_tongling'), `${id} 不是统领`);
  }
  for (const id of ['shu_zhoucang', 'wei_zhangyan']) {
    assert.ok((real(id).tags ?? []).includes('huang_jin'), `${id} 仍是黄巾旧部`);
    assert.ok(!(real(id).tags ?? []).includes('huang_jin_zhong'), `${id} 不算黄巾众`);
  }
});

test('黄巾力士：3 费 2/3，亡语召唤两个黄巾兵，自己也随统领永久成长', () => {
  const c = real('qun_huangjinlishi');
  assert.deepEqual([c.cost, c.attack, c.health], [3, 2, 3],
    '3 费 2/3（设计者定稿）：属性 5 点 ＋ 两个 1/1（4 点）＝ 9 点 vs 3 费基准 7 → +2，'
    + '换一个能站住、能交换的身体（备选 2/2 落在 +1）');

  const death = (c.skills ?? []).find((s) => s.trigger === 'on_death')!;
  assert.ok(death, '亡语必须在');
  assert.equal(death.effects![0]!.action, 'summon');
  assert.equal(death.effects![0]!.unit, 'token_huangjin_bing', '召的是普通黄巾兵');
  assert.equal(death.effects![0]!.count, 2);

  const grow = (c.skills ?? []).find((s) => s.trigger === 'on_play')!;
  assert.ok(grow, '本体也要按统领成长');
  const eff = grow.effects![0]!;
  assert.equal(eff.action, 'modify');
  assert.deepEqual(eff.attack_from, { side: 'ally', filter: { tag: 'huang_jin_tongling' } });
  assert.deepEqual(eff.health_from, { side: 'ally', filter: { tag: 'huang_jin_tongling' } });
  assert.deepEqual(eff.target, { source: true }, '只作用于自身');
  assert.equal(eff.duration, undefined, '不写 duration → 走 permanent 修正，永不回落');
});

test('黄巾兵「黄巾众」：是 on_play 快照而不是光环 —— 这是「永久」的关键', () => {
  const tok = real('token_huangjin_bing');
  const sk = (tok.skills ?? [])[0]!;
  assert.equal(sk.trigger, 'on_play', '召出来的兵靠「召唤也派发战吼」（ADR-121）跑这条');
  assert.notEqual(sk.kind, 'aura', '光环会随统领阵亡回落，与设计者要的「当前场次永久」相反');
  assert.deepEqual(sk.effects![0]!.target, { source: true }, '只作用于自身，不互相增益');
  assert.deepEqual(sk.effects![0]!.attack_from, { side: 'ally', filter: { tag: 'huang_jin_tongling' } });
  assert.deepEqual(sk.effects![1]!.condition,
    { exists: { side: 'ally', filter: { card_id: 'qun_huangjinlishi' } } },
    '力士那一档用 exists 门控 —— 若干张力士也只算一次');
  assert.deepEqual((tok.tags ?? []).sort(), ['huang_jin', 'huang_jin_zhong']);
});

/** 让一张黄巾力士阵亡，返回它召出来的黄巾兵列表（真实召唤路径） */
function tokensFromLishi(opts: { ling?: string[]; anotherLishi?: boolean }) {
  const s = setup();
  let col = 0;
  for (const id of opts.ling ?? []) {
    setUnit(s.state, 'own', 'front', col++, makeUnit(real(id), 0, nextUidSeq(s.state)));
  }
  if (opts.anotherLishi) {
    setUnit(s.state, 'own', 'front', col++, makeUnit(real('qun_huangjinlishi'), 0, nextUidSeq(s.state)));
  }
  setUnit(s.state, 'own', 'front', 7, makeUnit(real('qun_huangjinlishi'), 0, nextUidSeq(s.state)));
  dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 7), 99, [], '测试');
  return allUnits(s.state, 'own').filter((r) => r.unit.cardId === 'token_huangjin_bing');
}

const statsOf = (refs: ReturnType<typeof tokensFromLishi>) => refs.map((r) => [r.unit.atk, r.unit.maxHp]);

test('黄巾众逐档核对：落地即按当时局面 —— 与设计者三条例子逐条对齐', () => {
  assert.deepEqual(statsOf(tokensFromLishi({})), [[1, 1], [1, 1]], '无统领也无力士：普通 1/1');
  assert.deepEqual(statsOf(tokensFromLishi({ ling: ['qun_zhangliang'] })), [[2, 2], [2, 2]], '1 名统领 → 2/2');
  assert.deepEqual(statsOf(tokensFromLishi({ ling: ['qun_zhangliang', 'qun_zhangbao'] })), [[3, 3], [3, 3]],
    '2 名统领、无力士 → 3/3（设计者例①）');
  assert.deepEqual(
    statsOf(tokensFromLishi({ ling: ['qun_zhangliang', 'qun_zhangbao', 'qun_zhangjiao'] })),
    [[4, 4], [4, 4]], '三兄弟齐全 → 4/4（设计者例②）');
  assert.deepEqual(statsOf(tokensFromLishi({ ling: ['qun_zhangjiao'], anotherLishi: true })), [[3, 3], [3, 3]],
    '另有 1 张力士在场 ＋ 1 名统领 → 3/3（设计者例③）');
  assert.deepEqual(statsOf(tokensFromLishi({ anotherLishi: true })), [[2, 2], [2, 2]],
    '只有力士（若干张）在场 → 2/2，力士只算一次');
});

test('永久成长：统领阵亡后黄巾兵不缩回去（单向棘轮）', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_zhangliang'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'own', 'front', 7, makeUnit(real('qun_huangjinlishi'), 0, nextUidSeq(s.state)));
  dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 7), 99, [], '测试');
  const before = allUnits(s.state, 'own').find((r) => r.unit.cardId === 'token_huangjin_bing')!;
  assert.deepEqual([before.unit.atk, before.unit.maxHp], [2, 2]);

  dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 0), 99, [], '测试'); // 斩掉统领
  const after = allUnits(s.state, 'own').find((r) => r.unit.cardId === 'token_huangjin_bing')!;
  assert.deepEqual([after.unit.atk, after.unit.maxHp], [2, 2],
    '统领死了也不回落 —— 这正是设计者要的「当前场次永久」（旧版光环会缩回 1/1）');
});

test('统领上场：场上已有的黄巾众永久 +1/+1，且同一名统领只算一次', () => {
  const s = setup();
  // 张梁（统领）已在场；另有一个「早先召出来的」黄巾兵
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('qun_zhangliang'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'own', 'front', 1, makeUnit(real('token_huangjin_bing'), 0, nextUidSeq(s.state)));

  s.state.sides.own.hand = [{ card: real('qun_zhangbao'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 2 });
  assert.ok(r.ok, r.error ?? '出牌应成功');

  const tokens = allUnits(r.state, 'own').filter((x) => x.unit.cardId === 'token_huangjin_bing');
  assert.equal(tokens.length, 3, '原有的 1 个 ＋ 张宝战吼召的 2 个');
  const fresh = tokens.filter((x) => x.col !== 1);
  for (const t of fresh) {
    assert.deepEqual([t.unit.atk, t.unit.maxHp], [3, 3],
      '新召的兵落地快照 2 名统领 = 3/3；若战吼「先召唤后 buff」，同一名统领会被算两次变 4/4');
  }
  const old = tokens.find((x) => x.col === 1)!;
  assert.deepEqual([old.unit.atk, old.unit.maxHp, old.unit.mods.filter((m) => m.kind === 'permanent').length],
    [2, 2, 1], '老的一个只吃到张宝这一档 +1/+1，且只有一条永久修正（没有重复计）');
});

test('张角「大贤良师」：上场时给场上黄巾众永久 +1/+1', () => {
  const s = setup();
  s.state.sides.own.command.cur = 10;
  setUnit(s.state, 'own', 'front', 0, makeUnit(real('token_huangjin_bing'), 0, nextUidSeq(s.state)));
  const lishi = makeUnit(real('qun_huangjinlishi'), 0, nextUidSeq(s.state));
  setUnit(s.state, 'own', 'front', 1, lishi);
  s.state.sides.own.hand = [{ card: real('qun_zhangjiao'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 2 });
  assert.ok(r.ok, r.error ?? '出牌应成功');
  const tok = allUnits(r.state, 'own').find((x) => x.unit.cardId === 'token_huangjin_bing')!;
  const li = allUnits(r.state, 'own').find((x) => x.unit.cardId === 'qun_huangjinlishi')!;
  assert.deepEqual([tok.unit.atk, tok.unit.maxHp], [2, 2], '黄巾兵 +1/+1');
  assert.deepEqual([li.unit.atk, li.unit.maxHp], [3, 4], '力士也 +1/+1（2/3 → 3/4）');
});

/* =====================================================================
   五、两条引擎事实（都钉住以免日后被"优化"掉）
   ===================================================================== */

test('引擎事实：召唤也派发 on_play（ADR-121）—— 被召唤的单位落地即触发战吼', () => {
  const s = setup();
  const unit = {
    id: 'probe_summoned', name: '探针兵', faction: 'qun', type: 'token', cost: 0,
    attack: 2, health: 2, keywords: [], memo: '',
    skills: [{
      id: 'probe_on_play', name: '落地', kind: 'trigger', trigger: 'on_play',
      effects: [{ action: 'modify', attack: 1, health: 1, target: { source: true } }],
    }],
  } as CardDef;
  const summoner = {
    id: 'probe_summoner', name: '探针召唤者', faction: 'qun', type: 'general', cost: 1,
    attack: 1, health: 1, keywords: [], memo: '',
    skills: [{
      id: 'probe_summon', name: '召唤', kind: 'trigger', trigger: 'on_play',
      effects: [{ action: 'summon', unit: 'probe_summoned', count: 2, position: 'random' }],
    }],
  } as CardDef;
  s.ctx.cards.set(unit.id, unit);
  s.ctx.cards.set(summoner.id, summoner);
  s.state.sides.own.command.cur = 9;
  s.state.sides.own.hand = [{ card: summoner, mods: [] }];

  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '出牌应成功');
  const summoned = allUnits(r.state, 'own').filter((x) => x.unit.cardId === 'probe_summoned');
  assert.equal(summoned.length, 2, '召唤了 2 个');
  for (const x of summoned) {
    assert.deepEqual([x.unit.atk, x.unit.maxHp], [3, 3],
      '落地时自己的 on_play 必须跑 —— 改动前只有 playCard / upgradeUnit 派发，召唤出来的一律不跑');
  }
});

test('引擎事实：全体光环按同名份数独立叠加 —— 所以「黄巾众」只作用于自身', () => {
  const s = setup();
  const probe = {
    id: 'probe_aura_lishi', name: '探针力士', faction: 'qun', type: 'troop', cost: 2,
    attack: 2, health: 2, troopKind: 'infantry', tags: ['huang_jin'], keywords: [], memo: '',
    skills: [{
      id: 'probe_li', name: '力士', kind: 'aura',
      effects: [{
        action: 'modify', attack: 1,
        target: { side: 'ally', filter: { type: 'character', tag: 'huang_jin' }, count: 'all' },
      }],
    }],
  } as CardDef;
  s.ctx.cards.set(probe.id, probe);
  for (const col of [0, 1, 2]) setUnit(s.state, 'own', 'front', col, makeUnit(probe, 0, nextUidSeq(s.state)));
  for (const col of [3, 4]) {
    setUnit(s.state, 'own', 'front', col, makeUnit(real('token_huangjin_bing'), 0, nextUidSeq(s.state)));
  }
  setUnit(s.state, 'own', 'front', 5, makeUnit(real('neutral_infantry'), 0, nextUidSeq(s.state)));

  recomputeAuras(s.state, s.ctx.cards, createRng(1), []);

  const atk = (col: number) => getUnit(s.state, 'own', 'front', col)!.atk;
  assert.deepEqual([atk(0), atk(1), atk(2)], [5, 5, 5], '2 基础 ＋ 3 份光环 = 5（6 费换 15 点攻击）');
  assert.deepEqual([atk(3), atk(4)], [4, 4], '黄巾兵 1 ＋ 3 份光环 = 4');
  assert.equal(atk(5), 1, '非黄巾单位不受影响 —「黄巾众」绝不能写成这种全体光环');
  assert.equal(real('qun_huangjinlishi').skills!.some((sk) => sk.kind === 'aura'), false,
    '力士与黄巾兵走的都是 on_play 永久快照，不是光环');
});

/* =====================================================================
   六、白马义从（马腾线之后的第二张群雄骑兵）——「骑射」重做（ADR-123）
   史料：《英雄记》「選騎射之士，號為白馬義從，以為左右翼」；
        《三国志·魏书八》界桥「白馬義從為中堅……左射右，右射左」
   ===================================================================== */

test('白马义从：4 费 3/3 骑兵，无先攻、无战技，只有战吼「夹射」', () => {
  const c = real('qun_baimayicong');
  assert.deepEqual([c.cost, c.attack, c.health], [4, 3, 3]);
  assert.equal(c.troopKind, 'cavalry');
  assert.deepEqual(c.keywords ?? [], [],
    '⚠️ 刻意不给先攻：战吼(≈3.5)＋先攻(1)＋3/3(6) ≈ 10.5 已超 4 费基准 9；'
    + '且群雄原有两张 4 费 3/3 先攻骑兵（白马义从／西凉铁骑）几乎同形，去掉先攻正好把两张卡拆开');

  const skills = c.skills ?? [];
  assert.equal(skills.length, 1, '只留一个技能');
  const sk = skills[0]!;
  assert.equal(sk.name, '夹射');
  assert.equal(sk.trigger, 'on_play', '是战吼（一次性齐射），不是每回合的战技');
  assert.ok(!(sk.kind === 'active'), '不再是战技');

  // ① 主目标 2 点，且**不含主公**（"左右相邻"是棋盘概念，主公不在 8 列里）
  const main = sk.effects![0]!;
  assert.equal(main.action, 'damage');
  assert.equal(main.value, 2);
  assert.deepEqual(main.target,
    { side: 'enemy', filter: { type: 'character', include_lord: false }, count: 1, mode: 'choose' });
  // ② 左右相邻各 1 点 —— 引擎内建 adjacent_to: chosen（Math.abs(col - chosen.col) === 1 ＝ 左右两侧）
  const side = sk.effects![1]!;
  assert.equal(side.action, 'damage');
  assert.equal(side.value, 1);
  assert.deepEqual(side.target, {
    side: 'enemy',
    filter: { type: 'character', include_lord: false, adjacent_to: 'chosen' },
    count: 'all',
  });
  assert.match(sk.text ?? '', /2\s*点/, '卡面文案必须写出主伤害 2');
  assert.match(sk.text ?? '', /1\s*点/, '卡面文案必须写出相邻伤害 1');
});

test('夹射结算：打中间目标 → 本身 2 点、左右各 1 点；不误伤其他格', () => {
  const s = setup();
  // 敌方 col 3 / 4 / 5 各一个 2/6 白毦兵（血厚便于读数），col 7 放一个做对照
  for (const col of [3, 4, 5, 7]) setUnit(s.state, 'enemy', 'front', col, makeUnit(real('shu_bai_erbing'), 0, nextUidSeq(s.state)));
  s.state.sides.own.command.cur = 9;
  s.state.sides.own.hand = [{ card: real('qun_baimayicong'), mods: [] }];

  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 4 },
  });
  assert.ok(r.ok, r.error ?? '出牌应成功');

  const hp = (col: number) => getUnit(r.state, 'enemy', 'front', col)!.hp;
  assert.equal(hp(4), 4, '主目标 6 − 2 = 4');
  assert.equal(hp(3), 5, '左邻 6 − 1 = 5');
  assert.equal(hp(5), 5, '右邻 6 − 1 = 5');
  assert.equal(hp(7), 6, '不挨着的单位不受伤');
  assert.equal(r.state.sides.enemy.lord.hp, 30, '不含主公 —— 主公不掉血');
});

test('夹射的口径：相邻按**列位**算（col ± 1），空列不压缩；越界不绕回', () => {
  const s = setup();
  // 只放 col 0 与 col 2（col 1 是空格）
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(real('shu_bai_erbing'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'enemy', 'front', 2, makeUnit(real('shu_bai_erbing'), 0, nextUidSeq(s.state)));
  s.state.sides.own.command.cur = 9;
  s.state.sides.own.hand = [{ card: real('qun_baimayicong'), mods: [] }];
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.ok(r.ok, r.error ?? '出牌应成功');
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 4, '主目标 6 − 2');
  assert.equal(getUnit(r.state, 'enemy', 'front', 2)!.hp, 6,
    'col 1 是空格 → 相邻判定按列位（col ± 1），**不压缩距离**，col 2 不吃伤害'
    + '（与蒙冲斗舰「空格跳过」、霹雳车「左右相邻」同一口径）');

  // 越界：打 col 0 时左侧没有格子，不应"绕回"到最右列
  const s2 = setup();
  setUnit(s2.state, 'enemy', 'front', 0, makeUnit(real('shu_bai_erbing'), 0, nextUidSeq(s2.state)));
  setUnit(s2.state, 'enemy', 'front', 7, makeUnit(real('shu_bai_erbing'), 0, nextUidSeq(s2.state)));
  s2.state.sides.own.command.cur = 9;
  s2.state.sides.own.hand = [{ card: real('qun_baimayicong'), mods: [] }];
  const r2 = applyAction(s2.state, s2.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.ok(r2.ok, r2.error ?? '出牌应成功');
  assert.equal(getUnit(r2.state, 'enemy', 'front', 7)!.hp, 6, '打最左列不会绕回去打最右列');
});

test('白马义从没有先攻：打出当回合不能攻击（与西凉铁骑的对照）', () => {
  // 白马义从（无先攻）
  const s = setup();
  setUnit(s.state, 'enemy', 'front', 3, makeUnit(real('shu_bai_erbing'), 0, nextUidSeq(s.state)));
  s.state.sides.own.command.cur = 9;
  s.state.sides.own.hand = [{ card: real('qun_baimayicong'), mods: [] }];
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 3 },
  });
  assert.ok(r.ok, r.error ?? '出牌应成功');
  assert.equal(allUnits(r.state, 'own').find((u) => u.unit.cardId === 'qun_baimayicong')!.unit.attackedThisTurn, 0);
  const atk = applyAction(r.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 3 },
  });
  assert.equal(atk.ok, false, '没有先攻 → 入场当回合不能攻击（这是它把机动性换成齐射的代价）');
  assert.equal(getUnit(r.state, 'enemy', 'front', 3)!.hp, 4,
    '只吃了齐射的 2 点（6→4）；攻击被拦，没有再掉血'
    + '（引擎对"召唤失调"返回的是通用「动作不合法」，前端不会给出这个按钮）');

  // 对照：同为群雄 4 费 3/3 骑兵的西凉铁骑**有**先攻，同样操作应当成功
  const s2 = setup();
  setUnit(s2.state, 'enemy', 'front', 3, makeUnit(real('shu_bai_erbing'), 0, nextUidSeq(s2.state)));
  s2.state.sides.own.command.cur = 9;
  s2.state.sides.own.hand = [{ card: real('qun_xiliangtieqi'), mods: [] }];
  const r2 = applyAction(s2.state, s2.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r2.ok, r2.error ?? '出牌应成功');
  const atk2 = applyAction(r2.state, s2.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 3 },
  });
  assert.equal(atk2.ok, true, '西凉铁骑带先攻 → 入场当回合可攻击（两张卡的分工由此拉开）');
});

test('公孙瓒卡面文案与实际召唤数一致（2 → 1，ADR-047 削弱后文案漏改）', () => {
  const c = real('qun_gongsunzan');
  const sk = (c.skills ?? []).find((x) => x.name === '白马义从')!;
  const summons = (sk.effects ?? []).filter((e) => e.action === 'summon');
  const count = summons.reduce((n, e) => n + (e.count ?? 1), 0);
  assert.equal(count, 1, '效果只召唤 1 个弓兵');
  assert.match(sk.text ?? '', /召唤\s*1\s*个/, '卡面文案必须写 1 个（曾写成 2 个而效果是 1）');
  assert.match(c.memo ?? '', /1\s*个/, 'memo 也要一致');
});

/* =====================================================================
   七、伏楯士（原「先登盾兵」）：「俱起」成长（ADR-125）
   史料：《英雄记》「義兵皆伏楯下不動……乃同時俱起……直前衝突」
   命名：不用「先登」（会被误读成有先攻），改用「伏楯士」＝蹲盾的人
   ===================================================================== */

test('伏楯士：3 费 1/6 架盾，技能「俱起」每完整回合 +1 攻（封顶 6）', () => {
  const c = real('qun_fudunshi');
  assert.deepEqual([c.cost, c.attack, c.health], [3, 1, 6],
    '1/6 是 3 费盾兵线里最小的身材（同档 3/5、2/6、1/7），成长就是它换来的东西');
  assert.equal(c.name, '伏楯士', '不叫「先登盾兵」——「先登」会被大众误读成有先攻');
  assert.equal(c.troopKind, 'shield');
  assert.deepEqual(c.keywords ?? [], ['jia_dun'], '盾兵必备架盾');

  const sk = (c.skills ?? [])[0]!;
  assert.equal(sk.name, '俱起', '卡名＝姿态（伏楯），技能＝兑现（乃同時俱起）');
  assert.equal(sk.trigger, 'turn_end',
    '己方回合结束时 +1 —— 每个完整回合只涨一次，且**敌人上来时面对的已经是涨过的数值**');
  const eff = (sk.effects ?? [])[0]!;
  assert.equal(eff.action, 'modify');
  assert.equal(eff.attack, 1);
  assert.deepEqual(eff.target, { source: true });
  // 封顶：attack_max: 5 ＝"攻击力 ≤ 5 时才加"，加到 6 自然停住（与蜀越骑「蓄锐」同款实现）
  assert.deepEqual(eff.condition?.all_of?.[0],
    { count: { selector: { source: true, filter: { attack_max: 5 } }, op: '==', value: 1 } },
    '涨到 6 攻必须停住');
  assert.match(sk.text ?? '', /6/, '卡面文案必须写出上限 6');
  assert.ok(!(c.skills ?? []).some((x) => x.effects?.some((e) => e.action === 'attack_bonus')),
    '旧的「攻击时 +2」必须已经移除');
});

test('俱起结算：按设计者给的时序 —— 己方回合结束 +1，敌人面对的是涨过的值', () => {
  const s = setup();
  s.state.sides.own.lord.hp = 99;                 // 避免牌库空导致的粮尽伤害干扰读数
  s.state.sides.enemy.lord.hp = 99;
  place(s, 'qun_fudunshi', 'own', 0);
  const atk = (st = s.state) => getUnit(st, 'own', 'front', 0)!.atk;

  // 设计者原话的时序：
  // 「当前放下的伏楯士是 1/6 盾兵，然后他结束时变为 2 攻，然后敌人行动。
  //   敌人行动完成后轮到我来行，此时还是 2 攻，但是结束后变为 3 攻。」
  assert.equal(atk(), 1, '① 刚打出：1 攻');
  let st = applyAction(s.state, s.ctx, { type: 'END_TURN' }).state;
  assert.equal(atk(st), 2, '② 己方回合结束 → 立刻变 2 攻');
  st = applyAction(st, s.ctx, { type: 'END_TURN' }).state;
  assert.equal(atk(st), 2, '③ 敌人行动完（敌方回合结束不涨）→ 轮到我时仍是 2 攻');
  st = applyAction(st, s.ctx, { type: 'END_TURN' }).state;
  assert.equal(atk(st), 3, '④ 己方回合再次结束 → 3 攻（一整个回合 +1）');

  const round = () => {
    st = applyAction(st, s.ctx, { type: 'END_TURN' }).state;   // 己方结束 → +1
    st = applyAction(st, s.ctx, { type: 'END_TURN' }).state;   // 敌方结束 → 不涨
  };
  for (let i = 0; i < 3; i++) round();
  assert.equal(atk(st), 6, '第 6 个己方回合结束 → 涨满 6 攻');
  for (let i = 0; i < 3; i++) round();
  assert.equal(atk(st), 6, '到 6 攻后停止（attack_max: 5 封顶）');
  assert.equal(getUnit(st, 'own', 'front', 0)!.hp, 6, '成长只加攻击，不加生命');
});

/* =====================================================================
   八、陷阵营：「抉择」二选一 ＋「无不破者」破盾墙（ADR-126/127）
   史料：《英雄记》「鎧甲鬬具皆精練齊整，每所攻擊無不破者，名為陷陣營」；
        《三国志·魏书七》「遣高順攻劉備於沛，破之……夏侯惇救備，為順所敗」
   ===================================================================== */

test('陷阵营：4 费 2/5 抉择 —— 架盾 2/7 或 先攻 4/5（另外保留无不破者）', () => {
  const c = real('qun_xianzhenying');
  assert.deepEqual([c.cost, c.attack, c.health], [4, 2, 5],
    '基础 2/5 ＝ 7 点，低于 4 费基准 9 —— 两个分支各补 3 点回来');
  assert.equal(c.troopKind, 'shield');
  assert.deepEqual(c.keywords ?? [], [], '架盾/先攻都由战吼抉择当场授予，不是卡面固定关键词');

  const modal = (c.skills ?? []).find((x) => x.name === '陷阵')!;
  assert.equal(modal.trigger, 'on_play');
  assert.equal(modal.modes?.length, 2, '两个分支');
  assert.deepEqual(modal.modes![0]!.effects!.map((e) => [e.action, e.status ?? e.health]),
    [['apply_status', 'jia_dun_status'], ['modify', 2]], '① 架盾 ＋ 生命 +2 → 2/7');
  assert.deepEqual(modal.modes![1]!.effects!.map((e) => [e.action, e.status ?? e.attack]),
    [['apply_status', 'xian_gong_status'], ['modify', 2]], '② 先攻 ＋ 攻击 +2 → 4/5');

  const po = (c.skills ?? []).find((x) => x.name === '无不破者')!;
  assert.equal(po.trigger, 'on_attack');
  assert.deepEqual(po.effects![0]!.condition, { attack_target: { keyword: 'jia_dun' } },
    '「无不破者」是两个分支共有的固有属性（抉择换的是怎么用它，不是它是谁）');
  assert.equal(po.effects![0]!.value, 2);
});

test('抉择结算：从手牌打出，① 变 2/7 带架盾；② 变 4/5 带先攻且当回合能打', () => {
  const s = setup();
  s.state.sides.own.command.cur = 9;
  s.state.sides.own.hand = [{ card: real('qun_xianzhenying'), mods: [] }];
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0, modeIndex: 0,
  });
  assert.ok(r.ok, r.error ?? '出牌应成功');
  const a = getUnit(r.state, 'own', 'front', 0)!;
  assert.deepEqual([a.atk, a.hp, a.maxHp], [2, 7, 7], '① 架盾分支：2/7');
  assert.ok(hasTrait(a, 'jia_dun'), '并获得架盾（嘲讽）');
  assert.ok(!hasTrait(a, 'xian_gong'), '不该同时有先攻');

  const s2 = setup();
  s2.state.sides.own.command.cur = 9;
  s2.state.sides.own.hand = [{ card: real('qun_xianzhenying'), mods: [] }];
  const r2 = applyAction(s2.state, s2.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0, modeIndex: 1,
  });
  assert.ok(r2.ok, r2.error ?? '出牌应成功');
  const b = getUnit(r2.state, 'own', 'front', 0)!;
  assert.deepEqual([b.atk, b.hp, b.maxHp], [4, 5, 5], '② 先攻分支：4/5');
  assert.ok(hasTrait(b, 'xian_gong'), '并获得先攻');
  assert.ok(!hasTrait(b, 'jia_dun'), '不该同时有架盾');

  // 先攻＝入场当回合即可攻击
  setUnit(r2.state, 'enemy', 'front', 3, makeUnit(real('shu_bai_erbing'), 0, nextUidSeq(r2.state)));
  const atk = applyAction(r2.state, s2.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 3 },
  });
  assert.equal(atk.ok, true, '先攻分支打出当回合就能攻击');
});

test('升变选先攻：同样能当回合再打一次（ADR-127 修的引擎缺口）', () => {
  const s = setup();
  s.state.sides.own.command.cur = 9;
  // 2 费盾兵（有架盾），先让它打一次，再升变成陷阵营并选「先攻」
  const shield = place(s, 'neutral_shieldman', 'own', 0);
  shield.enteredTurn = -1;
  shield.upgradeProgress = { damage: 0, shieldSurvival: 2, basicKills: 0, characterKills: 0, heroHits: 0 };
  setUnit(s.state, 'enemy', 'front', 3, makeUnit(real('shu_bai_erbing'), 0, nextUidSeq(s.state)));
  const first = applyAction(s.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 3 },
  });
  assert.equal(first.ok, true, '盾兵先打一次');
  assert.equal(getUnit(first.state, 'own', 'front', 0)!.attackedThisTurn, 1, '本回合已用掉普攻');

  const up = applyAction(first.state, s.ctx, {
    type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: 'qun_xianzhenying', modeIndex: 1,
  });
  assert.ok(up.ok, up.error ?? '升变应成功');
  const u = getUnit(up.state, 'own', 'front', 0)!;
  assert.equal(u.cardId, 'qun_xianzhenying');
  assert.deepEqual([u.atk, u.hp, u.maxHp], [4, 5, 5], '先攻分支的属性也要生效（战吼在升变路径必须执行）');
  assert.ok(hasTrait(u, 'xian_gong'), '先攻由战吼授予 —— 升变路径也要拿到');
  assert.equal(u.attackedThisTurn, 0, 'ADR-127：先攻的返还必须在战吼之后判定，升变选先攻也能再打一次');

  const second = applyAction(up.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 3 },
  });
  assert.equal(second.ok, true, '升变来的先攻同样可以当回合再攻击一次');
});

test('升变选架盾：变 2/7 并获得嘲讽', () => {
  const s = setup();
  s.state.sides.own.command.cur = 9;
  const shield = place(s, 'neutral_shieldman', 'own', 0);
  shield.enteredTurn = -1;
  shield.upgradeProgress = { damage: 0, shieldSurvival: 2, basicKills: 0, characterKills: 0, heroHits: 0 };
  const up = applyAction(s.state, s.ctx, {
    type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: 'qun_xianzhenying', modeIndex: 0,
  });
  assert.ok(up.ok, up.error ?? '升变应成功');
  const u = getUnit(up.state, 'own', 'front', 0)!;
  assert.deepEqual([u.atk, u.hp, u.maxHp], [2, 7, 7], '架盾分支：2/7');
  assert.ok(hasTrait(u, 'jia_dun'));
});

test('陷阵结算：打架盾目标 +2 攻，打不带架盾的目标不加，且不绕过架盾', () => {
  const a = setup();
  setUnit(a.state, 'enemy', 'front', 3, makeUnit(real('shu_bai_erbing'), 0, nextUidSeq(a.state)));
  a.state.sides.own.command.cur = 9;
  a.state.sides.own.hand = [{ card: real('qun_xianzhenying'), mods: [] }];
  const ra = applyAction(a.state, a.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0, modeIndex: 1,
  });
  assert.ok(ra.ok, ra.error ?? '出牌应成功');
  const atk = applyAction(ra.state, a.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 3 },
  });
  assert.ok(atk.ok, atk.error ?? '攻击应成功');
  assert.equal(getUnit(atk.state, 'enemy', 'front', 3), null,
    '先攻分支 4 攻 ＋ 破盾 2 ＝ 6 点，6 血白毦兵被一击打死');

  const b = setup();
  setUnit(b.state, 'enemy', 'front', 3, makeUnit(real('wei_hubaoki_hu'), 0, nextUidSeq(b.state)));
  b.state.sides.own.command.cur = 9;
  b.state.sides.own.hand = [{ card: real('qun_xianzhenying'), mods: [] }];
  const rb = applyAction(b.state, b.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0, modeIndex: 1,
  });
  assert.ok(rb.ok, rb.error ?? '出牌应成功');
  const atk2 = applyAction(rb.state, b.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 3 },
  });
  assert.ok(atk2.ok, atk2.error ?? '攻击应成功');
  assert.equal(getUnit(atk2.state, 'enemy', 'front', 3)!.hp, 5 - 4, '打不带架盾的目标：只有 4 点');

  // 架盾的嘲讽仍然有效：敌方有架盾单位时不能越过它打别人
  const c = setup();
  setUnit(c.state, 'enemy', 'front', 3, makeUnit(real('shu_bai_erbing'), 0, nextUidSeq(c.state)));
  setUnit(c.state, 'enemy', 'front', 5, makeUnit(real('neutral_infantry'), 0, nextUidSeq(c.state)));
  c.state.sides.own.command.cur = 9;
  c.state.sides.own.hand = [{ card: real('qun_xianzhenying'), mods: [] }];
  const rc = applyAction(c.state, c.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0, modeIndex: 1,
  });
  const over = applyAction(rc.state, c.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 5 },
  });
  assert.equal(over.ok, false, '「无不破者」只是打盾墙更疼，**并不绕过架盾**');
});

/* =====================================================================
   九、乌桓突骑：攻高血少的游牧突骑（ADR-128）
   史料：《后汉书·卷73》「發幽州烏桓三千突騎」；《乌桓传》「烏桓者本東胡也……俗善騎射」
   ===================================================================== */

test('乌桓突骑：4 费 4/3 骑兵，先攻 ＋ 战吼随机齐射（不再是弓兵战技）', () => {
  const c = real('qun_wuhuantuqi');
  assert.deepEqual([c.cost, c.attack, c.health], [4, 4, 3],
    '攻高血少：4/3 ＝ 7 点（4 费基准 9，−1），靠先攻＋战吼补回');
  assert.equal(c.troopKind, 'cavalry', '「突骑」本就是骑兵 —— 修掉 ADR-118 留下的 archer 归属');
  assert.equal(c.upgradeFrom, 'cavalry', '升变来源同步改为骑兵');
  assert.deepEqual(c.keywords ?? [], ['xian_gong']);

  const sk = (c.skills ?? [])[0]!;
  assert.equal(sk.name, '突骑');
  assert.equal(sk.trigger, 'on_play', '齐射是战吼（一次性），不是每回合的战技');
  assert.equal(sk.kind, 'trigger');
  assert.ok(!(c.skills ?? []).some((x) => x.kind === 'active'), '不再有 active 战技（放箭已移除）');
  const eff = (sk.effects ?? [])[0]!;
  assert.equal(eff.action, 'damage');
  assert.equal(eff.value, 2, '每下 2 点');
  assert.equal(eff.count, 2, '结算两次（最多 4 点）');
  assert.equal(eff.target!.mode, 'random', '随机分配 —— 游牧骑射的骚扰性');
  assert.equal(eff.target!.filter!.include_lord, true, 'ADR-087：随机伤害默认含主公');
});

test('乌桓突骑结算：齐射随机打两个目标（固定 4 点总量），且先攻当回合能冲', () => {
  const s = setup();
  s.state.sides.own.command.cur = 9;
  // 敌方只有两个单位（各 9 血），保证两下都落在场上、便于读总伤害
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(real('wei_hubaoki_hu'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'enemy', 'front', 2, makeUnit(real('wei_hubaoki_hu'), 0, nextUidSeq(s.state)));
  const hpBefore = s.state.sides.enemy.lord.hp;
  s.state.sides.own.hand = [{ card: real('qun_wuhuantuqi'), mods: [] }];

  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 5 });
  assert.ok(r.ok, r.error ?? '出牌应成功');

  const a = getUnit(r.state, 'enemy', 'front', 0)!;
  const b = getUnit(r.state, 'enemy', 'front', 2)!;
  const dealt = (5 - a.hp) + (5 - b.hp);
  const lord = hpBefore - r.state.sides.enemy.lord.hp;
  assert.equal(dealt + lord, 4, '齐射总量固定 4 点（2 点 × 2 次），只是随机分配');
  assert.ok(dealt >= 0 && lord >= 0);
  assert.deepEqual([getUnit(r.state, 'own', 'front', 5)!.atk, getUnit(r.state, 'own', 'front', 5)!.hp], [4, 3]);

  // 先攻：入场当回合即可攻击
  const atk = applyAction(r.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 5 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.equal(atk.ok, true, '先攻 → 到场当回合就能冲');
});

/* =====================================================================
   十、先登弩手：2 费强弩（ADR-129）
   史料：《袁绍传》「強弩千張，以為前登」；《英雄记》「強弩雷發，所中必倒」
   ===================================================================== */

test('先登弩手：2 费 1/2 弓兵，战技「强弩」指定 2 点（含主公）', () => {
  const c = real('qun_xiandengnushou');
  assert.deepEqual([c.cost, c.attack, c.health], [2, 1, 2],
    'ADR-112 显式豁免的 2 费弓兵（先例：蜀·连弩士）；补上群雄缺失的 2 费档');
  assert.equal(c.troopKind, 'archer');
  assert.deepEqual(c.keywords ?? [], ['zhan_ji']);

  const sk = (c.skills ?? [])[0]!;
  assert.equal(sk.name, '强弩');
  assert.equal(sk.kind, 'active', '战技（每回合可持续）—— 战吼版会弱于基础弓兵的每回合乱射');
  assert.equal(sk.frequency, 'once_per_turn');
  const eff = (sk.effects ?? [])[0]!;
  assert.equal(eff.action, 'damage');
  assert.equal(eff.value, 2, '基础弓兵是 1 点随机 → 特种翻倍为 2 点');
  assert.equal(eff.target!.mode, 'choose', '指定目标（旧版的"随机秒杀"去掉，不再有方差）');
  assert.equal(eff.target!.filter!.include_lord, true,
    '含主公：基础弓兵「放箭」本就含主公；且不含主公会被蜀·连弩士完全压住（它 1+1 可分开打）');
  assert.ok(!(c.skills ?? []).some((x) => x.effects?.some((e) => e.action === 'destroy')),
    '旧的「消灭」必须移除 —— 随机秒杀接近 12-randomness 规则一');
});

test('强弩结算：指定目标 2 点；也可以指定敌方主公打脸', () => {
  const s = setup();
  s.state.sides.own.command.cur = 9;
  s.state.sides.own.hand = [{ card: real('qun_xiandengnushou'), mods: [] }];
  setUnit(s.state, 'enemy', 'front', 3, makeUnit(real('shu_bai_erbing'), 0, nextUidSeq(s.state)));
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '出牌应成功');
  const u = getUnit(r.state, 'own', 'front', 0)!;

  const hitUnit = applyAction(r.state, s.ctx, {
    type: 'USE_SKILL', row: 'front', col: 0, skillId: 'qiang_nu',
    target: { side: 'enemy', row: 'front', col: 3 },
  });
  assert.ok(hitUnit.ok, hitUnit.error ?? '战技应成功');
  assert.equal(getUnit(hitUnit.state, 'enemy', 'front', 3)!.hp, 6 - 2, '指定人物：2 点');

  // 第二个回合 → 再指定主公打脸
  let st = hitUnit.state;
  st = applyAction(st, s.ctx, { type: 'END_TURN' }).state;
  st = applyAction(st, s.ctx, { type: 'END_TURN' }).state;
  const lordBefore = st.sides.enemy.lord.hp;
  const hitLord = applyAction(st, s.ctx, {
    type: 'USE_SKILL', row: 'front', col: 0, skillId: 'qiang_nu',
    target: { side: 'enemy' },
  });
  assert.ok(hitLord.ok, hitLord.error ?? '战技应成功');
  assert.equal(hitLord.state.sides.enemy.lord.hp, lordBefore - 2, '可以打主公（打脸 2 点）');
  void u;
});

/* =====================================================================
   十一、象兵（蜀）：新选择器 attack_target（ADR-130）
   —— 本文件是群雄文件，但象兵是"为它新加引擎能力"的卡，测试放这里集中管理
   ===================================================================== */

test('象兵：蜀 4 费 3/6 骑兵，无先攻，象阵 50% 震慑"被打的那个目标"', () => {
  const c = real('shu_xiangbing');
  assert.equal(c.faction, 'shu');
  assert.deepEqual([c.cost, c.attack, c.health], [4, 3, 6], '3/6 ＝ 9 点 ＝ 正好 4 费基准');
  assert.equal(c.troopKind, 'cavalry');
  assert.deepEqual(c.keywords ?? [], [], '无先攻：象不是冲过去的，是碾过去的');

  const sk = (c.skills ?? [])[0]!;
  assert.equal(sk.name, '象阵');
  assert.equal(sk.trigger, 'on_attack');
  const eff = (sk.effects ?? [])[0]!;
  assert.equal(eff.action, 'apply_status');
  assert.equal(eff.status, 'zhen_she');
  assert.equal(eff.chance, 0.5, '50%（与张角五雷轰顶同款写法，避免每回合稳定点控过强）');
  assert.equal(eff.duration, 1);
  assert.deepEqual(eff.target, { attack_target: true },
    'ADR-130 新增的选择器：以"本次普通攻击的目标"为作用对象（此前只有 condition 能读它）');
  assert.match(sk.text ?? '', /攻击时/, '卡面要写"攻击时"——on_attack 的非击杀效果在伤害结算前执行');
});

test('attack_target 选择器：状态只落在"被打的那个单位"身上，从不误伤别人', () => {
  // 单次攻击即可验证选择器：无论 50% 是否命中，**中招的只可能是被打的那个**。
  // （概率本身是数据层断言：`chance: 0.5`，与张角五雷同款；不做统计抖动测试。）
  const s = setup();
  s.state.sides.own.command.cur = 9;
  s.state.sides.own.lord.hp = 99;
  s.state.sides.enemy.lord.hp = 99;
  const bag = makeUnit(real('wei_piliche'), 0, nextUidSeq(s.state));   // 0 攻：不会反击
  bag.hp = 99; bag.maxHp = 99;                                        // 加血：保证挨完这一下还活着
  setUnit(s.state, 'enemy', 'front', 3, bag);
  setUnit(s.state, 'enemy', 'front', 5, makeUnit(real('wei_piliche'), 0, nextUidSeq(s.state)));
  const xiang = place(s, 'shu_xiangbing', 'own', 0);
  xiang.enteredTurn = -1;

  const r = applyAction(s.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 3 },
  });
  assert.ok(r.ok, r.error ?? '攻击应成功');
  const target = getUnit(r.state, 'enemy', 'front', 3)!;
  const bystander = getUnit(r.state, 'enemy', 'front', 5)!;
  assert.equal(bystander.statuses['zhen_she']?.stacks ?? 0, 0,
    '没被打的那个单位永远不该被震慑 —— 选择器只认"本次攻击的目标"');
  // 命中与否由 50% 决定（概率本身在数据层断言 chance: 0.5），这里只要求：
  // ① 没打到的人绝不被震慑；② 攻击正常结算（靶子掉了 3 血）。
  assert.equal(target.hp, 99 - 3, '攻击正常结算：3 攻打掉 3 血');
});
