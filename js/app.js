"use strict";
/* =====================================================================
   APP: splash (one tap to play), level map, new-move cards, play loop,
   compact results, party mode, sensor lab
   ===================================================================== */
const CFG = { AI_ENDPOINT: "" }; // optional Supabase edge function for the AI coach
let screenNow = "s-splash";
function show(id){
  screenNow = id;
  document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("on",s.id===id));
  if(id==="s-map") renderMap();
  if(id==="s-splash") renderSplash();
  if(id!=="s-lab") labStop();
}
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));

/* ---------- progress & unlocking ---------- */
const prog = store.get("prog", {});
const getProg = (g,l) => (prog[g]||{})[l] || {stars:0,best:0};
function saveProg(g,l,stars,score){
  prog[g] = prog[g]||{}; const p = prog[g][l] || {stars:0,best:0};
  const newBest = score > p.best && p.best>0;
  prog[g][l] = {stars:Math.max(p.stars,stars), best:Math.max(p.best,score)}; store.set("prog",prog);
  return newBest;
}
const done = (gid,lid) => getProg(gid,lid).stars>0;
const worldOpen = g => !g.unlockAfter || done(...g.unlockAfter);
const levelOpen = (g,i) => worldOpen(g) && (i===0 || done(g.id, g.levels[i-1].id));
const ORDER = GAMES.flatMap(g=>g.levels.map((l,i)=>({g,l,i})));
function nextUp(){
  return ORDER.find(o=>levelOpen(o.g,o.i) && !done(o.g.id,o.l.id)) || {g:GAMES[0], l:GAMES[0].levels[GAMES[0].levels.length-1]};
}
function nextAfter(g,l){
  const i = g.levels.indexOf(l);
  if(i+1 < g.levels.length && levelOpen(g,i+1)) return {g, l:g.levels[i+1]};
  const n = nextUp(); return done(n.g.id,n.l.id) ? null : n;
}
const STARS_HTML = n => "★".repeat(n) + `<span class="off">${"★".repeat(3-n)}</span>`;

/* ---------- splash ---------- */
function renderSplash(){
  $("splashIcon").innerHTML = ICONS.hold;
  if($("splashNext").dataset.challenge) return;
  const n = nextUp(); const lvlNo = n.g.levels.indexOf(n.l)+1;
  $("splashNext").textContent = `${n.g.title} · Level ${lvlNo}: ${n.l.title}`;
}
async function wake(){ SFX.init(); await Engine.enable(); }
$("btnTapPlay").onclick = async ()=>{ await wake(); const n=nextUp(); launch(n.g, n.l); };
$("btnSplashMap").onclick = ()=>show("s-map");
$("btnSplashParty").onclick = ()=>openParty();

/* ---------- level map ---------- */
function renderMap(){
  const list = $("mapList"); list.innerHTML="";
  const nxt = nextUp(); let total=0, got=0;
  GAMES.forEach(g=>{
    const w = document.createElement("div"); w.className="world card";
    const gotW = g.levels.reduce((s,l)=>s+getProg(g.id,l.id).stars,0); total += g.levels.length*3; got += gotW;
    w.innerHTML = `<h3><span></span><small>★ ${gotW}/${g.levels.length*3}</small></h3>`;
    w.querySelector("h3 span").textContent = g.title;
    if(!worldOpen(g)){
      const [ug,ul] = g.unlockAfter; const G = GAMES.find(x=>x.id===ug); const L = G.levels.find(x=>x.id===ul);
      const m = document.createElement("p"); m.className="lockmsg"; m.textContent = `Finish ${G.title} level ${G.levels.indexOf(L)+1} to unlock`; w.appendChild(m);
    }
    const nodes = document.createElement("div"); nodes.className="nodes";
    g.levels.forEach((l,i)=>{
      const b = document.createElement("button"); const open = levelOpen(g,i), p = getProg(g.id,l.id);
      b.className = "node" + (!open?" locked":"") + (nxt.g===g && nxt.l===l ? " next":"");
      b.innerHTML = `<b>${i+1}</b><span class="s">${open ? "★".repeat(p.stars)+"☆".repeat(3-p.stars) : "&nbsp;"}</span>`;
      b.setAttribute("aria-label", `${l.title}${open?"":", locked"}`); b.title = l.title;
      b.onclick = async ()=>{ if(!open){ toast("Finish the previous level first"); return; } await wake(); launch(g,l,true); };
      nodes.appendChild(b);
    });
    w.appendChild(nodes); list.appendChild(w);
  });
  $("mapStars").textContent = `★ ${got}/${total}`;
  $("btnSfx").textContent = SFX.on ? "Sound on" : "Sound off";
}
$("btnSfx").onclick = ()=>{ SFX.on = !SFX.on; renderMap(); };
$("btnMapParty").onclick = ()=>openParty();

