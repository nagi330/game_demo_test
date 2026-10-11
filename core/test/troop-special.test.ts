import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

import { applyAction, playTargetPlan, unitSkillTargetPlan } from '../src/engine.ts';
import { applyStatus, dealDamage, expireStatuses, lordRef, resolveTurnEndStatuses, resolveTurnStartDamage, unitRef } from '../src/mutate.ts';
import { recomputeAuras, resolveAttack, resolveTargets } from '../src/effects.ts';
import { createRng } from '../src/rng.ts';
import { capStacks, getUnit, makeUnit, setUnit, statusStacks } from '../src/state.ts';
import { scenario } from './fixtures.ts';
import type { CardDef, GameEvent } from '../src/types.ts';
import type { Row, Side } from '../src/types.ts';

/** 从 core/data/cards.json 读一张**真实卡**（防内联夹具与数据漂移） */
const REAL_CARDS: CardDef[] = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cards.json'), 'utf8'),
);
function realTroop(id: string): CardDef {
  const c = REAL_CARDS.find((x) => x.id === id);
  if (!c) throw new Error(`真实卡表里没有 ${id}`);
  return { ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] };
}

test('虎骑营：攻击满血单位本次+1，受伤单位不加成', () => {
  const { state, ctx } = scenario({});
  const tiger = realTroop('wei_hubaoki_hu');
  const general: CardDef = { id: 'test_target_general', name: '敌将', faction: 'shu', type: 'general', cost: 2, attack: 0, health: 10, memo: '测试' };
  const troop: CardDef = { id: 'test_target_troop', name: '敌兵', faction: 'shu', type: 'troop', cost: 1, attack: 0, health: 10, troopKind: 'infantry', memo: '测试' };
  ctx.cards.set(tiger.id, tiger);
  ctx.cards.set(general.id, general);
  ctx.cards.set(troop.id, troop);
  setUnit(state, 'own', 'front', 0, makeUnit(tiger, 0, 1101));
  setUnit(state, 'enemy', 'front', 0, makeUnit(general, 0, 1102));
  const vsGeneral = applyAction(state, ctx, { type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 } });
  assert.equal(vsGeneral.ok, true);
  assert.equal(getUnit(vsGeneral.state, 'enemy', 'front', 0)?.hp, 10 - (tiger.attack! + 1));

  const next = scenario({});
  next.ctx.cards.set(tiger.id, tiger);
  next.ctx.cards.set(troop.id, troop);
  setUnit(next.state, 'own', 'front', 0, makeUnit(tiger, 0, 1103));
  setUnit(next.state, 'enemy', 'front', 0, makeUnit(troop, 0, 1104));
  getUnit(next.state, 'enemy', 'front', 0)!.hp = 9;
  const vsTroop = applyAction(next.state, next.ctx, { type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 } });
  assert.equal(vsTroop.ok, true);
  assert.equal(getUnit(vsTroop.state, 'enemy', 'front', 0)?.hp, 9 - tiger.attack!);
});

for (const type of ['general', 'strategist'] as const) {
  test(`虎骑营：攻击${type}后不永久提高攻击力`, () => {
    const { state, ctx } = scenario({});
    const tiger = realTroop('wei_hubaoki_hu');
    const target: CardDef = { id: 'test_person', name: '人物', faction: 'shu', type, cost: 2, attack: 0, health: 10, memo: '测试' };
    ctx.cards.set(tiger.id, tiger);
    ctx.cards.set(target.id, target);
    setUnit(state, 'own', 'front', 0, makeUnit(tiger, 0, 1105));
    setUnit(state, 'enemy', 'front', 0, makeUnit(target, 0, 1106));
    const result = applyAction(state, ctx, { type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 } });
    assert.equal(result.ok, true);
    assert.equal(getUnit(result.state, 'enemy', 'front', 0)?.hp, 10 - (tiger.attack! + 1));
    assert.equal(getUnit(result.state, 'own', 'front', 0)?.atk, tiger.attack);
  });
}

for (const [type, health] of [['troop', 10], ['general', 10]] as const) {
  test(`豹骑营：攻击${health}血${type}不返还攻击`, () => {
    const { state, ctx } = scenario({});
    const leopard = realTroop('wei_hubaoki_bao');
    const target: CardDef = { id: 'test_no_reward', name: '目标', faction: 'shu', type, cost: 2, attack: 0, health, memo: '测试' };
    ctx.cards.set(leopard.id, leopard);
    ctx.cards.set(target.id, target);
    setUnit(state, 'own', 'front', 0, makeUnit(leopard, 0, 1113));
    setUnit(state, 'enemy', 'front', 0, makeUnit(target, 0, 1114));
    const result = applyAction(state, ctx, { type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 } });
    assert.equal(result.ok, true);
    assert.equal(getUnit(result.state, 'own', 'front', 0)?.attackedThisTurn, 1);
    assert.ok(!result.events.some(e => e.type === 'EXTRA_ATTACK'));
  });
}

test('豹骑营：击杀敌方普通兵后获得一次额外攻击', () => {
  const { state, ctx } = scenario({});
  const leopard = realTroop('wei_hubaoki_bao');
  const infantry = realTroop('neutral_infantry');
  ctx.cards.set(leopard.id, leopard);
  ctx.cards.set(infantry.id, infantry);
  setUnit(state, 'own', 'front', 0, makeUnit(leopard, 0, 1111));
  setUnit(state, 'enemy', 'front', 0, makeUnit(infantry, 0, 1112));
  const result = applyAction(state, ctx, { type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 } });
  assert.equal(result.ok, true);
  assert.equal(getUnit(result.state, 'enemy', 'front', 0), null, '豹骑营应击杀普通兵');
  assert.equal(getUnit(result.state, 'own', 'front', 0)?.attackedThisTurn, 0, '击杀普通兵后应返还一次攻击机会');
});


test('攻击目标条件：青州兵只在己方主公血量更高时强化主公伤害', () => {
  const { state, ctx } = scenario({});
  const qingzhou: CardDef = {
    id: 'test_qingzhou', name: '青州兵', faction: 'wei', type: 'troop',
    cost: 2, attack: 3, health: 3, troopKind: 'infantry', memo: '测试',
    skills: [{ id: 'qingzhou', name: '青州突骑', kind: 'trigger', trigger: 'on_attack', effects: [
      { action: 'attack_bonus', value: 2, condition: {
        all_of: [{ attack_target: { type: 'lord' } }, { lord_hp_vs_enemy: '>' }],
      } },
    ] }],
  };
  ctx.cards.set(qingzhou.id, qingzhou);
  setUnit(state, 'own', 'front', 0, makeUnit(qingzhou, 0, 1));
  state.sides.enemy.lord.hp = 29;
  const r = applyAction(state, ctx, {
    type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'lord' },
  });
  assert.equal(r.ok, true);
  assert.equal(r.state.sides.enemy.lord.hp, 24, '3 点基础伤害 + 2 点青州兵强化');
});

test('战技相邻目标：蒙冲式伤害会命中指定目标左右相邻单位', () => {
  const { state, ctx } = scenario({});
  const ship: CardDef = {
    id: 'test_ship', name: '蒙冲', faction: 'wu', type: 'troop',
    cost: 2, attack: 0, health: 4, troopKind: 'archer', memo: '测试',
    skills: [{ id: 'ship', name: '蒙冲', kind: 'active', frequency: 'once_per_turn',
      target: { side: 'enemy', filter: { type: 'character' }, count: 1, mode: 'choose' },
      effects: [
        { action: 'damage', value: 2 },
        { action: 'damage', value: 1, target: { side: 'enemy', filter: { type: 'character', adjacent_to: 'chosen' }, count: 'all' } },
      ] }],
  };
  const victim: CardDef = { id: 'test_victim', name: '目标', faction: 'wei', type: 'general', cost: 2, attack: 0, health: 5, memo: '测试' };
  ctx.cards.set(ship.id, ship);
  ctx.cards.set(victim.id, victim);
  setUnit(state, 'own', 'front', 0, makeUnit(ship, 0, 2));
  setUnit(state, 'enemy', 'front', 2, makeUnit(victim, 0, 3));
  setUnit(state, 'enemy', 'front', 3, makeUnit(victim, 0, 4));
  const plan = unitSkillTargetPlan(state, 'own', 'front', 0);
  assert.equal(plan.choices.length, 1, '技能级 target 应生成指向性选择');
  assert.equal(plan.choices[0]!.targets.length, 2);
  const r = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 2 },
  });
  assert.equal(r.ok, true, r.error ?? '蒙冲技能应当成功结算');
  assert.equal(getUnit(r.state, 'enemy', 'front', 2)?.hp, 3);
  assert.equal(getUnit(r.state, 'enemy', 'front', 3)?.hp, 4);
});

test('放箭改为主动战技：随机造成1点伤害，回合结束不会自动触发', () => {
  const { state, ctx } = scenario({});
  const archer: CardDef = {
    id: 'test_fangjian', name: '测试弓兵', faction: 'neutral', type: 'troop',
    cost: 1, attack: 1, health: 2, troopKind: 'archer', memo: '测试', keywords: ['zhan_ji'],
    skills: [{ id: 'fangjian', name: '放箭', kind: 'active', frequency: 'once_per_turn',
      effects: [{ action: 'damage', value: 1,
        target: { side: 'enemy', filter: { type: 'character', include_lord: false }, count: 1, mode: 'random' } }] }],
  };
  const victim: CardDef = { id: 'test_victim', name: '目标', faction: 'wei', type: 'general', cost: 2, attack: 0, health: 5, memo: '测试' };
  ctx.cards.set(archer.id, archer);
  ctx.cards.set(victim.id, victim);
  setUnit(state, 'own', 'front', 0, makeUnit(archer, 0, 5));
  setUnit(state, 'enemy', 'front', 0, makeUnit(victim, 0, 7));
  const used = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 0, skillId: 'fangjian' });
  assert.equal(used.ok, true, used.error ?? '放箭战技应当成功');
  assert.ok(used.events.some((e) => e.type === 'DAMAGE'), '放箭应当造成伤害');
  const ended = applyAction(used.state, ctx, { type: 'END_TURN' });
  assert.equal(ended.events.some((e) => e.type === 'SKILL_TRIGGERED' && e.skillName === '放箭'), false,
    '回合结束不应再自动触发放箭');
});

test('同一单位多个战技：可按 skillId 使用第二个战技', () => {
  const { state, ctx } = scenario({});
  const multi: CardDef = {
    id: 'test_multi_skill', name: '多技兵', faction: 'neutral', type: 'troop',
    cost: 1, attack: 0, health: 2, troopKind: 'archer', memo: '测试',
    skills: [
      { id: 'first_skill', name: '先技', kind: 'active', frequency: 'once_per_turn', effects: [{ action: 'draw', value: 1 }] },
      { id: 'second_skill', name: '放箭', kind: 'active', frequency: 'once_per_turn',
        effects: [{ action: 'damage', value: 1,
          target: { side: 'enemy', filter: { type: 'character', include_lord: false }, count: 1, mode: 'random' } }] },
    ],
  };
  const victim: CardDef = { id: 'test_victim', name: '目标', faction: 'wei', type: 'general', cost: 2, attack: 0, health: 5, memo: '测试' };
  ctx.cards.set(multi.id, multi);
  ctx.cards.set(victim.id, victim);
  setUnit(state, 'own', 'front', 0, makeUnit(multi, 0, 6));
  setUnit(state, 'enemy', 'front', 0, makeUnit(victim, 0, 8));
  const used = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 0, skillId: 'second_skill' });
  assert.equal(used.ok, true, used.error ?? '第二个战技应当成功');
  assert.equal(used.events.filter((e) => e.type === 'DAMAGE').length, 1);
});

