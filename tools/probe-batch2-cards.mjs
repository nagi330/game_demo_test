/**
 * 蜀国第二批 14 张 · **真实页面**验证（无头 Chrome，真实鼠标拖拽 / 真实点击）
 *
 * 为什么要有这一份：`core` 的单测只能证明**引擎**对，证明不了**界面**对 —— 这一批里两个
 * 真 bug 都是"引擎全绿、界面全错"：
 *   · 拖拽落点会再补一个 click 给格子 → 需要选目标的战吼被自己的落点取消（ADR-151）；
 *   · 出牌时的手牌步骤（刘巴「直百」弃一张手牌）此前在界面上根本不会问，弃牌悄悄退化成随机（ADR-146 出牌版）。
 *
 * 跑法：`node tools/probe-batch2-cards.mjs`（退出码 0/1）
 * 覆盖：廖化落单成长 / 木鹿象兵必中 / 吴懿主公披坚+魏延 / 刘巴弃牌交互 / 谯周双方削弱 /
 *       带来洞主召唤 / 孙乾群雄发现 / 李严拼点 / 先攻语义 + 无先攻对照。
 */
const PORT = 9350; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const { spawn } = await import('node:child_process'); const { mkdtempSync, rmSync } = await import('node:fs');
const { tmpdir } = await import('node:os'); const { join } = await import('node:path');
const profile = mkdtempSync(join(tmpdir(), 'b2-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new','--disable-gpu','--no-first-run','--window-size=1600,900',`--remote-debugging-port=${PORT}`,`--user-data-dir=${profile}`,'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${PORT}/json/version`); break; } catch { await wait(250); } }
const page = await (await fetch(`http://127.0.0.1:${PORT}/json/new?file://${process.cwd()}/prototype/battlefield.html`, { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (m, p = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return { ERR: JSON.stringify(r.result.exceptionDetails).slice(0, 220) }; return r.result?.result?.value; };
const mouse = (t, x, y) => send('Input.dispatchMouseEvent', { type: t, x, y, button: 'left', buttons: t === 'mouseReleased' ? 0 : 1, clickCount: 1 });
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await wait(1500);
await js(`document.querySelector('[data-act="toDeck"]').click()`); await wait(400);
await js(`(function(){var b=document.querySelectorAll('#setup button,#setup .crow');for(var i=0;i<b.length;i++){if(b[i].textContent.trim()==='自动组卡'){b[i].click();return true;}}return false;})()`); await wait(500);
await js(`document.querySelector('[data-act="toMulligan"]').click()`); await wait(400);
await js(`document.querySelector('[data-act="start"]').click()`); await wait(1400);

const R = []; const ok = (n, p, d = '') => R.push(`${p ? '✅' : '❌'} ${n}${d ? '　' + d : ''}`);

/** 摆场：清空棋盘/手牌/牌库，放入指定手牌，并把 active 拿回自己 */
const setup = (hand, deck = []) => js(`(function(){
  session.state.active='own'; session.state.winner=null;
  session.state.sides.own.command={cur:10,max:10};
  for (var r of ['front','back']) for (var c=0;c<8;c++){ session.state.sides.own.rows[r][c]=null; session.state.sides.enemy.rows[r][c]=null; }
  if (session.state.pendingDiscover) session.state.pendingDiscover=null;
  if (session.state.pendingHandChoice) session.state.pendingHandChoice=null;
  session.state.sides.own.deck=${JSON.stringify(deck)};
  session.state.sides.own.hand=${JSON.stringify(hand)}.map(function(id){ return {card:GD.cards.find(function(c){return c.id===id;}), mods:[]}; });
  session.state.sides.own.discard=[];
  renderAll(); return true;
})()`);
/** 真实拖拽：把手牌 index 打到 front/col */
async function dragPlay(hi, col) {
  const p = await js(`(function(){
    var hc=document.querySelector('.hcard-wrap[data-card-index="${hi}"]');
    var slot=document.querySelector('.slot[data-side="own"][data-row="front"][data-col="${col}"]');
    if(!hc||!slot) return null;
    var a=hc.getBoundingClientRect(), b=slot.getBoundingClientRect();
    return {hx:a.left+a.width/2, hy:a.top+a.height/2, sx:b.left+b.width/2, sy:b.top+b.height/2};
  })()`);
  if (!p) return false;
  await mouse('mousePressed', p.hx, p.hy); await wait(110);
  await mouse('mouseMoved', (p.hx+p.sx)/2, (p.hy+p.sy)/2); await wait(110);
  await mouse('mouseMoved', p.sx, p.sy); await wait(110);
  await mouse('mouseReleased', p.sx, p.sy);
  for (let t = 0; t < 20; t++) { await wait(400); if ((await js(`!busy`)) === true) break; }
  return true;
}
const stat = (side, col) => js(`(function(){
  var u=session.state.sides["${side}"].rows.front[${col}];
  return u? {name:u.name, atk:Core.effectiveAttack(session.state,"${side}","front",${col}), hp:u.maxHp, hpNow:u.hp} : null;
})()`);

/* ── A. 廖化：落单 4/5，补一个友军回落 2/4 ── */
await setup(['shu_liaohua', 'neutral_infantry']);
await dragPlay(0, 0);
const A1 = await stat('own', 0);
await dragPlay(0, 1);                      // 真实打出第二个单位（动作结算后光环会重算）
const A2 = await stat('own', 0);
ok('廖化：落单 4/5 → 有友军回落 2/4', A1?.atk === 4 && A1?.hp === 5 && A2?.atk === 2 && A2?.hp === 4,
   `单独 ${A1?.atk}/${A1?.hp} → 有友军 ${A2?.atk}/${A2?.hp}`);

/* ── B. 木鹿大王：象兵 +1/+1，且真实拖拽攻击必中震慑 ── */
await setup(['shu_muludawang']);
await js(`(function(){ var x=Core.makeUnit(GD.cards.find(function(c){return c.id==='shu_xiangbing';}),1,701); x.enteredTurn=-1;
  Core.setUnit(session.state,'own','front',0,x);
  var bag=Core.makeUnit(GD.cards.find(function(c){return c.id==='wei_piliche';}),1,702); bag.hp=bag.maxHp=bag.baseMaxHp=30;
  Core.setUnit(session.state,'enemy','front',3,bag); renderAll(); return true; })()`);
await wait(400);
const B0 = await stat('own', 0);
await dragPlay(0, 4);
const B1 = await stat('own', 0);
const hasRule = await js(`(function(){ var u=session.state.sides.own.rows.front[0];
  return u.mods.some(function(m){ return m.kind==='rule' && m.rule && m.rule.cap==='proc_chance' && m.rule.value===1; }); })()`);
ok('木鹿：象兵 3/6 → 4/7 且挂上 proc_chance 覆盖', B0?.atk === 3 && B1?.atk === 4 && B1?.hp === 7 && hasRule === true,
   `${B0?.atk}/${B0?.hp} → ${B1?.atk}/${B1?.hp}　覆盖=${hasRule}`);
// 真实拖拽攻击：象兵 → 敌方靶子（先攻无关，用 drag：按下象兵拖到靶子）
{
  const p = await js(`(function(){
    var a=document.querySelector('.slot[data-side="own"][data-row="front"][data-col="0"] .unit-wrap').getBoundingClientRect();
    var b=document.querySelector('.slot[data-side="enemy"][data-row="front"][data-col="3"] .unit-wrap').getBoundingClientRect();
    return {hx:a.left+a.width/2, hy:a.top+a.height/2, sx:b.left+b.width/2, sy:b.top+b.height/2};
  })()`);
  await mouse('mousePressed', p.hx, p.hy); await wait(120);
  await mouse('mouseMoved', (p.hx+p.sx)/2, (p.hy+p.sy)/2); await wait(120);
  await mouse('mouseMoved', p.sx, p.sy); await wait(120);
  await mouse('mouseReleased', p.sx, p.sy);
  for (let t = 0; t < 20; t++) { await wait(400); if ((await js(`!busy`)) === true) break; }
}
const stunned = await js(`(function(){ var t=session.state.sides.enemy.rows.front[3];
  return t ? (t.statuses['zhen_she']?.stacks||0) : -1; })()`);
const bagHp = (await stat('enemy', 3))?.hpNow;
ok('木鹿：象兵真实攻击 → 目标必中震慑（100%）', stunned === 1 && bagHp === 26,
   `震慑层数=${stunned}　靶子 30 → ${bagHp}（象兵被加成到 4 攻）`);

/* ── C. 吴懿：主公披坚 + 与魏延互相 +1/+1 ── */
await setup(['shu_wuyi']);
await js(`(function(){ Core.setUnit(session.state,'own','front',0,Core.makeUnit(GD.cards.find(function(c){return c.id==='shu_weiyan';}),1,703)); renderAll(); return true; })()`);
await wait(300);
await dragPlay(0, 1);
const C1 = await stat('own', 1), C2 = await stat('own', 0);
const lordShield = await js(`(session.state.sides.own.lord.statuses && session.state.sides.own.lord.statuses.sheng_dun_status) ? (session.state.sides.own.lord.statuses.sheng_dun_status.stacks||0) : 0`);
ok('吴懿：主公获得披坚（UI 状态栏可见）+ 魏延与吴懿各 +1/+1',
   lordShield >= 1 && C1?.atk === 5 && C1?.hp === 5 && C2?.atk === 5 && C2?.hp === 5,
   `主公披坚=${lordShield}　吴懿 ${C1?.atk}/${C1?.hp}　魏延 ${C2?.atk}/${C2?.hp}`);

/* ── D. 刘巴：真实界面必须弹出「选择手牌」并精确弃掉点的那张 ── */
await setup(['shu_liuba', 'neutral_infantry', 'neutral_archer'], ['neutral_shieldman', 'neutral_cavalry']);
await dragPlay(0, 0);
const D1 = await js(`(function(){ var d=document.getElementById('detail');
  return { handHi: document.querySelectorAll('.hcard-wrap.is-target').length, pending: !!pendingSkill,
           text: (d? d.textContent : '').slice(0, 34) }; })()`);
// 点第 3 张（弓兵，打牌前 index 2）
await js(`(function(){ var els=document.querySelectorAll('.hcard-wrap'); if(els[2]) els[2].click(); return true; })()`);
for (let t = 0; t < 20; t++) { await wait(400); if ((await js(`!busy`)) === true) break; }
const D2 = await js(`({ discard: session.state.sides.own.discard.map(function(c){return c.name;}),
  hand: session.state.sides.own.hand.map(function(h){return h.card.name;}), deck: session.state.sides.own.deck.length })`);
const D3 = await js(`({ playWalk: pendingPlay === null, skillWalk: skillWalk === null })`);
ok('刘巴：界面弹出「选择手牌」，点哪张弃哪张（含下标换算），且收尾干净',
   D1.handHi === 3 && /选择手牌/.test(D1.text) && D2.discard.length === 1 && D2.discard[0] === '弓兵'
   && D2.hand.length === 3 && D3.playWalk === true && D3.skillWalk === true,
   `高亮=${D1.handHi} 提示="${D1.text}"　弃=${JSON.stringify(D2.discard)}　手牌=${JSON.stringify(D2.hand)} 牌库=${D2.deck}　收尾干净=${D3.playWalk && D3.skillWalk}`);

/* ── E. 谯周：双方武将 −1（谋臣/兵种不受影响）── */
await setup(['shu_qiaozhou']);
await js(`(function(){
  Core.setUnit(session.state,'own','front',0,Core.makeUnit(GD.cards.find(function(c){return c.id==='shu_wangping';}),1,704));
  Core.setUnit(session.state,'enemy','front',0,Core.makeUnit(GD.cards.find(function(c){return c.id==='shu_weiyan';}),1,705));
  Core.setUnit(session.state,'own','front',1,Core.makeUnit(GD.cards.find(function(c){return c.id==='neutral_infantry';}),1,706));
  renderAll(); return true; })()`);
await wait(300);
await dragPlay(0, 4);
const E = await js(`({ ownGen: Core.effectiveAttack(session.state,'own','front',0), enemyGen: Core.effectiveAttack(session.state,'enemy','front',0),
  troop: Core.effectiveAttack(session.state,'own','front',1) })`);
ok('谯周：双方武将 −1，兵种不受影响', E.ownGen === 2 && E.enemyGen === 3 && E.troop === 1,
   `己方武将 3→${E.ownGen}　敌方武将 4→${E.enemyGen}　兵种 ${E.troop}`);

/* ── F. 带来洞主：召唤 2 个蛮族步兵 ── */
await setup(['shu_dailaidongzhu']);
await dragPlay(0, 0);
const F = await js(`(function(){ var all=[].concat(session.state.sides.own.rows.front, session.state.sides.own.rows.back).filter(Boolean);
  return { total: all.length, tokens: all.filter(function(u){return u.cardId==='token_manzu_bubing';}).length }; })()`);
ok('带来洞主：场上自带 1 + 召唤 2', F.total === 3 && F.tokens === 2, `场上 ${F.total}，其中衍生物 ${F.tokens}`);

/* ── G. 孙乾：发现面板只给群雄牌 ── */
await setup(['shu_sunqian'], ['qun_yuanshao', 'neutral_infantry', 'qun_huatuo']);
await dragPlay(0, 0);
let panel = false;
for (let t = 0; t < 16 && !panel; t++) { await wait(500); panel = (await js(`!!document.getElementById('discover-pick')`)) === true; }
const G1 = await js(`(function(){ var box=document.getElementById('discover-pick'); if(!box) return null;
  var names=[]; box.querySelectorAll('.discover-list > *').forEach(function(b){ names.push(b.textContent.replace(/\\s+/g,' ').slice(0,14)); });
  return { n: names.length, names: names }; })()`);
ok('孙乾：真实界面弹出发现面板，且候选只含群雄牌', panel && G1 && G1.n === 2, `面板=${panel} 候选=${G1 ? JSON.stringify(G1.names) : '-'}`);

/* ── H. 李严：拼点即时结算（两条分支之一必须成立）── */
await setup(['shu_liyan']);
await dragPlay(0, 0);
const H = await js(`(function(){ var u=session.state.sides.own.rows.front[0];
  return { atk: Core.effectiveAttack(session.state,'own','front',0), hp: u.maxHp, cmd: session.state.sides.own.command.cur }; })()`);
ok('李严：拼点结算可见（胜=统率回满上限 10 / 败=3→1 攻、5→3 血）',
   (H.cmd === 10 && H.atk === 3 && H.hp === 5)      // 胜：花 5 后 +6，被上限夹回 10
   || (H.cmd === 5 && H.atk === 1 && H.hp === 3),    // 败：花 5 后不涨，自身 −2/−2
   `统率=${H.cmd}　李严 ${H.atk}/${H.hp}`);

/* ── I. 先攻的正确含义：**入场当回合即可攻击**（对比一张没有先攻的卡打不了）── */
await setup(['shu_jinhuansanjie']);
await js(`(function(){ var bag=Core.makeUnit(GD.cards.find(function(c){return c.id==='wei_piliche';}),1,707); bag.hp=bag.maxHp=bag.baseMaxHp=30;
  Core.setUnit(session.state,'enemy','front',3,bag); renderAll(); return true; })()`);
await dragPlay(0, 0);
{
  const p = await js(`(function(){
    var a=document.querySelector('.slot[data-side="own"][data-row="front"][data-col="0"] .unit-wrap').getBoundingClientRect();
    var b=document.querySelector('.slot[data-side="enemy"][data-row="front"][data-col="3"] .unit-wrap').getBoundingClientRect();
    return {hx:a.left+a.width/2, hy:a.top+a.height/2, sx:b.left+b.width/2, sy:b.top+b.height/2}; })()`);
  await mouse('mousePressed', p.hx, p.hy); await wait(120);
  await mouse('mouseMoved', p.sx, p.sy); await wait(140);
  await mouse('mouseReleased', p.sx, p.sy);
  for (let t = 0; t < 18; t++) { await wait(400); if ((await js(`!busy`)) === true) break; }
}
const I = await js(`({ hp: session.state.sides.enemy.rows.front[3]?.hp, attacks: session.state.sides.own.rows.front[0]?.attackedThisTurn })`);
ok('金环三结：先攻＝入场当回合就能打（刚落地就砍掉 3 血）', I.hp === 27 && I.attacks === 1,
   `靶子 30 → ${I.hp}　攻击次数=${I.attacks}`);

// 对照：吴懿没有先攻 → 入场当回合打不了
await setup(['shu_wuyi']);
await js(`(function(){ var bag=Core.makeUnit(GD.cards.find(function(c){return c.id==='wei_piliche';}),1,708); bag.hp=bag.maxHp=bag.baseMaxHp=30;
  Core.setUnit(session.state,'enemy','front',3,bag); renderAll(); return true; })()`);
await dragPlay(0, 0);
const J = await js(`(function(){ var u=session.state.sides.own.rows.front[0];
  return { canAttack: Core.canAttack(session.state,'own','front',0).ok, why: Core.canAttack(session.state,'own','front',0).reason||'' }; })()`);
ok('对照：吴懿（无先攻）入场当回合不能攻击', J.canAttack === false && /入场/.test(J.why), `可攻击=${J.canAttack}　原因「${J.why}」`);

console.log(R.join('\n'));
const allOk = R.every((x) => x.startsWith('✅'));
console.log('\n结论：' + (allOk ? '✅ 第二批 11 项真实交互全部正确' : '❌ 有环节不对'));
ws.close(); chrome.kill('SIGKILL'); await wait(600); rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
process.exit(allOk ? 0 : 1);