/* ---------- launching a level (new-move card first, if any) ---------- */
let curGame=null, curLevel=null;
function launch(g, l, fromMap=false){
  curGame=g; curLevel=l;
  const seen = store.get("seen",{}); const key = g.id+":"+l.id;
  if(l.new && (!seen[key] || fromMap)){
    $("readyLevel").textContent = `${g.title} · Level ${g.levels.indexOf(l)+1}`;
    $("readyPill").hidden = !!seen[key];
    $("readyIcon").className = "ready-ic anim-"+l.new.icon; $("readyIcon").innerHTML = ICONS[l.new.icon];
    $("readyTitle").textContent = l.new.title; $("readyText").textContent = l.new.text;
    $("readySafety").hidden = !(l.new.safety && !store.get("safetyOk",false));
    show("s-ready"); return;
  }
  startPlay(g, l);
}
$("btnReadyGo").onclick = ()=>{
  const seen = store.get("seen",{}); seen[curGame.id+":"+curLevel.id]=true; store.set("seen",seen);
  if(curLevel.new && curLevel.new.safety) store.set("safetyOk",true);
  startPlay(curGame, curLevel);
};

/* ---------- play ---------- */
let run = null;
const fmt = s => s>=60 ? `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}` : s.toFixed(1);
let bubbleT=null, flashT=null;
const UI = {
  canvas: $("playCanvas"),
  cmd(icon, text, step, opts={}){
    if(run && !run.inst.hasGlass){
      $("bigIcon").className = "ic anim-"+icon; $("bigIcon").innerHTML = ICONS[icon];
      $("bigSays").textContent = opts.simon ? "Simon says" : "";
      $("bigWord").textContent = text.replace(/^Simon says: /,"");
      return;
    }
    $("cmd").hidden=false; $("cmdIcon").className = "ic anim-"+icon; $("cmdIcon").innerHTML = ICONS[icon]; $("cmdText").textContent = text;
    $("cmdStep").textContent = step && step!=="1/1" ? `Move ${step}` : ""; $("cmdBar").style.width="0%"; $("cmdCnt").textContent="";
  },
  progress(p, cnt){ $("cmdBar").style.width = (p*100).toFixed(0)+"%"; $("cmdCnt").textContent = cnt||""; },
  timer(s){ $("timer").textContent = fmt(s); },
  spill(x){ $("spillFill").style.width = (x*100).toFixed(0)+"%"; },
  lives(n,max){ const el=$("lives"); el.hidden=false; el.textContent = "♥".repeat(Math.max(0,n)) + "♡".repeat(Math.max(0,max-n)); },
  score(n){ const el=$("scorebox"); el.hidden=false; el.textContent = run && run.level.target ? `${n}/${run.level.target}` : n; },
  ring(f){ $("ringArc").style.strokeDashoffset = (289*(1-f)).toFixed(1); $("ringArc").style.stroke = f<0.3?"var(--bad)":"var(--simon)"; },
  flash(kind, msg){ const f=$("flash"); f.className="flash on "+kind; f.textContent=msg; clearTimeout(flashT); flashT=setTimeout(()=>f.className="flash",900); },
  say(ch, text){
    $("bubbleAv").innerHTML = ch.svg; $("bubbleName").textContent = ch.name; $("bubbleText").textContent = text;
    const b=$("bubble"); b.hidden=false; b.style.animation="none"; void b.offsetWidth; b.style.animation="";
    clearTimeout(bubbleT); bubbleT=setTimeout(()=>b.hidden=true, 2800);
  },
  shake(on){ $("playCanvas").classList.toggle("shake-on", !!on); },
  finish(result){ endPlay(result); },
};
async function startPlay(g, lv, partyPlayer=null){
  await wake();
  if(lv.mic) await Promise.race([Engine.enableMic(), new Promise(r=>setTimeout(()=>r(false),4000))]);
  if(run) cancelAnimationFrame(run.raf);
  curGame=g; curLevel=lv;
  show("s-play");
  $("cmd").hidden=true; $("bubble").hidden=true; $("flash").className="flash"; $("count").textContent="";
  $("lives").hidden=true; $("scorebox").hidden=true; $("timer").textContent="";
  $("playLevel").textContent = partyPlayer ? `${partyPlayer} · ${g.title}` : `${g.title} · Level ${g.levels.indexOf(lv)+1}: ${lv.title}`;
  UI.spill(0); UI.shake(false);
  const inst = g.make(lv, UI);
  $("spillWrap").hidden = !inst.hasGlass; $("playCanvas").hidden = !inst.hasGlass; $("big").classList.toggle("on", !inst.hasGlass);
  if(!inst.hasGlass){ $("bigIcon").innerHTML=""; $("bigWord").textContent="Get ready"; $("bigSays").textContent=""; UI.ring(1); }
  run = {game:g, level:lv, inst, phase:"count", t0:performance.now(), last:0, party:partyPlayer, lastCount:0};
  setTimeout(()=>{ $("demoHint").hidden = !Engine.S.sim; }, 1000);
  run.raf = requestAnimationFrame(loop);
}
function loop(now){
  if(!run) return;
  const dt = run.last ? Math.min(0.05,(now-run.last)/1000) : 0.016; run.last = now;
  if(run.phase==="count"){
    const left = 3 - (now-run.t0)/1000;
    const c = left>0 ? Math.ceil(left) : 0;
    if(c && c!==run.lastCount){ run.lastCount=c; SFX.count(); }
    $("count").textContent = c || "";
    if(left<=0){ run.phase="play"; SFX.go(); run.inst.begin(); }
  } else if(run.phase==="play") run.inst.update(dt);
  if(run && run.phase!=="done") run.raf = requestAnimationFrame(loop);
}
Engine.on((type,data)=>{ if(run && run.phase==="play") run.inst.onEvent(type,data); labEvent(type); });
document.addEventListener("visibilitychange",()=>{ if(!document.hidden && run && run.phase==="play") run.inst.away(); });
$("btnQuit").onclick = ()=>{ if(run){ cancelAnimationFrame(run.raf); run.phase="done"; } SFX.stop(); UI.shake(false); run=null; party.on=false; show("s-map"); };

