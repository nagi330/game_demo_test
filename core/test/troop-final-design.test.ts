import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction, unitSkillTargetPlan } from '../src/engine.ts';
import { dealDamage, expireStatuses, lordRef, unitRef } from '../src/mutate.ts';
import { recomputeAuras, runEffects } from '../src/effects.ts';
import { createRng } from '../src/rng.ts';
import { allUnits, getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { scenario } from './fixtures.ts';
import type { CardDef, GameEvent, Side } from '../src/types.ts';

const cards: CardDef[] = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const real = (id: string): CardDef => {
  const card = cards.find(c => c.id === id);
  assert.ok(card, id);
  return card;
};
function setup(seed = 1) {
  const s = scenario({ seed });
  for (const c of cards) s.ctx.cards.set(c.id, c);
  return s;
}
function place(s: ReturnType<typeof setup>, id: string, side: Side = 'own', col = 0) {
  const u = makeUnit(real(id), 0, nextUidSeq(s.state));
  setUnit(s.state, side, 'front', col, u);
  return u;
}
function victim(s: ReturnType<typeof setup>, col: number, hp = 10, attack = 0, shield = false) {
  const c: CardDef = { id: `victim_${col}`, name: '目标', faction: 'wei', type: 'general', cost: 4,
    attack, health: hp, keywords: shield ? ['jia_dun'] : [], memo: '测试' };
  s.ctx.cards.set(c.id, c);
  const u = makeUnit(c, 0, nextUidSeq(s.state));
  setUnit(s.state, 'enemy', 'front', col, u);
  return u;
}
function attack(s: ReturnType<typeof setup>, target: 'lord' | number = 0) {
  const r = applyAction(s.state, s.ctx, { type: 'ATTACK', from: { row: 'front', col: 0 },
    to: target === 'lord' ? { kind: 'lord' } : { kind: 'unit', row: 'front', col: target } });
  assert.ok(r.ok, r.error ?? '攻击应成功');
  return r;
}
function cast(s: ReturnType<typeof setup>, col: number) {
  const r = applyAction(s.state, s.ctx, { type: 'USE_SKILL', row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col } });
  assert.ok(r.ok, r.error ?? '技能应成功');
  return r;
}
function play(s: ReturnType<typeof setup>, id: string) {
  s.state.sides.own.hand = [{ card: real(id), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(r.ok, r.error ?? '出牌应成功');
  return r;
}

test('武射吏：武将光环动态增减，战技为2或3点，移除先攻', () => {
  const s = setup();
  const u = place(s, 'wu_jiangdong_nushou');
  victim(s, 0);
  assert.ok(!u.kw.includes('xian_gong'));
  assert.equal(getUnit(cast(s, 0).state, 'enemy', 'front', 0)!.hp, 8);
  const general = makeUnit(real('wu_sunyi'), 0, nextUidSeq(s.state));
  setUnit(s.state, 'own', 'front', 1, general);
  recomputeAuras(s.state, s.ctx.cards, createRng(1), []);
  assert.deepEqual([u.atk, u.maxHp], [4, 5]);
  recomputeAuras(s.state, s.ctx.cards, createRng(1), []);
  assert.deepEqual([u.atk, u.maxHp], [4, 5], '光环不能重复叠加');
  assert.equal(getUnit(cast(s, 0).state, 'enemy', 'front', 0)!.hp, 7);
  setUnit(s.state, 'own', 'front', 1, null);
  recomputeAuras(s.state, s.ctx.cards, createRng(1), []);
  assert.deepEqual([u.atk, u.maxHp], [3, 4]);
});

for (const type of ['troop', 'strategist', 'machine', 'token', 'general'] as const) {
  test(`锦帆军：命中并击杀${type}，仅非武将夺取实际牌顶`, () => {
    const s = setup();
    place(s, 'wu_jinfanjun');
    const target = victim(s, 0, 1);
    target.type = type;
    s.state.sides.enemy.deck = ['neutral_archer', 'neutral_infantry'];
    const r = applyAction(s.state, s.ctx, { type: 'USE_SKILL', row: 'front', col: 0, skillId: 'jinfan_jieying' });
    assert.ok(r.ok, r.error ?? '技能应成功');
    assert.equal(getUnit(r.state, 'enemy', 'front', 0), null);
    const stolen = r.events.filter(e => e.type === 'CARD_STOLEN');
    assert.equal(stolen.length, type === 'general' ? 0 : 1);
    if (type !== 'general') {
      assert.equal(r.state.sides.own.hand.at(-1)!.card.id, 'neutral_infantry');
      assert.deepEqual(r.state.sides.enemy.deck, ['neutral_archer']);
    }
  });
}

test('锦帆军：空牌库不夺牌，无场上单位不命中主公', () => {
  const s = setup();
  place(s, 'wu_jinfanjun');
  const target = victim(s, 0, 1);
  target.type = 'troop';
  s.state.sides.enemy.deck = [];
  const r = applyAction(s.state, s.ctx, { type: 'USE_SKILL', row: 'front', col: 0 });
  assert.ok(r.ok);
  assert.equal(r.events.filter(e => e.type === 'CARD_STOLEN').length, 0);
  setUnit(s.state, 'enemy', 'front', 0, null);
  const empty = applyAction(s.state, s.ctx, { type: 'USE_SKILL', row: 'front', col: 0 });
  assert.equal(empty.state.sides.enemy.lord.hp, 30);
});

test('锦帆军：劫营夺牌概率为50%', () => {
  const skill = real('wu_jinfanjun').skills?.find(s => s.id === 'jinfan_jieying');
  assert.equal((skill?.effects ?? []).find(e => e.action === 'steal_card')?.chance, 0.5);
});

test('ADR-117：15种特殊兵费用与攻血逐项对应最终设计列', () => {
  const expected: Array<[string, number, number, number]> = [
    ['wei_huweidun', 3, 1, 5], ['wei_wuweiying', 3, 2, 5], ['wei_qingzhou_bing', 2, 3, 2],
    ['wei_suwei_hushi', 2, 2, 2], ['wei_hubaoki_hu', 4, 2, 4], ['wei_hubaoki_bao', 4, 3, 3],
    ['wei_qiangnuying', 2, 1, 2], ['wei_piliche', 3, 0, 3], ['wu_wunan_bing', 3, 1, 3],
    ['wu_jiefanbing', 3, 3, 3], ['wu_gansiying', 3, 2, 3], ['wu_chexiahushi', 3, 3, 4],
    ['wu_dongwujingqi', 5, 4, 3], ['wu_louchuanjun', 3, 2, 4], ['wu_mengchongdoujian', 3, 1, 3],
  ];
  for (const [id, cost, atk, hp] of expected) {
    const c = real(id);
    assert.deepEqual([c.cost, c.attack, c.health], [cost, atk, hp], id);
  }
});

for (const active of ['own', 'enemy'] as const) {
  test(`虎卫盾：在${active}回合阵亡后主公持续免伤，到当前回合结束清除`, () => {
    const s = setup();
    s.state.active = active;
    place(s, 'wei_huweidun');
    dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 0), 99, [], '测试');
    for (let i = 0; i < 2; i++) {
      assert.equal(dealDamage(s.state, s.ctx.cards, lordRef('own'), 5, [], '测试'), 0);
    }
    assert.equal(s.state.sides.own.lord.hp, 30);
    expireStatuses(s.state, active, []);
    assert.equal(dealDamage(s.state, s.ctx.cards, lordRef('own'), 5, [], '测试'), 5);
    assert.equal(s.state.sides.own.lord.hp, 25);
  });
}

