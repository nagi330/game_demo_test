/**
 * 吕布「一骑当千」—— 9 费 8/8 群雄武将。
 *
 * 设计者定稿（2026-10-18）：
 *   战吼：对指定一名敌方人物造成 5 点伤害，并对其左右相邻的敌方人物各造成 3 点伤害；
 *        若该人物因此阵亡，使相邻目标获得 1 回合「震慑」。
 *
 * ⚠️ 顺序是语义的一部分（设计者 2026-10-18 确认：先吃 3 点相邻伤害，再挂震慑；
 *    且只有**主目标**阵亡才挂）：
 *    `apply_status` 排在 3 点相邻伤害**之后**，条件用 `chosen_dead`（不是共享的 `event: killed`），
 *    因此相邻 3 点造成的击杀不会触发震慑。
 *
 * 本文件只钉**真实卡数据 + 真实 DSL**，不用内联 CardDef 夹具（避免夹具与数据漂移）。
 * 相邻口径复用 `adjacent_to: 'chosen'`（与白马义从「夹射」、霹雳车「霹雳」同一条路径）：
 * 按**列位 ±1**、同排、不压缩空格、越界不绕回。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAction } from '../src/engine.ts';
import { applyStatus, unitRef } from '../src/mutate.ts';
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
  return s;
}

/** 在敌方指定列放一个真实单位（血厚/血薄按用例选） */
function place(s: ReturnType<typeof setup>, id: string, col: number) {
  const u = makeUnit(real(id), 0, nextUidSeq(s.state));
  setUnit(s.state, 'enemy', 'front', col, u);
  return u;
}

/** 打出吕布，指定主目标列；返回 applyAction 结果 */
function playLvbu(s: ReturnType<typeof setup>, targetCol: number) {
  s.state.sides.own.command.cur = 9;
  s.state.sides.own.hand = [{ card: real('qun_lvbu'), mods: [] }];
  return applyAction(s.state, s.ctx, {
    type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0,
    target: { side: 'enemy', row: 'front', col: targetCol },
  });
}

/* =====================================================================
   一、数据形态
   ===================================================================== */

test('吕布：9 费 8/8 群雄武将，无关键词，一骑当千', () => {
  const c = real('qun_lvbu');
  assert.deepEqual([c.cost, c.attack, c.health], [9, 8, 8]);
  assert.equal(c.faction, 'qun');
  assert.equal(c.type, 'general');
  assert.equal(c.rarity, 'elite');
  assert.deepEqual(c.keywords ?? [], [], '不要先攻/连击——技能本身就是“冲阵”');
  assert.ok(c.memo?.includes('震慑'), 'memo 要写出记忆点');
  assert.ok(c.flavor?.includes('飞将'), 'flavor 用 A-02 原文');

  const sk = (c.skills ?? [])[0]!;
  assert.equal(sk.name, '一骑当千');
  assert.equal(sk.trigger, 'on_play', '是战吼，不是主动技');
  assert.equal(sk.effects?.length, 3, '主伤害 + 相邻伤害 + 条件震慑（顺序是语义的一部分）');

  // ① 主目标 5 点，指定，不含主公
  const main = sk.effects![0]!;
  assert.equal(main.action, 'damage');
  assert.equal(main.value, 5);
  assert.deepEqual(main.target, {
    side: 'enemy',
    filter: { type: 'character', include_lord: false },
    count: 1,
    mode: 'choose',
  });

  // ② 左右相邻各 3 点（引擎内建 adjacent_to: chosen）
  const side = sk.effects![1]!;
  assert.equal(side.action, 'damage');
  assert.equal(side.value, 3);
  assert.deepEqual(side.target, {
    side: 'enemy',
    filter: { type: 'character', include_lord: false, adjacent_to: 'chosen' },
    count: 'all',
  });

  // ③ 先吃 3 伤、再挂震慑；条件用 chosen_dead（不是共享的 event: killed）
  const stun = sk.effects![2]!;
  assert.equal(stun.action, 'apply_status');
  assert.equal(stun.status, 'zhen_she');
  assert.equal(stun.duration, 1);
  assert.deepEqual(stun.condition, { chosen_dead: true });
  assert.deepEqual(stun.target, {
    side: 'enemy',
    filter: { type: 'character', include_lord: false, adjacent_to: 'chosen' },
    count: 'all',
  });

  // 卡面文案必须写出 5/3/震慑
  assert.match(sk.text ?? '', /5\s*点/);
  assert.match(sk.text ?? '', /3\s*点/);
  assert.match(sk.text ?? '', /震慑/);
});

/* =====================================================================
   二、结算：主目标 5 / 左右各 3 / 不误伤
   ===================================================================== */

