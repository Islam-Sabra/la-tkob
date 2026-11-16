"use strict";
/* =====================================================================
   APP: hub, navigation, play loop, results, party mode, sensor lab
   ===================================================================== */
const CFG = { AI_ENDPOINT: "" }; // optional Supabase edge function for the AI coach
const STARS = n => "★".repeat(n)+"☆".repeat(3-n);
const HUES = {tea:"var(--tea-light)", simon:"var(--simon)", waiter:"var(--waiter)"};
let screenNow = "s-hub";
function show(id){
  screenNow = id;
  document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("on",s.id===id));
  if(id==="s-hub") renderHub();
  if(id!=="s-lab") labStop();
}
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));

/* ---------- progress storage ---------- */
const prog = store.get("prog", {});
function getProg(g,l){ return (prog[g]||{})[l] || {stars:0,best:0}; }
function saveProg(g,l,stars,score){
  prog[g] = prog[g]||{}; const p = prog[g][l] || {stars:0,best:0};
  const newBest = score > p.best;
  prog[g][l] = {stars:Math.max(p.stars,stars), best:Math.max(p.best,score)}; store.set("prog",prog);
  return newBest && p.best>0;
}

/* ---------- hub ---------- */
function renderHub(){
  const l = $("gameList"); l.innerHTML="";
  readChallenge(l);
  GAMES.forEach(g=>{
    const total = g.levels.length*3, got = g.levels.reduce((s,lv)=>s+getProg(g.id,lv.id).stars,0);
    const b = document.createElement("button"); b.className="card game-card"; b.style.setProperty("--hue",HUES[g.id]);
    b.innerHTML = `<div class="ic">${ICONS[g.icon]}</div><div><div class="tag"></div><h3></h3><p></p><div class="stars small"></div></div>`;
    b.querySelector(".tag").textContent = g.tag; b.querySelector("h3").textContent = g.title;
    b.querySelector("p").textContent = g.desc; b.querySelector(".stars").textContent = `★ ${got}/${total}`;
    b.onclick = ()=>openGame(g); l.appendChild(b);
  });
  $("sfxToggle").checked = SFX.on;
}
$("sfxToggle").onchange = e=>{ SFX.on = e.target.checked; };

let curGame=null, curLevel=null;
function openGame(g){
  curGame = g;
  $("gTitle").textContent = g.title; $("gDesc").textContent = g.desc;
  const l = $("levelList"); l.innerHTML="";
  g.levels.forEach(lv=>{
    const p = getProg(g.id, lv.id);
    const b = document.createElement("button"); b.className="card level";
    b.innerHTML = `<div><h3></h3><p class="small muted"></p></div><div class="meta"><div class="stars"></div><div class="small muted"></div></div>`;
    b.querySelector("h3").textContent = lv.title; b.querySelector("p").textContent = lv.sub;
    b.querySelector(".stars").textContent = g.id==="simon" ? "" : STARS(p.stars);
    b.querySelector(".meta .muted").textContent = p.best ? `Best ${p.best}` : "";
    b.onclick = ()=>openLevel(g, lv); l.appendChild(b);
  });
  show("s-game");
}
function needsSpace(g,lv){ return !(g.id==="tea" && lv.id==="classic"); }
let afterSafety=null;
function openLevel(g, lv){
  curGame=g; curLevel=lv;
  if(needsSpace(g,lv) && !store.get("safetyOk",false)){ afterSafety=()=>openIntro(g,lv); show("s-safety"); return; }
  openIntro(g, lv);
}
$("btnSafetyOk").onclick = ()=>{ store.set("safetyOk",true); afterSafety && afterSafety(); };
function openIntro(g, lv){
  const chars = lv.chars||[];
  $("introAvatars").innerHTML = chars.map(c=>`<div class="avs">${CHARS[c].svg}</div>`).join("") ||
    `<div class="avs" style="color:${HUES[g.id]}">${ICONS[g.icon]}</div>`;
  $("introTitle").textContent = lv.title; $("introText").textContent = lv.sub;
  const rules = lv.rules || (g.id==="simon"
    ? ["Hold the phone in front of you so you can read it.","Do the move only if it starts with \"Simon says\".","Otherwise, don't move at all.","After \"Flip it face down\", flip it back when asked."]
    : ["Hold the phone flat like a tray.","Each obstacle has a move: do it, then the next one appears.","Faster = more points, but every drop counts."]);
  $("introRules").innerHTML = "<ul style='margin:0;padding-left:18px;line-height:1.8'></ul>";
  const ul = $("introRules").querySelector("ul"); rules.forEach(r=>{ const li=document.createElement("li"); li.textContent=r; ul.appendChild(li); });
  show("s-intro");
}
$("btnIntroGo").onclick = ()=>startPlay(curGame, curLevel);
$("btnIntroBack").onclick = ()=>openGame(curGame);