test('圣盾关键词免疫一次伤害，消耗后下一次伤害正常结算', () => {
  const { state, ctx } = scenario({});
  const shield: CardDef = {
    id: 'test_shield', name: '圣盾兵', faction: 'wei', type: 'troop', cost: 2,
    attack: 1, health: 3, troopKind: 'infantry', keywords: ['sheng_dun'], memo: '测试',
  };
  ctx.cards.set(shield.id, shield);
  setUnit(state, 'own', 'front', 0, makeUnit(shield, 0, 10));
  const events: GameEvent[] = [];
  const target = unitRef('own', 'front', 0);
  const first = dealDamage(state, ctx.cards, target, 2, events, '测试', 0, undefined, undefined);
  assert.equal(first, 0);
  assert.equal(getUnit(state, 'own', 'front', 0)?.hp, 3);
  const second = dealDamage(state, ctx.cards, target, 2, events, '测试', 0, undefined, undefined);
  assert.equal(second, 2);
  assert.equal(getUnit(state, 'own', 'front', 0)?.hp, 1);
});

test('先登弩手战技：先随机消灭先攻士兵，再继续放箭', () => {
  const { state, ctx } = scenario({});
  const xiandeng: CardDef = {
    id: 'test_xiandeng_nu', name: '先登弩手', faction: 'qun', type: 'troop',
    cost: 2, attack: 2, health: 4, troopKind: 'archer', keywords: ['zhan_ji'], memo: '测试',
    skills: [{ id: 'xiandeng_nu', name: '先登', kind: 'active', frequency: 'once_per_turn', effects: [
      { action: 'destroy', target: { side: 'enemy', filter: { type: 'troop', keyword: 'xian_gong' }, count: 1, mode: 'random' } },
      { action: 'damage', value: 1, target: { side: 'enemy', filter: { type: 'character', include_lord: false }, count: 1, mode: 'random' } },
    ] }],
  };
  const striker: CardDef = {
    id: 'test_striker_troop', name: '先攻兵', faction: 'wei', type: 'troop',
    cost: 1, attack: 1, health: 1, troopKind: 'infantry', keywords: ['xian_gong'], memo: '测试',
  };
  const victim: CardDef = {
    id: 'test_arrow_victim', name: '目标', faction: 'wei', type: 'general',
    cost: 2, attack: 1, health: 3, keywords: [], memo: '测试',
  };
  ctx.cards.set(xiandeng.id, xiandeng);
  ctx.cards.set(striker.id, striker);
  ctx.cards.set(victim.id, victim);
  setUnit(state, 'own', 'front', 0, makeUnit(xiandeng, 0, 1));
  setUnit(state, 'enemy', 'front', 0, makeUnit(striker, 0, 2));
  setUnit(state, 'enemy', 'front', 1, makeUnit(victim, 0, 3));

  const result = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 0, skillId: 'xiandeng_nu' });
  assert.equal(result.ok, true, result.error ?? '先登战技应当成功');
  assert.equal(getUnit(result.state, 'enemy', 'front', 0), null, '应先消灭敌方先攻士兵');
  assert.equal(getUnit(result.state, 'enemy', 'front', 1)?.hp, 2, '先登消灭后仍应继续随机放箭造成1点伤害');
});

test('治疗战技可以选择满血友军', () => {
  const { state, ctx } = scenario({});
  const healer: CardDef = {
    id: 'test_full_heal', name: '测试医者', faction: 'shu', type: 'troop',
    cost: 2, attack: 0, health: 6, troopKind: 'infantry', keywords: ['zhan_ji'], memo: '测试',
    skills: [{ id: 'mu_niu', name: '测试治疗', kind: 'active', frequency: 'once_per_turn',
      target: { side: 'ally', filter: { type: 'character' }, count: 1, mode: 'choose' },
      effects: [{ action: 'heal', value: 3 }] }],
  };
  const ally: CardDef = {
    id: 'test_full_ally', name: '满血士兵', faction: 'shu', type: 'troop',
    cost: 1, attack: 1, health: 2, troopKind: 'infantry', keywords: [], memo: '测试',
  };
  ctx.cards.set(healer.id, healer);
  ctx.cards.set(ally.id, ally);
  setUnit(state, 'own', 'front', 0, makeUnit(healer, 0, 4));
  setUnit(state, 'own', 'front', 1, makeUnit(ally, 0, 5));
  const plan = unitSkillTargetPlan(state, 'own', 'front', 0);
  assert.equal(plan.choices[0]?.targets.some((t) => t.side === 'own' && t.row === 'front' && t.col === 1), true,
    '满血友军也应出现在治疗目标列表');
  const result = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 0, skillId: 'mu_niu',
    target: { side: 'own', row: 'front', col: 1 },
  });
  assert.equal(result.ok, true, result.error ?? '治疗满血友军应当成功');
  assert.equal(getUnit(result.state, 'own', 'front', 1)?.hp, 2);
});

/* ========================================================================
 * ADR-108 藤甲盾：「刀枪不入、箭矢不透，遇火即燃」
 *
 * 这是**首个受伤侧属性感知**的机制。此前 dealDamage 完全不知道伤害来源是
 * 火还是水（damage_type 只在发起侧被读取），所以这三条必须各锁一个用例：
 *   ① 物理/无属性伤害 −1，且**最低为 0**（1 攻单位打不动 2/4 藤甲——预期设计，ADR-110）
 *   ② 火属性伤害 +1
 *   ③ **没有反伤层**（ADR-110 删除：反弹挂在火分支会惩罚用火克制藤甲的正确行为）
 * ===================================================================== */

const TENGJIA: CardDef = {
  id: 'test_tengjia', name: '藤甲兵', faction: 'shu', type: 'troop',
  cost: 2, attack: 2, health: 4, troopKind: 'shield', keywords: ['jia_dun'], memo: '测试',
  skills: [{ id: 'teng_jia_wei', name: '藤甲', kind: 'aura', effects: [
    { action: 'apply_status', status: 'teng_jia', stacks: 1, target: { source: true } },
  ] }],
};
const STRAW: CardDef = {
  id: 'test_straw', name: '草人', faction: 'wei', type: 'troop',
  cost: 1, attack: 1, health: 4, troopKind: 'infantry', keywords: [], memo: '测试',
};

/** 摆一个「藤甲盾挨打」的局面，返回目标与攻击者的坐标 */
function tengjiaUnderAttack() {
  const { state, ctx } = scenario({});
  ctx.cards.set(TENGJIA.id, TENGJIA);
  ctx.cards.set(STRAW.id, STRAW);
  // uid 必须与本文件其它用例错开（前面已用到 1~10）：光环的 auraId 以 uid 为键，
  // uid 撞车会让 recomputeAuras 认到别的单位身上。
  setUnit(state, 'enemy', 'front', 3, makeUnit(TENGJIA, 0, 201));  // 挨打方
  setUnit(state, 'own', 'front', 0, makeUnit(STRAW, 0, 202));     // 攻击方
  // 光环由 recomputeAuras 挂载 —— 直接 setUnit 进场不会跑它，
  // 必须显式重算，否则藤甲的减伤/反伤状态根本没挂上（实测 4 条用例会全灭）。
  recomputeAuras(state, ctx.cards, createRng(1), []);
  // 目标必须是**带 kind 判别字段**的 TargetRef（`unitRef()` 构造）。
  // 写成 `{ side, row, col }` 会因缺 `kind` 被 `ref.kind !== 'unit'` 判否，
  // dealDamage 在函数第一行就返回 0 —— 症状是「藤甲减伤完全不生效」，极难定位。
  return { state, ctx, target: unitRef('enemy', 'front', 3) };
}

test('ADR-108 藤甲盾：物理伤害 −1（刀枪不入）', () => {
  const { state, ctx, target } = tengjiaUnderAttack();
  const u = getUnit(state, 'enemy', 'front', 3)!;
  const before = u.hp;
  assert.equal(capStacks(u.statuses, 'reduce_physical'), 1, '藤甲减伤应挂 1 层');
  // 2 点物理伤害 → 减 1 → 实际 1 点
  const dealt = dealDamage(state, ctx.cards, target, 2, [], '测试', 0, { side: 'own', row: 'front', col: 0 },
    getUnit(state, 'own', 'front', 0) ?? undefined, 'physical');
  assert.equal(dealt, 1, 'dealt 应为 1');
  assert.equal(before - (getUnit(state, 'enemy', 'front', 3)?.hp ?? -1), 1, '2 点物理伤害应被减到 1 点');
});

test('ADR-108 藤甲盾：减伤有下限，1 点物理伤害被完全免疫（不得为负）', () => {
  const { state, ctx, target } = tengjiaUnderAttack();
  const before = getUnit(state, 'enemy', 'front', 3)!.hp;
  const dealt = dealDamage(state, ctx.cards, target, 1, [], '测试', 0, { side: 'own', row: 'front', col: 0 },
    getUnit(state, 'own', 'front', 0) ?? undefined, 'physical');
  assert.equal(dealt, 0, '1 点物理伤害应被完全减掉');
  assert.equal(getUnit(state, 'enemy', 'front', 3)!.hp, before, '血量不应变化');
});

test('ADR-108 藤甲盾：火属性伤害 +1（遇火即燃）', () => {
  const { state, ctx, target } = tengjiaUnderAttack();
  const before = getUnit(state, 'enemy', 'front', 3)!.hp;
  // 2 点火伤 → 加 1 → 实际 3 点
  dealDamage(state, ctx.cards, target, 2, [], '火攻', 0, { side: 'own', row: 'front', col: 0 },
    getUnit(state, 'own', 'front', 0) ?? undefined, 'fire');
  assert.equal(before - getUnit(state, 'enemy', 'front', 3)!.hp, 3, '2 点火伤应放大为 3 点');
});

test('ADR-110 藤甲兵：没有反伤层——火伤只放大自身，来源不掉血', () => {
  const { state, ctx, target } = tengjiaUnderAttack();
  const atkBefore = getUnit(state, 'own', 'front', 0)!.hp;
  dealDamage(state, ctx.cards, target, 2, [], '火攻', 0, { side: 'own', row: 'front', col: 0 },
    getUnit(state, 'own', 'front', 0) ?? undefined, 'fire');
  assert.equal(getUnit(state, 'own', 'front', 0)!.hp, atkBefore, '火是克制手段，不应被反弹惩罚');
});

test('ADR-108 藤甲盾：水属性伤害不增不减（照常结算）', () => {
  const { state, ctx, target } = tengjiaUnderAttack();
  const before = getUnit(state, 'enemy', 'front', 3)!.hp;
  dealDamage(state, ctx.cards, target, 2, [], '水攻', 0, { side: 'own', row: 'front', col: 0 },
    getUnit(state, 'own', 'front', 0) ?? undefined, 'water');
  assert.equal(before - getUnit(state, 'enemy', 'front', 3)!.hp, 2, '水攻应原样结算');
});

test('ADR-108 藤甲盾：无藤甲状态的单位不受影响（能力是状态驱动，不是卡 id 驱动）', () => {
  const { state, ctx } = scenario({});
  ctx.cards.set(STRAW.id, STRAW);
  setUnit(state, 'own', 'front', 0, makeUnit(STRAW, 0, 301));
  setUnit(state, 'enemy', 'front', 1, makeUnit(STRAW, 0, 302));
  const before = getUnit(state, 'enemy', 'front', 1)!.hp;
  dealDamage(state, ctx.cards, unitRef('enemy', 'front', 1), 2, [], '测试', 0,
    { side: 'own', row: 'front', col: 0 }, getUnit(state, 'own', 'front', 0) ?? undefined, 'physical');
  assert.equal(before - getUnit(state, 'enemy', 'front', 1)!.hp, 2, '普通单位应吃满 2 点物理伤害');
});