test('一骑当千：主目标 5 点、左右各 3 点；不误伤其他格与主公', () => {
  const s = setup();
  // 8 血曹仁（无 on_damaged 干扰）放在 col 3/4/5/7；主目标 col 4
  for (const col of [3, 4, 5, 7]) place(s, 'wei_caoren', col);
  const r = playLvbu(s, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');

  const hp = (col: number) => getUnit(r.state, 'enemy', 'front', col)!.hp;
  assert.equal(hp(4), 3, '主目标 8 − 5 = 3');
  assert.equal(hp(3), 5, '左邻 8 − 3 = 5');
  assert.equal(hp(5), 5, '右邻 8 − 3 = 5');
  assert.equal(hp(7), 8, '不挨着的单位不受伤');
  assert.equal(r.state.sides.enemy.lord.hp, 30, '不含主公 —— 主公不掉血');

  // 没有击杀 → 不震慑
  assert.equal(getUnit(r.state, 'enemy', 'front', 3)!.statuses.zhen_she, undefined);
  assert.equal(getUnit(r.state, 'enemy', 'front', 5)!.statuses.zhen_she, undefined);
});

test('一骑当千：没有相邻敌人 → 只结算 5 点，不空放/不报错', () => {
  const s = setup();
  place(s, 'wei_caoren', 4);
  const r = playLvbu(s, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');
  assert.equal(getUnit(r.state, 'enemy', 'front', 4)!.hp, 3, '只有主目标吃 5 点');
  assert.equal(r.state.sides.enemy.lord.hp, 30, '主公不受影响');
});

test('一骑当千：边缘列只打一侧，不绕回', () => {
  const s = setup();
  place(s, 'shu_zhoucang', 0);   // 4 血主目标，吃 5 会死
  place(s, 'shu_yanyan', 1);     // 右邻 6 血
  place(s, 'shu_yanyan', 7);     // 远端的对照，不该被打
  const r = playLvbu(s, 0);
  assert.ok(r.ok, r.error ?? '出牌应成功');

  assert.equal(getUnit(r.state, 'enemy', 'front', 0), null, '主目标被 5 点击杀');
  assert.equal(getUnit(r.state, 'enemy', 'front', 1)!.hp, 3, '右邻 6 − 3 = 3');
  assert.equal(getUnit(r.state, 'enemy', 'front', 7)!.hp, 6, '不会从最左绕到最右');
  assert.ok(getUnit(r.state, 'enemy', 'front', 1)!.statuses.zhen_she, '唯一相邻目标应被震慑');
});

/* =====================================================================
   三、击杀 → 震慑
   ===================================================================== */

test('一骑当千：主目标被击杀 → 左右存活目标获得 1 回合震慑', () => {
  const s = setup();
  place(s, 'shu_yanyan', 3);      // 左邻 6 血，吃 3 存活
  place(s, 'shu_zhoucang', 4);    // 主目标 4 血，吃 5 死
  place(s, 'shu_yanyan', 5);      // 右邻 6 血，吃 3 存活
  const r = playLvbu(s, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');

  assert.equal(getUnit(r.state, 'enemy', 'front', 4), null, '主目标应阵亡');
  for (const col of [3, 5]) {
    const u = getUnit(r.state, 'enemy', 'front', col)!;
    assert.equal(u.hp, 3, `相邻 col ${col} 应吃 3 点`);
    assert.ok(u.statuses.zhen_she, `相邻 col ${col} 应被震慑`);
    assert.equal(u.statuses.zhen_she!.stacks, 1);
    assert.equal(u.statuses.zhen_she!.turns, 1, '震慑应剩 1 回合');
  }
});

test('一骑当千：先结算相邻 3 点，再挂震慑；相邻 3 点打死的人不挂状态', () => {
  const s = setup();
  place(s, 'qun_caimao', 3);      // 2 血左邻，吃 3 死
  place(s, 'shu_zhoucang', 4);    // 4 血主目标，吃 5 死
  place(s, 'shu_yanyan', 5);      // 6 血右邻，吃 3 存活
  const r = playLvbu(s, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');

  assert.equal(getUnit(r.state, 'enemy', 'front', 3), null, '左邻被 3 点打死，不应再挂震慑');
  const right = getUnit(r.state, 'enemy', 'front', 5)!;
  assert.equal(right.hp, 3, '右邻 6 − 3 = 3');
  assert.ok(right.statuses.zhen_she, '右邻存活，主目标阵亡 → 震慑');

  // 事件顺序：右邻的 DAMAGE 必须先于它的 STATUS_APPLIED（先吃 3 伤，再挂震慑）
  const dmgIdx = r.events.findIndex((e) =>
    e.type === 'DAMAGE' && e.target.side === 'enemy' && e.target.row === 'front' && e.target.col === 5);
  const stunIdx = r.events.findIndex((e) =>
    e.type === 'STATUS_APPLIED' && e.side === 'enemy' && e.row === 'front' && e.col === 5
    && e.status === 'zhen_she');
  assert.ok(dmgIdx >= 0, '应有右邻的 DAMAGE 事件');
  assert.ok(stunIdx >= 0, '应有右邻的 STATUS_APPLIED 事件');
  assert.ok(dmgIdx < stunIdx, '必须先吃 3 点伤害，再挂震慑');
});

test('一骑当千：没有击杀 → 不震慑', () => {
  const s = setup();
  place(s, 'shu_yanyan', 3);
  place(s, 'shu_yanyan', 4);      // 6 血，吃 5 存活（1 血）
  place(s, 'shu_yanyan', 5);
  const r = playLvbu(s, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');

  assert.equal(getUnit(r.state, 'enemy', 'front', 4)!.hp, 1, '主目标 6 − 5 = 1');
  for (const col of [3, 5]) {
    assert.equal(getUnit(r.state, 'enemy', 'front', col)!.hp, 3);
    assert.equal(getUnit(r.state, 'enemy', 'front', col)!.statuses.zhen_she, undefined,
      '没有击杀 → 不震慑');
  }
});

test('一骑当千：主目标存活、相邻被击杀 → 不震慑（只有主目标阵亡才震慑）', () => {
  const s = setup();
  place(s, 'qun_caimao', 3);      // 2 血左邻，吃 3 死
  place(s, 'shu_yanyan', 4);      // 6 血主目标，吃 5 存活
  place(s, 'shu_yanyan', 5);      // 6 血右邻，吃 3 存活
  const r = playLvbu(s, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');

  assert.equal(getUnit(r.state, 'enemy', 'front', 3), null, '左邻应被 3 点击杀');
  assert.equal(getUnit(r.state, 'enemy', 'front', 4)!.hp, 1, '主目标存活');
  const right = getUnit(r.state, 'enemy', 'front', 5)!;
  assert.equal(right.hp, 3);
  assert.equal(right.statuses.zhen_she, undefined,
    '主目标没死 → 相邻 3 点造成的击杀不触发震慑（设计者 2026-10-18 口径）');
});

test('一骑当千：震慑持续 1 回合，敌方回合结束后失效', () => {
  const s = setup();
  place(s, 'shu_yanyan', 3);
  place(s, 'shu_zhoucang', 4);
  place(s, 'shu_yanyan', 5);
  const r = playLvbu(s, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');
  const stunned = getUnit(r.state, 'enemy', 'front', 5)!;
  assert.equal(stunned.statuses.zhen_she?.turns, 1);

  // 己方结束 → 敌方回合内仍生效；敌方结束 → 失效
  const r2 = applyAction(r.state, s.ctx, { type: 'END_TURN' });
  assert.equal(getUnit(r2.state, 'enemy', 'front', 5)!.statuses.zhen_she?.turns, 1,
    '敌方回合内震慑仍应生效');
  const r3 = applyAction(r2.state, s.ctx, { type: 'END_TURN' });
  assert.equal(getUnit(r3.state, 'enemy', 'front', 5)!.statuses.zhen_she, undefined,
    '敌方回合结束后震慑应失效');
});

/* =====================================================================
   四、护盾/减伤对冲
   ===================================================================== */

test('一骑当千：披坚吸收主目标 5 点 → 不触发击杀，不震慑', () => {
  const s = setup();
  place(s, 'shu_yanyan', 3);
  const main = place(s, 'shu_yanyan', 4);
  place(s, 'shu_yanyan', 5);
  applyStatus(s.state, unitRef('enemy', 'front', 4), 'sheng_dun_status', 1, []);

  assert.ok(main.statuses.sheng_dun_status);
  const r = playLvbu(s, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');

  assert.equal(getUnit(r.state, 'enemy', 'front', 4)!.hp, 6, '披坚吃掉整段 5 点，主目标不掉血');
  assert.equal(getUnit(r.state, 'enemy', 'front', 4)!.statuses.sheng_dun_status, undefined,
    '披坚触发后被消耗');
  for (const col of [3, 5]) {
    assert.equal(getUnit(r.state, 'enemy', 'front', col)!.hp, 3, '相邻仍吃 3 点');
    assert.equal(getUnit(r.state, 'enemy', 'front', col)!.statuses.zhen_she, undefined,
      '没有击杀 → 不震慑');
  }
});

test('一骑当千：藤甲把 5/3 各减 1（物理减伤）', () => {
  const s = setup();
  for (const col of [3, 4, 5]) {
    place(s, 'shu_yanyan', col);
    applyStatus(s.state, unitRef('enemy', 'front', col), 'teng_jia', 1, []);
  }
  const r = playLvbu(s, 4);
  assert.ok(r.ok, r.error ?? '出牌应成功');

  assert.equal(getUnit(r.state, 'enemy', 'front', 4)!.hp, 2, '主目标 6 − (5−1) = 2');
  for (const col of [3, 5]) {
    assert.equal(getUnit(r.state, 'enemy', 'front', col)!.hp, 4, `相邻 6 − (3−1) = 4`);
    assert.equal(getUnit(r.state, 'enemy', 'front', col)!.statuses.zhen_she, undefined);
  }
});
