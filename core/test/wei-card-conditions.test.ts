import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { applyAction } from '../src/engine.ts';
import { resolveAttack } from '../src/effects.ts';
import { createMatch, getUnit, makeUnit, setUnit } from '../src/state.ts';
import { createRng } from '../src/rng.ts';
import { loadData } from '../src/loader.ts';
import type { CardDef, GameEvent, LordDef } from '../src/types.ts';

const cards = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8')) as CardDef[];
const heroes = JSON.parse(readFileSync(new URL('../data/heroes.json', import.meta.url), 'utf8')) as LordDef[];
const data = loadData({ cards, heroes }, { own: 'wu_sunquan', enemy: 'wei_caocao' });
const ctx = { cards: data.cards, lords: data.lords };

function stateWith(hand: string[] = [], deck: string[] = []) {
  const state = createMatch({
    seed: 17,
    cards: data.cards,
    lords: data.lords,
    decks: { own: [], enemy: [] },
    firstSide: 'own',
    secondCompensation: 'none',
  });
  state.sides.own.command = { cur: 10, max: 10 };
  state.sides.own.hand = hand.map((id) => ({ card: data.cards.get(id)!, mods: [] }));
  state.sides.own.deck = [...deck];
  return state;
}

test('邓艾·屯田：本回合没有行动时，回合结束抽一张牌', () => {
  const state = stateWith(['wei_dengai'], ['neutral_infantry']);
  let result = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(result.ok, true, result.error ?? '邓艾应能上场');
  result = applyAction(result.state, ctx, { type: 'END_TURN' });
  assert.equal(result.ok, true, result.error ?? '应能结束回合');
  assert.equal(result.state.sides.own.hand.length, 1, '没有行动时应抽到牌');
  assert.equal(result.state.sides.own.hand[0]?.card.id, 'neutral_infantry');
});

test('邓艾·屯田：本回合攻击过时不抽牌', () => {
  const state = stateWith([], ['neutral_infantry']);
  setUnit(state, 'own', 'front', 0, makeUnit(data.cards.get('wei_dengai')!, 0, 0));
  setUnit(state, 'enemy', 'front', 0, makeUnit(data.cards.get('neutral_infantry')!, 0, 1));
  let result = applyAction(state, ctx, {
    type: 'ATTACK',
    from: { row: 'front', col: 0 },
    to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.equal(result.ok, true, result.error ?? '邓艾应能攻击');
  result = applyAction(result.state, ctx, { type: 'END_TURN' });
  assert.equal(result.ok, true, result.error ?? '应能结束回合');
  assert.equal(result.state.sides.own.hand.length, 0, '本回合行动过时不应抽牌');
  assert.equal(result.state.sides.own.deck.length, 1, '牌库不应被屯田抽走');
});

test('夏侯惇·拔箭啖睛：非满血受到伤害后攻击力提高', () => {
  const state = stateWith();
  const xiahoudun = makeUnit(data.cards.get('wei_xiahoudun')!, 0, 0);
  xiahoudun.hp = xiahoudun.maxHp - 1;
  setUnit(state, 'own', 'front', 0, xiahoudun);
  const attacker = makeUnit(data.cards.get('neutral_infantry')!, 0, 1);
  attacker.atk = attacker.baseAtk = 1;
  setUnit(state, 'enemy', 'front', 0, attacker);
  const events: GameEvent[] = [];
  const ok = resolveAttack(
    state, data.cards, 'enemy', { row: 'front', col: 0 },
    { kind: 'unit', row: 'front', col: 0 }, events, createRng(17),
  );
  assert.equal(ok, true, '敌方攻击应成功');
  assert.equal(getUnit(state, 'own', 'front', 0)?.atk, 5, '非满血受击后应获得+1攻击');
});

test('蒋济·诈敌：限制指定武将和所有兵种，其他角色不受影响', () => {
  const state = stateWith(['wei_jiangji']);
  setUnit(state, 'enemy', 'front', 0, makeUnit(data.cards.get('wei_caopi')!, 0, 0));
  setUnit(state, 'enemy', 'front', 1, makeUnit(data.cards.get('neutral_infantry')!, 0, 1));
  setUnit(state, 'enemy', 'front', 2, makeUnit(data.cards.get('wei_huweidun')!, 0, 2));
  setUnit(state, 'enemy', 'front', 3, makeUnit(data.cards.get('wu_zhangzhao')!, 0, 3));
  const result = applyAction(state, ctx, {
    type: 'PLAY_CARD',
    cardIndex: 0,
    row: 'front',
    col: 0,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.equal(result.ok, true, result.error ?? '蒋济应能选择敌方武将');
  for (const col of [0, 1, 2]) {
    assert.ok(getUnit(result.state, 'enemy', 'front', col)?.statuses.jin_gong,
      `第${col}格目标应获得无法攻击状态`);
  }
  assert.equal(getUnit(result.state, 'enemy', 'front', 3)?.statuses.jin_gong, undefined,
    '敌方谋臣不应被所有兵种效果选中');
});
