"use strict";
/* =====================================================================
   CORE: helpers, storage, sound effects, movement engine, renderer, analysis
   ===================================================================== */
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const rand = (a,b) => a + Math.random()*(b-a);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const store = {
  get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
};
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("on");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("on"),2400);}
function vibrate(p){ if(navigator.vibrate) try{navigator.vibrate(p)}catch(e){} }

/* ================= SOUND EFFECTS (synthesized) ================= */
const SFX = (()=>{
  let ac=null, master=null, noiseBuf=null, slosh=null, rumble=null, lastDrip=0, lastWarn=0, lastStep=0;
  let on = store.get("sfx", true);
  function init(){
    if(ac){ if(ac.state==="suspended") ac.resume(); return; }
    try{ ac = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
    master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate*2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    slosh = loopNoise("bandpass", 650, 1.2); rumble = loopNoise("lowpass", 90, 0.7);
  }
  function loopNoise(type, freq, q){
    const src = ac.createBufferSource(); src.buffer=noiseBuf; src.loop=true;
    const f = ac.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q;
    const g = ac.createGain(); g.gain.value=0; src.connect(f); f.connect(g); g.connect(master); src.start();
    return {g,f};
  }
  const ok = ()=> ac && on;
  function tone(freq, dur, {type="sine", vol=0.3, at=0, slide=0, attack=0.005}={}){
    if(!ok()) return; const t=ac.currentTime+at;
    const o=ac.createOscillator(), g=ac.createGain(); o.type=type; o.frequency.setValueAtTime(freq,t);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide), t+dur);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+attack); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+dur+0.05);
  }
  function burst(dur, freq, {vol=0.4, type="lowpass", at=0}={}){
    if(!ok()) return; const t=ac.currentTime+at;
    const s=ac.createBufferSource(); s.buffer=noiseBuf; const f=ac.createBiquadFilter(); f.type=type; f.frequency.value=freq;
    const g=ac.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t,Math.random()); s.stop(t+dur+0.05);
  }
  const api = {
    init,
    get on(){return on}, set on(v){on=v; store.set("sfx",v); if(!v) api.stop();},
    count(){ tone(660,0.14,{type:"square",vol:0.12}); },
    go(){ tone(990,0.35,{type:"square",vol:0.14}); tone(1320,0.35,{vol:0.12,at:0.05}); },
    cmd(){ tone(740,0.12,{type:"triangle",vol:0.2}); tone(988,0.16,{type:"triangle",vol:0.2,at:0.1}); },
    good(){ tone(880,0.12,{type:"triangle",vol:0.2}); tone(1318,0.22,{type:"triangle",vol:0.2,at:0.08}); },
    fail(){ tone(160,0.35,{type:"sawtooth",vol:0.16,slide:0.6}); },
    tick(){ tone(1200,0.04,{type:"square",vol:0.05}); },
    clink(){ tone(2600,0.5,{vol:0.12}); tone(3900,0.35,{vol:0.06,at:0.01}); },
    update(amp, vel, nearRim, turb){
      if(!ac) return; const t=ac.currentTime;
      const s = on ? clamp(amp*5 + Math.abs(vel)*0.25, 0, 0.7) : 0;
      slosh.g.gain.setTargetAtTime(s, t, 0.05); slosh.f.frequency.setTargetAtTime(500+amp*3000, t, 0.1);
      rumble.g.gain.setTargetAtTime(on && turb ? 0.8 : 0, t, 0.15);
      if(nearRim>0){ const gap = 420 - nearRim*340, now=performance.now();
        if(now-lastWarn>gap){ lastWarn=now; tone(1400,0.06,{type:"square",vol:0.07}); } }
    },
    drip(){ const now=performance.now(); if(now-lastDrip<90) return; lastDrip=now; tone(900+Math.random()*500,0.12,{vol:0.18,slide:0.4}); },
    splash(){ burst(0.6,1800,{vol:0.5}); burst(0.4,600,{vol:0.4,at:0.05}); },
    step(){ const now=performance.now(); if(now-lastStep<150) return; lastStep=now; burst(0.07,300,{vol:0.25}); },
    whoosh(){ burst(0.35,1200,{vol:0.25,type:"bandpass"}); },
    seatbelt(){ tone(1046,0.6,{vol:0.18}); tone(784,0.8,{vol:0.18,at:0.35}); },
    bump(){ tone(70,0.35,{vol:0.6,slide:0.5}); burst(0.15,900,{vol:0.3}); setTimeout(()=>api.clink(),60); },
    buzz(){ tone(140,0.25,{type:"sawtooth",vol:0.12}); },
    away(){ tone(440,0.15,{type:"triangle",vol:0.15}); tone(330,0.25,{type:"triangle",vol:0.15,at:0.15}); },
    win(){ [523,659,784,1046].forEach((f,i)=>tone(f,0.35,{type:"triangle",vol:0.18,at:i*0.11})); setTimeout(()=>api.clink(),480); },
    lose(){ [392,370,349,294].forEach((f,i)=>tone(f,i===3?0.7:0.3,{type:"sawtooth",vol:0.09,at:i*0.28,slide:i===3?0.85:1})); },
    stop(){ if(!ac) return; slosh.g.gain.setTargetAtTime(0,ac.currentTime,0.05); rumble.g.gain.setTargetAtTime(0,ac.currentTime,0.1); },
  };
  return api;
})();

