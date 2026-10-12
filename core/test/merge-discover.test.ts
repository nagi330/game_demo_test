import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { applyAction } from '../src/engine.ts';
import { runEffects } from '../src/effects.ts';
import { loadData } from '../src/loader.ts';
import { effectiveCost, killUnit } from '../src/mutate.ts';
import { createRng } from '../src/rng.ts';
import { createMatch, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import type { CardDef, CardEffect, GameEvent, LordDef } from '../src/types.ts';

const cards = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8')) as CardDef[];
const heroes = JSON.parse(readFileSync(new URL('../data/heroes.json', import.meta.url), 'utf8')) as LordDef[];
const data = loadData({ cards, heroes }, { own: 'wei_caocao', enemy: 'wu_sunquan' });

function emptyMatch() {
  return createMatch({ seed: 17, cards: data.cards, lords: data.lords,
    decks: { own: [], enemy: [] }, firstSide: 'own', secondCompensation: 'none' });
}

for (const poolStyle of ['pool', 'discover_from'] as const) {
  test(`合并回归：${poolStyle} 公共池多选同时保留魏国发现修正，不消耗牌库同名牌`, () => {
    const ids = ['wei_caoren', 'wei_caohong', 'wei_caozhang'];
    const pool = new Map(ids.map((id) => [id, data.cards.get(id)!]));
    const ctx = { cards: pool, lords: data.lords };
    const state = emptyMatch();
    state.sides.own.deck = ['wei_caoren'];
    const effect: CardEffect = {
      action: 'discover', count: 3, picks: 2, rest: 'deck', value: -1,
      ...(poolStyle === 'pool' ? { pool: { type: 'general', factions: ['wei'] } }
        : { discover_from: 'pool' as const }),
      discover_modifiers: { general: { attack: 1, health: 1 } },
      discover_tag_modifiers: { cao_clan: { cost: -1 } },
      ban_choice: true,
    };
    runEffects(state, pool, [effect], { side: 'own' }, createRng(17), []);
    const first = applyAction(state, ctx, { type: 'CHOOSE_DISCOVER', cardId: ids[0]! });
    assert.ok(first.ok, first.error ?? '第一次发现应成功');
    assert.equal(first.state.pendingDiscover?.picks, 1);
    assert.deepEqual(first.state.sides.own.deck, ['wei_caoren']);
    assert.equal(applyAction(first.state, ctx, { type: 'END_TURN' }).ok, false);

    const second = applyAction(first.state, ctx, { type: 'CHOOSE_DISCOVER', cardId: ids[1]! });
    assert.ok(second.ok, second.error ?? '第二次发现应成功');
    assert.equal(second.state.pendingDiscover, undefined);
    assert.deepEqual(second.state.sides.own.deck, ['wei_caoren', 'wei_caozhang']);
    for (const hand of second.state.sides.own.hand) {
      assert.equal(effectiveCost(hand), hand.card.cost - 2);
      assert.ok(hand.mods.some((mod) => mod.kind === 'attack' && mod.value === 1));
      assert.ok(hand.mods.some((mod) => mod.kind === 'health' && mod.value === 1));
      assert.ok(hand.mods.some((mod) => mod.kind === 'ban' && mod.turns === 1));
    }
    assert.equal(second.state.sides.own.hand.length, 2);
  });
}

test('合并回归：对手回合郭嘉亡语发现仍能选牌并解除结算阻塞', () => {
  const ctx = { cards: data.cards, lords: data.lords };
  const state = emptyMatch();
  state.active = 'enemy';
  state.sides.own.deck = ['tactic_huogong'];
  const guojia = makeUnit(data.cards.get('wei_guojia')!, 0, nextUidSeq(state));
  setUnit(state, 'own', 'front', 0, guojia);
  const events: GameEvent[] = [];
  killUnit(state, data.cards, { side: 'own', row: 'front', col: 0, unit: guojia }, events);
  assert.equal(state.pendingDiscover?.side, 'own');
  const chosen = applyAction(state, ctx, { type: 'CHOOSE_DISCOVER', cardId: 'tactic_huogong' });
  assert.ok(chosen.ok, chosen.error ?? '对手回合应能完成亡语发现');
  assert.equal(chosen.state.pendingDiscover, undefined);
  assert.equal(chosen.state.active, 'enemy');
  assert.equal(chosen.state.sides.own.hand[0]?.card.id, 'tactic_huogong');
  assert.deepEqual(chosen.state.sides.own.deck, []);
  assert.ok(applyAction(chosen.state, ctx, { type: 'END_TURN' }).ok);
});