/* ---------- results (compact: stars + one big button) ---------- */
let lastRes = null;
function endPlay(res){
  if(!run || run.phase==="done") return;
  run.phase="done"; cancelAnimationFrame(run.raf); SFX.stop(); UI.shake(false);
  const r = run; lastRes = {...res, game:r.game, level:r.level, party:r.party};
  const score = res.kind==="tea" ? res.a.score : res.score;
  const stars = res.kind==="tea" ? res.a.stars : res.stars;
  lastRes.stars = stars; lastRes.successAll = res.success; lastRes.scoreAll = score;
  setTimeout(()=> res.success ? SFX.win() : SFX.lose(), res.kind==="tea" && res.a.spill>=1 ? 650 : 200);
  if(!r.party && !(res.kind==="tea" && res.a.onTable)){ if(saveProg(r.game.id, r.level.id, stars, score)) setTimeout(()=>toast("New personal best!"),500); }
  if(r.party) party.results.push({name:r.party, score});
  run = null;
  renderResult(lastRes);
  setTimeout(()=>show("s-result"), res.kind==="simon" ? 0 : 500);
}
function renderResult(R){
  const d = $("resDetails"); d.innerHTML=""; $("coachCard").hidden=true; $("resWarn").hidden=true; $("resNote").textContent=""; $("resMore").open=false;
  $("resWho").textContent = R.party ? R.party : `${R.game.title} · Level ${R.game.levels.indexOf(R.level)+1}: ${R.level.title}`;
  $("resStars").innerHTML = R.party ? "" : STARS_HTML(R.stars);
  $("resScore").textContent = R.scoreAll;
  if(R.kind==="tea"){
    const a = R.a;
    $("resTitle").textContent = a.onTable ? "Cheater?" : !R.success ? "Spilled!" : titleFor(a.score);
    let line = a.spill>=1 ? "The tea spilled. Try moving slower." :
      !R.success ? `Time's up. ${R.stepsDone} of ${R.total} moves done.` :
      a.spill>0.05 ? `Done, with ${Math.round(a.spill*100)}% spilled.` : "Not a drop spilled!";
    if(a.penalty) line += ` −${a.penalty} for noise.`;
    $("resLine").textContent = line;
    if(a.onTable){ $("resWarn").hidden=false; $("resWarn").textContent="Score voided: the phone seems to have been on a table. Hold it in your hand."; }
    const weakest = Object.entries(a.dims).sort((x,y)=>x[1]-y[1])[0][0];
    d.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px" id="meters"></div>`;
    for(const [k,v] of Object.entries(a.dims)){
      const col = v>=75?"var(--good)":v>=50?"var(--gold)":"var(--bad)";
      const row = document.createElement("div"); row.className="meter"+(k===weakest?" weak":"");
      row.innerHTML = `<span>${DIM_LABEL[k]}</span><div class="bar"><i style="width:${v}%;background:${col}"></i></div><b>${v}</b>`;
      d.querySelector("#meters").appendChild(row);
    }
    if(a.tremor){ const p=document.createElement("p"); p.className="small muted"; p.style.marginTop="10px";
      p.textContent=`Dominant hand-motion frequency: ${a.tremor.peakHz} Hz. Everyone has a slight natural tremor; caffeine, poor sleep and stress raise it.`; d.appendChild(p); }
    const c = localCoach(a); setCoach(c); aiCoach(a).then(x=>{ if(x && lastRes===R) setCoach(x); });
    $("resNote").textContent = "For fun and practice only. Not a medical assessment.";
  } else if(R.kind==="simon"){
    const best = getProg(R.game.id,R.level.id).best;
    $("resTitle").textContent = R.level.target ? (R.success?"Cleared!":"Out!") : R.score>=20?"Simon's Boss":R.score>=10?"Sharp":R.score>=5?"Quick":"Rookie";
    $("resLine").textContent = R.level.target ? (R.success ? `All ${R.level.target} moves done!` : `${R.score} of ${R.level.target}. Out on: ${R.reason}`)
                                              : `${R.score} moves. Out on: ${R.reason}`;
    d.innerHTML = `<div class="stat"><span>Moves</span><b>${R.score}</b></div><div class="stat"><span>Your best</span><b>${best}</b></div>` +
      (R.level.stars ? `<div class="stat"><span>Stars at</span><b>${R.level.stars.join(" / ")}</b></div>` : `<div class="stat"><span>Lives left</span><b>${Math.max(0,R.lives)}</b></div>`);
  } else if(R.kind==="waiter"){
    $("resTitle").textContent = !R.success?"Fired!":R.stars===3?"Head Waiter":R.stars===2?"Pro":"Trainee";
    $("resLine").textContent = R.success ? `Done in ${fmt(R.time)}s.` : `The tray spilled. ${R.done} of ${R.total} obstacles cleared.`;
    d.innerHTML = `<div class="stat"><span>Time</span><b>${fmt(R.time)}s (par ${R.level.par}s)</b></div>
      <div class="stat"><span>Tea left</span><b>${Math.round((1-R.spill)*100)}%</b></div>
      <div class="stat"><span>Too slow</span><b>${R.slow}</b></div>
      <div class="stat"><span>Obstacles</span><b>${R.done}/${R.total}</b></div>`;
  }
  // success: "Next level" is the big button. fail: "Retry" is.
  const isParty = !!R.party;
  const nxt = !isParty && R.successAll ? nextAfter(R.game, R.level) : null;
  R.next = nxt;
  $("btnNext").hidden = !nxt; if(nxt) $("btnNext").textContent = nxt.g===R.game ? "Next level" : `Unlocked: ${nxt.g.title}!`;
  $("btnAgain").className = (!nxt && !isParty) ? "btn" : "btn ghost";
  $("btnAgain").hidden = isParty; $("btnShare").hidden = isParty; $("btnResBack").hidden = isParty;
  $("btnNextTurn").hidden = !isParty;
  if(isParty) $("btnNextTurn").textContent = party.idx+1 < party.players.length ? "Next player" : "See leaderboard";
}
function setCoach(c){
  $("coachCard").hidden=false; $("coachText").textContent=c.text;
  const ul=$("coachTips"); ul.innerHTML=""; c.tips.forEach(t=>{const li=document.createElement("li"); li.textContent=t; ul.appendChild(li);});
}
async function aiCoach(a){
  if(!CFG.AI_ENDPOINT) return null;
  try{ const res = await fetch(CFG.AI_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({analysis:a})});
    if(!res.ok) return null; const d=await res.json(); return d.text?{text:d.text,tips:d.tips||[],source:"ai"}:null; }catch(e){ return null; }
}
$("btnNext").onclick = ()=>{ const n = lastRes.next; if(n) launch(n.g, n.l); };
$("btnAgain").onclick = ()=>startPlay(lastRes.game, lastRes.level);
$("btnResBack").onclick = ()=>show("s-map");

