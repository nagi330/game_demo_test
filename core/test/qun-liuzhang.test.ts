/**
 * 刘璋〈负乘致寇〉—— 4 费 1/6 群雄谋臣（elite）。
 *
 * 设计者定稿（2026-10-21）：
 *   战吼及己方回合开始时：你抽 1 张牌，并为己方主公恢复 2 点生命。
 *   亡语：敌方抽 1 张牌。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
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
  s.state.sides.own.deck = ['qun_huatuo', 'qun_tianfeng', 'qun_yuanshu', 'qun_huaxiong'];
  return s;
}

function playLiuzhang(s: ReturnType<typeof setup>) {
  s.state.sides.own.command.cur = 4;
  s.state.sides.own.hand = [{ card: real('qun_liuzhang'), mods: [] }];
  return applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
}

function endTurn(s: ReturnType<typeof setup>, state: ReturnType<typeof setup>['state']) {
  return applyAction(state, s.ctx, { type: 'END_TURN' });
}

test('刘璋 数据形态：4 费 1/6、负乘致寇（战吼/回合开始/亡语）', () => {
  const c = real('qun_liuzhang');
  assert.equal(c.cost, 4);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 6);
  const onPlay = (c.skills ?? []).find((k) => k.id === 'fu_cheng_zhi_kou');
  assert.ok(onPlay);
  assert.equal(onPlay.trigger, 'on_play');
  assert.equal(onPlay.effects?.[0]?.action, 'draw');
  assert.equal(onPlay.effects?.[1]?.action, 'heal');
  assert.equal(onPlay.effects?.[1]?.target?.lord, true);
  const turn = (c.skills ?? []).find((k) => k.id === 'fu_cheng_zhi_kou_turn');
  assert.ok(turn);
  assert.equal(turn.trigger, 'turn_start');
  const death = (c.skills ?? []).find((k) => k.id === 'wang_yu_zi_di');
  assert.ok(death);
  assert.equal(death.trigger, 'on_death');
  assert.equal(death.effects?.[0]?.target?.side, 'enemy');
});

test('刘璋〈负乘致寇〉：战吼抽 1 + 主公回 2', () => {
  const s = setup();
  s.state.sides.own.lord.hp = 20;   // 主公先受伤，治疗才有意义（满血会被 maxHp 夹掉）
  const r = playLiuzhang(s);
  assert.equal(r.ok, true);
  assert.equal(r.state.sides.own.hand.length, 1);
  assert.equal(r.state.sides.own.lord.hp, 22);
});

test('刘璋〈负乘致寇·回合〉：己方回合开始抽 1 + 主公回 2', () => {
  const s = setup();
  s.state.sides.own.lord.hp = 20;
  const r1 = playLiuzhang(s);
  const st = r1.state;
  const lordBefore = st.sides.own.lord.hp;
  const r2 = endTurn(s, st);          // 己方结束
  const r3 = endTurn(s, r2.state);    // 敌方结束 → 己方回合开始
  assert.equal(r2.ok, true);
  assert.equal(r3.ok, true);
  assert.equal(r3.state.sides.own.lord.hp, lordBefore + 2);
  assert.equal(r3.state.sides.own.hand.length, 3); // 战吼 1 + 回合开始 1 + 正常回合抽 1
});

test('刘璋 亡语：敌方抽 1（数据形态）', () => {
  const c = real('qun_liuzhang');
  const death = (c.skills ?? []).find((k) => k.id === 'wang_yu_zi_di');
  assert.ok(death);
  assert.equal(death.trigger, 'on_death');
  assert.equal(death.effects?.[0]?.action, 'draw');
  assert.equal(death.effects?.[0]?.target?.side, 'enemy');
});

test('刘璋 4 费 1/6（身板 7，基准 9，−2）', () => {
  const c = real('qun_liuzhang');
  assert.equal(c.cost * 2 + 1 - ((c.attack ?? 0) + (c.health ?? 0)), 2);
});
