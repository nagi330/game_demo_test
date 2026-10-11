import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction, upgradeCost, upgradeStatus } from '../src/engine.ts';
import { dealDamage, unitRef, lordRef } from '../src/mutate.ts';
import { runEffects, recomputeAuras, resolveAttack } from '../src/effects.ts';
import { createRng } from '../src/rng.ts';
import { allUnits, makeUnit, nextUidSeq, setUnit, getUnit } from '../src/state.ts';
import { canAttack, lordAttackTargets } from '../src/rules.ts';
import { isDeckable } from '../src/deck.ts';
import { scenario } from './fixtures.ts';
import type { CardDef, GameEvent, Side } from '../src/types.ts';

const real: CardDef[] = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
function setup(seed = 1) {
  const s = scenario({ seed });
  for (const c of real) s.ctx.cards.set(c.id, structuredClone(c));
  return s;
}
function place(s: ReturnType<typeof setup>, id: string, side: Side = 'own', col = 0) {
  const u = makeUnit(s.ctx.cards.get(id)!, 0, nextUidSeq(s.state));
  setUnit(s.state, side, 'front', col, u);
  return u;
}
function ready(s: ReturnType<typeof setup>) {
  s.state.sides.own.lord.faction = 'wu';
  const u = place(s, 'neutral_infantry');
  u.upgradeProgress = { damage: 2, shieldSurvival: 0, basicKills: 0, characterKills: 0, heroHits: 0 };
  return u;
}

test('升变：差额不超过1免费，否则只支付超出1费的部分', () => {
  for (const [from, to, expected] of [[1, 2, 0], [1, 3, 1], [3, 5, 1], [3, 3, 0], [3, 2, 0]]) {
    assert.equal(upgradeCost({ cost: from }, { cost: to }), expected);
  }
});

test('升变：依据当前卡池费用，忽略单位缓存；统率不足完全拒绝', () => {
  const s = setup();
  const u = ready(s);
  u.cost = 99;
  s.ctx.cards.get('neutral_infantry')!.cost = 2;
  s.ctx.cards.get('wu_jiefanbing')!.cost = 4;
  const action = { type: 'UPGRADE_UNIT' as const, row: 'front' as const, col: 0, toCardId: 'wu_jiefanbing' };
  s.state.sides.own.command.cur = 0;
  assert.equal(upgradeStatus(s.state, s.ctx.cards, 'own', 'front', 0)!.costs.wu_jiefanbing, 1);
  const rejected = applyAction(s.state, s.ctx, action);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.state, s.state);
  s.state.sides.own.command.cur = 1;
  const r = applyAction(s.state, s.ctx, action);
  assert.equal(r.ok, true);
  assert.equal(r.state.sides.own.command.cur, 0);
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.cardId, 'wu_jiefanbing');
});

for (const id of ['wei_piliche', 'wu_louchuanjun', 'wu_mengchongdoujian']) {
  test(`${id}：军械可构筑并部署，占用单位位置，不是升变选项`, () => {
    const s = setup();
    const c = s.ctx.cards.get(id)!;
    assert.equal(c.type, 'machine');
    assert.equal(c.troopKind, undefined);
    assert.equal(c.upgradeFrom, undefined);
    assert.ok(isDeckable(c));
    s.state.sides.own.hand = [{ card: c, mods: [] }];
    assert.equal(applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0 }).ok, false);
    const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
    assert.ok(r.ok);
    assert.equal(getUnit(r.state, 'own', 'front', 0)!.type, 'machine');
    s.state.sides.own.lord.faction = c.faction;
    const archer = place(s, 'neutral_archer');
    archer.upgradeProgress = { damage: 0, shieldSurvival: 0, basicKills: 0, characterKills: 0, heroHits: 1 };
    assert.equal(upgradeStatus(s.state, s.ctx.cards, 'own', 'front', 0)!.options.some(o => o.id === id), false);
  });
}

test('武射吏：先攻且战技只伤指定目标', () => {
  assert.equal(real.some(c => c.id === 'wei_caowei_nushou'), false);
  assert.equal(real.find(c => c.id === 'wei_qiangnuying')!.name, '冀州强弩');
  assert.equal(real.find(c => c.id === 'wu_jiangdong_nushou')!.name, '武射吏');
  for (const id of ['wu_jiangdong_nushou']) {
    const s = setup();
    place(s, id);
    for (let col = 0; col < 4; col++) {
      const u = place(s, 'test_champion', 'enemy', col);
      u.kw.push('jia_dun');
    }
    recomputeAuras(s.state, s.ctx.cards, createRng(1), []);
    const r = applyAction(s.state, s.ctx, { type: 'USE_SKILL', row: 'front', col: 0,
      target: { side: 'enemy', row: 'front', col: 1 } });
    assert.ok(r.ok);
    assert.deepEqual([0, 1, 2, 3].map(col => getUnit(r.state, 'enemy', 'front', col)!.hp),
      [5, 3, 5, 5]);
    assert.equal(applyAction(r.state, s.ctx, { type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 1 } }).ok, true);
  }
});