/* ================= MOVEMENT ENGINE =================
   Turns raw motion data into body actions:
   step, jump, down (squat / lower), up (stand / raise), turn, shake, flip
   plus continuous state: jitter, roll, yaw, vertical velocity, steps.      */
const Engine = (()=>{
  const T = { // thresholds, tunable from the Sensor Lab
    stepPeak:1.3, stepRefractory:300,
    freefall:3.5, freefallMs:60, landing:15,
    vertV:0.42, vertMs:140, vertDepth:0.12,
    turnDeg:150, turnWindow:2600,
    shakePeak:10, shakeCount:5,
  };
  const S = {
    got:false, sim:false, last:0,
    rr:0, lin:0, aig:9.8, av:0, v:0, disp:0,
    roll:0, pitch:0, uz:1, yaw:0, jitter:0, jEma:0,
    steps:0, mic:0, level:"stand",
  };
  const listeners = new Set();
  const on = fn => (listeners.add(fn), ()=>listeners.delete(fn));
  const counts = {step:0,jump:0,down:0,up:0,turn:0,shake:0,flip:0};
  function emit(type, data={}){
    counts[type] = (counts[type]||0)+1;
    for(const fn of listeners) try{ fn(type, data); }catch(e){ console.error(e); }
  }
  // internal detector state
  let g = [0,0,9.8], lastStep=0, stepArmed=true, lastJump=0;
  let ffStart=0, ffSeen=0;
  let vPhase=null; // {dir, t0, disp}
  let yawHist=[], shakeTimes=[], lastShakePeak=0, flipT=0, flipped=false;

  function process(aig, lin, rot, dt, now){
    // gravity (up) vector
    if(lin){ g = [aig[0]-lin[0], aig[1]-lin[1], aig[2]-lin[2]]; }
    else { const k = 1-Math.exp(-dt/0.25); g = g.map((v,i)=>v+(aig[i]-v)*k); lin = aig.map((v,i)=>v-g[i]); }
    const gm = Math.hypot(...g)||9.8; const u = g.map(v=>v/gm);
    const av = lin[0]*u[0]+lin[1]*u[1]+lin[2]*u[2];
    const linMag = Math.hypot(...lin), aigMag = Math.hypot(...aig);
    const w = [rot.beta||0, rot.gamma||0, rot.alpha||0]; // deg/s around x,y,z
    const rr = Math.hypot(...w);
    const yawRate = w[0]*u[0]+w[1]*u[1]+w[2]*u[2];
    S.rr=rr; S.lin=linMag; S.aig=aigMag; S.av=av; S.uz=u[2];
    S.roll = Math.atan2(u[0], Math.abs(u[2])+1e-6); S.pitch = Math.atan2(u[1], Math.abs(u[2])+1e-6);
    S.yaw += yawRate*dt;
    S.jitter = rr + linMag*6; S.jEma += (S.jitter-S.jEma)*Math.min(1,dt*8);
    // vertical velocity with leak (kills drift)
    S.v += av*dt; S.v *= Math.exp(-dt/(Math.abs(av)<0.15?0.35:1.2));

    // JUMP: free-fall then landing
    if(aigMag < T.freefall){ if(!ffStart) ffStart=now; if(now-ffStart>=T.freefallMs) ffSeen=now; }
    else ffStart=0;
    if(ffSeen && now-lastJump>700){
      if(aigMag > T.landing || now-ffSeen>140){ lastJump=now; ffSeen=0; S.v=0; vPhase=null; emit("jump"); }
    }
    if(ffSeen && now-ffSeen>800) ffSeen=0;
    const nearJump = now-lastJump<600 || ffStart;

    // STEP: peaks in linear acceleration
    if(!nearJump){
      if(stepArmed && linMag>T.stepPeak && now-lastStep>T.stepRefractory && !vPhase){ stepArmed=false; lastStep=now; S.steps++; emit("step"); }
      else if(!stepArmed && linMag<T.stepPeak*0.45) stepArmed=true;
    }

    // DOWN / UP: sustained vertical velocity (squat, stand, raise, lower)
    if(!nearJump){
      const dir = S.v < -T.vertV ? -1 : S.v > T.vertV ? 1 : 0;
      if(dir && (!vPhase || vPhase.dir!==dir)) vPhase = {dir, t0:now, disp:0};
      if(vPhase){
        vPhase.disp += S.v*dt;
        if(Math.abs(S.v) < T.vertV*0.45){
          if(now-vPhase.t0 >= T.vertMs && Math.abs(vPhase.disp) >= T.vertDepth){
            const type = vPhase.dir<0 ? "down" : "up";
            S.level = type==="down" ? (S.level==="high"?"stand":"low") : (S.level==="low"?"stand":"high");
            emit(type, {depth:Math.abs(vPhase.disp)});
          }
          vPhase=null;
        }
      }
    }

    // TURN: yaw range over a short window
    yawHist.push([now,S.yaw]); while(yawHist.length && now-yawHist[0][0]>T.turnWindow) yawHist.shift();
    let mn=Infinity,mx=-Infinity; for(const [,y] of yawHist){ if(y<mn)mn=y; if(y>mx)mx=y; }
    if(mx-mn >= T.turnDeg){ yawHist=[[now,S.yaw]]; emit("turn",{deg:mx-mn}); }

    // SHAKE: many strong peaks quickly
    if(linMag>T.shakePeak && now-lastShakePeak>110){ lastShakePeak=now; shakeTimes.push(now); }
    shakeTimes = shakeTimes.filter(t=>now-t<1500);
    if(shakeTimes.length>=T.shakeCount){ shakeTimes=[]; emit("shake"); }

    // FLIP: screen facing down
    if(u[2] < -0.6){ if(!flipT) flipT=now; if(!flipped && now-flipT>300){ flipped=true; emit("flip"); } }
    else { flipT=0; if(u[2]>0.3) flipped=false; }
  }

  function onMotion(e){
    const A = e.accelerationIncludingGravity||{}, L = e.acceleration;
    if(A.x==null && !(e.rotationRate && e.rotationRate.alpha!=null)) return; // browser without real sensors
    const now = performance.now(), dt = S.last ? Math.min(0.1,(now-S.last)/1000) : 0.016;
    S.last = now; S.got = true; S.sim = false;
    const sg = isIOS ? -1 : 1;
    const aig = [sg*(A.x||0), sg*(A.y||0), sg*(A.z||0)];
    const lin = L && L.x!=null ? [sg*L.x, sg*L.y, sg*L.z] : null;
    process(aig, lin, e.rotationRate||{}, dt, now);
  }

  async function enable(){
    try{
      if(typeof DeviceMotionEvent!=="undefined" && typeof DeviceMotionEvent.requestPermission==="function"){
        const p = await DeviceMotionEvent.requestPermission();
        if(p!=="granted") toast("Motion access denied: demo mode. Reload and tap Allow.");
      }
    }catch(e){}
    window.removeEventListener("devicemotion", onMotion);
    window.addEventListener("devicemotion", onMotion);
    setTimeout(()=>{ if(!S.got) S.sim = true; }, 900);
  }

  /* ---- Desktop simulator: mouse = hand tremor, keys = body moves ---- */
  let mPrev=null;
  window.addEventListener("pointermove", e=>{
    if(!S.sim) return; const now=performance.now();
    if(mPrev){ const dt=(now-mPrev.t)/1000||0.016; const v=Math.hypot(e.clientX-mPrev.x,e.clientY-mPrev.y)/dt; S.rr=v/40; S.jitter=S.rr; }
    S.roll=((e.clientX/window.innerWidth)-0.5)*0.6; mPrev={x:e.clientX,y:e.clientY,t:now};
  });
  setInterval(()=>{ if(S.sim){ S.jEma += (S.jitter-S.jEma)*0.3; S.jitter*=0.7; S.rr*=0.7; } }, 50);
  window.addEventListener("keydown", e=>{
    if(!S.sim || e.target.tagName==="INPUT") return;
    const k=e.key.toLowerCase();
    const act = {w:"step", j:"jump", s:"down", u:"up", t:"turn", k:"shake", f:"flip"}[k];
    if(!act) return;
    if(act==="step") S.steps++;
    if(act==="turn") S.yaw += 180;
    if(act==="down") S.level = S.level==="high"?"stand":"low";
    if(act==="up") S.level = S.level==="low"?"stand":"high";
    S.jitter = act==="step"?6: act==="jump"?20: 4;
    emit(act, {sim:true});
  });

  // Microphone loudness
  let micAn=null, micBuf=null;
  async function enableMic(){
    if(micAn) return true;
    try{
      const st = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false}});
      const ac = new (window.AudioContext||window.webkitAudioContext)();
      const src = ac.createMediaStreamSource(st); micAn = ac.createAnalyser(); micAn.fftSize=1024;
      micBuf = new Float32Array(micAn.fftSize); src.connect(micAn); return true;
    }catch(e){ return false; }
  }
  function readMic(){
    if(!micAn) return S.mic; micAn.getFloatTimeDomainData(micBuf);
    let s=0; for(let i=0;i<micBuf.length;i++) s+=micBuf[i]*micBuf[i];
    return S.mic = Math.sqrt(s/micBuf.length);
  }
  window.addEventListener("wheel",()=>{ if(S.sim){ S.mic=0.4; setTimeout(()=>S.mic=0,400);} });

  return {S, T, on, emit, enable, enableMic, readMic, counts};
})();

