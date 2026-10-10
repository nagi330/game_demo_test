#!/usr/bin/env node
/**
 * 探针：**不需要目标的主动技，点一下单位能不能放出来**（ADR-145）
 *
 * ## 为什么需要它
 *
 * 2026-10-10 实测发现：原型里"点一下单位 = 放指向性技能"的那条路，
 * 要求技能必须有可选目标（`plan.choices[0].targets.length`），于是**不需要目标的主动技**
 * 点上去完全没反应 —— 轻点会落回"选中该单位准备攻击"，而刚入场的单位本回合又不能攻击，
 * 玩家看到的就是"技能没生效、牌也没抽"。池里当时有 8 张中招
 *（诸葛亮运筹帷幄 / 弓兵放箭 / 曹丕宗室擢用 / 太史慈神射豪 / 鲁肃仗义疏财 /
 *   冀州强弩强弩 / 锦帆军劫营 / 杨仪筹度粮谷）。
 *
 * 引擎侧从来没问题 —— 坏的是 UI 的派发条件。core 的测试覆盖不到这一层，
 * 所以这里用**无头 Chrome 走真实点击路径**把它钉住：
 *
 *   检查 A：逐张把"不需要目标的主动技"单位放上场，调 `trySkillTargeting`（点一下单位走的就是它），
 *           要求返回 true（＝已派发）。
 *   检查 D：**诸葛父子「同赴」**（ADR-149）—— 打出一个另一张一起上场，或从牌库置入手牌。
 *   检查 B：**两步技能**（ADR-146 华佗「青囊」：先弃一张手牌 → 再出箭头选回血目标）——
 *           要求第 1 步进"点手牌"模式且**不出箭头**、第 2 步出箭头、点完结算且
 *           **回血量 = 弃掉那张牌的统率值**。
 *
 * ## 用法
 *
 *   node tools/probe-skill-dispatch.mjs            # 自动开关 Chrome
 *   CHROME_BIN=/path/to/chrome node tools/probe-skill-dispatch.mjs
 *
 * 退出码 0 = 全部派发成功；1 = 有卡点不动（会列出是哪几张）。
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CHROME = process.env.CHROME_BIN
  ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.PROBE_PORT ?? 9411);
const PAGE = `file://${resolve(process.cwd(), 'prototype/battlefield.html')}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), 'probe-skill-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

let ws;
/** 收尾：先等 Chrome 真的退出，再删临时 profile —— 它还在写盘时删会 ENOTEMPTY */
const cleanup = async () => {
  try { ws?.close(); } catch { /* 忽略 */ }
  try { chrome.kill('SIGKILL'); } catch { /* 忽略 */ }
  await new Promise((res) => {
    if (chrome.exitCode !== null || chrome.signalCode) return res();
    chrome.once('exit', res);
    setTimeout(res, 2000);
  });
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
  catch { /* 极少数情况下仍被占用：临时目录留给系统清理，不影响结论 */ }
};