test('宿卫虎士：自己与主公各自独立免疫一次，不会相互消耗', () => {
  const s = setup();
  const r = play(s, 'wei_suwei_hushi');
  s.state = r.state;
  const events: GameEvent[] = [];
  assert.equal(dealDamage(s.state, s.ctx.cards, lordRef('own'), 4, events, '测试'), 0);
  assert.equal(dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 0), 1, events, '测试'), 0);
  assert.equal(dealDamage(s.state, s.ctx.cards, lordRef('own'), 4, events, '测试'), 4);
  assert.ok(events.some(e => e.type === 'LORD_STATUS_EXPIRED'));
});

test('武卫营：护主仍有效，转移的火攻仍保留伤害属性', () => {
  const s = setup();
  place(s, 'wei_wuweiying');
  recomputeAuras(s.state, s.ctx.cards, createRng(1), []);
  dealDamage(s.state, s.ctx.cards, lordRef('own'), 2, [], '测试');
  assert.equal(s.state.sides.own.lord.hp, 30);
  assert.equal(getUnit(s.state, 'own', 'front', 0)!.hp, real('wei_wuweiying').health! - 2);
});

test('青州兵：伤害交换后存活且概率命中时夺取牌顶', () => {
  const s = setup();
  s.state.rngState = 7;
  place(s, 'wei_qingzhou_bing');
  victim(s, 0, 10, 1);
  s.state.sides.enemy.deck = ['neutral_infantry', 'wei_caoxiu'];
  const r = attack(s);
  assert.deepEqual(r.state.sides.enemy.deck, ['neutral_infantry']);
  assert.equal(r.state.sides.own.hand.at(-1)?.card.id, 'wei_caoxiu');
  assert.equal(allUnits(r.state, 'own').length, 1, '夺牌不是抽牌，不触发曹休自动上场');
  assert.equal(r.events.filter(e => e.type === 'CARD_STOLEN').length, 1);
});