/* ================= GLASS / TRAY RENDERER ================= */
function makeGlass(canvas, opts={}){
  const ctx = canvas.getContext("2d");
  const st = {theta:0, amp:0, phase:0, level:-0.86, spill:0, drops:[], count:opts.count||1};
  let rect;
  function size(){
    const r = canvas.getBoundingClientRect(), d = window.devicePixelRatio||1;
    canvas.width = Math.max(1,r.width*d); canvas.height = Math.max(1,r.height*d);
    ctx.setTransform(d,0,0,d,0,0); return rect=r;
  }
  size(); window.addEventListener("resize", size);
  function glassPath(s,cx,cy,inset){
    const p = new Path2D(); const k = 1-inset;
    const X = x => cx + x*s*k, Y = y => cy + y*s*(1-inset*0.5);
    p.moveTo(X(-0.56),Y(-1)); p.lineTo(X(0.56),Y(-1));
    p.bezierCurveTo(X(0.56),Y(-0.55),X(0.34),Y(-0.25),X(0.36),Y(0.15));
    p.bezierCurveTo(X(0.38),Y(0.55),X(0.52),Y(0.6),X(0.46),Y(0.86));
    p.quadraticCurveTo(X(0.42),Y(1),X(0),Y(1));
    p.quadraticCurveTo(X(-0.42),Y(1),X(-0.46),Y(0.86));
    p.bezierCurveTo(X(-0.52),Y(0.6),X(-0.38),Y(0.55),X(-0.36),Y(0.15));
    p.bezierCurveTo(X(-0.34),Y(-0.25),X(-0.56),Y(-0.55),X(-0.56),Y(-1));
    p.closePath(); return p;
  }
  function geom(){
    const w=rect.width, h=rect.height, n=st.count;
    if(n===1){ const s=Math.min(h*0.40, w*0.62); return {s, cy:h*0.46, xs:[w/2], tray:false}; }
    const s=Math.min(h*0.30, w/(n*1.35)); const gap=s*1.3;
    return {s, cy:h*0.42, xs:Array.from({length:n},(_,i)=>w/2+(i-(n-1)/2)*gap), tray:true};
  }
  function drawOne(s,cx,cy,idx){
    const inner = glassPath(s,cx,cy,0.05);
    ctx.save(); ctx.clip(inner);
    const level = st.level + st.spill*0.38, tan = Math.tan(st.theta);
    ctx.beginPath(); const left=cx-s*0.7, right=cx+s*0.7;
    ctx.moveTo(left, cy+s*1.2);
    for(let x=left; x<=right+1; x+=4){
      const u=(x-cx)/s, ph=st.phase+idx*1.7;
      const y = level - u*tan + st.amp*Math.sin(u*9+ph) + st.amp*0.5*Math.sin(u*17-ph*1.3);
      ctx.lineTo(x, cy+y*s);
    }
    ctx.lineTo(right, cy+s*1.2); ctx.closePath();
    const g = ctx.createLinearGradient(0,cy-s,0,cy+s);
    g.addColorStop(0,"#e8873a"); g.addColorStop(0.5,"#c4521c"); g.addColorStop(1,"#7a2a0b");
    ctx.fillStyle=g; ctx.fill(); ctx.restore();
    const outer = glassPath(s,cx,cy,0);
    ctx.strokeStyle="#f3ead8cc"; ctx.lineWidth=2.5; ctx.stroke(outer);
    ctx.fillStyle="#ffffff0c"; ctx.fill(outer);
    ctx.strokeStyle="#ffffff55"; ctx.lineWidth=3; ctx.beginPath();
    ctx.moveTo(cx-s*0.40,cy-s*0.85); ctx.quadraticCurveTo(cx-s*0.28,cy-s*0.4,cx-s*0.26,cy-s*0.05); ctx.stroke();
    ctx.strokeStyle="#e3b04b"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(cx-s*0.56,cy-s*0.96); ctx.lineTo(cx+s*0.56,cy-s*0.96); ctx.stroke();
  }
  function draw(dt){
    const w=rect.width, h=rect.height; ctx.clearRect(0,0,w,h);
    st.phase += dt*7;
    const G = geom(); const {s,cy} = G;
    const base = cy+s*1.08, span = G.tray ? (G.xs[G.xs.length-1]-G.xs[0])/2 + s*0.8 : s*0.95;
    ctx.save(); ctx.translate(w/2, base); ctx.rotate(G.tray ? st.theta*0.25 : 0);
    if(G.tray){ ctx.fillStyle="#b9c3c6"; ctx.fillRect(-span, -2, span*2, 8); ctx.fillStyle="#ffffff22"; ctx.fillRect(-span, 6, span*2, 3); }
    else { ctx.fillStyle="#ffffff10"; ctx.beginPath(); ctx.ellipse(0,0,span,s*0.16,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#e3b04b88"; ctx.lineWidth=2; ctx.stroke(); }
    if(st.spill>0.01){ ctx.fillStyle="#c4521caa"; ctx.beginPath();
      ctx.ellipse(0,G.tray?4:2,span*Math.min(1,0.3+st.spill),(G.tray?6:s*0.12)*Math.min(1,0.3+st.spill),0,0,Math.PI*2); ctx.fill(); }
    ctx.restore();
    G.xs.forEach((cx,i)=>drawOne(s,cx,cy,i));
    ctx.fillStyle="#d5642a";
    st.drops = st.drops.filter(d=>{ d.vy+=1800*dt; d.x+=d.vx*dt; d.y+=d.vy*dt;
      ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2); ctx.fill(); return d.y<base+4; });
  }
  function spawnDrop(side){
    const G=geom(); const cx = side<0 ? G.xs[0] : G.xs[G.xs.length-1];
    st.drops.push({x:cx+side*G.s*0.56, y:G.cy-G.s*0.98, vx:side*rand(60,150), vy:-rand(80,140), r:rand(2,5)});
  }
  return {st, draw, spawnDrop, resize:size};
}

/* Tea physics shared by Tea & Waiter games */
function makeTea(glass){
  const t = {glass, thVel:0, spill:0, splashed:false, roll0:0, dist:0, extraAmp:0};
  t.reset = ()=>{ Object.assign(glass.st,{theta:0,amp:0,spill:0,drops:[]}); t.thVel=0; t.spill=0; t.splashed=false; t.extraAmp=0; t.roll0=Engine.S.roll; };
  t.kick = (v)=>{ t.thVel += v; };
  t.slosh = (a)=>{ t.extraAmp = Math.max(t.extraAmp, a); };
  t.step = (dt, {active=true, accW=1.5, turb=false}={})=>{
    const S = Engine.S, st = glass.st;
    const target = active ? clamp(S.roll - t.roll0 + t.dist, -0.8, 0.8) : 0;
    const acc = -38*(st.theta-target) - 5.5*t.thVel;
    t.thVel += acc*dt; st.theta += t.thVel*dt;
    const j = S.rr + S.lin*accW + Math.abs(S.av)*2.5;
    t.extraAmp *= Math.exp(-dt*1.5);
    let ampT = clamp(j*0.009 + t.extraAmp, 0, 0.2); if(turb) ampT = Math.max(ampT, 0.03);
    st.amp += (ampT-st.amp)*Math.min(1,dt*6);
    let near = 0;
    if(active){
      const lv = st.level + t.spill*0.38, tn=Math.tan(st.theta);
      const yL = lv + 0.56*tn - st.amp, yR = lv - 0.56*tn - st.amp;
      const top = Math.min(yL,yR); near = clamp((-0.92-top)/0.08,0,1);
      const over = Math.max(0, -1.0 - top);
      if(over>0){ t.spill = Math.min(1, t.spill + over*dt*5.5);
        if(Math.random()<0.6){ glass.spawnDrop(yL<yR?-1:1); SFX.drip(); }
        if(Math.random()<0.1) vibrate(15);
        if(t.spill>=1 && !t.splashed){ t.splashed=true; SFX.splash(); } }
      st.spill = t.spill;
    }
    SFX.update(st.amp, t.thVel, near, turb);
    glass.draw(dt);
  };
  return t;
}

/* ================= STEADINESS ANALYSIS (on-device coach) ================= */
function mean(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}
function median(a){if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y);return b[Math.floor(b.length/2)]}
function resample(samples, key, hz){
  if(samples.length<4) return [];
  const T = samples[samples.length-1].t, out=[]; let i=0;
  for(let t=0;t<=T;t+=1/hz){ while(i<samples.length-2 && samples[i+1].t<t) i++;
    const a=samples[i], b=samples[i+1]; const f=b.t>a.t?(t-a.t)/(b.t-a.t):0; out.push(a[key]+(b[key]-a[key])*clamp(f,0,1)); }
  return out;
}
function spectrum(x, hz, fmin, fmax, step){
  const m = mean(x); const y = x.map(v=>v-m); const res=[];
  for(let f=fmin; f<=fmax; f+=step){ let re=0,im=0; const w=2*Math.PI*f/hz;
    for(let n=0;n<y.length;n++){ re+=y[n]*Math.cos(w*n); im-=y[n]*Math.sin(w*n); }
    res.push({f, p:(re*re+im*im)/y.length}); }
  return res;
}
function analyze(samples, duration, spill, roundSec){
  const js = samples.map(s=>s.j);
  const meanJ = mean(js);
  const stability = Math.round(100*Math.exp(-meanJ/6));
  const meanDev = mean(samples.map(s=>Math.abs(s.dRoll)))*57.3;
  const balance = Math.round(clamp(100*Math.exp(-meanDev/5),0,100));
  const third = Math.max(1,Math.floor(js.length/3));
  const first = mean(js.slice(0,third)), last = mean(js.slice(-third));
  const fatigue = first>0 ? last/first : 1;
  const endurance = Math.round(clamp(100 - Math.max(0,fatigue-1)*55, 0, 100));
  const med = median(js); const spikes = js.filter(v=>v>Math.max(1.5,med*3)).length;
  const spikesPerSec = spikes/Math.max(1,duration);
  const smoothness = Math.round(clamp(100 - spikesPerSec*12, 0, 100));
  let tremor = null;
  const hz = 50; const rs = resample(samples,"rr",hz);
  const rate = samples.length/Math.max(0.1,duration);
  if(!Engine.S.sim && rs.length>hz*4 && rate>30){
    const sp = spectrum(rs, hz, 3, Math.min(15, rate/2-1), 0.25);
    const peak = sp.reduce((a,b)=>b.p>a.p?b:a, sp[0]);
    tremor = {peakHz:+peak.f.toFixed(1)};
  }
  const onTable = !Engine.S.sim && meanJ < 0.12 && Math.max(0,...js) < 0.6;
  let score = (stability*0.6 + balance*0.25 + smoothness*0.15)*(1-0.6*spill);
  if(spill>=1) score *= clamp(duration/roundSec,0,1)*0.8;
  score = Math.round(clamp(score,0,100));
  return {score, dims:{stability,balance,endurance,smoothness}, meanJ:+meanJ.toFixed(2), meanDevDeg:+meanDev.toFixed(1),
          fatigue:+fatigue.toFixed(2), spikesPerSec:+spikesPerSec.toFixed(2), spill:+spill.toFixed(2), duration:+duration.toFixed(1), tremor, onTable};
}
function titleFor(s){
  if(s>=95) return "Surgeon's Hand"; if(s>=85) return "Sniper"; if(s>=70) return "Steady";
  if(s>=50) return "Not Bad"; if(s>=30) return "A Bit Shaky"; return "Earthquake";
}
const DIM_LABEL = {stability:"Stability", balance:"Balance", endurance:"Endurance", smoothness:"Smoothness"};
const TIPS = {
  stability:["Tuck your elbows into your sides. Your hands will shake far less.","Breathe out slowly and hold still halfway, like a sniper.","Hold the phone with both hands, fingers underneath."],
  balance:["Watch the gold rim of the glass, not the tea.","Relax your shoulders. Tense shoulders tilt your hands.","When you move, keep the phone level by bending your knees, not your wrists."],
  endurance:["Your hand tires near the end. Hold lightly: gripping hard causes tremor.","Brace your arms against your chest instead of holding them out."],
  smoothness:["Don't over-correct when the tea sloshes. Small, slow corrections work better.","Move your legs slowly and let your arms float. Sudden steps travel up to the glass."],
};
function localCoach(a){
  const dims = Object.entries(a.dims).sort((x,y)=>x[1]-y[1]);
  const [weakKey, weakVal] = dims[0]; const [strongKey] = dims[dims.length-1];
  let text;
  if(a.onTable) text = "The readings were unnaturally still, so the phone was probably on a table. Real hands always have a slight tremor.";
  else if(a.score>=85) text = `Strong round. Best area: ${DIM_LABEL[strongKey]}. To reach "Surgeon's Hand", work on ${DIM_LABEL[weakKey]}.`;
  else if(a.spill>=1) text = `The tea spilled. ${DIM_LABEL[weakKey]} (${weakVal}) needs the most work.`;
  else text = `Best: ${DIM_LABEL[strongKey]}. Weakest: ${DIM_LABEL[weakKey]} (${weakVal}). Focus on it next round.`;
  const tips = [pick(TIPS[weakKey])];
  if(a.dims.endurance<70 && weakKey!=="endurance") tips.push(TIPS.endurance[0]);
  return {text, tips, weakKey, source:"local"};
}