/* ---------- share / challenge links ---------- */
$("btnShare").onclick = async ()=>{
  const R = lastRes;
  const text = `I scored ${R.scoreAll} on ${R.game.title}: ${R.level.title} in Motion Party. Can you beat me?`;
  const u = new URL(location.href); u.search=""; u.hash="";
  u.searchParams.set("g",R.game.id); u.searchParams.set("l",R.level.id); u.searchParams.set("c",R.scoreAll);
  try{ if(navigator.share){ await navigator.share({title:"Motion Party", text, url:u.toString()}); return; } }catch(e){ if(e.name==="AbortError") return; }
  try{ await navigator.clipboard.writeText(text+" "+u); toast("Link copied. Send it to a friend"); }catch(e){ toast(u.toString()); }
};
(function readChallenge(){
  const q = new URLSearchParams(location.search);
  const g = GAMES.find(x=>x.id===q.get("g")); if(!g) return;
  const l = g.levels.find(x=>x.id===q.get("l")); const c = parseInt(q.get("c"),10); if(!l||isNaN(c)) return;
  $("splashNext").dataset.challenge = "1";
  $("splashNext").textContent = `A friend scored ${c} on ${l.title}. Tap to beat it!`;
  $("btnTapPlay").onclick = async ()=>{ await wake(); startPlay(g,l); };
})();

