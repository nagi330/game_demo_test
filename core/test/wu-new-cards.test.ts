import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { applyAction } from '../src/engine.ts';
import { resolveAttack } from '../src/effects.ts';
import { dealDamage, drawCard, killUnit, lordRef } from '../src/mutate.ts';
import { createRng } from '../src/rng.ts';
import { createMatch, getUnit, makeUnit, setUnit } from '../src/state.ts';
import { loadData } from '../src/loader.ts';
import type { CardDef, GameEvent, LordDef } from '../src/types.ts';

const cards = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8')) as CardDef[];
const heroes = JSON.parse(readFileSync(new URL('../data/heroes.json', import.meta.url), 'utf8')) as LordDef[];
const data = loadData({ cards, heroes }, { own: 'wu_sunquan', enemy: 'wei_caocao' });
const ctx = { cards: data.cards, lords: data.lords };

function stateWith(hand: string[]) {
  const state = createMatch({
    seed: 5, cards: data.cards, lords: data.lords,
    decks: { own: [], enemy: [] }, firstSide: 'own', secondCompensation: 'none',
  });
  state.sides.own.command = { cur: 10, max: 10 };
  state.sides.own.hand = hand.map((id) => ({ card: data.cards.get(id)!, mods: [] }));
  return state;
}

test('太史慈 归吴/神射：入场召唤骑兵，战技锁定同一目标并压低攻击', () => {
  const state = stateWith(['wu_taishici']);
  const firstTarget = makeUnit(data.cards.get('wei_caopi')!, 0, 0);
  const chosenTarget = makeUnit(data.cards.get('wei_caopi')!, 0, 1);
  setUnit(state, 'enemy', 'front', 0, firstTarget);
  setUnit(state, 'enemy', 'front', 1, chosenTarget);
  let result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(result.ok, true, result.error ?? '太史慈应能上场');
  assert.ok(result.state.sides.own.rows.front.some((u) => u?.cardId === 'neutral_cavalry'));
  result = applyAction(result.state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 1 },
  });
  assert.equal(result.ok, true, result.error ?? '神射应能发动');
  assert.equal(result.state.sides.enemy.rows.front[0]?.hp, 8, '未被选择的目标不应受到神射影响');
  assert.equal(result.state.sides.enemy.rows.front[0]?.atk, 4, '未被选择的目标攻击力不应降低');
  assert.equal(result.state.sides.enemy.rows.front[1]?.hp, 6, '选择目标应受到2点伤害');
  assert.equal(result.state.sides.enemy.rows.front[1]?.atk, 2, '减攻应作用于选择目标');
});

test('太史慈 神射：第一段击杀目标后，减攻不会转移到其他目标', () => {
  const state = stateWith(['wu_taishici']);
  const firstTarget = makeUnit(data.cards.get('wei_caopi')!, 0, 0);
  const chosenTarget = makeUnit(data.cards.get('wei_caopi')!, 0, 1);
  chosenTarget.hp = 2;
  setUnit(state, 'enemy', 'front', 0, firstTarget);
  setUnit(state, 'enemy', 'front', 1, chosenTarget);

  let result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(result.ok, true, result.error ?? '太史慈应能上场');
  result = applyAction(result.state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 1 },
  });
  assert.equal(result.ok, true, result.error ?? '神射应能发动');
  assert.equal(result.state.sides.enemy.rows.front[0]?.hp, 8, '其他目标不应承受第二段效果');
  assert.equal(result.state.sides.enemy.rows.front[0]?.atk, 4, '其他目标攻击力不应被降低');
  assert.equal(result.state.sides.enemy.rows.front[1], null, '被选择目标应被第一段伤害击杀');
});

test('诸葛恪 骄狂：回合结束按层数弃牌，至少弃到一张才发动三次伤害', () => {
  const state = stateWith(['wu_zhugeke', 'neutral_infantry', 'neutral_infantry']);
  state.sides.own.deck = ['neutral_infantry', 'neutral_infantry'];
  const enemy = makeUnit(data.cards.get('wei_caopi')!, 0, 1);
  enemy.hp = 5;
  setUnit(state, 'enemy', 'front', 0, enemy);
  let result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(result.ok, true, result.error ?? '诸葛恪应能上场');
  result = applyAction(result.state, ctx, { type: 'END_TURN' });
  assert.equal(result.ok, true, result.error ?? '应能结束回合');
  const unit = result.state.sides.own.rows.front[0]!;
  assert.equal(unit.statuses.jiao_kuang?.stacks, 1);
  assert.ok(result.state.sides.own.discard.length >= 1, '骄狂应随机弃置一张手牌');
  assert.ok((result.state.sides.enemy.rows.front[0]?.hp ?? 5) < 5, '成功弃牌后应造成三次1点伤害');
});