/* ================= COMMAND PICTOGRAMS ================= */
const ICONS = (()=>{
  const sw = 'fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"';
  const head = (x,y)=>`<circle cx="${x}" cy="${y}" r="7" fill="currentColor"/>`;
  return {
    walk:`<svg viewBox="0 0 100 100"><g ${sw}>${head(52,16)}<path d="M50 26 L46 52 L58 72 L56 90"/><path d="M46 52 L34 70 L24 88"/><path d="M48 32 L34 46"/><path d="M50 32 L66 44"/></g></svg>`,
    turn:`<svg viewBox="0 0 100 100"><g ${sw}><path d="M78 50 A28 28 0 1 1 64 26"/><path d="M60 14 L66 27 L52 31"/></g></svg>`,
    jump:`<svg viewBox="0 0 100 100"><g ${sw}>${head(50,14)}<path d="M50 24 L50 52"/><path d="M50 52 L38 64 L42 76"/><path d="M50 52 L62 64 L58 76"/><path d="M50 30 L32 18"/><path d="M50 30 L68 18"/><path d="M30 92 L70 92"/></g></svg>`,
    down:`<svg viewBox="0 0 100 100"><g ${sw}>${head(48,36)}<path d="M48 46 L50 66"/><path d="M50 66 L68 66 L66 88"/><path d="M50 66 L36 76 L40 88"/><path d="M48 52 L70 54"/><path d="M84 20 L84 46 M76 38 L84 46 L92 38"/></g></svg>`,
    up:`<svg viewBox="0 0 100 100"><g ${sw}>${head(46,26)}<path d="M46 36 L46 66"/><path d="M46 66 L38 90 M46 66 L54 90"/><path d="M46 42 L34 22 M46 42 L58 22"/><path d="M84 46 L84 20 M76 28 L84 20 L92 28"/></g></svg>`,
    freeze:`<svg viewBox="0 0 100 100"><g ${sw}><path d="M50 12 L50 88 M17 31 L83 69 M17 69 L83 31"/><path d="M42 18 L50 26 L58 18 M42 82 L50 74 L58 82"/></g></svg>`,
    shake:`<svg viewBox="0 0 100 100"><g ${sw}><rect x="36" y="20" width="28" height="56" rx="6"/><path d="M22 34 L16 48 L22 62 M78 34 L84 48 L78 62"/></g></svg>`,
    flip:`<svg viewBox="0 0 100 100"><g ${sw}><rect x="22" y="56" width="56" height="22" rx="5"/><path d="M30 42 A26 26 0 0 1 72 34"/><path d="M64 24 L73 35 L60 40"/></g></svg>`,
    side:`<svg viewBox="0 0 100 100"><g ${sw}>${head(50,16)}<path d="M50 26 L50 62 M50 62 L44 90 M50 62 L56 90"/><path d="M50 34 L50 54"/><path d="M20 50 L36 50 M30 44 L36 50 L30 56 M80 50 L64 50 M70 44 L64 50 L70 56"/></g></svg>`,
    hold:`<svg viewBox="0 0 100 100"><g ${sw}><circle cx="50" cy="50" r="34"/><path d="M50 30 L50 52 L64 60"/></g></svg>`,
  };
})();
