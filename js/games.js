"use strict";
/* ================= CHARACTERS ================= */
function avatar(o){
  // o: skin, head ("ghutra"|"hijab"|"cap"|"pilot"), hc (head color), beard
  const head = {
    ghutra:`<path d="M10 30 Q32 2 54 30 L58 58 Q46 44 32 46 Q18 44 6 58 Z" fill="${o.hc}"/><rect x="13" y="18" width="38" height="5" rx="2.5" fill="#1d1d1d"/>`,
    hijab:`<path d="M8 34 Q32 -2 56 34 L58 64 L6 64 Z" fill="${o.hc}"/>`,
    cap:`<path d="M14 26 Q32 8 50 26 Z" fill="${o.hc}"/><rect x="30" y="22" width="24" height="5" rx="2" fill="${o.hc}"/>`,
    pilot:`<path d="M13 25 Q32 9 51 25 L51 28 L13 28 Z" fill="${o.hc}"/><rect x="28" y="16" width="8" height="5" rx="1" fill="#e3b04b"/>`,
  }[o.head];
  const beard = o.beard ? `<path d="M19 40 Q32 60 45 40 Q40 46 32 46 Q24 46 19 40Z" fill="${o.beard}"/>` : "";
  const front = o.head==="hijab" ? `<path d="M8 34 Q32 -2 56 34 L56 40 Q50 18 32 16 Q14 18 8 40Z" fill="${o.hc}"/>` : "";
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="#ffffff14"/>${o.head==="hijab"?head:""}<circle cx="32" cy="34" r="15" fill="${o.skin}"/>${o.head!=="hijab"?head:front}<circle cx="26.5" cy="33" r="1.8" fill="#1d1408"/><circle cx="37.5" cy="33" r="1.8" fill="#1d1408"/><path d="M27 40 Q32 43 37 40" stroke="#1d1408" stroke-width="1.6" fill="none" stroke-linecap="round"/>${beard}</svg>`;
}
const CHARS = {
  abuFahad:{name:"Abu Fahad", svg:avatar({skin:"#c99a6e",head:"ghutra",hc:"#f5f2ea",beard:"#e8e4dc"}), lines:{
    intro:["Bring the tea, son. Slowly."],
    shaky:["Easy! Why is your hand shaking?","Slowly, slowly.","Calm down, the tea isn't going anywhere."],
    veryShaky:["Whoa! Not on my carpet!","Stop, stop. Steady!"],
    steady:["That's a steady hand.","Good, keep coming."],
    tilt:["Straighten the glass, it's leaning!"],
    spill:["You spilled some!","The saucer is a lake now."],
    jump:["Did you just JUMP with my tea?!"],
    loud:["No chatting while carrying tea."],
    done:["Good.","Yes, like that.","Keep going."],
    away:["Where did you go? I'm still waiting!"],
    timeLow:["Hurry up, you're late!"],
    win:["Perfect pour. You can serve in my diwaniya any day."],
    lose:["That's not how tea should arrive. Try again."],
  }},
  captain:{name:"The Captain", svg:avatar({skin:"#e0b48a",head:"pilot",hc:"#1f3554"}), lines:{
    intro:["This is your captain. Light turbulence ahead. Crew, continue service."],
    turbWarn:["Turbulence incoming!","Fasten seatbelts, rough air ahead."],
    turbEnd:["Smooth air again. Carry on."],
  }},
  passenger:{name:"Sleepy Passenger", svg:avatar({skin:"#d9a77b",head:"cap",hc:"#5d6b73",beard:"#3a2a1c"}), lines:{
    shaky:["Careful, don't spill it on me!"], veryShaky:["My clothes! Watch it!"],
    steady:["Not a drop, even in turbulence."],
    spill:["Ouch! That's on my leg!","Napkin, please!"],
    jump:["Why is the flight attendant jumping?!"],
    loud:["Shh! I'm trying to sleep.","Keep it down."],
    done:["Mm-hm.","Okay..."],
    win:["Thanks. Best service I've ever had."], lose:["Forget it, I'll have juice."],
  }},
  mama:{name:"Mom", svg:avatar({skin:"#d8a878",head:"hijab",hc:"#2d4a3e"}), lines:{
    intro:["The guests are here. Bring the tea and don't embarrass me."],
    shaky:["Steady, dear, everyone's watching.","Gently!"],
    veryShaky:["No no no! Slowly!"],
    steady:["That's my boy.","Good, let them see how I raised you."],
    spill:["On the new carpet!","How embarrassing."],
    jump:["Are you jumping in front of the guests?!"],
    loud:["Lower your voice, we have guests.","Shh, don't laugh now."],
    done:["Good.","Nice and slow."],
    away:["Where did you vanish? The guests are waiting!"],
    timeLow:["Almost done, stay steady."],
    win:["You made me proud."], lose:["It's okay, dear. I'll pour. Go sit down."],
  }},
  khala:{name:"Aunt Noura", svg:avatar({skin:"#e3b892",head:"hijab",hc:"#8a2f4a"}), lines:{
    steady:["Steady hands, just like his father."],
    shaky:["Haha, he's shaking. Shy?"],
    spill:["Oops! I filmed that for the family group."],
    bump:["Oh sorry, dear, didn't see you!"],
  }},
  boss:{name:"Head Waiter", svg:avatar({skin:"#cf9f74",head:"cap",hc:"#2a2a2a"}), lines:{
    intro:["Three teas, table nine. Move!"],
    done:["Go go go!","Next!","Faster!"],
    spill:["You're losing tea!","That's coming out of your tips."],
    slow:["Too slow! Customers are waiting."],
    win:["Not bad, rookie."], lose:["You're fired. Just kidding. Try again."],
  }},
};

/* ================= COMMANDS ================= */
const CMD_DEF = {
  walk:{icon:"walk", label:s=>`Walk ${s.n} steps`},
  turn:{icon:"turn", label:()=>"Turn around"},
  side:{icon:"side", label:()=>"Turn sideways"},
  jump:{icon:"jump", label:()=>"Jump!"},
  down:{icon:"down", label:()=>"Squat down"},
  up:{icon:"up", label:()=>Engine.S.level==="low"?"Stand up":"Raise the phone up high"},
  freeze:{icon:"freeze", label:s=>`Freeze! ${s.sec}s`},
  shake:{icon:"shake", label:()=>"Shake it!"},
  flip:{icon:"flip", label:()=>"Flip the phone face down"},
  unflip:{icon:"flip", label:()=>"Flip it back up"},
  hold:{icon:"hold", label:s=>`Hold it steady (${s.sec}s)`},
};
const FREEZE_MAX = 9; // jitter above this = moving
function makeRunner(spec, {strictFreeze=false}={}){
  const S = Engine.S, def = CMD_DEF[spec.c];
  const r = {spec, def, label: spec.label || def.label(spec), icon: def.icon, done:false, failed:false, t:0,
    steps0:S.steps, yaw0:S.yaw, maxYaw:0, still:0};
  const target = spec.c==="turn" ? (spec.deg||150) : spec.c==="side" ? (spec.deg||70) : 0;
  r.onEvent = (type)=>{
    if(r.done) return;
    if((spec.c==="jump"&&type==="jump") || (spec.c==="down"&&type==="down") || (spec.c==="up"&&type==="up") ||
       (spec.c==="shake"&&type==="shake") || (spec.c==="flip"&&type==="flip")) r.done = true;
    if(spec.c==="turn" && type==="turn") r.done = true;
  };
  r.update = (dt)=>{
    if(r.done||r.failed) return;
    r.t += dt;
    switch(spec.c){
      case "walk": if(S.steps-r.steps0 >= spec.n) r.done=true; break;
      case "turn": case "side": r.maxYaw = Math.max(r.maxYaw, Math.abs(S.yaw-r.yaw0)); if(r.maxYaw>=target) r.done=true; break;
      case "freeze":
        if(S.jEma < FREEZE_MAX) r.still += dt; else if(strictFreeze && r.t>0.4) r.failed=true; else r.still = 0;
        if(r.still >= spec.sec) r.done=true; break;
      case "hold": if(r.t >= spec.sec) r.done=true; break;
      case "unflip": if(S.uz > 0.3 || S.sim) r.done=true; break;
    }
  };
  r.progress = ()=>{
    if(r.done) return 1;
    switch(spec.c){
      case "walk": return clamp((S.steps-r.steps0)/spec.n,0,1);
      case "turn": case "side": return clamp(r.maxYaw/target,0,1);
      case "freeze": return clamp(r.still/spec.sec,0,1);
      case "hold": return clamp(r.t/spec.sec,0,1);
      default: return 0;
    }
  };
  r.counter = ()=> spec.c==="walk" ? `${Math.min(S.steps-r.steps0,spec.n)}/${spec.n}` : "";
  return r;
}

/* ================= GAME 1: DON'T SPILL THE TEA ================= */
const TEA_LEVELS = [
  {id:"classic", classic:true, title:"Steady Hands", sub:"The original. Hold a full glass for 15 seconds without moving your feet.",
   rules:["Hold the phone flat.","Breathe slowly. Watch the rim."], chars:[], partyOK:true,
   script:[{c:"hold",sec:15,label:"Hold it steady"}], timeLimit:15},
  {id:"diwaniya", title:"Abu Fahad's Tea", sub:"Carry the tea through the house to Abu Fahad and serve it on the low table.",
   rules:["You'll walk about 7 steps and turn around: clear some space.","Squat slowly, the glass is full."],
   chars:["abuFahad"], main:"abuFahad", mic:true, timeLimit:70,
   script:[{c:"walk",n:4,label:"Walk 4 steps toward the diwaniya"},{c:"turn",label:"Turn around, he's behind you"},
           {c:"walk",n:3,label:"Walk 3 steps to Abu Fahad"},{c:"down",label:"Squat to put the tea on the low table"},
           {c:"freeze",sec:2,label:"Hold still while he takes it"}]},
  {id:"plane", title:"Turbulence at 30,000 ft", sub:"You're the flight attendant serving tea to a sleeping passenger while the plane shakes.",
   rules:["When the seatbelt chime sounds, tilt against the shake.","Make noise and you wake the passenger: points lost."],
   chars:["captain","passenger"], main:"passenger", mic:true, quietPenalty:6, turb:true, timeLimit:70,
   script:[{c:"hold",sec:5,label:"Seatbelt sign is on. Hold steady"},{c:"walk",n:4,label:"Walk down the aisle"},
           {c:"side",label:"Turn sideways to pass the trolley"},{c:"walk",n:2,label:"Two more steps"},
           {c:"down",label:"Bend down to the passenger"},{c:"freeze",sec:2,label:"Freeze. Don't wake him"}]},
  {id:"mama", title:"Mom's Dinner Party", sub:"Guests are watching. Aunt Noura keeps walking into you.",
   rules:["No laughing or loud talking.","Your aunt will bump into you. Be ready."],
   chars:["mama","khala"], main:"mama", mic:true, quietPenalty:8, timeLimit:70,
   script:[{c:"walk",n:3,label:"Carry the tea into the living room"},{c:"freeze",sec:3,label:"Freeze! Aunt Noura is passing by",bump:true},
           {c:"turn",label:"Turn to face the guests"},{c:"down",label:"Bend down to serve Grandma"},
           {c:"up",label:"Stand back up slowly"},{c:"freeze",sec:2,label:"Hold still while Mom smiles"}]},
];

function teaGame(level, ui){
  const S = Engine.S;
  const glass = makeGlass(ui.canvas, {count:1}); const tea = makeTea(glass);
  const g = {level, samples:[], idx:0, runner:null, t:0, penalty:0, ev:{}, cool:{}, lastSay:0, bumped:false, inTurb:false, turbIdx:-1};
  const chars = level.chars||[];
  function say(e, who){
    const now=performance.now();
    if(!chars.length) return;
    if(now-g.lastSay<2200 && !["bump","turbWarn","win","lose","jump"].includes(e)) return;
    if(now-(g.cool[e]||0)<5000 && !["bump","turbWarn","turbEnd"].includes(e)) return;
    const cands = who ? [who] : chars.filter(c=>CHARS[c].lines[e]);
    if(!cands.length) return;
    const c = cands.includes(level.main)&&Math.random()<0.6 ? level.main : pick(cands);
    if(!CHARS[c].lines[e]) return;
    ui.say(CHARS[c], pick(CHARS[c].lines[e])); g.cool[e]=now; g.lastSay=now;
  }
  function next(){
    if(g.idx>0) { SFX.good(); if(g.idx<level.script.length) say("done"); }
    if(g.idx>=level.script.length) return finish(true);
    g.runner = makeRunner(level.script[g.idx]); g.idx++;
    if(level.script.length>1) SFX.cmd();
    ui.cmd(g.runner.icon, g.runner.label, `${g.idx}/${level.script.length}`);
    if(g.runner.spec.bump) g.bumpAt = g.t + rand(0.8,1.6);
  }
  function finish(ok){
    if(g.over) return; g.over=true; SFX.stop();
    const a = analyze(g.samples, g.t, tea.spill, level.timeLimit);
    a.penalty = g.penalty; a.score = Math.max(0, a.score - g.penalty); if(a.onTable) a.score=0;
    const success = ok && tea.spill<1 && !a.onTable;
    a.stars = success ? (a.score>=80?3:a.score>=60?2:1) : 0;
    if(!level.classic && chars.length) say(success?"win":"lose", level.main);
    ui.finish({kind:"tea", level, a, success, stepsDone: g.idx - (ok?0:1), total: level.script.length});
  }
  return {
    hasGlass:true, timer:"down",
    begin(){ tea.reset(); next(); if(chars.length) setTimeout(()=>{ const c=chars.find(c=>CHARS[c].lines.intro); if(c) say("intro",c); },300); },
    onEvent(type){
      if(g.over) return;
      g.runner && g.runner.onEvent(type);
      if(type==="jump"){ tea.slosh(0.2); tea.kick(rand(-3,3)); say("jump"); }
      if(type==="step" && g.runner && g.runner.spec.c==="walk") SFX.step();
    },
    away(){ g.penalty+=10; SFX.away(); say("away"); },
    update(dt){
      if(g.over) return;
      g.t += dt;
      ui.timer(Math.max(0, level.timeLimit - g.t));
      // turbulence
      if(level.turb){
        const ph = (g.t-3) % 9, idx = Math.floor((g.t-3)/9);
        const inW = g.t>3 && ph<3.2;
        if(g.t>1.4 && ph>7.4 && idx+1!==g.turbIdx){ g.turbIdx=idx+1; SFX.seatbelt(); say("turbWarn","captain"); }
        if(!inW && g.inTurb) say("turbEnd","captain");
        g.inTurb = inW;
        tea.dist = inW ? 0.22*Math.sin(2*Math.PI*0.9*g.t) + 0.08*Math.sin(2*Math.PI*2.3*g.t+1) : tea.dist*0.92;
        ui.shake(inW);
      }
      if(g.bumpAt && g.t>g.bumpAt){ g.bumpAt=0; tea.kick((Math.random()<0.5?-1:1)*2.6); SFX.bump(); vibrate([40,30,60]); say("bump","khala"); }
      // mic
      if(level.mic){ Engine.readMic(); g.loudT = S.mic>0.08 ? (g.loudT||0)+dt : 0;
        if(g.loudT>0.25){ g.loudT=0; say("loud"); if(level.quietPenalty && performance.now()-(g.penT||0)>3000){ g.penalty+=level.quietPenalty; g.penT=performance.now(); SFX.buzz(); } } }
      // reactions
      if(S.jEma>14) say("veryShaky"); else if(S.jEma>7 && g.runner && !["walk","turn","side"].includes(g.runner.spec.c)) say("shaky");
      g.steadyT = S.jEma<2 ? (g.steadyT||0)+dt : 0; if(g.steadyT>4){ g.steadyT=0; say("steady"); }
      if(tea.spill-(g.spillSaid||0)>0.15){ g.spillSaid=tea.spill; say("spill"); }
      if(!g.lowSaid && level.timeLimit-g.t<8){ g.lowSaid=true; say("timeLow"); }
      // sample + physics
      g.samples.push({t:g.t, rr:S.rr, j:S.rr+S.lin*1.5, dRoll:S.roll-tea.roll0+tea.dist});
      tea.step(dt, {active:true, accW:1.5, turb:g.inTurb});
      ui.spill(tea.spill);
      g.runner.update(dt);
      ui.progress(g.runner.progress(), g.runner.counter());
      if(g.runner.done) next();
      if(tea.spill>=1) finish(false);
      else if(g.t>=level.timeLimit) finish(g.idx>=level.script.length && g.runner.done);
    },
  };
}

/* ================= GAME 2: SIMON SAYS ================= */
const SIMON_POOL = [
  {c:"walk",n:2},{c:"turn"},{c:"jump"},{c:"down"},{c:"up"},{c:"freeze",sec:2},{c:"shake"},{c:"side"},{c:"flip"},{c:"walk",n:3},{c:"jump"},{c:"shake"}
];
const SIMON_LEVELS = [
  {id:"classic", title:"Classic", sub:"Do it only when Simon says. 3 lives.", lives:3, partyOK:true},
  {id:"speed", title:"Speed Round", sub:"Starts fast, gets faster. 1 life.", lives:1, fast:true},
];
function simonGame(level, ui){
  const S = Engine.S;
  const g = {lives:level.lives, score:0, phase:"gap", t:0, until:0.6, runner:null, simon:true, last:null, reason:"", moved:false, flipped:false};
  function winFor(spec){
    const base = level.fast ? 3.2 : 4.6, min = level.fast ? 1.6 : 2.2;
    let w = Math.max(min, base - g.score*0.12);
    if(spec.c==="walk") w += spec.n*0.5;
    if(spec.c==="freeze") w = spec.sec + 1.2;
    if(spec.c==="turn"||spec.c==="flip"||spec.c==="unflip") w += 1;
    return w;
  }
  function newRound(){
    let spec;
    if(g.flipped){ spec={c:"unflip"}; g.simon=true; }
    else {
      do { spec = pick(SIMON_POOL); } while(g.last && spec.c===g.last.c);
      g.simon = g.score<2 ? true : Math.random() < 0.72;
      if(spec.c==="up" && S.level!=="low" && Math.random()<0.5) spec = {c:"down"};
    }
    g.last = spec;
    g.runner = makeRunner(spec, {strictFreeze:true});
    g.phase = "act"; g.t = 0; g.until = winFor(spec); g.moved=false;
    const text = (g.simon ? "Simon says: " : "") + g.runner.label;
    ui.cmd(g.runner.icon, text, g.simon ? "" : "", {big:true, simon:g.simon});
    SFX.cmd();
  }
  function fail(reason){
    g.lives--; g.reason = reason; SFX.fail(); vibrate([80,40,80]);
    ui.flash("bad", reason);
    ui.lives(g.lives, level.lives);
    if(g.lives<=0) return end();
    g.phase="gap"; g.t=0; g.until=1.6;
  }
  function pass(msg){
    g.score++; SFX.good(); ui.flash("good", msg); ui.score(g.score);
    if(g.runner && g.runner.spec.c==="flip" && g.simon) g.flipped = true;
    if(g.runner && g.runner.spec.c==="unflip") g.flipped = false;
    g.phase="gap"; g.t=0; g.until= level.fast ? 0.6 : 0.9;
  }
  function end(){
    if(g.over) return; g.over=true;
    setTimeout(()=>ui.finish({kind:"simon", level, score:g.score, reason:g.reason}), 900);
  }
  const ACTIONS = ["jump","down","up","turn","shake","flip"];
  return {
    hasGlass:false, timer:"none",
    begin(){ ui.score(0); ui.lives(g.lives, level.lives); },
    onEvent(type){
      if(g.over || g.phase!=="act") return;
      if(g.simon){ g.runner.onEvent(type); return; }
      // Simon didn't say: any real action = out
      if(ACTIONS.includes(type)) g.moved = type;
      if(type==="step"){ g.stepCount=(g.stepCount||0)+1; if(g.stepCount>=2) g.moved="step"; }
    },
    away(){},
    update(dt){
      if(g.over) return;
      g.t += dt;
      if(g.phase==="gap"){ ui.ring(0); if(g.t>=g.until){ g.stepCount=0; newRound(); } return; }
      const left = g.until - g.t; ui.ring(clamp(left/g.until,0,1));
      if(left < 1.2 && Math.floor(left*4)!==g.lastTick){ g.lastTick=Math.floor(left*4); SFX.tick(); }
      if(g.simon){
        g.runner.update(dt); ui.progress(g.runner.progress(), g.runner.counter());
        if(g.runner.failed) return fail("You moved during Freeze!");
        if(g.runner.done) return pass(pick(["Nice!","Yes!","Good!","Perfect!"]));
        if(left<=0) return fail("Too slow!");
      } else {
        ui.progress(0,"");
        if(g.moved) return fail("Simon didn't say!");
        if(left<=0) return pass("Good, you didn't fall for it");
      }
    },
  };
}

/* ================= GAME 3: WAITER RUSH ================= */
const OBSTACLES = [
  {c:"walk",n:3,label:"Walk 3 steps to the next table"},
  {c:"down",label:"Low doorway! Duck under it", then:{c:"up",label:"Stand back up"}},
  {c:"jump",label:"Toy on the floor! Hop over it"},
  {c:"side",label:"Narrow gap! Turn sideways"},
  {c:"turn",label:"Wrong table! Turn around"},
  {c:"freeze",sec:2,label:"A customer takes a glass. Freeze!"},
  {c:"walk",n:5,label:"Long hallway: walk 5 steps"},
];
const WAITER_LEVELS = [
  {id:"breakfast", title:"Breakfast Shift", sub:"5 obstacles. Learn the moves.", fixed:[0,1,4,5,0], par:40, partyOK:true},
  {id:"lunch", title:"Lunch Rush", sub:"7 random obstacles, faster pace.", random:7, par:50},
  {id:"wedding", title:"Wedding Party", sub:"10 obstacles and guests bumping into you.", random:10, par:70, bumps:true},
];
function waiterGame(level, ui){
  const S = Engine.S;
  const glass = makeGlass(ui.canvas, {count:3}); const tea = makeTea(glass);
  let list = level.fixed ? level.fixed.map(i=>OBSTACLES[i]) : Array.from({length:level.random},()=>pick(OBSTACLES));
  const queue = []; list.forEach(o=>{ queue.push(o); if(o.then) queue.push(o.then); });
  const g = {idx:0, t:0, ot:0, runner:null, slow:0, nextBump: rand(6,10)};
  function next(){
    if(g.idx>0) SFX.good();
    if(g.idx>=queue.length) return finish(true);
    const spec = queue[g.idx++]; g.runner = makeRunner(spec); g.ot = 0;
    SFX.cmd(); ui.cmd(g.runner.icon, g.runner.label, `${g.idx}/${queue.length}`);
    if(g.idx>1 && Math.random()<0.35) ui.say(CHARS.boss, pick(CHARS.boss.lines.done));
  }
  function finish(ok){
    if(g.over) return; g.over=true; SFX.stop();
    const success = ok && tea.spill<1;
    const score = success ? Math.max(0, Math.round(1000 - Math.max(0,g.t-level.par*0.5)*12 - tea.spill*600 - g.slow*80)) : 0;
    const stars = !success ? 0 : (tea.spill<0.15 && g.t<=level.par) ? 3 : (tea.spill<0.4 && g.t<=level.par*1.4) ? 2 : 1;
    ui.say(CHARS.boss, pick(CHARS.boss.lines[success?"win":"lose"]));
    ui.finish({kind:"waiter", level, success, score, stars, time:g.t, spill:tea.spill, slow:g.slow, done:g.idx-(ok?0:1), total:queue.length});
  }
  return {
    hasGlass:true, timer:"up",
    begin(){ tea.reset(); next(); setTimeout(()=>ui.say(CHARS.boss, CHARS.boss.lines.intro[0]),300); },
    onEvent(type){
      if(g.over) return;
      g.runner && g.runner.onEvent(type);
      if(type==="jump"){ tea.slosh(0.16); tea.kick(rand(-2.5,2.5)); }
      if(type==="step" && g.runner && g.runner.spec.c==="walk") SFX.step();
    },
    away(){ g.slow++; },
    update(dt){
      if(g.over) return;
      g.t += dt; g.ot += dt; ui.timer(g.t);
      if(level.bumps && g.t>g.nextBump){ g.nextBump = g.t + rand(6,11); tea.kick((Math.random()<0.5?-1:1)*2.2); SFX.bump(); vibrate([40,30,60]); ui.flash("bad","A guest bumped you!"); }
      tea.step(dt, {active:true, accW:1.5});
      ui.spill(tea.spill);
      if(tea.spill-(g.spillSaid||0)>0.25){ g.spillSaid=tea.spill; ui.say(CHARS.boss, pick(CHARS.boss.lines.spill)); }
      g.runner.update(dt);
      ui.progress(g.runner.progress(), g.runner.counter());
      if(g.runner.done) next();
      else if(g.ot > 12){ g.slow++; tea.spill=Math.min(1,tea.spill+0.12); SFX.buzz(); ui.say(CHARS.boss, CHARS.boss.lines.slow[0]); next(); }
      if(tea.spill>=1) finish(false);
    },
  };
}

const GAMES = [
  {id:"tea", title:"Don't Spill the Tea", tag:"Balance", desc:"Carry a full glass through real-life situations. Walk, turn and squat without spilling a drop.",
   icon:"hold", levels:TEA_LEVELS, make:teaGame, scoreLabel:"Score"},
  {id:"simon", title:"Simon Says", tag:"Reflexes", desc:"Jump, squat, spin, freeze. Only when Simon says! Your phone checks every move.",
   icon:"jump", levels:SIMON_LEVELS, make:simonGame, scoreLabel:"Moves"},
  {id:"waiter", title:"Waiter Rush", tag:"Speed + balance", desc:"A tray of three teas and an obstacle course. Duck, hop and squeeze through, fast.",
   icon:"walk", levels:WAITER_LEVELS, make:waiterGame, scoreLabel:"Score"},
];