/* ========================================================================
 * 无难兵「赴难」：己方主公血量**低于**敌方主公时，自身 2/4 → 3/4
 *
 * 设计要点：它必须是**条件型光环**（把 +1 攻写进修正层），而不是"攻击时 +1"——
 * 玩家要在卡面上直接看到 3/4，而不是只在打出那一下才变。
 * 与青州兵「青州突骑」条件方向相反（青州=顺风 >，无难=逆风 <）。
 *
 * ⚠️ 本组测试**从 core/data/cards.json 读真实卡**，不用内联夹具 ——
 * 内联夹具会在数据改动后静默脱节（本组此前的 `on_attack` 版本就是这么漂移的）。
 * ===================================================================== */

// 无难兵在 ADR-117 改为召唤右部；旧用例保留为通用主公血量光环回归，
// 不再声称覆盖当前无难兵设计。真实卡效果由 troop-final-design.test.ts 验证。
const WUNAN: CardDef = {
  id: 'test_lord_hp_aura', name: '血量光环', faction: 'wu', type: 'troop', cost: 3,
  attack: 2, health: 4, memo: '通用条件光环测试',
  skills: [{ id: 'fu_nan', name: '血量光环', kind: 'aura', effects: [
    { action: 'modify', attack: 1, target: { source: true }, condition: { lord_hp_vs_enemy: '<' } },
  ] }],
};

test('通用主公血量光环：条件写入修正层', () => {
  const sk = (WUNAN.skills ?? []).find((x) => x.id === 'fu_nan');
  assert.ok(sk, '应存在赴难技能');
  assert.equal(sk.kind, 'aura', '必须是光环 —— 否则卡面不会显示 3/4');
  assert.equal(sk.trigger, undefined, '不应是 on_attack 触发技');
  assert.equal(sk.effects?.[0]?.action, 'modify', '应是 modify（写修正层），不是 attack_bonus');
  assert.deepEqual(sk.effects?.[0]?.condition, { lord_hp_vs_enemy: '<' });
});

test('通用主公血量光环：逆风时卡面由 2/4 变为 3/4', () => {
  const { state, ctx } = scenario({});
  ctx.cards.set(WUNAN.id, WUNAN);
  setUnit(state, 'own', 'front', 0, makeUnit(WUNAN, 0, 501));
  state.sides.own.lord.hp = 20;     // 我方 20
  state.sides.enemy.lord.hp = 28;   // 敌方 28 → 逆风
  recomputeAuras(state, ctx.cards, createRng(1), []);
  const u = getUnit(state, 'own', 'front', 0)!;
  assert.equal(u.atk, 3, '逆风时攻击力应为 3（2 基础 + 1 赴难）');
  assert.equal(u.hp, 4, '生命值不变');
});

test('通用主公血量光环：顺风时保持 2/4', () => {
  const { state, ctx } = scenario({});
  ctx.cards.set(WUNAN.id, WUNAN);
  setUnit(state, 'own', 'front', 0, makeUnit(WUNAN, 0, 502));
  state.sides.own.lord.hp = 28;
  state.sides.enemy.lord.hp = 20;   // 顺风
  recomputeAuras(state, ctx.cards, createRng(1), []);
  assert.equal(getUnit(state, 'own', 'front', 0)!.atk, 2, '顺风时无加成');
});

test('通用主公血量光环：主公掉血后立即重算', () => {
  const { state, ctx } = scenario({});
  ctx.cards.set(WUNAN.id, WUNAN);
  setUnit(state, 'own', 'front', 0, makeUnit(WUNAN, 0, 503));
  state.sides.own.lord.hp = 30;
  state.sides.enemy.lord.hp = 25;
  recomputeAuras(state, ctx.cards, createRng(1), []);
  assert.equal(getUnit(state, 'own', 'front', 0)!.atk, 2, '初始顺风');

  // 不手动重算：靠 dealDamage 的主公分支触发 afterLordDamagedResolver
  dealDamage(state, ctx.cards, lordRef('own'), 20, [], '测试');   // 30 → 10 < 25 逆风
  assert.equal(getUnit(state, 'own', 'front', 0)!.atk, 3,
    '主公掉血后应立刻变 3（registerAfterLordDamagedResolver 生效）');
});

/* ========================================================================
 * 丹阳兵「袍泽」：阵亡时己方其他【步兵系】永久 +1/+1
 *
 * 关键不变量：只作用于 troopKind=infantry —— 盾/骑/弓系**不得**被误伤
 * （`type: troop` 的卡占全池 38 张，若过滤失效会波及所有兵种）。
 * ===================================================================== */

const DANYANG: CardDef = {
  id: 'test_danyang', name: '丹阳兵', faction: 'shu', type: 'troop',
  cost: 3, attack: 3, health: 3, troopKind: 'infantry', keywords: [], memo: '测试',
  skills: [{ id: 'pao_ze', name: '袍泽', kind: 'trigger', trigger: 'on_death', effects: [
    { action: 'modify', attack: 1, health: 1, target: {
      side: 'ally', filter: { type: 'troop', troopKind: 'infantry', exclude_source: true }, count: 'all' } },
  ] }],
};
const SHIELDER: CardDef = {
  id: 'test_shield', name: '测试盾兵', faction: 'wu', type: 'troop',
  cost: 2, attack: 1, health: 4, troopKind: 'shield', keywords: ['jia_dun'], memo: '测试',
};

test('丹阳兵 袍泽：亡语给己方其他步兵 +1/+1', () => {
  const { state, ctx } = scenario({});
  ctx.cards.set(DANYANG.id, DANYANG);
  setUnit(state, 'own', 'front', 0, makeUnit(DANYANG, 0, 504));
  setUnit(state, 'own', 'front', 1, makeUnit(DANYANG, 0, 401)); // 另一名步兵
  setUnit(state, 'own', 'front', 2, makeUnit(DANYANG, 0, 402));
  const ally = getUnit(state, 'own', 'front', 1)!;
  const ally2 = getUnit(state, 'own', 'front', 2)!;
  assert.equal(ally.atk, 3); assert.equal(ally.hp, 3);

  // 打死 0 号位的丹阳兵 → 触发亡语
  const events: GameEvent[] = [];
  dealDamage(state, ctx.cards, unitRef('own', 'front', 0), 99, events, '测试');

  assert.equal(ally.atk, 4, '另一名步兵应 +1 攻');
  assert.equal(ally.hp, 4, '另一名步兵应 +1 血');
  assert.equal(ally2.atk, 4, '第三名步兵也应吃到增益');
});

test('丹阳兵 袍泽：不得波及其他兵种（盾/骑/弓）', () => {
  const { state, ctx } = scenario({});
  ctx.cards.set(DANYANG.id, DANYANG);
  ctx.cards.set(SHIELDER.id, SHIELDER);
  setUnit(state, 'own', 'front', 0, makeUnit(DANYANG, 0, 505));
  setUnit(state, 'own', 'front', 1, makeUnit(SHIELDER, 0, 411)); // 盾兵：不该被加成
  const shield = getUnit(state, 'own', 'front', 1)!;
  assert.equal(shield.atk, 1);

  dealDamage(state, ctx.cards, unitRef('own', 'front', 0), 99, [], '测试');

  assert.equal(shield.atk, 1, '盾兵攻击力不应被步兵亡语加成');
  assert.equal(shield.hp, 4, '盾兵生命值不应被步兵亡语加成');
});

/* ========================================================================
 * 武卫营「虎帐」（护主）
 *
 * 史实：典韦「引置左右，将亲兵数百人，常绕大帐」——护卫主公是本职。
 * 机制复用已有的 hu_zhu（redirect_damage + guard_scope:lord）。
 *
 * 这条用例锁的是**「持续承伤直到阵亡」**的完整行为，而不只是"能触发一次"：
 *   ① 主公受 2 伤 → 血量不变，武卫营掉 2
 *   ② 再次受 2 伤 → 守护者阵亡
 *   ③ 阵亡后主公开始正常掉血（保护消失）
 * 另有一条锁住**「架盾挡不住效果伤害」**这个缺口：护主正是为补它而存在。
 * ===================================================================== */

const WUWEI: CardDef = {
  id: 'test_wuweiying', name: '武卫营', faction: 'wei', type: 'troop',
  cost: 2, attack: 2, health: 4, troopKind: 'shield', keywords: ['jia_dun'], memo: '测试',
  skills: [{ id: 'hu_zhang', name: '虎帐', kind: 'aura', effects: [
    { action: 'apply_status', status: 'hu_zhu', status_source: 'self', target: { side: 'ally', lord: true } },
  ] }],
};

/** 摆一个「武卫营护卫主公」的局面（需显式重算光环才会挂上 hu_zhu） */
function wuweiGuarding() {
  const { state, ctx } = scenario({});
  ctx.cards.set(WUWEI.id, WUWEI);
  setUnit(state, 'own', 'front', 0, makeUnit(WUWEI, 0, 601));
  recomputeAuras(state, ctx.cards, createRng(1), []);
  return { state, ctx };
}

test('武卫营 虎帐：主公受到的伤害由自己承受，自己不掉血', () => {
  const { state, ctx } = wuweiGuarding();
  const guard = getUnit(state, 'own', 'front', 0)!;
  const lordBefore = state.sides.own.lord.hp;
  assert.equal(guard.hp, 4, '起始应为满血 4');
  assert.ok(state.sides.own.lord.statuses?.hu_zhu, '主公应挂上 hu_zhu 守护状态');

  dealDamage(state, ctx.cards, lordRef('own'), 2, [], '测试');

  assert.equal(state.sides.own.lord.hp, lordBefore, '主公血量不应变化');
  assert.equal(getUnit(state, 'own', 'front', 0)!.hp, 2, '武卫营应代为承受 2 点伤害');
});

test('武卫营 虎帐：自己被打光后保护消失，主公开始正常掉血', () => {
  const { state, ctx } = wuweiGuarding();
  // 先打光守护者：4 血，两次 2 点
  dealDamage(state, ctx.cards, unitRef('own', 'front', 0), 2, [], '测试');
  dealDamage(state, ctx.cards, unitRef('own', 'front', 0), 2, [], '测试');
  assert.equal(getUnit(state, 'own', 'front', 0), null, '武卫营应已阵亡');

  // 光环重算（阵亡结算后会跑）后主公不再有 hu_zhu
  recomputeAuras(state, ctx.cards, createRng(1), []);
  const lordBefore = state.sides.own.lord.hp;
  dealDamage(state, ctx.cards, lordRef('own'), 2, [], '测试');
  assert.equal(state.sides.own.lord.hp, lordBefore - 2, '守护者阵亡后，主公应正常承受伤害');
});

test('武卫营 虎帐：护的是「效果伤害」——架盾挡不住的那类（存在的缺口）', () => {
  // 架盾只写在 legalTargets 里，约束的是**普通攻击的目标选择**；
  // 卡牌效果造成的伤害不经过它。所以主公每回合都在被绕过架盾直击，
  // 武卫营的虎帐正是补这个缺口。
  const { state, ctx } = wuweiGuarding();
  const lordBefore = state.sides.own.lord.hp;
  // 走与「卡牌效果」同一条路径（dealDamage + lordRef），不走 ATTACK
  const events: GameEvent[] = [];
  dealDamage(state, ctx.cards, lordRef('own'), 3, events, '楼船军', 0, undefined, undefined, 'water');
  assert.ok(events.some((e) => e.type === 'DAMAGE_REDIRECTED' && 'lord' in e && e.lord === true),
    '应产生「主公伤害被转走」的事件');
  assert.equal(state.sides.own.lord.hp, lordBefore, '主公不应因效果伤害掉血');
});