test('青州兵：反击阵亡时不夺牌', () => {
  const s = setup();
  place(s, 'wei_qingzhou_bing');
  victim(s, 0, 10, 5);
  s.state.sides.enemy.deck = ['neutral_infantry'];
  const r = attack(s);
  assert.equal(r.state.sides.enemy.deck.length, 1);
  assert.equal(r.events.some(e => e.type === 'CARD_STOLEN'), false);
});

test('青州兵：伤害被披坚免疫时不夺牌，空牌库不触发粮尽', () => {
  const s = setup();
  place(s, 'wei_qingzhou_bing');
  const u = victim(s, 0);
  u.statuses.sheng_dun_status = { stacks: 1 };
  s.state.sides.enemy.deck = ['neutral_infantry'];
  const r = attack(s);
  assert.equal(r.state.sides.enemy.deck.length, 1);
  const empty = setup();
  place(empty, 'wei_qingzhou_bing');
  const r2 = attack(empty, 'lord');
  assert.equal(r2.state.sides.enemy.fatigue, 0);
});

test('虎骑营：击杀后永久成长一次，普通加攻不永久残留', () => {
  const s = setup();
  const u = place(s, 'wei_hubaoki_hu');
  victim(s, 0, 1);
  const r = attack(s);
  const after = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(after.atk, u.atk + 1);
  assert.equal(after.maxHp, u.maxHp + 1);
});

test('虎骑营：被反击杀死不获得成长', () => {
  const s = setup();
  place(s, 'wei_hubaoki_hu');
  victim(s, 0, 1, 10);
  const r = attack(s);
  assert.equal(getUnit(r.state, 'own', 'front', 0), null);
  assert.equal(r.events.some(e => e.type === 'SKILL_TRIGGERED' && e.skillName === '斩功'), false);
});

test('豹骑营：受伤单位本次+1，击杀武将也返还攻击', () => {
  const s = setup();
  const u = place(s, 'wei_hubaoki_bao');
  const v = victim(s, 0, 10);
  v.hp = 9;
  const r = attack(s);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 9 - (u.atk + 1));
  const kill = setup();
  place(kill, 'wei_hubaoki_bao');
  victim(kill, 0, 1);
  const r2 = attack(kill);
  assert.equal(getUnit(r2.state, 'own', 'front', 0)!.attackedThisTurn, 0);
});

