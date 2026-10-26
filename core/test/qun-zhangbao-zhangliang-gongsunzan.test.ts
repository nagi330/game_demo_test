/** 张宝〈地公立坛〉/ 张梁〈人公精勇〉/ 公孙瓒〈白马义从〉（ADR-197）。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
import { getUnit, hasTrait, makeUnit, nextUidSeq, setUnit } from '../src/state.ts';
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
  return s;
}

const tokens = (events: { type: string; unit?: { cardId?: string } }[]) =>
  events.filter((e) => e.type === 'UNIT_SUMMONED' && e.unit?.cardId === 'token_huangjin_bing').length;

test('张宝 数据形态：3 费 1/3 谋臣、地公立坛', () => {
  const c = real('qun_zhangbao');
  assert.equal(c.cost, 3);
  assert.equal(c.attack, 1);
  assert.equal(c.health, 3);
  assert.equal(c.type, 'strategist');
  assert.ok((c.tags ?? []).includes('huang_jin_tongling'));
  const sk = (c.skills ?? []).find((s) => s.id === 'di_gong_li_tan');
  assert.ok(sk);
  assert.equal(sk.effects?.length, 3);
});

test('张宝〈地公立坛〉：无其他统领 → 只召 1 个黄巾兵，不给披坚', () => {
  const s = setup();
  s.state.sides.own.command.cur = 3;
  s.state.sides.own.hand = [{ card: real('qun_zhangbao'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(tokens(r.events), 1);
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.statuses.sheng_dun_status, undefined);
});

test('张宝〈地公立坛〉：有其他黄巾统领 → 再召 1 个 + 所有黄巾披坚', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 2, makeUnit(real('qun_zhangjiao'), 0, nextUidSeq(s.state)));
  s.state.sides.own.command.cur = 3;
  s.state.sides.own.hand = [{ card: real('qun_zhangbao'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(tokens(r.events), 2);
  for (const u of r.state.sides.own.rows.front) {
    if (u && (u.tags ?? []).includes('huang_jin')) {
      assert.equal(u.statuses.sheng_dun_status?.stacks, 1, `${u.name} 应披坚`);
    }
  }
});

test('张梁 数据形态：4 费 3/4 武将、人公精勇', () => {
  const c = real('qun_zhangliang');
  assert.equal(c.cost, 4);
  assert.equal(c.attack, 3);
  assert.equal(c.health, 4);
  assert.equal(c.type, 'general');
  const sk = (c.skills ?? []).find((s) => s.id === 'ren_gong_jing_yong');
  assert.ok(sk);
  assert.equal(sk.effects?.length, 3);
});

test('张梁〈人公精勇〉：召黄巾兵 + 黄巾众先攻；有其他统领全体黄巾 +1 攻', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 2, makeUnit(real('qun_zhangbao'), 0, nextUidSeq(s.state)));
  s.state.sides.own.command.cur = 4;
  s.state.sides.own.hand = [{ card: real('qun_zhangliang'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(tokens(r.events), 1);
  // 黄巾众（黄巾兵）获得先攻
  const bing = r.state.sides.own.rows.front.find((u) => u?.cardId === 'token_huangjin_bing')!;
  assert.ok(hasTrait(bing, 'xian_gong'), '黄巾兵应先攻');
  // 所有黄巾 +1 攻：张梁 3 → 4，张宝 1 → 2
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.atk, 4);
  assert.equal(getUnit(r.state, 'own', 'front', 2)!.atk, 2);
});

test('公孙瓒 数据形态：5 费 4/4 先攻、白马义从', () => {
  const c = real('qun_gongsunzan');
  assert.equal(c.cost, 5);
  assert.equal(c.attack, 4);
  assert.equal(c.health, 4);
  assert.ok((c.keywords ?? []).includes('xian_gong'));
  const sk = (c.skills ?? []).find((s) => s.id === 'bai_ma_yi_cong');
  assert.ok(sk);
  assert.equal(sk.effects?.[0]?.action, 'grant_card_keyword');
  assert.equal(sk.effects?.[0]?.keyword, 'xian_gong');
});

test('公孙瓒〈白马义从〉：手牌里的白马义从未上场就带先攻，出场当回合可攻击', () => {
  const s = setup();
  s.state.sides.own.command.cur = 10;
  s.state.sides.own.hand = [
    { card: real('qun_gongsunzan'), mods: [] },
    { card: real('qun_baimayicong'), mods: [] },
  ];
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(real('qun_huatuo'), 0, nextUidSeq(s.state)));
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.deepEqual(r.state.sides.own.cardKeywords?.qun_baimayicong, ['xian_gong'], '卡牌级授予已记录');

  const r2 = applyAction(r.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1 });
  assert.equal(r2.ok, true, '白马上场');
  const bai = getUnit(r2.state, 'own', 'front', 1)!;
  assert.ok(bai.kw.includes('xian_gong'), '出场即带先攻');
  assert.ok(hasTrait(bai, 'xian_gong'));
  const r3 = applyAction(r2.state, s.ctx, {
    type: 'ATTACK', from: { row: 'front', col: 1 }, to: { kind: 'unit', row: 'front', col: 0 },
  });
  assert.equal(r3.ok, true, '先攻：当回合即可攻击');
});

test('公孙瓒〈白马义从〉：场上有白马义从 → 战吼炸敌方全体人物 1（主公不吃）', () => {
  const s = setup();
  setUnit(s.state, 'own', 'front', 2, makeUnit(real('qun_baimayicong'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(real('qun_huatuo'), 0, nextUidSeq(s.state)));
  setUnit(s.state, 'enemy', 'front', 1, makeUnit(real('qun_yuanshu'), 0, nextUidSeq(s.state)));
  s.state.sides.own.command.cur = 5;
  s.state.sides.own.hand = [{ card: real('qun_gongsunzan'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, real('qun_huatuo').health! - 1);
  assert.equal(getUnit(r.state, 'enemy', 'front', 1)!.hp, real('qun_yuanshu').health! - 1);
  assert.equal(r.state.sides.enemy.lord.hp, 30, '主公不吃');
});

test('公孙瓒〈白马义从〉：场上没有白马义从 → 不炸', () => {
  const s = setup();
  setUnit(s.state, 'enemy', 'front', 0, makeUnit(real('qun_huatuo'), 0, nextUidSeq(s.state)));
  s.state.sides.own.command.cur = 5;
  s.state.sides.own.hand = [{ card: real('qun_gongsunzan'), mods: [] }];
  const r = applyAction(s.state, s.ctx, { type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
  assert.equal(r.ok, true);
  assert.equal(getUnit(r.state, 'enemy', 'front', 0)!.hp, real('qun_huatuo').health!);
});