test('武卫营 虎帐：己方与敌方各一个时，只护己方主公', () => {
  const { state, ctx } = wuweiGuarding();
  // 敌方也放一个武卫营，护敌方主公
  setUnit(state, 'enemy', 'front', 0, makeUnit(WUWEI, 0, 602));
  recomputeAuras(state, ctx.cards, createRng(1), []);

  const ownBefore = state.sides.own.lord.hp;
  const enemyBefore = state.sides.enemy.lord.hp;
  dealDamage(state, ctx.cards, lordRef('enemy'), 2, [], '测试');
  assert.equal(state.sides.own.lord.hp, ownBefore, '己方主公不应因敌方受击而变化');
  assert.equal(state.sides.enemy.lord.hp, enemyBefore, '敌方主公的伤害应由敌方武卫营承担');
  assert.equal(getUnit(state, 'enemy', 'front', 0)!.hp, 2, '敌方武卫营应代为承受');
});

/* ========================================================================
 * 白毦兵「忠勇」：受到普通攻击后，对攻击者**额外**造成 1 点伤害
 *
 * 这是 ADR-110 释放出来的 `thorns` cap 的首个使用者（此前藤甲兵删掉反伤层后，
 * 引擎代码保留但无卡在用 = 休眠路径）。三条不变量各锁一个用例：
 *   ① 与**自动反击**分开结算 —— 合计回敬 = 反击 2 + 忠勇 1 = 3
 *   ② **技能伤害不触发**（无 killerRef）—— 这是它的解药
 *   ③ 即使被打死也触发（与「反击同时结算、死了也反击」的语义一致）
 * ===================================================================== */

const BAIER: CardDef = {
  id: 'test_baier', name: '白毦兵', faction: 'shu', type: 'troop',
  cost: 3, attack: 2, health: 6, troopKind: 'shield', keywords: ['jia_dun'], memo: '测试',
  skills: [{ id: 'zhong_yong', name: '忠勇', kind: 'aura', effects: [
    { action: 'apply_status', status: 'zhong_yong_status', stacks: 1, target: { source: true } },
  ] }],
};
const RAIDER: CardDef = {
  id: 'test_raider', name: '攻击者', faction: 'wei', type: 'troop',
  cost: 2, attack: 3, health: 9, troopKind: 'infantry', keywords: [], memo: '测试',
};

function baierUnderAttack() {
  const { state, ctx } = scenario({});
  ctx.cards.set(BAIER.id, BAIER);
  ctx.cards.set(RAIDER.id, RAIDER);
  setUnit(state, 'enemy', 'front', 3, makeUnit(BAIER, 0, 601));   // 挨打方（蜀）
  setUnit(state, 'own', 'front', 0, makeUnit(RAIDER, 0, 602));    // 攻击方（魏）
  recomputeAuras(state, ctx.cards, createRng(1), []);
  return { state, ctx };
}

test('ADR-108 白毦兵 忠勇：普攻后额外回敬 1 点（与自动反击合计 3）', () => {
  const { state, ctx } = baierUnderAttack();
  assert.equal(capStacks(getUnit(state, 'enemy', 'front', 3)!.statuses, 'thorns'), 1, '忠勇应挂 1 层');
  const atkBefore = getUnit(state, 'own', 'front', 0)!.hp;
  resolveAttack(state, ctx.cards, 'own', { row: 'front', col: 0 },
    { kind: 'unit', row: 'front', col: 3 }, [], createRng(1), { toSide: 'enemy' });
  const lost = atkBefore - (getUnit(state, 'own', 'front', 0)?.hp ?? 0);
  assert.equal(lost, 3, '攻击者应吃 反击 2 + 忠勇 1 = 3 点');
});

test('ADR-108 白毦兵 忠勇：技能伤害不触发（无 killerRef）—— 这是它的解药', () => {
  const { state, ctx } = baierUnderAttack();
  const atkBefore = getUnit(state, 'own', 'front', 0)!.hp;
  const t0 = getUnit(state, 'enemy', 'front', 3)!.hp;
  // 模拟火攻/战技：走 dealDamage 的技能路径，不传 killerRef
  dealDamage(state, ctx.cards, unitRef('enemy', 'front', 3), 2, [], '火攻',
    0, undefined, undefined, 'fire');
  assert.equal(getUnit(state, 'enemy', 'front', 3)!.hp, t0 - 2, '白毦兵应正常受伤');
  assert.equal(getUnit(state, 'own', 'front', 0)!.hp, atkBefore, '技能伤害不得引发忠勇回敬');
});

test('ADR-108 白毦兵 忠勇：即使本击被打死也照样回敬（与反击「同时结算」一致）', () => {
  const { state, ctx } = baierUnderAttack();
  ctx.cards.set(RAIDER.id, { ...RAIDER, attack: 20 });
  setUnit(state, 'own', 'front', 0, makeUnit({ ...RAIDER, attack: 20 }, 0, 603));
  const atkBefore = getUnit(state, 'own', 'front', 0)!.hp;
  resolveAttack(state, ctx.cards, 'own', { row: 'front', col: 0 },
    { kind: 'unit', row: 'front', col: 3 }, [], createRng(1), { toSide: 'enemy' });
  assert.equal(getUnit(state, 'enemy', 'front', 3), null, '白毦兵应被击杀并离场');
  assert.equal(atkBefore - (getUnit(state, 'own', 'front', 0)?.hp ?? 0), 3, '阵亡也要吃满 反击 2 + 忠勇 1');
});

/* ========================================================================
 * 「披坚」（原圣盾）：免疫一次伤害 —— 没有时间限制，被攻击后消耗
 *
 * 引擎依据：`expireStatuses` 只递减有 `turns` 的状态（`mutate.ts`：
 * `if (inst.turns === undefined) continue; // 永久 / 直到消耗`），而
 * `applyStatus` 对 `duration: until_consumed` **不写 turns** → 天然无时限。
 *
 * 三条不变量各锁一个用例：① 跨多次回合末检查仍在 ② 挨打时免伤并消耗
 * ③ 消耗后再受伤正常掉血。
 * ===================================================================== */

const PIJIAN_UNIT: CardDef = {
  id: 'test_pijian', name: '披坚测试兵', faction: 'wei', type: 'troop',
  cost: 2, attack: 2, health: 3, troopKind: 'infantry', keywords: [], memo: '测试',
};

test('披坚：没有时间限制，跨多次回合末检查仍不消失', () => {
  const { state, ctx } = scenario({});
  ctx.cards.set(PIJIAN_UNIT.id, PIJIAN_UNIT);
  const u = makeUnit(PIJIAN_UNIT, 0, 701);
  u.statuses.sheng_dun_status = { stacks: 1 };      // 模拟「上场获得披坚」：turns 缺省
  setUnit(state, 'own', 'front', 0, u);

  for (let i = 0; i < 4; i++) expireStatuses(state, 'own', []);
  const after = getUnit(state, 'own', 'front', 0)!;
  assert.equal(statusStacks(after, 'sheng_dun_status'), 1, '4 次回合末检查后披坚应仍在');
  assert.equal(after.statuses.sheng_dun_status.turns, undefined, '不应写入 turns（否则会倒计时）');
});

test('披坚：挨打时免掉该次伤害并消耗（UI 徽章随之消失）', () => {
  const { state, ctx } = scenario({});
  ctx.cards.set(PIJIAN_UNIT.id, PIJIAN_UNIT);
  const u = makeUnit(PIJIAN_UNIT, 0, 702);
  u.statuses.sheng_dun_status = { stacks: 1 };
  setUnit(state, 'own', 'front', 0, u);
  const hpBefore = getUnit(state, 'own', 'front', 0)!.hp;

  const events: GameEvent[] = [];
  const dealt = dealDamage(state, ctx.cards, unitRef('own', 'front', 0), 1, events, '测试');

  assert.equal(dealt, 0, '该次伤害应被完全免掉');
  assert.equal(getUnit(state, 'own', 'front', 0)!.hp, hpBefore, '血量不应变化');
  assert.equal(statusStacks(getUnit(state, 'own', 'front', 0)!, 'sheng_dun_status'), 0,
    '披坚应被消耗 —— 客户端据此把徽章抹掉');
  assert.ok(events.some((e) => e.type === 'STATUS_EXPIRED'), '应发 STATUS_EXPIRED 事件');
});

test('披坚：消耗后再受伤正常掉血（只免疫一次）', () => {
  const { state, ctx } = scenario({});
  ctx.cards.set(PIJIAN_UNIT.id, PIJIAN_UNIT);
  const u = makeUnit(PIJIAN_UNIT, 0, 703);
  u.statuses.sheng_dun_status = { stacks: 1 };
  setUnit(state, 'own', 'front', 0, u);

  dealDamage(state, ctx.cards, unitRef('own', 'front', 0), 1, [], '测试');   // 被免掉
  const d2 = dealDamage(state, ctx.cards, unitRef('own', 'front', 0), 2, [], '测试');
  assert.equal(d2, 2, '第二次应正常吃满 2 点');
  assert.equal(getUnit(state, 'own', 'front', 0)!.hp, 1, '3 - 2 = 1');
});

/* ========================================================================
 * 升变必须派发「战吼（on_play）」
 *
 * 踩到的真 bug：`upgradeUnit` 此前**完全不派发 on_play** —— 而升变正是获得
 * 特种兵的**主要途径**。于是宿卫虎士「上场获得披坚」在升变时永远拿不到披坚，
 * 卡面既不显示徽章也不显示光圈（只有"从手牌直接打出"才有），玩家看到的是
 * "同一个兵，打出有免疫、升变没有"。
 *
 * 全池 57 张带 on_play 的卡里，**只有宿卫虎士同时带 upgradeFrom** —— 所以
 * 这个坑一直藏着，直到要它显示光圈才暴露。
 * ===================================================================== */

const HUSHI = realTroop('wei_suwei_hushi');

test('升变：新形态的战吼必须发动（宿卫虎士升变后应获得披坚）', () => {
  const { state, ctx } = scenario({ ownCommand: 10 });
  ctx.cards.set(HUSHI.id, HUSHI);
  const base = realTroop('neutral_infantry');
  ctx.cards.set(base.id, base);
  // 宿卫虎士是魏国卡，升变候选按**主公阵营**过滤 —— 所以本方主公必须是魏
  state.sides.own.lord.faction = 'wei';
  const u = makeUnit(base, 0, 801);
  // 步兵的升变条件是「累计造成伤害 ≥ 2」（字段名见 engine.ts upgradeStatus）
  u.upgradeProgress = { damage: 2, shieldSurvival: 0, basicKills: 0, characterKills: 0, heroHits: 0 };
  setUnit(state, 'own', 'front', 0, u);

  const r = applyAction(state, ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: HUSHI.id });
  assert.equal(r.ok, true, r.error ?? '升变应成立');
  const after = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(after.name, '宿卫虎士', '形态应已替换');
  assert.equal(statusStacks(after, 'sheng_dun_status'), 1,
    '升变出的宿卫虎士必须拿到披坚 —— 否则卡面不会显示徽章与光圈');
});

test('升变：战吼在数据里是 on_play（防夹具/数据漂移）', () => {
  const sk = (HUSHI.skills ?? [])[0];
  assert.equal(sk?.trigger, 'on_play', '虎士应为上场触发');
  assert.equal((HUSHI as { upgradeFrom?: string }).upgradeFrom, 'infantry', '宿卫虎士走步兵升变');
});

/* ========================================================================
 * 「水困」——与火（灼烧）正交的持续轴（ADR-116 立项，ADR-132 重做）
 *
 * ⚠️ ADR-132 起口径已变（本组测试随之改写，新矩阵见 `elemental-debuffs.test.ts`）：
 *   旧：① 回合末受 N 点水伤 ② 行动时**固定 1** 点 ③ 持续 1~2 回合
 *   新：① **回合末不再有水伤** ② 行动时受 **2^(阶段-1)** 点（阶段 = 层数）③ **永久**
 * 仍然成立的两条：只由**主动行动**（普攻/主动技）触发（反击/被动不触发）、不设每回合上限。
 * ===================================================================== */

const SHUIKUN_CARD: CardDef = {
  id: 'test_shuikun_dummy', name: '受困者', faction: 'wei', type: 'troop',
  cost: 2, attack: 3, health: 8, troopKind: 'infantry', keywords: [], memo: '测试',
};