/* ---------- party mode ---------- */
const party = {on:false, players:store.get("party",[]), idx:0, results:[], pick:0};
const PARTY_OPTS = GAMES.flatMap(g=>g.levels.filter(l=>l.partyOK).map(l=>({g,l})));
function openParty(){ renderParty(); show("s-party"); }
function renderParty(){
  const seg=$("partyGames"); seg.innerHTML="";
  PARTY_OPTS.forEach((o,i)=>{ const b=document.createElement("button"); b.textContent=o.g.title; b.setAttribute("aria-pressed", String(i===party.pick));
    b.onclick=()=>{party.pick=i; renderParty();}; seg.appendChild(b); });
  const l=$("playerList"); l.innerHTML="";
  party.players.forEach((p,i)=>{ const d=document.createElement("div"); d.className="chip";
    d.innerHTML=`<span></span><button aria-label="Remove">×</button>`; d.querySelector("span").textContent=p;
    d.querySelector("button").onclick=()=>{party.players.splice(i,1); store.set("party",party.players); renderParty();}; l.appendChild(d); });
  $("btnPartyStart").disabled = party.players.length<2;
}
function addPlayer(){ const v=$("playerName").value.trim(); if(!v) return; if(party.players.length>=12){toast("Max 12 players");return;}
  party.players.push(v); $("playerName").value=""; store.set("party",party.players); renderParty(); $("playerName").focus(); }
