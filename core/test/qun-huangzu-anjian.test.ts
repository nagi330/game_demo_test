/** 黄祖〈暗箭〉公开预告（ADR-200）/ 蔡瑁〈督水〉。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
import { killUnit, summonUnit } from '../src/mutate.ts';
import { getUnit, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
import { scenario } from './fixtures.ts';
import type { CardDef } from '../src/types.ts';

const cards: CardDef[] = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const real = (id: string): CardDef => {
  const card = cards.find((c) => c.id === id);
  assert.ok(card, id);
  return card;
};

function setup() {
  const s = scenario({});
  for (const c of cards) s.ctx.cards.set(c.id, c);
  s.state.sides.own.deck = ['qun_huatuo', 'qun_yuanshu'];
  s.state.sides.enemy.deck = ['qun_huatuo', 'qun_yuanshu'];
  s.state.sides.own.command.cur = 10;
  s.state.sides.enemy.command.cur = 10;
  return s;
}

/** 让敌方真正打出一张牌（把行动权切到敌方；注意用 setup 的 ctx） */
function enemyPlay(s: ReturnType<typeof setup>, cardId: string, col = 0) {
  s.state.active = 'enemy';
  s.state.sides.enemy.hand = [{ card: real(cardId), mods: [] }];
  return applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col });
}

const hasAnjian = (r: { state: ReturnType<typeof setup>['state'] }) =>
  Boolean(r.state.sides.enemy.lord.statuses?.anjian_status);

test('黄祖 数据形态：3 费 3/4，暗箭（挂标记 / 触发 / 阵亡清除）', () => {
  const c = real('qun_huangzu');
  assert.equal(c.cost, 3);
  assert.equal(c.attack, 3);
  assert.equal(c.health, 4);
  const trigs = (c.skills ?? []).map((s) => s.trigger);
  assert.deepEqual(trigs, ['on_play', 'on_card_played', 'on_death']);
  const listener = (c.skills ?? []).find((s) => s.trigger === 'on_card_played')!;
  assert.equal(listener.played_by, 'enemy', '只认对手出牌');
});

test('暗箭·挂：黄祖登场后，敌方主公头顶出现公开标记', () => {
  const s = setup();
  s.state.sides.own.hand = [{ card: real('qun_huangzu'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.ok(hasAnjian(r), '敌方主公应挂上「暗箭」');
  assert.equal(r.state.sides.enemy.lord.statuses!.anjian_status!.stacks, 1);
});

test('暗箭·发：敌方下一个打出的人物落地后吃 3 点，标记随即消失', () => {
  const s = setup();
  s.state.sides.own.hand = [{ card: real('qun_huangzu'), mods: [] }];
  const r1 = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(hasAnjian(r1));

  s.state = r1.state;
  const r2 = enemyPlay(s, 'qun_zhanglu');   // 1/3
  assert.equal(r2.ok, true);
  assert.equal(getUnit(r2.state, 'enemy', 'front', 0), null, '1/3 吃 3 点应阵亡');
  assert.ok(!hasAnjian(r2), '触发后标记消失');
});

test('暗箭·只一次：敌方再打出第二个人物不再受伤', () => {
  const s = setup();
  s.state.sides.own.hand = [{ card: real('qun_huangzu'), mods: [] }];
  const r1 = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  s.state = r1.state;
  const r2 = enemyPlay(s, 'qun_zhanglu');
  s.state = r2.state;
  const r3 = enemyPlay(s, 'qun_kongrong', 1);
  assert.equal(r3.ok, true);
  assert.equal(getUnit(r3.state, 'enemy', 'front', 1)!.hp, 3, '孔融 1/3 毫发无伤');
});

test('暗箭·不认己方：黄祖先手试过，自己人登场不吃伤害', () => {
  const s = setup();
  s.state.sides.own.hand = [{ card: real('qun_huangzu'), mods: [] }, { card: real('qun_kongrong'), mods: [] }];
  const r1 = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(hasAnjian(r1));
  const r2 = applyAction(r1.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1 });
  assert.equal(r2.ok, true);
  assert.equal(getUnit(r2.state, 'own', 'front', 1)!.hp, 3, '己方人物不吃暗箭');
  assert.ok(hasAnjian(r2), '标记仍在');
});

test('暗箭·召唤不算：敌方召唤的衍生物不消耗暗箭', () => {
  const s = setup();
  s.state.sides.own.hand = [{ card: real('qun_huangzu'), mods: [] }];
  const r1 = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  const evs: never[] = [];
  summonUnit(r1.state, s.ctx.cards, 'enemy', 'front', 2, 'token_huangjin_bing', evs as never);
  assert.equal(getUnit(r1.state, 'enemy', 'front', 2)!.hp, 1, '召唤物不受暗箭');
  assert.ok(hasAnjian(r1), '标记仍在');
});

test('暗箭·灭：黄祖阵亡，标记消失（对手的反制手段）', () => {
  const s = setup();
  s.state.sides.own.hand = [{ card: real('qun_huangzu'), mods: [] }];
  const r1 = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.ok(hasAnjian(r1));
  const me = getUnit(r1.state, 'own', 'front', 0)!;
  killUnit(r1.state, s.ctx.cards, { side: 'own', row: 'front', col: 0, unit: me }, []);
  assert.ok(!hasAnjian(r1), '黄祖一死，暗箭失效');
});

test('蔡瑁〈督水〉：技能已改名，效果仍是战吼点名 1 点水伤', () => {
  const c = real('qun_caimao');
  assert.equal(c.cost, 2);
  assert.deepEqual([c.attack, c.health], [2, 2]);
  const sk = (c.skills ?? [])[0]!;
  assert.equal(sk.name, '督水');
  assert.equal(sk.effects?.[0]?.action, 'damage');
  assert.equal(sk.effects?.[0]?.value, 1);
  assert.equal(sk.effects?.[0]?.damage_type, 'water');

  const s = setup();
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(real('qun_zhanglu'), 0, nextUidSeq(s.state)));
  s.state.sides.own.hand = [{ card: real('qun_caimao'), mods: [] }];
  const r = applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: 0 },
  });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, 2, '1/3 → 1/2');
});