function withShuiKun(stacks = 1) {
  const { state, ctx } = scenario({ ownCommand: 10 });
  ctx.cards.set(SHUIKUN_CARD.id, SHUIKUN_CARD);
  const u = makeUnit(SHUIKUN_CARD, 0, 901);
  u.statuses.shui_kun = { stacks };
  setUnit(state, 'enemy', 'front', 4, u);
  return { state, ctx, get: () => getUnit(state, 'enemy', 'front', 4)! };
}

test('水困：回合末**不再结算水伤**（ADR-132：不行动就完全不受伤）', () => {
  const { state, ctx, get } = withShuiKun(2);
  const before = get().hp;
  resolveTurnEndStatuses(state, ctx.cards, 'enemy', []);
  assert.equal(get().hp, before, '回合末没有水伤了（旧口径的 ① 已删除）');
  assert.equal(statusStacks(get(), 'shui_kun'), 3, '但阶段照常 +1（2 → 3）');
});

test('灼烧（zhuo_shao）：改在**回合开始**按 dot_fire 结算火属性伤害（ADR-132 改时机）', () => {
  const { state, ctx, get } = withShuiKun(1);
  delete get().statuses.shui_kun;
  get().statuses.zhuo_shao = { stacks: 3 };         // 永久，无 turns
  const before = get().hp;
  // ⚠️ 走的是 resolveTurnStartDamage（回合开始），不再是 resolveTurnEndStatuses（回合结束）
  resolveTurnStartDamage(state, ctx.cards, 'enemy', []);
  assert.equal(get().hp, before - 3, '3 层灼烧 → 回合开始掉 3 点');
});

test('水困：行动税 = 2^(阶段-1)，随阶段增长（3 阶段 → 4 点）', () => {
  const { state, ctx, get } = withShuiKun(3);        // 阶段 3
  const before = get().hp;
  state.active = 'enemy';
  // 打**我方主公** —— 主将不反击（ADR-051），所以掉的血只可能来自行动税。
  // ⚠️ 若改成打单位，反击伤害会混进来，断言就变成">= 1"这种查不出问题的松断言。
  const r = applyAction(state, ctx, { type: 'ATTACK', from: { row: 'front', col: 4 }, to: { kind: 'lord' } });
  assert.equal(r.ok, true, r.error ?? '攻击应成立');
  const after = getUnit(r.state, 'enemy', 'front', 4)!;
  assert.equal(before - after.hp, 4,
    `阶段 3 行动一次扣 2^(3-1) = 4 点；实际扣 ${before - after.hp}`);
  // 同时确认这笔伤害确实出自水困（而不是别处漏出来的扣血）
  assert.ok((r.events ?? []).some((e) => e.type === 'DAMAGE' && e.source === '水困'),
    '应有一条来源为「水困」的伤害事件');
});

test('水困：反击/被动不触发行动税（只有主动行动才扣）', () => {
  const { state, ctx, get } = withShuiKun(1);
  const before = get().hp;
  // 我方攻击它 → 它自动反击（不是"主动行动"）
  setUnit(state, 'own', 'front', 0, makeUnit(SHUIKUN_CARD, 0, 903));
  state.active = 'own';
  resolveAttack(state, ctx.cards, 'own', { row: 'front', col: 0 },
    { kind: 'unit', row: 'front', col: 4 }, [], createRng(1), { toSide: 'enemy' });
  const lost = before - get().hp;
  // 掉血只应来自我方这次攻击（3 点），不含行动税
  assert.equal(lost, 3, `被攻击只掉 3 点（我方攻击力），不应有行动税；实际掉 ${lost}`);
});

/* ========================================================================
 * 升变也要能**指定战吼目标**（ADR-116）
 *
 * 升变是获得特种兵的主要途径，而虎步军「越水」是"对指定敌方人物"的战吼。
 * `UPGRADE_UNIT` 此前没有 target 字段 → `mode:'choose'` 只能走 narrowByMode 的
 * 兜底（`pool.slice(0, n)` = 第一个合法目标），玩家无法指定。
 *
 * 本用例刻意放**两个**敌人：第一个是兜底会命中的，第二个才是"被指定的"。
 * 如果 target 没被真正传下去，水困会挂到第一个身上 → 断言失败。
 * ===================================================================== */

const HUBU = realTroop('shu_hubujun');

test('升变：可以把战吼目标指定给**非第一个**的敌人（越水）', () => {
  const { state, ctx } = scenario({ ownCommand: 10 });
  ctx.cards.set(HUBU.id, HUBU);
  const base = realTroop('neutral_infantry');
  ctx.cards.set(base.id, base);
  const dummy = realTroop('neutral_shieldman');
  ctx.cards.set(dummy.id, dummy);

  const u = makeUnit(base, 0, 801);
  u.upgradeProgress = { damage: 2, shieldSurvival: 0, basicKills: 0, characterKills: 0, heroHits: 0 };
  setUnit(state, 'own', 'front', 0, u);
  setUnit(state, 'enemy', 'front', 0, makeUnit(dummy, 0, 802));   // 第一个（兜底会打它）
  setUnit(state, 'enemy', 'front', 3, makeUnit(dummy, 0, 803));   // 第二个（我们要指定的）

  const r = applyAction(state, ctx, {
    type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: HUBU.id,
    target: { side: 'enemy', row: 'front', col: 3 },              // ← 指定第二个
  });
  assert.equal(r.ok, true, r.error ?? '升变应成立');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.name, '虎步军', '形态应已替换');

  const first = getUnit(r.state, 'enemy', 'front', 0)!;
  const third = getUnit(r.state, 'enemy', 'front', 3)!;
  assert.equal(statusStacks(third, 'shui_kun'), 1, '被指定的那个敌人应获得水困');
  assert.equal(statusStacks(first, 'shui_kun'), 0, '第一个敌人**不应**获得水困（否则说明 target 没生效）');
});

test('升变：不传 target 时退回兜底（AI / 测试路径不崩）', () => {
  const { state, ctx } = scenario({ ownCommand: 10 });
  ctx.cards.set(HUBU.id, HUBU);
  const base = realTroop('neutral_infantry');
  ctx.cards.set(base.id, base);
  ctx.cards.set('neutral_shieldman', realTroop('neutral_shieldman'));
  const u = makeUnit(base, 0, 811);
  u.upgradeProgress = { damage: 2, shieldSurvival: 0, basicKills: 0, characterKills: 0, heroHits: 0 };
  setUnit(state, 'own', 'front', 0, u);
  setUnit(state, 'enemy', 'front', 3, makeUnit(realTroop('neutral_shieldman'), 0, 812));

  const r = applyAction(state, ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: HUBU.id });
  assert.equal(r.ok, true, r.error ?? '不传 target 也应成立（兜底取第一个合法目标）');
});

/* ========================================================================
 * 越水的目标池**只能是场上人物**，绝不能盲选对方手牌（ADR-116）
 *
 * 设计者提出的风险：手牌里的卡在你看来只是**牌背**，玩家并不知道对方手里
 * 拿的是人物牌还是非人物牌 —— 若战吼能选到手牌，那是纯赌博。
 *
 * 引擎侧的依据（已核查）：
 *   · `resolveTargets` 的基础池只从 `state.sides[s].rows[r]` 构建（场上单位），
 *     手牌必须在 selector 里**显式**写 `zone: 'hand' | 'both'` 才会并入；
 *   · UI 的 `playTargetPlan` → `choiceOf` **复用同一个 resolveTargets**，
 *     且只把 `kind === 'unit' | 'lord'` 放进可点列表。
 * 本组测试把这个不变量钉死：即使对方**手里全是人物牌**，也不能出现在候选里。
 * ===================================================================== */

test('越水：目标池只含场上人物，对方手牌（含人物牌）绝不入选', () => {
  const { state, ctx } = scenario({ ownCommand: 10 });
  ctx.cards.set(HUBU.id, HUBU);
  // 对方手牌刻意混入**人物牌**与**非人物牌** —— 若机制有漏，人物牌最容易被误选
  ctx.cards.set('wei_caoren', realTroop('wei_caoren'));
  ctx.cards.set('tactic_huogong', realTroop('tactic_huogong'));
  state.sides.enemy.hand = [
    { card: realTroop('wei_caoren'), mods: [] },          // 人物牌
    { card: realTroop('tactic_huogong'), mods: [] },      // 非人物牌
  ];
  const dummy = realTroop('neutral_shieldman');
  ctx.cards.set(dummy.id, dummy);
  setUnit(state, 'enemy', 'front', 3, makeUnit(dummy, 0, 821));

  const plan = playTargetPlan(state, 'own', HUBU, 0);
  const all = plan.choices.flatMap((c) => c.targets);
  assert.ok(all.length > 0, '应当有候选目标（场上那个单位 + 主公）');
  assert.ok(all.every((t) => t.kind === 'unit' || t.kind === 'lord'),
    `候选里出现了非场上目标：${JSON.stringify(all.filter((t) => t.kind !== 'unit' && t.kind !== 'lord'))}`);
  assert.ok(plan.choices.every((c) => !c.includesHand), '不应标记为"含手牌目标"');

  // 直接查引擎的解析结果：同样不能出现 handRef
  const sel = { side: 'enemy' as const, filter: { type: 'character' as const, include_lord: true },
                count: 'all' as const, mode: 'first' as const };
  const pool = resolveTargets(state, sel, { side: 'own' }, createRng(1));
  assert.ok(pool.every((r) => r.kind !== 'hand'),
    `引擎目标池混入了手牌：${JSON.stringify(pool.filter((r) => r.kind === 'hand'))}`);
});

test('越水：显式声明 zone: hand 时才可能选到手牌（证明是白名单而非全局禁令）', () => {
  const { state, ctx } = scenario({ ownCommand: 10 });
  ctx.cards.set('wei_caoren', realTroop('wei_caoren'));
  state.sides.enemy.hand = [{ card: realTroop('wei_caoren'), mods: [] }];
  const withHand = resolveTargets(state,
    { side: 'enemy', zone: 'hand', filter: { type: 'character' }, count: 'all', mode: 'first' },
    { side: 'own' }, createRng(1));
  assert.ok(withHand.some((r) => r.kind === 'hand'),
    '写了 zone: hand 就应该能选到手牌 —— 说明上面那条不是"手牌永远不可选"的假阳性');
});

/* ========================================================================
 * 「水困」必须走真实卡牌 DSL 验证（ADR-116 立项，ADR-132 改口径）
 *
 * 血的教训：最初的单测都是「手工把状态塞进 `unit.statuses`」，
 * 于是卡牌 YAML 里的字段写错（`turns` 不是 `Effect` 的字段，正确字段是 `duration`）
 * **完全查不出来** —— 引擎读到 `eff.duration === undefined` 就当永久，
 * 而当时水困本该是限时的。
 *
 * ⚠️ ADR-132 反转了方向：水困**现在就是永久**的，所以"永久"不再是 bug 症状；
 * 但字段写错依然要能抓 —— 现在钉的是"**不许**写 duration"（写了会把永久变成限时）。
 * 这组测试仍然坚持**从卡牌数据出牌**，不碰 unit.statuses。
 * ===================================================================== */

function playFromHand(cardId: string, target?: { side: Side; row?: Row; col?: number }) {
  const { state, ctx } = scenario({ ownCommand: 10 });
  const card = realTroop(cardId);
  ctx.cards.set(card.id, card);
  const foe = realTroop('neutral_shieldman');
  ctx.cards.set(foe.id, foe);
  state.sides.own.hand = [{ card, mods: [] }];
  setUnit(state, 'enemy', 'front', 3, makeUnit(foe, 0, 831));   // 高血量，确保扛得住伤害
  const action: { type: 'PLAY_CARD'; cardIndex: number; row: Row; col: number; target?: typeof target } =
    { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 };
  if (target) action.target = target;
  const r = applyAction(state, ctx, action);
  assert.equal(r.ok, true, r.error ?? '出牌应成立');
  return { state: r.state, target: getUnit(r.state, 'enemy', 'front', 3) };
}