for (const [id, token, keyword] of [
  ['wu_wunan_bing', 'token_wunan_right', 'jia_dun'],
] as const) {
  test(`${id}：上场召唤一个同攻血右部，保留关键词而不递归召唤`, () => {
    const s = setup();
    const r = play(s, id);
    const units = allUnits(r.state, 'own').map(ref => ref.unit);
    assert.equal(units.length, 2);
    const right = units.find(u => u.cardId === token)!;
    const left = units.find(u => u.cardId === id)!;
    assert.deepEqual([right.atk, right.hp], [left.atk, left.hp]);
    assert.ok(right.kw.includes(keyword));
    assert.equal(right.type, 'token');
    assert.equal(real(token).upgradeFrom, undefined);
    assert.equal(right.skills?.length ?? 0, 0);
  });
  test(`${id}：召唤复制当前受伤及增益后的攻血，不复制状态`, () => {
    const s = setup();
    const u = place(s, id);
    u.atk += 2;
    u.hp = 1;
    u.statuses.jin_gong = { stacks: 1 };
    runEffects(s.state, s.ctx.cards, real(id).skills![0]!.effects,
      { side: 'own', source: u }, createRng(1), []);
    const right = allUnits(s.state, 'own').find(ref => ref.unit.cardId === token)!.unit;
    assert.deepEqual([right.atk, right.hp], [u.atk, u.hp]);
    assert.equal(right.statuses.jin_gong, undefined);
  });
  test(`${id}：升变发动召唤，场满时不覆盖单位`, () => {
    const s = setup();
    s.state.sides.own.lord.faction = 'wu';
    const baseId = id === 'wu_wunan_bing' ? 'neutral_shieldman' : 'neutral_infantry';
    const u = place(s, baseId);
    u.upgradeProgress = { damage: 2, shieldSurvival: 2, basicKills: 0, characterKills: 0, heroHits: 0 };
    const r = applyAction(s.state, s.ctx, { type: 'UPGRADE_UNIT', row: 'front', col: 0, toCardId: id });
    assert.ok(r.ok, r.error ?? '升变应成功');
    assert.ok(allUnits(r.state, 'own').some(ref => ref.unit.cardId === token));
    const full = setup();
    for (let c = 1; c < full.state.sides.own.rows.front.length; c++) place(full, 'neutral_infantry', 'own', c);
    const r2 = play(full, id);
    assert.equal(allUnits(r2.state, 'own').filter(ref => ref.unit.cardId === token).length, 0);
  });
}

test('解烦兵：不再召唤右部，战技对指定单位造成1点水攻', () => {
  const s = setup();
  const r = play(s, 'wu_jiefanbing');
  assert.equal(allUnits(r.state, 'own').length, 1);
  s.state = r.state;
  victim(s, 0);
  assert.equal(getUnit(cast(s, 0).state, 'enemy', 'front', 0)!.hp, 9);
});

test('敢死营：上场获得披坚，亡语按水攻属性受到蒋钦加成', () => {
  const s = setup();
  let r = play(s, 'wu_gansiying');
  s.state = r.state;
  assert.equal(dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 0), 1, [], '测试'), 0);
  place(s, 'wu_jiangqin', 'own', 1);
  recomputeAuras(s.state, s.ctx.cards, createRng(1), []);
  dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 0), 99, [], '测试');
  assert.equal(s.state.sides.enemy.lord.hp, 25, '敌方仅主公在场，亡语为2+3水攻');
});

test('车下虎士：主公受伤不反射，亡语提供本回合攻甲', () => {
  const s = setup();
  const u = place(s, 'wu_chexiahushi');
  s.state.sides.own.lord.armor = 2;
  dealDamage(s.state, s.ctx.cards, lordRef('own'), 5, [], '测试');
  assert.equal(s.state.sides.own.lord.hp, 27);
  assert.equal(s.state.sides.enemy.lord.hp, 30);
  assert.equal(u.hp, real('wu_chexiahushi').health);
  dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 0), 99, [], '测试');
  assert.equal(s.state.sides.own.lord.attackThisTurn, 2);
  assert.equal(s.state.sides.own.lord.temporaryArmor, 2);
});

