import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyAction } from '../src/engine.ts';
import { getUnit, makeUnit, setUnit } from '../src/state.ts';
import { TEST_CARDS, scenario } from './fixtures.ts';
import type { CardDef } from '../src/types.ts';

function addCard(card: CardDef): CardDef {
  const existing = TEST_CARDS.find((x) => x.id === card.id);
  if (existing) return existing;
  TEST_CARDS.push(card);
  return card;
}

test('鲁肃「榻上策」：从全局卡池发现，不要求候选牌在牌库中', () => {
  addCard({
    id: 'test_lusu_discover', name: '鲁肃', faction: 'wu', type: 'strategist',
    cost: 4, attack: 1, health: 4, keywords: [], memo: '全局卡池发现测试',
    skills: [{
      id: 'ta_shang_ce', name: '榻上策', kind: 'trigger', trigger: 'on_play', effects: [{
        action: 'discover', discover_from: 'pool', count: 3,
        target: { side: 'self', filter: { type: 'tactic', factions: ['wu', 'shu'] }, count: 3 },
      }],
    }],
  });
  const wuTactic = addCard({
    id: 'test_wu_pool_tactic', name: '吴国战法', faction: 'wu', type: 'tactic',
    cost: 2, memo: '不在牌库中的发现候选', effects: [{ action: 'draw', value: 1 }],
  });
  const { state, ctx } = scenario({ ownHand: ['test_lusu_discover'] });
  assert.equal(state.sides.own.deck.includes(wuTactic.id), false);
  const played = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(played.ok, true, played.error ?? '');
  assert.ok(played.state.pendingDiscover?.candidates.includes(wuTactic.id));
  const chosen = applyAction(played.state, ctx, { type: 'CHOOSE_DISCOVER', cardId: wuTactic.id });
  assert.equal(chosen.ok, true, chosen.error ?? '');
  assert.ok(chosen.state.sides.own.hand.some((x) => x.card.id === wuTactic.id));
  assert.equal(chosen.state.sides.own.deck.includes(wuTactic.id), false);
});

test('陆逊「火烧连营」：新版技能只有一个起火点目标模式', () => {
  const card = addCard({
    id: 'test_luxun_shape', name: '陆逊', faction: 'wu', type: 'general',
    cost: 9, attack: 5, health: 8, keywords: [], memo: '新版火烧连营结构',
    skills: [{
      id: 'huo_shao_lian_ying', name: '火烧连营', kind: 'active', cost: 0, frequency: 'once_per_turn',
      target: { side: 'enemy', filter: { type: 'character', include_lord: false }, count: 1, mode: 'choose' },
      effects: [{ action: 'chain_damage', value: 2, damage_type: 'fire', target: { pick: 1 } }],
    }],
  });
  const skill = card.skills?.find((x) => x.name === '火烧连营');
  assert.ok(skill, '陆逊应有火烧连营');
  assert.equal(skill!.modes, undefined, '新版不再使用引火/焚烧抉择');
  assert.equal(skill!.effects?.[0]?.action, 'chain_damage');
  assert.equal(skill!.effects?.[0]?.value, 2);
  assert.equal(skill!.target?.count, 1);
});

test('陆逊新版「火烧连营」：从起火点沿连续相邻站位传播，每个目标只受一次伤害', () => {
  const luxun = addCard({
    id: 'test_luxun_chain', name: '陆逊', faction: 'wu', type: 'general',
    cost: 9, attack: 5, health: 8, keywords: [], memo: '相邻传播火攻测试',
    skills: [{
      id: 'huo_shao_lian_ying', name: '火烧连营', kind: 'active', cost: 0, frequency: 'once_per_turn',
      target: { side: 'enemy', filter: { type: 'character', include_lord: false }, count: 1, mode: 'choose' },
      effects: [{ action: 'chain_damage', value: 2, damage_type: 'fire', target: { pick: 1 } }],
    }],
  });
  const { state, ctx } = scenario({ ownHand: [luxun.id] });
  const champion = TEST_CARDS.find((x) => x.id === 'test_champion')!;
  setUnit(state, 'enemy', 'front', 0, makeUnit(champion, 1, 1));
  setUnit(state, 'enemy', 'front', 1, makeUnit(champion, 1, 2));
  setUnit(state, 'enemy', 'front', 2, makeUnit(champion, 1, 3));
  const played = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(played.ok, true, played.error ?? '');
  const result = applyAction(played.state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 1 },
  });
  assert.equal(result.ok, true, result.error ?? '');
  assert.equal(getUnit(result.state, 'enemy', 'front', 0)?.hp, 3);
  assert.equal(getUnit(result.state, 'enemy', 'front', 1)?.hp, 5, '起火点不应承受传播伤害');
  assert.equal(getUnit(result.state, 'enemy', 'front', 2)?.hp, 3);
});

test('周瑜「反间计」：战技拼点获胜后按目标攻击力伤害敌方主公', () => {
  const zhouyu = addCard({
    id: 'test_zhouyu_active', name: '周瑜', faction: 'wu', type: 'strategist',
    cost: 7, attack: 1, health: 5, keywords: [], memo: '反间计战技测试',
    skills: [{
      id: 'fan_jian_ji', name: '反间计', kind: 'active', cost: 0, frequency: 'once_per_turn',
      target: { side: 'enemy', filter: { type: 'general' }, count: 1, mode: 'choose' },
      effects: [
        { action: 'clash', clashMode: 'cost', tie_is_neutral: true },
        { action: 'destroy', condition: { event: 'clash_won' } },
        { action: 'damage', value_from_clash_target: 'attack', target: { side: 'enemy', lord: true }, condition: { event: 'clash_won' } },
        { action: 'apply_status', status: 'zhen_she', duration: 'until_enemy_turn_end', condition: { event: 'clash_lost' } },
      ],
    }],
  });
  const { state, ctx } = scenario({ ownHand: [zhouyu.id] });
  setUnit(state, 'enemy', 'front', 0, makeUnit(TEST_CARDS.find((x) => x.id === 'test_champion')!, 1, 1));
  const played = applyAction(state, ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(played.ok, true, played.error ?? '');
  const result = applyAction(played.state, ctx, {
    type: 'USE_SKILL', row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.equal(result.ok, true, result.error ?? '');
  assert.equal(result.state.sides.enemy.lord.hp, 25, '目标武将5攻击，主公应受到5点伤害');
});