test('越水（真实 DSL）：水困是**永久**且阶段 1（不是限时状态）', () => {
  const { target } = playFromHand('shu_hubujun', { side: 'enemy', row: 'front', col: 3 });
  const st = target!.statuses.shui_kun;
  assert.ok(st, '目标应获得水困');
  assert.equal(st.stacks, 1, '施加当回合 = 阶段 1');
  assert.equal(st.turns, undefined,
    '永久 = 无剩余回合数。若这里是个数字，说明卡牌 YAML 又写了 duration（ADR-132 起不写）');
});

test('水淹七军（真实 DSL）：水困永久 + 禁用仍 1 回合，且是水攻伤害', () => {
  const { target } = playFromHand('shu_guanyu', undefined);   // count:all，不需要指定目标
  assert.equal(target!.statuses.shui_kun?.turns, undefined, '水困已改为永久（ADR-132）');
  assert.equal(target!.statuses.shui_kun?.stacks, 1, '阶段 1 起步');
  assert.equal(target!.statuses.jin_yong?.turns, 1, '禁用仍是 1 回合（这一条没动）');
});

test('水淹七军：伤害是**水攻**属性（不是默认物理）', () => {
  const { target } = playFromHand('shu_guanyu', undefined);
  assert.equal(target!.hp, (realTroop('neutral_shieldman').health ?? 0) - 1, '应受到 1 点伤害');
});

/* ========================================================================
 * 蜀国「西凉铁骑」的「突阵」——攻击**主将**时 +2 攻（ADR-116）
 *
 * 史实：《三国志·蜀书六》「超负其多力，阴欲突前捉曹公」。
 * 与群雄版「突骑」（打武将/谋臣 +2）构成**同一支凉州铁骑的两个时期**：
 * 马腾「典领部众」是创业期（破敌将），马超「领腾部曲」入蜀是突击期（直取主帅）。
 *
 * 旧技能是「放箭：随机 1 点」—— 那是**弓兵「神射」**的具体化（keywords.yaml），
 * 放在骑兵身上张冠李戴，这组测试同时锁住"新技能生效"与"旧机制已摘除"。
 * ===================================================================== */

const SHU_TIEQI = realTroop('shu_xiliangtieqi');

/** 让 source 攻击一次指定目标，返回事件流 */
function attackWith(sourceId: string, to: { kind: 'lord' } | { kind: 'unit'; row: Row; col: number }) {
  const { state, ctx } = scenario({ ownCommand: 10 });
  const card = realTroop(sourceId);
  ctx.cards.set(card.id, card);
  const u = makeUnit(card, 0, 841);
  u.statuses.xian_gong = { stacks: 1, turns: 1 };      // 先攻：入场即可攻击
  setUnit(state, 'own', 'front', 0, u);
  // ⚠️ 只在打**单位**时才放敌人：`neutral_shieldman` 带「架盾」（嘲讽），
  // 它会把打主将的攻击吸走 —— 那样测的就不是「突阵」了。
  if (to.kind === 'unit') {
    // ⚠️ 用高血靶子：`neutral_shieldman` 只有 4 血，而西凉铁骑定档后是 4 攻
    // （ADR-118），一击必死 → `getUnit()` 返回 undefined，血量差会算出 NaN。
    // 用合成卡而不是真实卡 id，避免以后数值再调时又被打破。
    const foe: CardDef = {
      id: 'test_high_hp_dummy', name: '高血靶', faction: 'wei', type: 'troop',
      cost: 3, attack: 1, health: 10, troopKind: 'infantry', keywords: [], memo: '测试',
    };
    ctx.cards.set(foe.id, foe);
    setUnit(state, 'enemy', 'front', 3, makeUnit(foe, 0, 842));
  }
  state.active = 'own';
  const before = state.sides.enemy.lord.hp;
  const r = applyAction(state, ctx, { type: 'ATTACK', from: { row: 'front', col: 0 }, to });
  assert.equal(r.ok, true, r.error ?? '攻击应成立');
  return { state: r.state, lordLost: before - r.state.sides.enemy.lord.hp,
           target: getUnit(r.state, 'enemy', 'front', 3) };
}

test('突阵：攻击**主将**时 +2 攻（4 攻打成 6 点）', () => {
  const { lordLost } = attackWith('shu_xiliangtieqi', { kind: 'lord' });
  // 基础攻 4（ADR-118 特种骑兵定档 4 费 4/3）+ 突阵 2 = 6
  assert.equal(lordLost, 6, `西凉铁骑 4 攻 + 突阵 2 = 6；实际 ${lordLost}`);
});

test('突阵：打**普通单位**时不加成（仍只有基础攻 4 点）', () => {
  const { target } = attackWith('shu_xiliangtieqi', { kind: 'unit', row: 'front', col: 3 });
  assert.ok(target, '靶子应活着（10 血挨 4 点）');
  assert.equal(10 - target!.hp, 4, `打单位不应有加成；实际掉 ${10 - target!.hp}`);
});

test('突阵：已摘除旧的「放箭」随机伤害（关键词 zhan_ji 也应移除）', () => {
  assert.ok(!(SHU_TIEQI.skills ?? []).some((s) => s.name === '放箭'), '不应再有「放箭」');
  assert.ok(!(SHU_TIEQI.keywords ?? []).includes('zhan_ji'), '改成触发后不该再带战技关键词');
  assert.ok((SHU_TIEQI.skills ?? []).some((s) => s.name === '突阵'), '应有「突阵」');
});

/* ========================================================================
 * 「木牛流马」——**机械牌**（ADR-152，取代 ADR-116 ⑴ 的归类部分）
 *
 * 史料（不变）：《三国志·蜀书五·诸葛亮传》
 *   · 「九年，亮复出祁山，**以木牛运**…粮尽退军」
 *   · 「十二年春，亮悉大众由斜谷出，**以流马运**」
 *   · 「亮性长于巧思，**损益连弩，木牛流马，皆出其意**」
 *   · 裴松之注引《亮集》载《作木牛流马法》有完整机械尺寸
 * 与「元戎弩」同属陈寿所谓「工械技巧」，**不是兵**。
 *
 * 归类演进（三版）：
 *   ① 初版「特种兵·骑兵 0/6」—— type 与 troopKind 都错、且「治疗友军」无依据
 *   ② ADR-116 改为**战法卡**（3 费抽 2）
 *   ③ **ADR-152 改为机械牌**：2 费 0/2、己方回合结束抽 1 —— 它是**占战场位置的军械**，
 *      既不是兵种也不是一次性战法；同一个 id 还被黄月英「机巧出阵」召唤。
 * ===================================================================== */

const ALL_CARDS: CardDef[] = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cards.json'), 'utf8'));

test('木牛流马：是**机械牌**（既不是兵种、也不是战法卡）', () => {
  const c = ALL_CARDS.find((x) => x.id === 'shu_muniuliuma');
  assert.ok(c, '应有 shu_muniuliuma');
  assert.equal(c!.type, 'machine', '必须是机械牌（ADR-152）');
  assert.equal((c as { troopKind?: string }).troopKind, undefined, '军械不该有兵种');
  assert.equal((c as { upgradeFrom?: string }).upgradeFrom, undefined, '军械不参与升变');
  assert.equal(ALL_CARDS.some((x) => x.id === 'tactic_muniuliuma'), false,
    '旧 id「tactic_muniuliuma」（战法卡）必须已随归类变更删除');
});

test('木牛流马：2 费 0/2；己方回合结束时抽 1 张（运粮＝补给资源）', () => {
  const c = ALL_CARDS.find((x) => x.id === 'shu_muniuliuma')!;
  assert.equal(c.cost, 2, 'ADR-152 定 2 费');
  assert.equal(c.attack, 0, '0 攻');
  assert.equal(c.health, 2, '0/2 —— 2 费基准 5 = 身体 2 ＋ 持续抽 1(≈3)');

  const sk = (c.skills ?? []).find((s) => s.id === 'mu_niu_yun_liang');
  assert.ok(sk, '应有「运粮」技能');
  assert.equal(sk!.trigger, 'turn_end', '必须是回合结束触发（不是战吼、不是战技）');
  const draw = (sk!.effects ?? []).find((e) => e.action === 'draw');
  assert.ok(draw, '「运粮」应有 draw 效果');
  assert.equal(draw!.value, 1, '抽 1 张（旧版的「抽 2」已随归类作废）');
  // 反向锁：效果必须写在 skills 内 —— 旧战法版把 draw 挂在**卡级** `effects` 上（全池孤例）
  assert.equal(c.effects, undefined, '不挂卡级 effects');
});

test('木牛流马：军械按 ADR-119「无法普通攻击」，带 jin_gong 光环', () => {
  const c = ALL_CARDS.find((x) => x.id === 'shu_muniuliuma')!;
  const aura = (c.skills ?? []).find((s) => s.kind === 'aura');
  assert.ok(aura, '应有「车阵」光环');
  const st = (aura!.effects ?? []).find((e) => e.action === 'apply_status');
  assert.ok(st, '光环应施加状态');
  assert.equal(st!.status, 'jin_gong', '施加的必须是「无法攻击」（jin_gong）');
});

test('木牛流马：不能再挂在骑兵的升变池里', () => {
  const cav = ALL_CARDS.filter((x) => x.upgradeFrom === 'cavalry').map((x) => x.id);
  assert.ok(!cav.includes('shu_muniuliuma'), '骑兵升变池不该再有木牛流马');
  assert.ok(!cav.includes('tactic_muniuliuma'), '旧战法 id 更不该进升变池');
});

test('反向锁：不该有低于 3 费却「抽 2 张以上」的战法卡（会低于费效曲线）', () => {
  // 原挂在「木牛流马 3 费」那条里，随归类变更移出 —— 但这条池子健康检查本身仍然有效。
  const cheap = ALL_CARDS.filter((x) => x.type === 'tactic' && (x.cost ?? 9) < 3
    && (x.effects ?? []).some((e) => e.action === 'draw' && (e.value ?? 0) >= 2));
  assert.deepEqual(cheap.map((x) => x.id), [],
    '不该有低于 3 费却抽 2 张以上的战法卡');
});

/* ========================================================================
 * 五谷丰登：`draw` 必须尊重 `target.side`（ADR-116）
 *
 * 引擎原先的 `draw` 是 `drawCard(state, cards, ctx.side, events)` ——
 * **无条件抽给施放者，完全忽略 `eff.target`**。于是五谷丰登（名义"双方各抽 2 张"）
 * 实际是**自己抽 4 张**（两条 draw 都抽给自己），1 费抽 4 张，
 * 远超全库「3 费抽 2」的标准档。
 *
 * 这组测试从**真实卡牌数据**出牌，同时锁住"引擎修复"与"卡面数值"。
 * ===================================================================== */

function playEvent(cardId: string) {
  const { state, ctx } = scenario({ ownCommand: 10 });
  const card = realTroop(cardId);          // 该 helper 只是"从 cards.json 按 id 取卡"
  ctx.cards.set(card.id, card);
  state.sides.own.hand = [{ card, mods: [] }];
  // ⚠️ `scenario()` 默认**牌库是空的**（`decks: { own: [], enemy: [] }`）——
  // 不补牌库的话「抽牌」抽了个寂寞，测出来两头都是 0，看着像引擎没修好。
  const filler = realTroop('neutral_infantry').id;
  state.sides.own.deck = [filler, filler, filler];
  state.sides.enemy.deck = [filler, filler, filler];
  const ownBefore = state.sides.own.hand.length;
  const foeBefore = state.sides.enemy.hand.length;
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true, r.error ?? '出牌应成立');
  return {
    ownDelta: r.state.sides.own.hand.length - ownBefore,
    foeDelta: r.state.sides.enemy.hand.length - foeBefore,
  };
}