test('车下虎士：双方在场均不反射，披坚免伤不触发亡语', () => {
  const s = setup();
  place(s, 'wu_chexiahushi');
  place(s, 'wu_chexiahushi', 'enemy');
  const events: GameEvent[] = [];
  dealDamage(s.state, s.ctx.cards, lordRef('own'), 3, events, '测试');
  assert.deepEqual([s.state.sides.own.lord.hp, s.state.sides.enemy.lord.hp], [27, 30]);
  assert.equal(events.filter(e => e.type === 'DAMAGE').length, 1);
  s.state.sides.own.lord.statuses = { sheng_dun_status: { stacks: 1 } };
  dealDamage(s.state, s.ctx.cards, lordRef('own'), 3, [], '测试');
  assert.equal(s.state.sides.enemy.lord.hp, 30);
});

test('车下虎士：已经阵亡时不反射，护主转移时主公未扣血不反射', () => {
  const s = setup();
  place(s, 'wu_chexiahushi');
  place(s, 'wei_wuweiying', 'own', 1);
  recomputeAuras(s.state, s.ctx.cards, createRng(1), []);
  dealDamage(s.state, s.ctx.cards, lordRef('own'), 1, [], '测试');
  assert.equal(s.state.sides.enemy.lord.hp, 30);
  dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 0), 99, [], '测试');
  dealDamage(s.state, s.ctx.cards, unitRef('own', 'front', 1), 99, [], '测试');
  dealDamage(s.state, s.ctx.cards, lordRef('own'), 2, [], '测试');
  assert.equal(s.state.sides.enemy.lord.hp, 30);
});

test('东吴精骑：攻击后使用主公技返还一次攻击，重复主公技被拒', () => {
  const s = setup();
  place(s, 'wu_dongwujingqi');
  s.state = attack(s, 'lord').state;
  const r = applyAction(s.state, s.ctx, { type: 'USE_LORD_SKILL' });
  assert.ok(r.ok, r.error ?? '主公技应成功');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.attackedThisTurn, 0);
  const r2 = applyAction(r.state, s.ctx, { type: 'USE_LORD_SKILL' });
  assert.equal(r2.ok, false);
});

test('冀州强弩：随机战技3伤且仍无法普攻', () => {
  const s = setup();
  place(s, 'wei_qiangnuying');
  victim(s, 0);
  recomputeAuras(s.state, s.ctx.cards, createRng(1), []);
  assert.equal(applyAction(s.state, s.ctx, { type: 'ATTACK', from: { row: 'front', col: 0 }, to: { kind: 'unit', row: 'front', col: 0 } }).ok, false);
  const r = cast(s, 0);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 7);
});

test('霹雳车：目标及左右相邻分别2伤，架盾分别3伤，不误伤其他格', () => {
  const s = setup();
  place(s, 'wei_piliche');
  victim(s, 0, 10, 0, true);
  victim(s, 1);
  victim(s, 2, 10, 0, true);
  victim(s, 3);
  recomputeAuras(s.state, s.ctx.cards, createRng(1), []);
  const r = cast(s, 1);
  assert.deepEqual([0, 1, 2, 3].map(c => getUnit(r.state, 'enemy', 'front', c)!.hp), [7, 8, 7, 10]);
  assert.equal(r.state.sides.enemy.lord.hp, 30);
});

test('楼船军：目标和主公各2水攻，蒋钦对两段伤害均生效', () => {
  const s = setup();
  place(s, 'wu_louchuanjun');
  place(s, 'wu_jiangqin', 'own', 1);
  victim(s, 0);
  recomputeAuras(s.state, s.ctx.cards, createRng(1), []);
  const r = cast(s, 0);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 5);
  assert.equal(r.state.sides.enemy.lord.hp, 25);
});