$("btnAdd").onclick=addPlayer;
$("playerName").addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); addPlayer(); } });
$("btnPartyBack").onclick=()=>show("s-map");
function beginParty(){ party.on=true; party.idx=0; party.results=[]; showTurn(); }
function showTurn(){ const o=PARTY_OPTS[party.pick]; $("turnName").textContent=party.players[party.idx]; $("turnGame").textContent=`${o.g.title} · ${o.l.title}`; show("s-turn"); }
$("btnPartyStart").onclick=()=>{ store.set("safetyOk",true); beginParty(); };
$("btnTurnGo").onclick=()=>{ const o=PARTY_OPTS[party.pick]; startPlay(o.g, o.l, party.players[party.idx]); };
$("btnNextTurn").onclick=()=>{ party.idx++; if(party.idx<party.players.length) showTurn(); else showBoard(); };
function showBoard(){
  const r=[...party.results].sort((a,b)=>b.score-a.score); const ol=$("boardList"); ol.innerHTML="";
  r.forEach((p,i)=>{ const li=document.createElement("li"); if(i===r.length-1) li.className="last";
    li.innerHTML=`<span></span><b>${p.score}</b>`; li.querySelector("span").textContent=`${i+1}. ${p.name}`; ol.appendChild(li); });
  $("loserLine").textContent = r.length ? `${r[r.length-1].name} pours the tea for everyone.` : "";
  party.on=false; show("s-board");
}
$("btnRematch").onclick=beginParty;

/* ---------- sensor lab ---------- */
const LAB_EVENTS = ["step","jump","down","up","turn","shake","flip"];
const LAB_LABEL = {step:"Steps",jump:"Jumps",down:"Down",up:"Up",turn:"Turns",shake:"Shakes",flip:"Flips"};
let labRaf=0, labBase={};
$("labGrid").innerHTML = LAB_EVENTS.map(e=>`<div class="lab-ev" id="lab-${e}"><b>0</b><span>${LAB_LABEL[e]}</span></div>`).join("") +
  `<div class="lab-ev" id="lab-still"><b>–</b><span>Still?</span></div>`;
function labEvent(type){
  if(screenNow!=="s-lab") return;
  const el=$("lab-"+type); if(!el) return;
  el.querySelector("b").textContent = Engine.counts[type]-(labBase[type]||0);
  el.classList.add("hit"); setTimeout(()=>el.classList.remove("hit"),350);
  if(type==="step") SFX.step(); else SFX.good();
}
function labReset(){ LAB_EVENTS.forEach(e=>{ labBase[e]=Engine.counts[e]||0; $("lab-"+e).querySelector("b").textContent="0"; }); }
function labTick(){
  const S=Engine.S;
  $("labLive").textContent =
`sensors   ${S.sim?"DEMO (no sensors)":S.got?"live":"waiting…"}
rotation  ${S.rr.toFixed(1)} °/s
accel     ${S.lin.toFixed(2)} m/s²   total ${S.aig.toFixed(1)}
vertical  a ${S.av.toFixed(2)}   v ${S.v.toFixed(2)} m/s
yaw       ${S.yaw.toFixed(0)}°   tilt ${(S.roll*57.3).toFixed(0)}°
jitter    ${S.jEma.toFixed(1)}   posture ${S.level}   face ${S.uz>0?"up":"down"}`;
  const st=$("lab-still"); const still = S.jEma < FREEZE_MAX;
  st.querySelector("b").textContent = still ? "yes" : "no"; st.classList.toggle("hit", still);
  labRaf = requestAnimationFrame(labTick);
}
function labStop(){ cancelAnimationFrame(labRaf); labRaf=0; }
$("btnLab").onclick = async ()=>{ await wake(); show("s-lab"); labReset(); labTick(); };
$("btnLabReset").onclick = labReset;

renderSplash();