test('鲁肃 榻上策/资粮：发现吴蜀战法并获得三层资粮，可强化其他兵种', () => {
  const state = stateWith(['wu_lusu']);
  state.sides.own.deck = ['tactic_muniuliuma', 'tactic_huogong', 'neutral_infantry'];
  let result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(result.ok, true, result.error ?? '鲁肃应能上场');
  assert.ok(result.state.pendingDiscover, '榻上策应进入发现流程');
  const chosen = result.state.pendingDiscover!.candidates[0]!;
  result = applyAction(result.state, ctx, { type: 'CHOOSE_DISCOVER', cardId: chosen });
  assert.equal(result.ok, true, result.error ?? '应能完成发现');
  const lusu = result.state.sides.own.rows.front[0]!;
  assert.equal(lusu.statuses.zi_liang?.stacks, 3, '上场后应有3层资粮');
  setUnit(result.state, 'own', 'front', 1, makeUnit(data.cards.get('neutral_infantry')!, 0, 1));
  result = applyAction(result.state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 0,
    target: { side: 'own', row: 'front', col: 1 },
  });
  assert.equal(result.ok, true, result.error ?? '仗义疏财应能发动');
  assert.equal(result.state.sides.own.rows.front[1]?.atk, 2);
  assert.equal(result.state.sides.own.rows.front[1]?.maxHp, 3);
  assert.equal(result.state.sides.own.rows.front[0]?.statuses.zi_liang?.stacks, 2);
});

test('孙尚香 联姻：抽牌后按手牌数量治疗指定男性角色', () => {
  const state = stateWith(['wu_sunshangxiang']);
  state.sides.own.deck = ['neutral_infantry'];
  const target = makeUnit(data.cards.get('wei_caopi')!, 0, 1);
  target.hp = 1;
  setUnit(state, 'enemy', 'front', 0, target);

  const result = applyAction(state, ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.equal(result.ok, true, result.error ?? '');
  assert.equal(result.state.sides.own.hand.length, 1, '战吼应先抽一张牌');
  assert.equal(result.state.sides.enemy.rows.front[0]?.hp, 2, '手牌数为 1 时应恢复 1 点');
});

test('孙翊 骁悍果烈：战吼和亡语按当前攻击力伤害敌方主帅', () => {
  const state = stateWith(['wu_sunyi']);
  const result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(result.ok, true, result.error ?? '');
  assert.equal(result.state.sides.enemy.lord.hp, 26);

  const unit = getUnit(result.state, 'own', 'front', 0)!;
  const events: GameEvent[] = [];
  killUnit(result.state, data.cards, { side: 'own', row: 'front', col: 0, unit }, events);
  assert.equal(result.state.sides.enemy.lord.hp, 22);
});

test('徐盛 疑城：架盾，敌方回合首次被攻击时按手牌兵力获得攻击', () => {
  const state = stateWith(['wu_xusheng']);
  const result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(result.ok, true, result.error ?? '');
  result.state.sides.own.hand = [
    { card: data.cards.get('wei_caopi')!, mods: [] },
    { card: data.cards.get('neutral_infantry')!, mods: [] },
  ];
  setUnit(result.state, 'enemy', 'front', 0, makeUnit(data.cards.get('neutral_infantry')!, 0, 2));
  const events: GameEvent[] = [];
  resolveAttack(result.state, data.cards, 'enemy', { row: 'front', col: 0 },
    { kind: 'unit', row: 'front', col: 0 }, events, createRng(result.state.rngState));
  assert.equal(result.state.sides.own.rows.front[0]?.atk, 3, '基础1攻 + 手牌中的武将/兵种数量2');
  assert.ok(result.state.sides.own.rows.front[0]?.kw.includes('jia_dun'));
});

test('蒋钦 水军都督：强化水攻伤害', () => {
  const state = stateWith(['wu_jiangqin', 'qun_caimao']);
  setUnit(state, 'enemy', 'front', 0, makeUnit(data.cards.get('neutral_infantry')!, 0, 2));
  let result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(result.ok, true, result.error ?? '');
  assert.equal(result.state.sides.own.rows.front[0]?.statuses.shui_gong_bonus?.stacks, 3);
  assert.equal(result.events.filter((e) => e.type === 'STATUS_APPLIED').length, 0, '光环状态不应重复刷日志');
  result = applyAction(result.state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1,
    target: { side: 'enemy', row: 'front', col: 0 } });
  assert.equal(result.ok, true, result.error ?? '');
  assert.equal(result.events.find((e) => e.type === 'DAMAGE')?.amount, 4, '水攻基础 1 点时应获得 +3');
  assert.equal(result.state.sides.enemy.rows.front[0], null, '1 点水攻 +3 应击杀 2 血目标');
});