/* ---------- play ---------- */
let run = null; // {game, level, inst, phase, t0, raf, party}
const fmt = s => s>=60 ? `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}` : s.toFixed(1);
let bubbleT=null, flashT=null;
const UI = {
  canvas: $("playCanvas"),
  cmd(icon, text, step, opts={}){
    if(run && !run.inst.hasGlass){
      $("bigIcon").innerHTML = ICONS[icon];
      $("bigSays").textContent = opts.simon ? "Simon says" : "";
      $("bigSays").className = "says";
      $("bigWord").textContent = text.replace(/^Simon says: /,"");
      return;
    }
    $("cmd").hidden=false; $("cmdIcon").innerHTML = ICONS[icon]; $("cmdText").textContent = text;
    $("cmdStep").textContent = step ? `Move ${step}` : ""; $("cmdBar").style.width="0%"; $("cmdCnt").textContent="";
  },
  progress(p, cnt){ $("cmdBar").style.width = (p*100).toFixed(0)+"%"; $("cmdCnt").textContent = cnt||""; },
  timer(s){ $("timer").textContent = fmt(s); },
  spill(x){ $("spillFill").style.width = (x*100).toFixed(0)+"%"; },
  lives(n,max){ const el=$("lives"); el.hidden=false; el.textContent = "♥".repeat(Math.max(0,n)) + "♡".repeat(Math.max(0,max-n)); },
  score(n){ const el=$("scorebox"); el.hidden=false; el.textContent = n; },
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
  SFX.init();
  await Engine.enable();
  if(lv.mic) await Promise.race([Engine.enableMic(), new Promise(r=>setTimeout(()=>r(false),4000))]);
  if(run) cancelAnimationFrame(run.raf);
  show("s-play");
  // reset UI
  $("cmd").hidden=true; $("bubble").hidden=true; $("flash").className="flash"; $("count").textContent="";
  $("lives").hidden=true; $("scorebox").hidden=true; $("timer").textContent="";
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
    if(run.inst.hasGlass && run.inst.preview!==false){ /* idle glass while counting */ }
    if(left<=0){ run.phase="play"; SFX.go(); run.inst.begin(); }
  } else if(run.phase==="play"){
    run.inst.update(dt);
  }
  if(run && run.phase!=="done") run.raf = requestAnimationFrame(loop);
}
Engine.on((type,data)=>{
  if(run && run.phase==="play") run.inst.onEvent(type,data);
  labEvent(type);
});
document.addEventListener("visibilitychange",()=>{ if(!document.hidden && run && run.phase==="play") run.inst.away(); });
$("btnQuit").onclick = ()=>{ if(run){ cancelAnimationFrame(run.raf); run.phase="done"; } SFX.stop(); UI.shake(false); run=null; party.on=false; openGame(curGame); };