test('冀州强弩：基础与升变骑兵单次4伤，非骑兵3伤，披坚免疫整段', () => {
  for (const id of ['neutral_cavalry', 'wei_hubaoki_hu', 'wu_dongwujingqi', 'neutral_infantry']) {
    for (const protectedTarget of [false, true]) {
      const s = setup();
      place(s, 'wei_qiangnuying');
      const target = place(s, id, 'enemy');
      target.baseMaxHp = target.hp = target.maxHp = 10;
      if (protectedTarget) target.statuses.sheng_dun_status = { stacks: 1 };
      recomputeAuras(s.state, s.ctx.cards, createRng(1), []);
      const r = applyAction(s.state, s.ctx, { type: 'USE_SKILL', row: 'front', col: 0 });
      assert.ok(r.ok);
      const expected = target.troopKind === 'cavalry' ? 4 : 3;
      assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, protectedTarget ? 10 : 10 - expected);
      assert.equal(r.events.filter(e => e.type === 'DAMAGE' && e.target.side === 'enemy').length, protectedTarget ? 0 : 1);
      assert.equal(r.state.sides.enemy.lord.hp, 30);
      assert.equal(applyAction(r.state, s.ctx, { type: 'USE_SKILL', row: 'front', col: 0 }).ok, false);
    }
  }
});

test('水军弓手：水攻强化，战技造成2点水攻且每回合一次', () => {
  const s = setup();
  place(s, 'wu_shuijun_gongshou'); place(s, 'wu_jiangqin', 'own', 1);
  const target = place(s, 'test_champion', 'enemy');
  target.baseMaxHp = target.hp = target.maxHp = 10;
  recomputeAuras(s.state, s.ctx.cards, createRng(1), []);
  const action = { type: 'USE_SKILL' as const, row: 'front' as const, col: 0, target: { side: 'enemy' as const, row: 'front' as const, col: 0 } };
  const r = applyAction(s.state, s.ctx, action);
  assert.ok(r.ok);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 4);
  assert.equal(applyAction(r.state, s.ctx, action).ok, false);
});

test('蒙冲斗舰：技能击杀也能锁定击杀者及相邻位置，不触发技能反伤', () => {
  const s = setup();
  place(s, 'wu_mengchongdoujian');
  const killer = place(s, 'test_champion', 'enemy', 1);
  for (const col of [0, 2, 3]) place(s, 'test_champion', 'enemy', col);
  runEffects(s.state, s.ctx.cards, [{ action: 'damage', value: 3, target: { side: 'enemy', filter: { type: 'machine' }, mode: 'first' } }],
    { side: 'enemy', source: killer }, createRng(1), []);
  assert.equal(getUnit(s.state, 'own', 'front', 0), null);
  assert.deepEqual([0, 1, 2, 3].map(col => getUnit(s.state, 'enemy', 'front', col)!.hp), [4, 3, 4, 5]);
});

test('车下虎士：主公普攻一次，不能重复；攻甲到期且永久护甲保留', () => {
  const s = setup();
  place(s, 'wu_chexiahushi');
  s.state.sides.own.lord.armor = 5;
  dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 0), 99, [], '测试');
  const action = { type: 'LORD_ATTACK' as const, to: { kind: 'lord' as const } };
  const r = applyAction(s.state, s.ctx, action);
  assert.ok(r.ok);
  assert.equal(r.state.sides.enemy.lord.hp, 28);
  assert.equal(applyAction(r.state, s.ctx, action).ok, false);
  dealDamage(r.state, s.ctx.cards, lordRef('own'), 1, [], '测试');
  const ended = applyAction(r.state, s.ctx, { type: 'END_TURN' });
  assert.ok(ended.ok);
  assert.equal(ended.state.sides.own.lord.attackThisTurn, undefined);
  assert.equal(ended.state.sides.own.lord.armor, 5);
});