test('李异 协同追击：其他来源造成水攻后额外追击一次，额外伤害不递归', () => {
  const state = stateWith(['wu_quancong']);
  setUnit(state, 'own', 'front', 1, makeUnit(data.cards.get('wu_liyi')!, 0, 20));
  setUnit(state, 'enemy', 'front', 0, makeUnit(data.cards.get('wei_caopi')!, 0, 5));
  const result = applyAction(state, ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 2,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.equal(result.ok, true, result.error ?? '');
  const damage = result.events.filter((e): e is Extract<GameEvent, { type: 'DAMAGE' }> => e.type === 'DAMAGE');
  assert.equal(damage.length, 2, '决水本体与李异追击各结算一次');
  assert.equal(getUnit(result.state, 'enemy', 'front', 0)?.hp, 4, '目标应受到 3+1 点水攻伤害');
});

test('董袭 当锋护驾：先攻伤害主公时从手牌免费上场承伤且每局一次', () => {
  const state = stateWith(['wu_dongxi']);
  const attacker = makeUnit(data.cards.get('wu_chenwu')!, 0, 0);
  setUnit(state, 'enemy', 'front', 0, attacker);
  const events: GameEvent[] = [];
  dealDamage(state, data.cards, lordRef('own'), 2, events, 'test', 0,
    { side: 'enemy', row: 'front', col: 0 }, attacker);
  assert.equal(state.sides.own.lord.hp, 30);
  assert.equal(state.sides.own.rows.front[0]?.cardId, 'wu_dongxi');
  assert.equal(state.sides.own.rows.front[0]?.hp, 3);
  dealDamage(state, data.cards, lordRef('own'), 2, events, 'test', 0,
    { side: 'enemy', row: 'front', col: 0 }, attacker);
  assert.equal(state.sides.own.lord.hp, 28, '同一局第二次不再触发护驾');
});

test('陈武 芦荡死战：友军阵亡加攻，自身阵亡冲击敌方全体', () => {
  const state = stateWith(['wu_chenwu']);
  const result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  const ally = makeUnit(data.cards.get('neutral_infantry')!, 0, 1);
  setUnit(result.state, 'own', 'front', 1, ally);
  const allyEvents: GameEvent[] = [];
  killUnit(result.state, data.cards, { side: 'own', row: 'front', col: 1, unit: ally }, allyEvents);
  assert.equal(getUnit(result.state, 'own', 'front', 0)?.atk, 3);
  const enemy = makeUnit(data.cards.get('neutral_infantry')!, 0, 2);
  setUnit(result.state, 'enemy', 'front', 0, enemy);
  const unit = getUnit(result.state, 'own', 'front', 0)!;
  const events: GameEvent[] = [];
  killUnit(result.state, data.cards, { side: 'own', row: 'front', col: 0, unit }, events);
  assert.equal(result.state.sides.enemy.lord.hp, 29);
  assert.equal(result.state.sides.enemy.rows.front[0]?.hp, 1);
});

test('张昭 辅政：使用主公技后抽一张牌', () => {
  const state = stateWith(['wu_zhangzhao']);
  state.sides.own.deck = ['neutral_infantry'];
  const played = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(played.ok, true, played.error ?? '');
  const before = played.state.sides.own.hand.length;
  const result = applyAction(played.state, ctx, { type: 'USE_LORD_SKILL' });
  assert.equal(result.ok, true, result.error ?? '');
  assert.ok(result.events.some((e) => e.type === 'SKILL_TRIGGERED' && e.skillId === 'fu_zheng'));
  assert.equal(result.state.sides.own.hand.length, before + 1);
});

test('张纮与张昭：先完成张纮置顶，再结算张昭抽牌', () => {
  const state = stateWith(['wu_zhanghong', 'wu_zhangzhao', 'neutral_infantry']);
  state.sides.own.deck = ['tactic_huogong', 'tactic_chenhuodajie', 'tactic_gongxinji', 'neutral_infantry'];
  let result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(result.ok, true, result.error ?? '');
  result = applyAction(result.state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1 });
  assert.equal(result.ok, true, result.error ?? '');
  const handBeforeSkill = result.state.sides.own.hand.length;
  result = applyAction(result.state, ctx, { type: 'USE_LORD_SKILL' });
  assert.equal(result.ok, true, result.error ?? '');
  assert.ok(result.state.pendingDiscover, '张纮应先暂停等待选择');
  assert.equal(result.state.sides.own.hand.length, handBeforeSkill, '张昭不能在张纮选择前提前抽牌');
  const chosen = result.state.pendingDiscover!.candidates[0]!;
  result = applyAction(result.state, ctx, { type: 'CHOOSE_DISCOVER', cardId: chosen });
  assert.equal(result.ok, true, result.error ?? '');
  assert.equal(result.state.pendingDiscover, undefined);
  assert.equal(result.state.sides.own.hand.length, handBeforeSkill + 1, '张昭应在张纮完成后抽一张牌');
  assert.ok(result.state.sides.own.hand.some((h) => h.card.id === chosen), '张昭应抽到张纮刚置顶的牌');
});