/* ---------- results ---------- */
let lastRes = null;
function endPlay(res){
  if(!run || run.phase==="done") return;
  run.phase="done"; cancelAnimationFrame(run.raf); SFX.stop(); UI.shake(false);
  const r = run; lastRes = {...res, game:r.game, level:r.level, party:r.party};
  const won = res.kind==="simon" ? res.score>=getProg(r.game.id,r.level.id).best && res.score>0 : res.success;
  setTimeout(()=> won ? SFX.win() : SFX.lose(), res.kind==="tea" && res.a.spill>=1 ? 650 : 200);
  const score = res.kind==="tea" ? res.a.score : res.score;
  const stars = res.kind==="tea" ? res.a.stars : res.kind==="waiter" ? res.stars : 0;
  if(!r.party && !(res.kind==="tea" && res.a.onTable)){ if(saveProg(r.game.id, r.level.id, stars, score)) setTimeout(()=>toast("New personal best!"),400); }
  if(r.party){ party.results.push({name:r.party, score}); }
  run = null;
  renderResult(lastRes);
  setTimeout(()=>show("s-result"), res.kind==="simon" ? 0 : 500);
}
function renderResult(R){
  const d = $("resDetails"); d.innerHTML=""; $("coachCard").hidden=true; $("resWarn").hidden=true; $("resNote").textContent="";
  const head = R.party ? R.party : R.level.title;
  if(R.kind==="tea"){
    const a = R.a;
    $("resWho").textContent = R.party ? head : `${head}  ${R.level.classic?"":STARS(a.stars)}`;
    $("resScore").textContent = a.score;
    $("resTitle").textContent = a.onTable ? "Cheater?" : titleFor(a.score);
    let line = a.spill>=1 ? `The tea spilled after ${a.duration} seconds.` :
      !R.success ? `Time's up. You finished ${R.stepsDone} of ${R.total} moves.` :
      a.spill>0.05 ? `Done, but you spilled ${Math.round(a.spill*100)}% of the tea.` : "Done, and not a drop spilled.";
    if(a.penalty) line += ` ${a.penalty} points off for noise or leaving the game.`;
    $("resLine").textContent = line;
    if(a.onTable){ $("resWarn").hidden=false; $("resWarn").textContent="Score voided: the phone seems to have been on a table. Hold it in your hand."; }
    const weakest = Object.entries(a.dims).sort((x,y)=>x[1]-y[1])[0][0];
    d.innerHTML = `<h3 style="margin:0 0 10px;font-size:16px">Breakdown</h3><div style="display:flex;flex-direction:column;gap:10px" id="meters"></div>`;
    for(const [k,v] of Object.entries(a.dims)){
      const col = v>=75?"var(--good)":v>=50?"var(--gold)":"var(--bad)";
      const row = document.createElement("div"); row.className="meter"+(k===weakest?" weak":"");
      row.innerHTML = `<span>${DIM_LABEL[k]}</span><div class="bar"><i style="width:${v}%;background:${col}"></i></div><b>${v}</b>`;
      d.querySelector("#meters").appendChild(row);
    }
    if(a.tremor){ const p=document.createElement("p"); p.className="small muted"; p.style.marginTop="10px";
      p.textContent=`Dominant hand-motion frequency: ${a.tremor.peakHz} Hz. Everyone has a slight natural tremor; caffeine, poor sleep and stress raise it.`; d.appendChild(p); }
    const c = localCoach(a); setCoach(c); aiCoach(a,c).then(x=>{ if(x && lastRes===R) setCoach(x); });
    $("resNote").textContent = "For fun and practice only. Not a medical assessment.";
  }
  else if(R.kind==="simon"){
    const best = getProg(R.game.id,R.level.id).best;
    $("resWho").textContent = head;
    $("resScore").textContent = R.score;
    $("resTitle").textContent = R.score>=20?"Simon's Boss":R.score>=10?"Sharp":R.score>=5?"Quick":"Rookie";
    $("resLine").textContent = `${R.score} correct move${R.score===1?"":"s"}. Out on: ${R.reason}`;
    d.innerHTML = `<div class="stat"><span>Moves</span><b>${R.score}</b></div><div class="stat"><span>Your best</span><b>${best}</b></div>`;
  }
  else if(R.kind==="waiter"){
    $("resWho").textContent = R.party ? head : `${head}  ${STARS(R.stars)}`;
    $("resScore").textContent = R.score;
    $("resTitle").textContent = !R.success?"Fired":R.stars===3?"Head Waiter":R.stars===2?"Pro":"Trainee";
    $("resLine").textContent = R.success ? `Course complete in ${fmt(R.time)}s.` : `The tray spilled. ${R.done} of ${R.total} obstacles cleared.`;
    d.innerHTML = `<div class="stat"><span>Time</span><b>${fmt(R.time)}s (par ${R.level.par}s)</b></div>
      <div class="stat"><span>Tea left</span><b>${Math.round((1-R.spill)*100)}%</b></div>
      <div class="stat"><span>Too slow</span><b>${R.slow}</b></div>
      <div class="stat"><span>Obstacles</span><b>${R.done}/${R.total}</b></div>`;
  }
  const isParty = !!R.party;
  $("btnNextTurn").hidden = !isParty; $("btnShare").hidden = isParty; $("btnAgain").hidden = isParty;
  $("btnResBack").hidden = isParty;
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
$("btnAgain").onclick = ()=>startPlay(lastRes.game, lastRes.level);
$("btnResBack").onclick = ()=>openGame(lastRes.game);

/* ---------- share / challenge links ---------- */
$("btnShare").onclick = async ()=>{
  const R = lastRes; const score = R.kind==="tea" ? R.a.score : R.score;
  const text = `I scored ${score} in ${R.game.title} (${R.level.title}) on Motion Party. Can you beat me?`;
  const u = new URL(location.href); u.search=""; u.hash="";
  u.searchParams.set("g",R.game.id); u.searchParams.set("l",R.level.id); u.searchParams.set("c",score);
  try{ if(navigator.share){ await navigator.share({title:"Motion Party", text, url:u.toString()}); return; } }catch(e){ if(e.name==="AbortError") return; }
  try{ await navigator.clipboard.writeText(text+" "+u); toast("Link copied. Send it to a friend"); }catch(e){ toast(u.toString()); }
};
function readChallenge(container){
  const q = new URLSearchParams(location.search);
  const g = GAMES.find(x=>x.id===q.get("g")); if(!g) return;
  const lv = g.levels.find(x=>x.id===q.get("l")); const c = parseInt(q.get("c"),10); if(!lv||isNaN(c)) return;
  const b = document.createElement("button"); b.className="card"; b.style.borderColor="var(--gold)";
  b.textContent = `Challenge: a friend scored ${c} in ${g.title} · ${lv.title}. Tap to play.`;
  b.onclick = ()=>openLevel(g, lv); container.appendChild(b);
}

/* ---------- party mode ---------- */
const party = {on:false, players:store.get("party",[]), idx:0, results:[], pick:0};
const PARTY_OPTS = GAMES.flatMap(g=>g.levels.filter(l=>l.partyOK).map(l=>({g,l})));
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
$("btnParty").onclick=()=>{ renderParty(); show("s-party"); };
function beginParty(){ party.on=true; party.idx=0; party.results=[]; showTurn(); }
function showTurn(){ const o=PARTY_OPTS[party.pick]; $("turnName").textContent=party.players[party.idx]; $("turnGame").textContent=`${o.g.title} · ${o.l.title}`; show("s-turn"); }
$("btnPartyStart").onclick=()=>{ const o=PARTY_OPTS[party.pick]; curGame=o.g; curLevel=o.l;
  if(needsSpace(o.g,o.l) && !store.get("safetyOk",false)){ afterSafety=beginParty; show("s-safety"); } else beginParty(); };
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
$("btnLab").onclick = async ()=>{ SFX.init(); await Engine.enable(); show("s-lab"); labReset(); labTick(); };
$("btnLabReset").onclick = labReset;

renderHub();