test('主公攻击：架盾优先，攻击单位受到反击，重复加攻不刷新次数', () => {
  const s = setup();
  place(s, 'wu_chexiahushi');
  const shield = place(s, 'test_champion', 'enemy'); shield.kw.push('jia_dun');
  dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 0), 99, [], '测试');
  assert.ok(lordAttackTargets(s.state, 'own').targets.every(t => t.kind === 'unit'));
  assert.equal(applyAction(s.state, s.ctx, { type: 'LORD_ATTACK', to: { kind: 'lord' } }).ok, false);
  const r = applyAction(s.state, s.ctx, { type: 'LORD_ATTACK', to: { kind: 'unit', row: 'front', col: 0 } });
  assert.ok(r.ok);
  assert.equal(r.state.sides.own.lord.hp, 27);
  runEffects(r.state, s.ctx.cards, [{ action: 'modify', attack: 2, duration: 'this_turn', target: { side: 'ally', lord: true } }], { side: 'own' }, createRng(1), []);
  assert.equal(lordAttackTargets(r.state, 'own').targets.length, 0);
});

test('车下虎士：敌方回合阵亡的临时攻甲不带入己方回合', () => {
  const s = setup(); s.state.active = 'enemy';
  place(s, 'wu_chexiahushi');
  dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 0), 99, [], '测试');
  assert.equal(lordAttackTargets(s.state, 'own').targets.length, 0);
  const r = applyAction(s.state, s.ctx, { type: 'END_TURN' });
  assert.equal(r.state.sides.own.lord.attackThisTurn, undefined);
  assert.equal(r.state.sides.own.lord.armor, 0);
});

test('主公普攻：受击技能与忠勇反伤照常触发', () => {
  const s = setup();
  const defender = place(s, 'shu_bai_erbing', 'enemy');
  defender.skills!.push({
    id: 'test_lord_hit', name: '受击测试', kind: 'trigger', trigger: 'on_damaged',
    effects: [{ action: 'draw', count: 1 }],
  });
  s.state.sides.enemy.deck = ['neutral_infantry'];
  s.state.sides.own.lord.attackThisTurn = 2;
  recomputeAuras(s.state, s.ctx.cards, createRng(1), []);
  const r = applyAction(s.state, s.ctx, { type: 'LORD_ATTACK', to: { kind: 'unit', row: 'front', col: 0 } });
  assert.ok(r.ok);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 4);
  assert.equal(r.state.sides.own.lord.hp, 27);
  assert.equal(r.state.sides.enemy.hand.length, s.state.sides.enemy.hand.length + 1);
});

test('主公击杀蒙冲斗舰：亡语识别主公击杀者，不误伤其他单位', () => {
  const s = setup();
  place(s, 'wu_mengchongdoujian', 'enemy');
  place(s, 'test_champion', 'own', 1);
  s.state.sides.own.lord.attackThisTurn = 3;
  const r = applyAction(s.state, s.ctx, { type: 'LORD_ATTACK', to: { kind: 'unit', row: 'front', col: 0 } });
  assert.ok(r.ok);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0), null);
  assert.equal(r.state.sides.own.lord.hp, 27);
  assert.equal(getUnit(r.state, 'own', 'front', 1)!.hp, 5);
});

test('青州兵：普攻后存活时有50%概率夺取牌顶', () => {
  const win = setup();
  win.state.rngState = 7;
  place(win, 'wei_qingzhou_bing');
  const low = place(win, 'test_champion', 'enemy');
  low.atk = 0;
  win.state.sides.enemy.deck = ['neutral_infantry', 'wei_caoxiu'];
  const won = applyAction(win.state, win.ctx, { type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 } });
  assert.ok(won.ok);
  assert.equal(won.state.sides.enemy.deck.length, 1);
  assert.equal(won.state.sides.own.hand.at(-1)?.card.id, 'wei_caoxiu');
  assert.equal(won.events.some(e => e.type === 'CARD_STOLEN'), true);

  const lose = setup();
  lose.state.rngState = 1;
  place(lose, 'wei_qingzhou_bing');
  const high = place(lose, 'test_champion', 'enemy');
  high.atk = 0;
  lose.state.sides.enemy.deck = ['neutral_infantry'];
  const lost = applyAction(lose.state, lose.ctx, { type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 } });
  assert.ok(lost.ok);
  assert.equal(lost.state.sides.enemy.deck.length, 1);
  assert.equal(lost.events.some(e => e.type === 'CARD_STOLEN'), false);
});

test('主公通用普攻：任意效果使主公获得本回合攻击力后均可攻击一次', () => {
  const s = setup();
  place(s, 'test_champion');
  runEffects(s.state, s.ctx.cards, [{ action: 'modify', attack: 2, duration: 'this_turn', target: { side: 'ally', lord: true } }], { side: 'own' }, createRng(1), []);
  const r = applyAction(s.state, s.ctx, { type: 'LORD_ATTACK', to: { kind: 'lord' } });
  assert.ok(r.ok);
  assert.equal(r.state.sides.enemy.lord.hp, 28);
  assert.equal(r.state.sides.own.lord.attackedThisTurn, true);
});