test('全琮 决水：造成 3 点水攻伤害', () => {
  const state = stateWith(['wu_quancong']);
  const target = makeUnit(data.cards.get('neutral_infantry')!, 0, 2);
  setUnit(state, 'enemy', 'front', 0, target);
  const result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 0 } });
  assert.equal(result.ok, true, result.error ?? '');
  assert.equal(result.state.sides.enemy.rows.front[0], null);
});

test('全琮 决水：选择敌方主公时不误伤敌方步兵', () => {
  const state = stateWith(['wu_quancong']);
  const target = makeUnit(data.cards.get('neutral_infantry')!, 0, 2);
  target.hp = 2;
  setUnit(state, 'enemy', 'front', 0, target);
  const result = applyAction(state, ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy' },
  });
  assert.equal(result.ok, true, result.error ?? '');
  assert.equal(result.state.sides.enemy.lord.hp, 27, '主公应受到 3 点水攻伤害');
  assert.equal(result.state.sides.enemy.rows.front[0]?.hp, 2, '步兵不应受到伤害（1/2 满血仍在）');
});

test('潘璋 擒将：只能选择受伤敌方武将并造成火攻伤害', () => {
  const state = stateWith(['wu_panzhang']);
  const target = makeUnit(data.cards.get('wei_caopi')!, 0, 2);
  target.hp = 1;
  setUnit(state, 'enemy', 'front', 0, target);
  const result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 0 } });
  assert.equal(result.ok, true, result.error ?? '');
  assert.equal(result.state.sides.enemy.rows.front[0], null);
});

test('张纮 广陵对：主公技后发现战法并置于牌库顶', () => {
  const state = stateWith(['wu_zhanghong', 'neutral_infantry']);
  state.sides.own.deck = ['tactic_huogong', 'tactic_chenhuodajie', 'tactic_gongxinji', 'neutral_infantry'];
  const played = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(played.ok, true, played.error ?? '');
  const skilled = applyAction(played.state, ctx, { type: 'USE_LORD_SKILL', handIndex: 0 });
  assert.equal(skilled.ok, true, skilled.error ?? '');
  assert.ok(skilled.state.pendingDiscover);
  assert.equal(skilled.state.pendingDiscover!.candidates.length, 3);
  const chosen = skilled.state.pendingDiscover!.candidates[0]!;
  const discovered = applyAction(skilled.state, ctx, { type: 'CHOOSE_DISCOVER', cardId: chosen });
  assert.equal(discovered.ok, true, discovered.error ?? '');
  assert.equal(discovered.state.sides.own.deck.at(-1), chosen);
  assert.equal(discovered.state.sides.own.hand.some((h) => h.card.id === chosen), false);
  const drawEvents: GameEvent[] = [];
  drawCard(discovered.state, data.cards, 'own', drawEvents);
  assert.equal(drawEvents.find((e) => e.type === 'CARD_DRAWN')?.card.id, chosen, '下次抽牌应抽到置顶战法');
});

test('陆绩 怀橘：主帅未满血时恢复 2 点生命', () => {
  const state = stateWith(['wu_luji']);
  state.sides.own.lord.hp = 28;
  const result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(result.ok, true, result.error ?? '');
  assert.equal(result.state.sides.own.lord.hp, 30);
  assert.equal(result.state.sides.own.hand.length, 0);
});

test('陆绩 怀橘：主帅满血时改为抽 1 张牌', () => {
  const state = stateWith(['wu_luji']);
  state.sides.own.deck = ['neutral_infantry'];
  const result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(result.ok, true, result.error ?? '');
  assert.equal(result.state.sides.own.lord.hp, 30);
  assert.equal(result.state.sides.own.hand.length, 1);
});

test('诸葛瑾 通好：限制敌方武将并恢复双方主公 3 点生命', () => {
  const state = stateWith(['wu_zhugejin']);
  state.sides.own.lord.hp = 27;
  state.sides.enemy.lord.hp = 27;
  setUnit(state, 'enemy', 'front', 0, makeUnit(data.cards.get('wei_caopi')!, 0, 2));
  const result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 0 } });
  assert.equal(result.ok, true, result.error ?? '');
  assert.equal(result.state.sides.own.lord.hp, 30);
  assert.equal(result.state.sides.enemy.lord.hp, 30);
  assert.equal(result.state.sides.enemy.rows.front[0]?.statuses.jin_gong?.turns, 1);
});