try {
  // ① 等调试端口起来
  let up = false;
  for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${PORT}/json/version`); up = true; break; } catch { await sleep(250); }
  }
  if (!up) throw new Error(`Chrome 调试端口没起来（${PORT}）`);

  // ② 开页面并连 CDP
  const page = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${PAGE}`, { method: 'PUT' })).json();
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0; const waiting = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); }
  };
  const send = (method, params = {}) =>
    new Promise((res) => { const i = ++seq; waiting.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    const ex = r.result?.exceptionDetails;
    if (ex) throw new Error(String(ex.exception?.description ?? ex.text).slice(0, 300));
    return r.result?.result?.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await sleep(1500);

  // ③ 走完开局（与 tools/probe-autodrive.js 同一套真按钮）
  await js(`document.querySelector('[data-act="toDeck"]').click()`); await sleep(400);
  await js(`(function(){var b=document.querySelectorAll('#setup button,#setup .crow');
    for(var i=0;i<b.length;i++){if(b[i].textContent.trim()==='自动组卡'){b[i].click();return true;}}return false;})()`);
  await sleep(500);
  await js(`document.querySelector('[data-act="toMulligan"]').click()`); await sleep(400);
  await js(`document.querySelector('[data-act="start"]').click()`); await sleep(1200);

  // ④ 逐张验：把候选单位放上场 → 点一下 → 必须派发
  const rows = await js(`(function(){
    var out = [];
    var ids = GD.cards
      .filter(function (c) { return ['troop','general','strategist','machine'].indexOf(c.type) >= 0; })
      .filter(function (c) { return (c.skills || []).some(function (s) { return s.kind === 'active'; }); })
      .map(function (c) { return c.id; });
    ids.forEach(function (id, i) {
      var def = GD.cards.find(function (c) { return c.id === id; });
      var col = 0;
      // 洗掉上一张留下的挂起状态，保证"这一次点击"是干净的
      var phc = session.state.pendingHandChoice;
      if (phc) doAction({ type: 'CHOOSE_HAND', handIndex: (phc.indices || [0])[0] });
      var pd = session.state.pendingDiscover;
      if (pd) doAction({ type: 'CHOOSE_DISCOVER', cardId: pd.candidates[0] });
      session.state.sides.own.command.cur = 10;
      session.state.sides.own.command.max = 10;
      // ⚠️ 开局谁先手是随机的（掷点）—— 不强制成玩家回合的话，
      //    trySkillTargeting 会以"现在不是你的回合"直接返回 false，整轮探针假红。
      session.state.active = 'own';
      Core.setUnit(session.state, 'own', 'front', col, null);
      Core.setUnit(session.state, 'own', 'front', col, Core.makeUnit(def, session.state.turn, 800 + i));
      var can = Core.canUseUnitSkill(session.state, 'own', 'front', col);
      var plan = Core.unitSkillTargetPlan(session.state, 'own', 'front', col);
      var noTarget = !plan.choices || plan.choices.length === 0;
      if (!can.ok || !noTarget) {                     // 只关心"不需要目标且可用"的那批
        Core.setUnit(session.state, 'own', 'front', col, null);
        return;
      }
      var dispatched = trySkillTargeting('front', col);
      out.push({ id: id, name: def.name, skill: (def.skills || []).filter(function (s) { return s.kind === 'active'; })[0].name, dispatched: dispatched });
      Core.setUnit(session.state, 'own', 'front', col, null);
    });
    return out;
  })()`);

  /* ---------- 检查 B：两步技能（手牌 → 场上）----------
     ⚠️ ADR-148：原本的载体卡华佗「青囊」已改成「医圣」（不弃牌），
     所以这里**在页面里现造一张合成卡**（只进 GD.cards 与 ctx.cards，不写进 data）来钉住这套机制。 */
  const twoStep = await js(`(function(){
    var card = { id: 'probe_two_step', name: '巫医', faction: 'qun', type: 'strategist',
      cost: 0, attack: 0, health: 5, keywords: [], gender: 'male', memo: 'probe',
      skills: [{ id: 'probe_sk', name: '祭礼', kind: 'active', cost: 0, frequency: 'once_per_turn',
        text: '战技（每回合一次）：弃一张手牌，治疗一位己方人物 3 点。',
        effects: [
          { action: 'discard', count: 1, mode: 'choose', target: { side: 'self', zone: 'hand' } },
          { action: 'heal', value: 3, target: { side: 'ally', filter: { type: 'character' }, count: 1, mode: 'choose' } }
        ] }] };
    if (!GD.cards.some(function (c) { return c.id === card.id; })) GD.cards.push(card);
    session.ctx.cards.set(card.id, card);
    // 清掉检查 A 可能留下的挂起状态
    var lphc = session.state.pendingHandChoice;
    if (lphc) doAction({ type: 'CHOOSE_HAND', handIndex: (lphc.indices || [0])[0] });
    var lpd = session.state.pendingDiscover;
    if (lpd) doAction({ type: 'CHOOSE_DISCOVER', cardId: lpd.candidates[0] });
    session.state.active = 'own';
    session.state.sides.own.command.cur = 10;
    session.state.sides.own.rows.front[4] = null;
    Core.setUnit(session.state, 'own', 'front', 4, Core.makeUnit(card, session.state.turn, 703));
    var ally = session.state.sides.own.rows.front[0];
    if (!ally) { ally = Core.makeUnit(GD.cards.find(function (c) { return c.id === 'neutral_shieldman'; }), session.state.turn, 704); Core.setUnit(session.state, 'own', 'front', 0, ally); }
    ally.maxHp = 40; ally.hp = 5;
    session.state.sides.own.hand = [{ card: card, mods: [] }];
    renderAll();
    var plan = Core.unitSkillTargetPlan(session.state, 'own', 'front', 4).choices;
    if (plan.length < 2 || plan[0].zone !== 'hand') return { skipped: '合成卡没造出两步（plan=' + plan.length + '）' };
    return { allyHp: 5, steps: plan.length };
  })()`);

  let twoStepOk = true;
  let twoStepNote = '';
  if (twoStep.skipped) {
    twoStepOk = false;
    twoStepNote = twoStep.skipped;
  } else {
    const dispatched = await js(`trySkillTargeting('front', 4)`);
    await sleep(300);
    const step1 = await js(`({ walk: !!skillWalk, idx: skillWalk && skillWalk.idx,
      handHi: document.querySelectorAll('.hcard-wrap.is-target').length, arrow: !!pendingPick })`);
    await js(`document.querySelectorAll('.hcard-wrap')[0].click()`);
    await sleep(500);
    const step2 = await js(`({ idx: skillWalk && skillWalk.idx, arrow: !!pendingPick,
      targets: pendingPick ? pendingPick.targets.length : 0 })`);
    await js(`document.querySelector('.slot[data-side="own"][data-row="front"][data-col="0"] .unit-wrap').click()`);
    await sleep(2500);
    const done = await js(`({ walk: !!skillWalk, allyHp: session.state.sides.own.rows.front[0].hp,
      hand: session.state.sides.own.hand.length,
      discarded: session.state.sides.own.discard.map(function (c) { return c.name; }) })`);
    twoStepOk = dispatched === true
      && step1.walk === true && step1.idx === 0 && step1.handHi > 0 && step1.arrow === false
      && step2.idx === 1 && step2.arrow === true && step2.targets > 0
      && done.walk === false && done.hand === 0
      && done.discarded.indexOf('巫医') >= 0
      && done.allyHp === 8;                       // 5 + 3
    twoStepNote = `两步（弃手牌 → 出箭头）第1步高亮=${step1.handHi}/箭头=${step1.arrow}　`
      + `第2步箭头=${step2.arrow}/候选=${step2.targets}　友军 5 → ${done.allyHp}（+3）　弃牌=${done.discarded.join('/')}`;
  }

  /* ---------- 检查 C：技能用不了时，点一下必须**给出原因**（不能静默无反应）----------
     场景：真的把战技用掉一次，再点同一个单位 —— 引擎会以「本回合已用过」拒绝。 */
  const silent = await js(`(function(){
    var ht = GD.cards.find(function (c) { return c.id === 'qun_huatuo'; });
    if (!ht) return { skipped: '卡池里没有华佗' };
    session.state.active = 'own';
    session.state.sides.own.command.cur = 10;
    Core.setUnit(session.state, 'own', 'front', 4, Core.makeUnit(ht, session.state.turn, 705));
    var ally = session.state.sides.own.rows.front[0];
    if (!ally) return { skipped: '场上没有可治疗的友军' };
    ally.hp = 3;
    renderAll();
    doAction({ type: 'USE_SKILL', row: 'front', col: 4, skillId: 'yi_sheng',
      target: { side: 'own', row: 'front', col: 0 } });          // 先用掉
    return { usedHp: ally.hp };
  })()`);
  await sleep(2500);
  const silent2 = await js(`(function(){
    var d = document.getElementById('detail');
    if (d) d.textContent = '';                                    // 先清空，才能确认"这次点击说了话"
    var wrap = document.querySelector('.slot[data-side="own"][data-row="front"][data-col="4"] .unit-wrap');
    if (wrap) wrap.click();
    var usable = Core.canUseUnitSkill(session.state, 'own', 'front', 4);
    return { usable: usable.ok, reason: usable.reason || '', walk: !!skillWalk,
             detail: ((document.getElementById('detail') || {}).textContent || '').slice(0, 60) };
  })()`);
  const silentOk = !silent.skipped && silent2.usable === false && silent2.walk === false && silent2.detail.length > 0;
  const silentNote = silent.skipped
    ? silent.skipped
    : `用掉一次后（友军 ${silent.usedHp} 血）再点 → 引擎理由「${silent2.reason}」，面板提示「${silent2.detail}」`;

  /* ---------- 检查 D：诸葛瞻/诸葛尚「同赴」（ADR-149）----------
     A：两张都在手 → 打出一张，另一张**免费一起上场**，且互相 +1/+1（同心光环）
     B：另一张只在牌库 → 打出后弹出"发现"面板（候选恰好 1 张），点选后进手牌（从牌库取走） */
  const pairA = await js(`(function(){
    session.state.active = 'own';
    session.state.sides.own.command.cur = 10;
    for (var r of ['front','back']) for (var c = 0; c < 8; c++) session.state.sides.own.rows[r][c] = null;
    var z = GD.cards.find(function (c) { return c.id === 'shu_zhugezhan'; });
    var sh = GD.cards.find(function (c) { return c.id === 'shu_zhugeshang'; });
    if (!z || !sh) return { skipped: '卡池里没有诸葛父子' };
    session.state.sides.own.hand = [{ card: z, mods: [] }, { card: sh, mods: [] }];
    renderAll();
    doAction({ type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
    return { dispatched: true };
  })()`);
  await sleep(5000);                                   // 动画约 4 秒，播完才结算光环
  const pairAState = await js(`(function(){
    var f = session.state.sides.own.rows.front;
    var at = function (i) { return f[i] ? Core.effectiveAttack(session.state, 'own', 'front', i) + '/' + f[i].maxHp : '—'; };
    return { c0: f[0] ? f[0].name : null, c1: f[1] ? f[1].name : null,
             s0: at(0), s1: at(1), hand: session.state.sides.own.hand.length,
             cmd: session.state.sides.own.command.cur };
  })()`);
  const pairAOk = !pairA.skipped
    && pairAState.c0 === '诸葛瞻' && pairAState.c1 === '诸葛尚'
    && pairAState.s0 === '3/6' && pairAState.s1 === '4/5'        // 2/5+1/+1 与 3/4+1/+1
    && pairAState.hand === 0;
  const pairANote = pairA.skipped
    ? pairA.skipped
    : `A 一起上场：${pairAState.c0} ${pairAState.s0}、${pairAState.c1} ${pairAState.s1}　手牌 ${pairAState.hand}　统率 ${pairAState.cmd}`;

  const pairB = await js(`(function(){
    session.state.active = 'own';
    session.state.sides.own.command.cur = 10;
    for (var r of ['front','back']) for (var c = 0; c < 8; c++) session.state.sides.own.rows[r][c] = null;
    var z = GD.cards.find(function (c) { return c.id === 'shu_zhugezhan'; });
    if (!z) return { skipped: '卡池里没有诸葛瞻' };
    session.state.sides.own.hand = [{ card: z, mods: [] }];
    session.state.sides.own.deck = ['shu_zhugeshang', 'neutral_infantry', 'neutral_shieldman'];
    renderAll();
    doAction({ type: 'PLAY_CARD', cardIndex: 0, row: 'front', col: 0 });
    return { dispatched: true };
  })()`);
  let panel = false;
  for (let t = 0; t < 16 && !panel; t++) {
    await sleep(500);
    panel = (await js(`!!document.getElementById('discover-pick')`)) === true;
  }
  const options = await js(`(function(){
    var box = document.getElementById('discover-pick');
    return box ? box.querySelectorAll('.discover-list > *').length : 0;
  })()`);
  if (panel) await js(`document.querySelector('#discover-pick .discover-list > *').click()`);
  await sleep(2500);
  const pairBState = await js(`(function(){
    return { hand: session.state.sides.own.hand.map(function (h) { return h.card.name; }),
             deck: session.state.sides.own.deck.length, pending: !!session.state.pendingDiscover };
  })()`);
  const pairBOk = !pairB.skipped && panel && options === 1
    && pairBState.hand.length === 1 && pairBState.hand[0] === '诸葛尚'
    && pairBState.deck === 2 && pairBState.pending === false;
  const pairBNote = pairB.skipped
    ? pairB.skipped
    : `B 牌库入手：面板=${panel} 候选=${options}　点选后手牌=${JSON.stringify(pairBState.hand)}　牌库剩 ${pairBState.deck}`;

  // ⑤ 汇报
  if (!rows.length) {
    console.log('⚠️ 没有找到"不需要目标的可用主动技"—— 是不是卡池/选择器变了？');
  } else {
    const bad = rows.filter((r) => r.dispatched !== true);
    console.log(`检查 A · 不需要目标的主动技 ${rows.length} 张：`);
    for (const r of rows) console.log(`  ${r.dispatched ? '✅' : '❌'} ${r.name}（${r.skill}）`);
    console.log(`\n检查 B · 两步技能（先弃手牌 → 再出箭头选目标）：${twoStepOk ? '✅' : '❌'} ${twoStepNote}`);
    console.log(`检查 C · 技能不可用时点击要"说话"：${silentOk ? '✅' : '❌'} ${silentNote}`);
    console.log(`检查 D · 诸葛父子「同赴」：${pairAOk && pairBOk ? '✅' : '❌'} ${pairANote}`);
    console.log(`　　　　　　${pairBOk ? '✅' : '❌'} ${pairBNote}`);
    if (bad.length || !twoStepOk || !silentOk || !pairAOk || !pairBOk) {
      if (bad.length) console.error(`❌ ${bad.length} 张点了没反应：${bad.map((r) => r.name).join('、')}`);
      if (!twoStepOk) console.error('❌ 两步技能流程不通过');
      if (!silentOk) console.error('❌ 技能不可用时点击是静默的（玩家会以为卡坏了）');
      if (!pairAOk) console.error('❌ 诸葛父子没有"一起上场"或互相 +1/+1 不对');
      if (!pairBOk) console.error('❌ 诸葛父子"从牌库到手牌"这条路径不对');
      await cleanup();
      process.exit(1);
    }
    console.log('\n✅ 四类交互全部正常（技能派发 / 多步 / 不可用提示 / 父子同赴）');
  }
} catch (err) {
  console.error('探针失败：', err.message);
  await cleanup();
  process.exit(1);
}
await cleanup();