/* ========================================================================
 * 军械「无法普通攻击」是**类型级规则**（ADR-119 / ADR-153）
 *
 * 设计者口径（ADR-153，原话）：「机械卡我们现在设计的是没办法普通攻击的，
 * **带的攻击值是为了别人打的时候有一定的伤害**」
 * —— `attack` 对军械**不是输出手段**，而是"打它要付的代价"（反击，ADR-062 同时结算）。
 *
 * ## 这条为什么值得单独钉死
 *
 * ADR-119 宣布「霹雳车、楼船军、蒙冲斗舰改为军械且**无法普通攻击**」，
 * 但数据里**只有霹雳车**写了 `jin_gong` 光环 —— 楼船军 2/4、蒙冲斗舰 1/3
 * **静默地**保留着普攻能力，横跨多轮无人发现（`validate` 不校验行为，测试也没覆盖）。
 * 现改为两层：
 *   · **引擎层（兜底 + 唯一真源）**：`canAttack` 里 `type === 'machine'` 直接拒绝；
 *   · **数据层（可见反馈）**：四张军械各自保留 `jin_gong` 光环，给玩家看「无法攻击」徽章。
 * 第三、四条测试专门验证**反击不受影响** —— 这正是设计者要那个攻击值的原因。
 * ===================================================================== */

const MACHINES = ['wei_piliche', 'wu_louchuanjun', 'wu_mengchongdoujian', 'shu_muniuliuma'];

test('军械：四张全部带 jin_gong 光环（防再次漏写 —— 楼船军/蒙冲斗舰就漏过一次）', () => {
  for (const id of MACHINES) {
    const c = real.find((x) => x.id === id);
    assert.ok(c, `cards.json 里应有 ${id}`);
    assert.equal(c!.type, 'machine', `${id} 应是军械`);
    const aura = (c!.skills ?? []).find((s) => s.kind === 'aura');
    assert.ok(aura, `${c!.name} 应有光环（jin_gong）`);
    const st = (aura!.effects ?? []).find((e) => e.action === 'apply_status');
    assert.equal(st?.status, 'jin_gong', `${c!.name} 光环应施加 jin_gong`);
  }
});

test('军械：一律不能普攻 —— 即使把 jin_gong 光环扒掉，类型规则仍然拦住', () => {
  const s = setup();
  for (const id of MACHINES) {
    const u = place(s, id, 'own', 0);
    const withAura = canAttack(s.state, 'own', 'front', 0);
    assert.equal(withAura.ok, false, `${u.name}（带光环）不该能普攻`);

    // 直接删掉光环留下的状态 → **依然**拒绝，证明拦截来自 `type` 而非状态
    delete u.statuses.jin_gong;
    const bare = canAttack(s.state, 'own', 'front', 0);
    assert.equal(bare.ok, false, `${u.name}（无光环）仍不该能普攻 —— 类型级兜底`);
    assert.match(bare.reason ?? '', /军械/, '理由应说明是军械规则');

    setUnit(s.state, 'own', 'front', 0, null);
  }
});

test('军械的攻击力**只用于反击**：打楼船军（2/4）要吃 2 点（ADR-062 同时结算）', () => {
  const s = setup();
  place(s, 'wu_louchuanjun', 'enemy', 0);
  const atk = place(s, 'test_champion', 'own', 0);            // 5/5，5 攻打 4 血
  const evs: GameEvent[] = [];
  resolveAttack(s.state, s.ctx.cards, 'own', { row: 'front', col: 0 },
    { kind: 'unit', row: 'front', col: 0 }, evs, createRng(1), { consumeAttack: false });

  assert.equal(getUnit(s.state, 'enemy', 'front', 0), null, '楼船军 4 血挨 5 点应已阵亡');
  assert.equal(atk.hp, 3, '攻击方应吃到 2 点反击（5 → 3）—— 这就是"带的攻击值"的用途');
  assert.ok(evs.some((e) => e.type === 'DAMAGE'), '应有伤害事件');
});

test('军械的攻击力**只用于反击**：打霹雳车（0/3）不吃反击，但它照样不能普攻', () => {
  const s = setup();
  place(s, 'wei_piliche', 'enemy', 0);
  const atk = place(s, 'test_champion', 'own', 0);
  resolveAttack(s.state, s.ctx.cards, 'own', { row: 'front', col: 0 },
    { kind: 'unit', row: 'front', col: 0 }, [], createRng(1), { consumeAttack: false });
  assert.equal(getUnit(s.state, 'enemy', 'front', 0), null, '0/3 挨 5 点应已阵亡');
  assert.equal(atk.hp, 5, '0 攻军械不反击（0 攻则无伤害，ADR-062）');
  assert.equal(canAttack(s.state, 'enemy', 'front', 0).ok, false, '霹雳车本来也不能普攻');
});

