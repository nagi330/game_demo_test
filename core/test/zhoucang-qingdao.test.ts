/**
 * 周仓「擎刀侍立」：3 费 2/4 ＋ 架盾；战吼给**另一名友方武将**永久 +1/+1 并获得「披坚」（ADR-166）
 *
 * ## 设计口径（设计者 2026-10-15 定稿，见 `docs/gdd/18-character-skill-design.md` §2.5）
 *
 * 这是一张**功能卡（辅助位）**：史料只用来给"特点与贴合度"，机制按当下游戏性做**创造性设计**。
 * 周仓只取一个抓点 —— **「保护关羽」的辅助性** —— 落成「递刀（+1/+1）＋ 侍立（披坚）」，
 * **刻意不绑死关羽这张卡**（否则会退化成"两张卡凑齐才生效"，两卡同时在场的概率又低）。
 *
 * ## ⚠️ 两处实现细节（改错就与文案不符，本文件逐条钉住）
 *
 * ① 目标筛选必须 `type: 'general'` —— 引擎里 `type: 'character'` 的含义是「**场上的单位**」
 *    （含兵种/衍生物/军械），而文案写的是"**武将**"。
 * ② 必须带 `exclude_source: true` —— 否则会 buff 到自己，与「**另一名**」矛盾。
 *
 * ## 已知属性（不是 bug，是设计取舍）
 *
 * 场上**没有第二名友方武将**时（例如 3 费回合周仓是第一个上场的单位），战吼**落空**、不产生任何效果。
 * 这是"顺从牌序"的代价，已由设计者确认保留 —— 测试 §「空放」把它钉成**已知行为**，免得日后被误当 bug 修掉。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { scenario, TEST_CARDS } from './fixtures.ts';
import { applyAction } from '../src/engine.ts';
import { getUnit, hasKeyword, makeUnit, setUnit } from '../src/state.ts';
import { legalTargets } from '../src/rules.ts';
import { dealDamage, unitRef } from '../src/mutate.ts';
import type { CardDef } from '../src/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL: CardDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));

for (const c of ALL) {
  if (!TEST_CARDS.some((x) => x.id === c.id)) {
    TEST_CARDS.push({ ...c, keywords: c.keywords ?? [], skills: c.skills ?? [] });
  }
}
function real(id: string): CardDef {
  const raw = ALL.find((c) => c.id === id);
  assert.ok(raw, `cards.json 里找不到 ${id}`);
  const flat: CardDef = { ...raw, keywords: raw.keywords ?? [], skills: raw.skills ?? [] };
  const i = TEST_CARDS.findIndex((x) => x.id === id);
  if (i >= 0) TEST_CARDS[i] = flat; else TEST_CARDS.push(flat);
  return flat;
}

/** 测试用友方单位（enteredTurn=0 → 不是本回合入场，可直接攻击/被攻击） */
const ally = (id: string, type: CardDef['type'], atk: number, hp: number): CardDef => ({
  id, name: id, faction: 'shu', type, cost: 2, attack: atk, health: hp, keywords: [], memo: '',
} as CardDef);

/** 己方 front.0 放一个单位；手牌里放一张周仓（待打出） */
function board(unit: CardDef) {
  const { state, ctx } = scenario({ ownHand: ['shu_zhoucang'] });
  setUnit(state, 'own', 'front', 0, makeUnit(unit, 0, 11));
  return { state, ctx };
}

/** 打出周仓（col 1），把战吼指向 col 0 的友军 */
function playZhoucang(state: ReturnType<typeof board>['state'], ctx: ReturnType<typeof board>['ctx']) {
  return applyAction(state, ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 1,
    target: { side: 'own', row: 'front', col: 0 },
  });
}

/* ============================================================
   ① 数据形态
   ============================================================ */

test('周仓 数据形态：3 费 2/4；架盾写在 keywords 上（旧版是"假架盾"）；两条效果都筛「武将」「另一名」', () => {
  const c = real('shu_zhoucang');
  assert.equal(c.cost, 3);
  assert.equal(c.attack, 2);
  assert.equal(c.health, 4);
  assert.ok((c.keywords ?? []).includes('jia_dun'),
    '架盾必须写在 keywords 上 —— 旧版只在技能 name 里写「架盾」，实际没有架盾（考证稿 §11.4-2）');

  const sk = (c.skills ?? []).find((s) => s.id === 'qing_dao_shi_li');
  assert.ok(sk, '周仓应有「擎刀侍立」');
  assert.equal(sk!.trigger, 'on_play');
  assert.equal(sk!.effects?.length, 2);

  const [mod, dun] = sk!.effects!;
  assert.equal(mod!.action, 'modify');
  assert.equal(mod!.attack, 1);
  assert.equal(mod!.health, 1);
  assert.equal(mod!.duration, undefined, '不带 duration 才是**永久**');
  assert.equal(dun!.action, 'apply_status');
  assert.equal(dun!.status, 'sheng_dun_status', '披坚 = sheng_dun_status（ADR-103 起不是公开关键词）');

  for (const e of [mod!, dun!]) {
    assert.equal(e.target?.side, 'ally', '只给友方');
    assert.equal(e.target?.filter?.type, 'general',
      '⚠️ 文案说「武将」→ 必须是 type: general（type: character 的含义是"场上的单位"，含兵种/token）');
    assert.equal(e.target?.filter?.exclude_source, true, '⚠️「另一名」→ 必须排除自己');
    assert.equal(e.target?.mode, 'choose');
  }
});