test('楼船军：只能选择非主公敌方单位，非法选择不消耗技能次数', () => {
  const s = setup();
  place(s, 'wu_louchuanjun');
  victim(s, 0);
  const plan = unitSkillTargetPlan(s.state, 'own', 'front', 0);
  assert.ok(plan.choices[0].targets.length > 0);
  assert.ok(plan.choices[0].targets.every(t => t.kind === 'unit' && t.side === 'enemy'));
  const r = applyAction(s.state, s.ctx, { type: 'USE_SKILL', row: 'front', col: 0,
    target: { side: 'enemy' } });
  assert.equal(r.ok, false);
  assert.deepEqual(r.state, s.state);
  assert.equal(cast(s, 0).state.sides.enemy.lord.hp, 28);
});

test('霹雳车：架盾目标单次3点，相邻和主要目标的披坚各免疫整段', () => {
  const s = setup();
  place(s, 'wei_piliche');
  for (let col = 0; col < 3; col++) victim(s, col, 10, 0, true);
  runEffects(s.state, s.ctx.cards, [{ action: 'apply_status', status: 'sheng_dun_status',
    target: { side: 'enemy', filter: { type: 'character' }, count: 'all' } }],
    { side: 'own' }, createRng(1), []);
  const r = cast(s, 1);
  assert.deepEqual([0, 1, 2].map(c => getUnit(r.state, 'enemy', 'front', c)!.hp), [10, 10, 10]);
  assert.equal(r.events.filter(e => e.type === 'STATUS_EXPIRED').length, 3);
});

test('霹雳车：主要和相邻架盾单位各产生一条3点伤害事件', () => {
  const s = setup();
  place(s, 'wei_piliche');
  for (let col = 0; col < 3; col++) victim(s, col, 10, 0, true);
  const r = cast(s, 1);
  const damage = r.events.filter(e => e.type === 'DAMAGE');
  assert.equal(damage.length, 3);
  assert.ok(damage.every(e => e.amount === 3));
});

test('蒙冲斗舰：指定单位1水攻，不自伤，不误伤相邻单位', () => {
  const s = setup();
  place(s, 'wu_mengchongdoujian');
  for (let c = 0; c < 5; c++) victim(s, c);
  const plan = unitSkillTargetPlan(s.state, 'own', 'front', 0);
  assert.ok(plan);
  assert.ok(plan.choices.every(choice => choice.targets.every(t => t.kind !== 'lord')));
  const r = cast(s, 1);
  assert.deepEqual([0, 1, 2, 3, 4].map(c => getUnit(r.state, 'enemy', 'front', c)!.hp), [10, 9, 10, 10, 10]);
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, 3);
  assert.equal(r.state.sides.enemy.lord.hp, 30);
});

test('蒙冲斗舰：原目标阵亡和右侧空格不改变坐标，不重复打初始目标', () => {
  const s = setup();
  place(s, 'wu_mengchongdoujian');
  victim(s, 0, 1);
  victim(s, 2);
  const r = cast(s, 0);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0), null);
  assert.equal(getUnit(r.state, 'enemy', 'front', 2)!.hp, 10);
  const edge = setup();
  place(edge, 'wu_mengchongdoujian');
  const last = edge.state.sides.enemy.rows.front.length - 1;
  victim(edge, last);
  const r2 = cast(edge, last);
  assert.equal(getUnit(r2.state, 'enemy', 'front', last)!.hp, 9);
});

test('蒙冲斗舰：不自损、不消耗自身披坚，水攻不触发藤甲火攻弱点', () => {
  const s = setup();
  const u = place(s, 'wu_mengchongdoujian');
  u.statuses.sheng_dun_status = { stacks: 1 };
  const armor = place(s, 'shu_tengjiabing', 'enemy');
  recomputeAuras(s.state, s.ctx.cards, createRng(1), []);
  const r = cast(s, 0);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 3);
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, u.hp);
  assert.ok(getUnit(r.state, 'own', 'front', 0)!.statuses.sheng_dun_status);
  assert.ok(armor.kw.includes('jia_dun'));
});