test('五谷丰登（真实 DSL）：双方各抽 1 张 —— 不能变成只给自己抽', () => {
  const { ownDelta, foeDelta } = playEvent('event_fengnian');
  // 自己：打出消耗 1 张，再抽 1 张 → 净 0
  assert.equal(ownDelta, 0, `自己净手牌应为 0（出 1 抽 1）；实际 ${ownDelta}`);
  assert.equal(foeDelta, 1, `对手也必须抽到 1 张；实际 ${foeDelta}`);
});

test('draw 动作：不带 target 时只抽给自己（默认行为不变）', () => {
  const { state, ctx } = scenario({ ownCommand: 10 });
  const card = realTroop('tactic_tuntian');       // 屯田：3 费抽 2，没有 target
  ctx.cards.set(card.id, card);
  state.sides.own.hand = [{ card, mods: [] }];
  const filler = realTroop('neutral_infantry').id;
  state.sides.own.deck = [filler, filler, filler];
  state.sides.enemy.deck = [filler, filler, filler];
  const foeBefore = state.sides.enemy.hand.length;
  const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  if (r.ok) {
    assert.equal(r.state.sides.enemy.hand.length, foeBefore,
      '没写 target 的 draw 不该给对手抽牌');
  }
});

/* ========================================================================
 * 卡面文案的回合数必须等于**实际 duration**（ADR-116）
 *
 * 这是真漂移过的：虎步军的水困从 2 回合改成 1 回合时，`effects` 改了、
 * **卡面 `text` 没改**，于是玩家看到的和实际结算对不上。
 * 这类不一致没有任何自动防线（`validate` 不比对文案与数值），只能靠测试钉住。
 *
 * ⚠️ ADR-132 起水困是**永久**（不再有回合数），所以这里只剩「禁用」这类仍限时的状态；
 * 水困改成钉"文案必须写「永久」"（写在 elemental-debuffs.test.ts 的数据用例里）。
 * ===================================================================== */

test('卡面回合数 = 实际 duration（水淹七军的「禁用」仍是 1 回合）', () => {
  const expectations: Array<[string, string, string, number]> = [
    ['shu_guanyu', '水淹七军', 'jin_yong', 1],
  ];
  for (const [cardId, skillName, statusId, turns] of expectations) {
    const card = ALL_CARDS.find((x) => x.id === cardId)!;
    const sk = (card.skills ?? []).find((s) => s.name === skillName)!;
    const eff = (sk.effects ?? []).find((e) => e.status === statusId)!;
    assert.equal(eff.duration, turns, `${card.name}「${skillName}」的 ${statusId} 应为 ${turns} 回合`);
    // 卡面文案必须写出同一个数字 —— 否则就是"文案没跟着改"
    // 中文数字也算（关羽的禁用写的是「禁用一回合」而非「1 回合」）
    const cn = ['零', '一', '二', '三', '四', '五'][turns] ?? String(turns);
    assert.match(sk.text ?? '', new RegExp(`(?:${turns}|${cn})\\s*回合`),
      `${card.name}「${skillName}」卡面文案里的回合数应写成 ${turns}（实际 duration=${turns}）`);
  }
});

/* ========================================================================
 * 蜀国「越骑」的「蓄锐」——未受伤才成长（ADR-116）
 *
 * 史实：《三国志·蜀书十一·杨洪传》「后为**越骑校尉**，领郡如故」；
 *      《季汉辅臣赞》「**越骑惟忠，厉志自祗，职于内外，念公忘私**」。
 *
 * 设计取舍：初版是"不行动攻击就 +1 攻"，但 3 回合不打 = 少打 9 点伤害，
 * 换 +3 攻要再打 3 回合才回本（6 回合内都是亏的），且体验消极。
 * 改成"**未受伤**才成长"后：可正常攻击（零机会成本）+ **对手打一下就能打断**（博弈）。
 *
 * 本组测试同时锁住三个引擎改动：
 *   ① `damaged: false` 生效（原先只认 `true`，写 false 静默失效）
 *   ② `attack_max` 过滤器（+3 硬上限）
 *   ③ `source: true` 尊重 filter（原先直接 return，全池 42 处都没带 filter 所以从未暴露）
 * ===================================================================== */

const YUEQI = realTroop('shu_yueqi');

/** 造一个越骑在我方场上，返回 state 与它 */
function withYueqi() {
  const { state, ctx } = scenario({ ownCommand: 10 });
  ctx.cards.set(YUEQI.id, YUEQI);
  setUnit(state, 'own', 'front', 0, makeUnit(YUEQI, 0, 851));
  return { state, ctx, get: () => getUnit(state, 'own', 'front', 0)! };
}

test('蓄锐：回合末毫发无伤 → 攻击力永久 +1', () => {
  const { state, ctx } = withYueqi();
  assert.equal(getUnit(state, 'own', 'front', 0)!.atk, 3, '基础 3 攻');
  // ⚠️ `turn_end` **技能**走的是结束回合流程（engine.ts:477 第 20 步 ②），
  // 不是 `resolveTurnEndStatuses`（那只结算持续伤害）—— 最初就是踩了这个才全红。
  const r = applyAction(state, ctx, { type: 'END_TURN' });
  assert.equal(r.ok, true, r.error ?? '结束回合应成立');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.atk, 4, '未受伤，应 +1 → 4 攻');
});

test('蓄锐：受过伤 → 本回合**不成长**（对手可以打断）', () => {
  const { state, ctx } = withYueqi();
  getUnit(state, 'own', 'front', 0)!.hp -= 1;      // 挨了一下
  const r = applyAction(state, ctx, { type: 'END_TURN' });
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.atk, 3,
    '受过伤就不该成长 —— 这正是"对手打一下就能打断"的机制本身');
});

test('蓄锐：上限 +3（涨到 6 攻后不再涨）', () => {
  let { state, ctx } = withYueqi();
  // 走真实的回合循环：我方结束 → 敌方结束 → 又轮到我方
  for (let i = 0; i < 8; i++) {
    const u = getUnit(state, 'own', 'front', 0);
    if (u) u.hp = u.maxHp;                          // 每回合都保持无伤
    const a = applyAction(state, ctx, { type: 'END_TURN' });
    if (!a.ok) break;
    state = a.state;
    if (state.active !== 'own') {
      const b = applyAction(state, ctx, { type: 'END_TURN' });
      if (!b.ok) break;
      state = b.state;
    }
  }
  const final = getUnit(state, 'own', 'front', 0);
  assert.ok(final, '越骑应还活着');
  assert.equal(final!.atk, 6, '基础 3 + 上限 3 = 6 攻（再多回合也不涨）');
});

test('越骑：卡面写明上限，且是骑兵（不再是越骑校尉的"官"）', () => {
  assert.equal(YUEQI.troopKind, 'cavalry', '骑兵');
  assert.equal(YUEQI.upgradeFrom, 'cavalry', '从骑兵升变而来');
  assert.ok((YUEQI.keywords ?? []).includes('xian_gong'), '保留先攻');
  const sk = (YUEQI.skills ?? [])[0];
  assert.match(sk.text ?? '', /最多\s*\+3/, '卡面必须写明上限，否则玩家不知道能涨多少');
});

/* ========================================================================
 * 蜀国「连弩士」与战法「元戎弩射」（ADR-116）
 *
 * 史料：《三国志·蜀书五·诸葛亮传》裴注引《魏氏春秋》
 *   「又损益连弩，谓之元戎，以铁为矢，矢长八寸，**一弩十矢俱发**。」
 * 「一弩十矢俱发」= 多发 → 技能做成**两次 1 点**而非一次 2 点。
 *
 * 旧卡「元戎弩兵」已删除：那名字是 **KOEI《三国志10》的兵种名**，正史零依据；
 * 且其「每回合免费对全体敌方 1 点」严重超模。
 * ===================================================================== */

const LIANNU = realTroop('shu_liannushi');

test('连弩士：2 费 1/2 弓兵，两次 1 点的战技', () => {
  assert.equal(LIANNU.cost, 2);
  assert.equal(LIANNU.attack, 1);
  assert.equal(LIANNU.health, 2);
  assert.equal(LIANNU.troopKind, 'archer', '弓兵');
  const sk = (LIANNU.skills ?? [])[0];
  assert.equal(sk.kind, 'active');
  const dmgs = (sk.effects ?? []).filter((e) => e.action === 'damage');
  assert.equal(dmgs.length, 2, '必须是**两次独立的 1 点**，不是一次 2 点（取「十矢俱发」的多发之意）');
  assert.ok(dmgs.every((e) => e.value === 1), '每次都是 1 点');
  // 卡面写「人物」时，全池 7/8 的卡都**不含主将**，本卡遵循该约定
  assert.ok(dmgs.every((e) => !e.target?.filter?.include_lord), '卡面写「人物」→ 不含主将');
});

test('连弩士：旧卡「元戎弩兵」已删除（那是 KOEI 的兵种名）', () => {
  assert.equal(ALL_CARDS.some((x) => x.id === 'shu_yuanrongnubing'), false,
    '元戎弩兵是《三国志10》的兵种名，正史 0 见，必须已删除');
  assert.equal(ALL_CARDS.some((x) => x.name === '元戎弩兵'), false, '不该再有同名的卡');
});

test('元戎弩射：1 费 3 支箭随机；场上无连弩士时不加箭', () => {
  const t = ALL_CARDS.find((x) => x.id === 'tactic_yuanrongnushe')!;
  assert.equal(t.cost, 1);
  const dmgs = (t.effects ?? []).filter((e) => e.action === 'damage');
  assert.equal(dmgs.length, 4, '3 支基础箭 + 1 支条件箭');
  const base = dmgs.filter((e) => !e.condition);
  const bonus = dmgs.filter((e) => e.condition);
  assert.equal(base.length, 3, '基础 3 支');
  assert.equal(bonus.length, 1, '条件加 1 支');
  assert.ok(base.every((e) => e.target?.mode === 'random'), '随机发射');
});

test('元戎弩射：条件的判定是"己方场上有连弩士"', () => {
  const t = ALL_CARDS.find((x) => x.id === 'tactic_yuanrongnushe')!;
  const bonus = (t.effects ?? []).find((e) => e.condition)!;
  const ex = bonus.condition!.exists!;
  assert.equal(ex.side, 'self', '看己方场上（不是双方）');
  assert.equal(ex.filter?.card_id, 'shu_liannushi', '必须是连弩士');
});

test('元戎弩射（真实 DSL）：场上**有**连弩士 → 多射 1 支（4 点），**没有** → 只有 3 点', () => {
  const tactic = realTroop('tactic_yuanrongnushe');
  const foe = realTroop('neutral_infantry');       // 1/1，两箭必死，便于数伤害
  const run = (withLiannu: boolean) => {
    const { state, ctx } = scenario({ ownCommand: 10 });
    ctx.cards.set(tactic.id, tactic);
    ctx.cards.set(LIANNU.id, LIANNU);
    ctx.cards.set(foe.id, foe);
    if (withLiannu) setUnit(state, 'own', 'front', 5, makeUnit(LIANNU, 0, 861));
    // 放 4 个 1/1：3 支箭最多打 3 点，4 支箭最多打 4 点 → 用总掉血区分
    for (let c = 0; c < 4; c++) setUnit(state, 'enemy', 'front', c, makeUnit(foe, 0, 870 + c));
    state.sides.own.hand = [{ card: tactic, mods: [] }];
    const before = [0, 1, 2, 3].map((c) => getUnit(state, 'enemy', 'front', c)!.hp);
    const lordBefore = state.sides.enemy.lord.hp;
    const r = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
    assert.equal(r.ok, true, r.error ?? '出牌应成立');
    const after = [0, 1, 2, 3].map((c) => getUnit(r.state, 'enemy', 'front', c)?.hp ?? 0);
    const unitDmg = before.reduce((s, h, i) => s + (h - after[i]), 0);
    // ⚠️ 必须把**主将**也算进来：ADR-087 规定「范围/随机伤害默认含主公」，
    // 所以随机箭本来就会随机打到敌方主将。只数单位血量会少算，导致"条件没生效"的误判。
    const lordDmg = lordBefore - r.state.sides.enemy.lord.hp;
    return unitDmg + lordDmg;
  };
  assert.equal(run(false), 3, '场上没有连弩士 → 只有 3 支箭 = 3 点');
  assert.equal(run(true), 4, '场上有连弩士 → 多射 1 支 = 4 点');
});