/* ============================================================
   ② 行为：+1/+1 永久 ＋ 披坚
   ============================================================ */

test('行为：战吼给另一名友方武将 +1/+1（永久，含上限）并获得披坚', () => {
  const { state, ctx } = board(ally('test_zhou_ally', 'general', 3, 5));
  const r = playZhoucang(state, ctx);
  assert.ok(r.ok, `周仓应能打出：${r.error}`);

  const a = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(a.atk, 4, '3 → 4');
  assert.equal(a.maxHp, 6, '上限 5 → 6');
  assert.equal(a.hp, 6, '当前血同步 +1');
  assert.ok(a.statuses.sheng_dun_status, '应获得「披坚」');
});

test('披坚真的生效：挡住一次伤害后被消耗', () => {
  const { state, ctx } = board(ally('test_zhou_ally', 'general', 3, 5));
  const r = playZhoucang(state, ctx);
  const hp = getUnit(r.state, 'own', 'front', 0)!.hp;

  dealDamage(r.state, ctx.cards, unitRef('own', 'front', 0), 3, [], '测试火攻', 0, undefined, undefined, 'fire');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, hp, '披坚应免疫这一次伤害');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.statuses.sheng_dun_status, undefined, '免疫后消耗');

  dealDamage(r.state, ctx.cards, unitRef('own', 'front', 0), 3, [], '第二次', 0, undefined, undefined, 'fire');
  assert.equal(getUnit(r.state, 'own', 'front', 0)!.hp, hp - 3, '第二次照常受伤');
});

test('「另一名」：周仓自己不吃自己的战吼（exclude_source）', () => {
  const { state, ctx } = board(ally('test_zhou_ally', 'general', 3, 5));
  const r = playZhoucang(state, ctx);
  const z = getUnit(r.state, 'own', 'front', 1)!;
  assert.equal(z.atk, 2, '周仓自己不加攻');
  assert.equal(z.hp, 4);
  assert.equal(z.statuses.sheng_dun_status, undefined, '周仓自己不拿披坚');
});

test('「友方**武将**」：兵种/谋臣不在目标池里', () => {
  const { state, ctx } = board(ally('test_zhou_troop', 'troop', 2, 6));
  const r = playZhoucang(state, ctx);
  assert.ok(r.ok, `没有合法武将目标时也应能正常打出：${r.error}`);
  const t = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(t.atk, 2, '兵种不吃这个战吼');
  assert.equal(t.maxHp, 6);
  assert.equal(t.statuses.sheng_dun_status, undefined);
});

test('已知属性（非 bug）：场上没有第二名友方武将时，战吼落空但不崩', () => {
  const { state, ctx } = scenario({ ownHand: ['shu_zhoucang'] });
  const r = applyAction(state, ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'own', row: 'front', col: 0 },
  });
  assert.ok(r.ok, `周仓应能空放上场：${r.error}`);
  const z = getUnit(r.state, 'own', 'front', 0)!;
  assert.equal(z.atk, 2, '自己不加（也没有别人可加）');
  assert.equal(z.statuses.sheng_dun_status, undefined);
  assert.ok(hasKeyword(z, 'jia_dun'), '空放也不影响架盾');
});

/* ============================================================
   ③ 架盾：真的能替其他人挡刀
   ============================================================ */

test('架盾生效：敌方单位的合法目标里**只有**周仓', () => {
  const { state, ctx } = board(ally('test_zhou_ally', 'general', 3, 5));
  const r = playZhoucang(state, ctx);

  const raider = ally('test_zhou_raider', 'troop', 3, 9);
  ctx.cards.set(raider.id, raider);
  setUnit(r.state, 'enemy', 'front', 0, makeUnit(raider, 0, 99));

  const { targets } = legalTargets(r.state, 'enemy', 'front', 0);
  assert.equal(targets.length, 1, '有架盾单位时，敌方只能打它');
  assert.equal(targets[0]!.side, 'own');
  assert.equal(targets[0]!.col, 1, '目标就是周仓所在格');
});