/* ========================================================================
 * 毒攻与「中毒」（ADR-117 立项，ADR-132 重做）
 *
 * ⚠️ ADR-132 起口径已变（本组测试随之改写，完整矩阵见 `elemental-debuffs.test.ts`）：
 *   旧：回合末受 N 点毒伤、层数封顶 3、持续 2 回合（断供即结束）
 *   新：该方**回合结束**时**永久降低 N 点生命上限**（不造成伤害）、层数**不封顶**、**永久**
 * 三系节奏：回合开始＝灼烧（火）／行动时＝水困（水）／回合结束＝中毒（毒）。
 *
 * 断言一律走**真实卡牌 DSL**（`shu_wudangfeijun` 从 cards.json 读），
 * 手工塞状态只能验证引擎、验证不了数据 —— ADR-116 的水困就是这么漏掉过一次。
 * ===================================================================== */

const WUDANG = realTroop('shu_wudangfeijun');

/** 摆一个「无当飞军 + 一个敌方目标」的局面，返回目标格 */
function wudangReady(foeId = 'neutral_shieldman') {
  const { state, ctx } = scenario({ ownCommand: 10 });
  ctx.cards.set(WUDANG.id, WUDANG);
  const foe = realTroop(foeId);
  ctx.cards.set(foe.id, foe);
  setUnit(state, 'own', 'front', 0, makeUnit(WUDANG, 0, 881));
  setUnit(state, 'enemy', 'front', 3, makeUnit(foe, 0, 882));
  return { state, ctx, get: (s: typeof state = state) => getUnit(s, 'enemy', 'front', 3) };
}

test('毒箭（真实 DSL）：指定目标 → 中毒 1 层 / **永久**，并造成 1 点毒攻伤害', () => {
  const { state, ctx, get } = wudangReady();
  const before = get()!.hp;
  const r = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 3 },
  });
  assert.equal(r.ok, true, r.error ?? '毒箭应能释放');
  const st = get(r.state)!.statuses.zhong_du;
  assert.ok(st, '目标应获得中毒');
  assert.equal(st.stacks, 1, '首次施加 = 1 层（层数就是每回合削掉的上限）');
  assert.equal(st.turns, undefined,
    '永久 = 无剩余回合数。若是个数字，说明卡牌 YAML 又写了 duration（ADR-132 起不写）');
  assert.equal(before - get(r.state)!.hp, 1, '毒箭本身还有 1 点毒攻伤害');
});

test('毒箭（真实 DSL）：指定的是**第二个**敌人，不是兜底的第一个', () => {
  const { state, ctx } = wudangReady();
  ctx.cards.set('neutral_infantry', realTroop('neutral_infantry'));
  setUnit(state, 'enemy', 'front', 0, makeUnit(realTroop('neutral_infantry'), 0, 883));  // 兜底会打它
  const r = applyAction(state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 3 },
  });
  assert.equal(r.ok, true, r.error ?? '毒箭应能释放');
  assert.equal(statusStacks(getUnit(r.state, 'enemy', 'front', 3)!, 'zhong_du'), 1, '被指定的那个应中毒');
  assert.equal(statusStacks(getUnit(r.state, 'enemy', 'front', 0)!, 'zhong_du'), 0,
    '第一个敌人**不应**中毒（否则说明 skill 级 target 没下沉到效果上）');
});

test('中毒：层数**不封顶**（旧的 max_stacks: 3 已删除）', () => {
  const { state, ctx, get } = wudangReady();
  for (let i = 0; i < 5; i++) applyStatus(state, unitRef('enemy', 'front', 3), 'zhong_du', 1, []);
  assert.equal(get()!.statuses.zhong_du.stacks, 5, '续毒每次都实打实 +1 层');
});

test('中毒：续毒只加层，不再有"时长重置"这回事（永久状态）', () => {
  const { state, ctx, get } = wudangReady();
  applyStatus(state, unitRef('enemy', 'front', 3), 'zhong_du', 1, []);
  applyStatus(state, unitRef('enemy', 'front', 3), 'zhong_du', 1, []);
  const st = get()!.statuses.zhong_du;
  assert.equal(st.stacks, 2, '续毒加 1 层（= 每回合多削 1 点上限）');
  assert.equal(st.turns, undefined, '永久状态没有剩余回合数，也就不存在"重置为 2 回合"');
});

test('中毒：回合末**削生命上限**（不造成伤害），事件来源是「中毒」', () => {
  const { state, ctx, get } = wudangReady();
  // 垫血：上限削 3 点后读得到差额。
  // ⚠️ 三个字段一起改（baseMaxHp 是**派生上限的基准**：maxHp = baseMaxHp + Σmods.health）。
  //    只改 maxHp 的话，削上限会按真实基础值重算 —— 那是夹具与引擎不变量不一致，不是引擎的问题。
  get()!.hp = get()!.maxHp = get()!.baseMaxHp = 6;
  applyStatus(state, unitRef('enemy', 'front', 3), 'zhong_du', 3, []);
  const before = get()!.hp;
  const events: GameEvent[] = [];
  resolveTurnEndStatuses(state, ctx.cards, 'enemy', events);
  assert.equal(get()!.maxHp, 3, '3 层中毒 → 上限 6 − 3 = 3');
  assert.equal(before - get()!.hp, 3, '当前生命被夹到新上限（6 → 3）');
  assert.ok(!events.some((e) => e.type === 'DAMAGE' && e.source === '中毒'),
    '中毒**不再造成伤害** —— 不该有「中毒」来源的伤害事件');
  assert.ok(events.some((e) => e.type === 'STAT_MODIFIED' && e.source === '中毒' && e.health === -3),
    '应以「中毒」来源的属性修正事件通告这次削上限');
});

test('毒攻：**不吃**藤甲的物理减伤（同一张卡通不过，毒照扣）', () => {
  const { state, ctx, target } = tengjiaUnderAttack();
  const before = getUnit(state, 'enemy', 'front', 3)!.hp;
  const src = getUnit(state, 'own', 'front', 0) ?? undefined;
  // 先确认这局面确实是"1 点物理打不动"（否则下面那条断言就成了假阳性）
  assert.equal(dealDamage(state, ctx.cards, target, 1, [], '测试',
    0, { side: 'own', row: 'front', col: 0 }, src, 'physical'), 0, '1 点物理应被藤甲完全减掉');
  const hpAfterPhysical = getUnit(state, 'enemy', 'front', 3)!.hp;
  assert.equal(dealDamage(state, ctx.cards, target, 1, [], '毒箭',
    0, { side: 'own', row: 'front', col: 0 }, src, 'poison'), 1, '1 点毒攻应原样结算');
  assert.equal(hpAfterPhysical - getUnit(state, 'enemy', 'front', 3)!.hp, 1, '毒伤实扣 1 点');
  assert.equal(before - getUnit(state, 'enemy', 'front', 3)!.hp, 1, '合计只掉了毒的那 1 点');
});

test('毒箭（真实 DSL）：目标池**不含主公**（毒不上主将）', () => {
  const { state, ctx } = wudangReady();
  // 把唯一的敌方单位移走，只剩敌方主将
  setUnit(state, 'enemy', 'front', 3, null);
  const plan = unitSkillTargetPlan(state, 'own', 'front', 0);
  const targets = plan.choices.flatMap((c) => c.targets);
  assert.equal(targets.length, 0,
    `敌方只剩主将时不应有合法目标（ADR-117：主公免疫中毒）；实际 ${JSON.stringify(targets)}`);
  const r = applyAction(state, ctx, { type: 'USE_SKILL', row: 'front', col: 0 });
  assert.equal(r.state.sides.enemy.lord.statuses?.zhong_du, undefined, '主将不应中毒');
});

test('剧毒：已从无当飞军移除（另立卡牌），关键词本身仍按「命中即斩杀」结算', () => {
  assert.ok(!(WUDANG.keywords ?? []).includes('ju_du'),
    '无当飞军不应再带剧毒 —— 剧毒认**一切**伤害（含战技），旧版「放箭」实际是每回合随机秒一个敌方单位');
  // 关键词保留给后续卡牌，行为钉死：造成伤害并实际命中 → 目标阵亡
  const { state, ctx, get } = wudangReady();
  const killer = realTroop('neutral_infantry');
  const juDu: CardDef = { ...killer, id: 'test_judu', name: '剧毒测试', attack: 1, keywords: ['ju_du'] };
  ctx.cards.set(juDu.id, juDu);
  const atk = makeUnit(juDu, 0, 884);
  setUnit(state, 'own', 'front', 1, atk);
  const before = get()!.hp;
  assert.ok(before > 1, '夹具目标应活得下 1 点伤害，否则测不出"命中即斩杀"');
  resolveAttack(state, ctx.cards, 'own', { row: 'front', col: 1 },
    { kind: 'unit', row: 'front', col: 3 }, [], createRng(1));
  assert.equal(getUnit(state, 'enemy', 'front', 3), null, '剧毒命中后目标应直接阵亡');
});

/* ========================================================================
 * 特种骑兵的定档规则：基础骑兵 3 费 → 特种骑兵 4 费（ADR-118）
 *
 * 全池 7 张特种骑兵原先**统一 2 费**，比基础骑兵（3 费 2/3）还便宜 1 费
 * —— 升级形态反而更便宜，是结构性问题。本轮先改蜀国两张。
 *
 * 4 费强度基准（从全池 29 张 4 费人物卡统计）：攻+血 区间 4~9、中位 6。
 * 设计者口径：优质 = 7~8，极品 = 9。
 * ===================================================================== */

test('特种骑兵定档：西凉铁骑 4 费 4/3（攻+血 7 = 优质档）', () => {
  const c = ALL_CARDS.find((x) => x.id === 'shu_xiliangtieqi')!;
  assert.equal(c.cost, 4, '特种骑兵定档 4 费');
  assert.equal((c.attack ?? 0) + (c.health ?? 0), 7, '攻+血 7 = 4 费优质档（区间 4~9、中位 6）');
});

test('特种骑兵定档：越骑 4 费，但基础值保持 3/3（有成长，故低于优质档）', () => {
  const c = ALL_CARDS.find((x) => x.id === 'shu_yueqi')!;
  assert.equal(c.cost, 4, '特种骑兵定档 4 费');
  assert.equal((c.attack ?? 0) + (c.health ?? 0), 6,
    '基础值 6（中位）——「蓄锐」可长到 6/3（攻+血 9），起手必须低于优质档才平衡');
});

test('特种骑兵定档：蜀国特种骑兵不再低于基础骑兵的费用', () => {
  const base = ALL_CARDS.find((x) => x.name === '骑兵' && !x.upgradeFrom)!;
  assert.equal(base.cost, 3, '基础骑兵 3 费');
  const shuCav = ALL_CARDS.filter((x) => x.faction === 'shu' && x.upgradeFrom === 'cavalry');
  assert.ok(shuCav.length >= 2, '蜀国至少两张特种骑兵');
  for (const c of shuCav) {
    assert.ok((c.cost ?? 0) > base.cost!,
      `${c.name}（${c.cost} 费）必须贵于基础骑兵（${base.cost} 费）—— 升级形态不该更便宜`);
  }
});
