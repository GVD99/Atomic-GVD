"use strict";
/* ================================================================
   ATOMIC GVD — tracker de obiceiuri după principiile Atomic Habits
   Date locale: localStorage + export/import JSON.
   ================================================================ */

/* ---------------- utilitare de dată (săptămâna începe LUNI) ---------------- */
const ZI = ["Duminică","Luni","Marți","Miercuri","Joi","Vineri","Sâmbătă"];
const ZIS = ["Lu","Ma","Mi","Jo","Vi","Sâ","Du"]; // ordonate luni→duminică
const LUNA = ["ianuarie","februarie","martie","aprilie","mai","iunie","iulie","august","septembrie","octombrie","noiembrie","decembrie"];
const pad = n => String(n).padStart(2,"0");
const iso = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const fromIso = s => { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
const todayIso = () => iso(new Date());
const addDays = (s,n) => { const d=fromIso(s); d.setDate(d.getDate()+n); return iso(d); };
const dow = s => (fromIso(s).getDay()+6)%7;           // 0=luni … 6=duminică
const isWorkday = s => dow(s) < 5;
const weekStart = s => addDays(s, -dow(s));            // luni
const monthKey = s => s.slice(0,7);
const fmtDate = s => { const d=fromIso(s); return ZI[d.getDay()]+", "+d.getDate()+" "+LUNA[d.getMonth()]; };
const fmtH = v => { const h=Math.floor(v), m=Math.round((v-h)*60); return m? h+"h"+pad(m) : h+"h"; };
const fmtH2 = v => (Math.round(v*10)/10).toLocaleString("ro-RO",{minimumFractionDigits:0,maximumFractionDigits:1})+" h";

/* ---------------- stare ---------------- */
const LSKEY = "atomicgvd_v1";
const PALETA = ["#7D6FD6","#199E8C","#AA8F26","#3E85D1","#C96A2E","#C75FA1","#3FA351","#B4543E","#5A7FD1","#8A8A3E"];

function seedHabits(){
  const c = todayIso();
  return [
    {id:"h1", nume:"Somn decent", identitate:"Om odihnit",      tip:"somn", negativ:false, perWeek:6, lucratoare:false, tintaOre:7, culoare:"#7D6FD6", cue:"Dimineața, la trezire, notez orele dormite", creat:c, arhivat:false},
    {id:"h2", nume:"Înot dimineața", identitate:"Înotător",     tip:"bifa", negativ:false, perWeek:2, lucratoare:false, culoare:"#199E8C", cue:"Seara pun geanta de înot lângă ușă", creat:c, arhivat:false},
    {id:"h3", nume:"Mâncare de acasă", identitate:"Om organizat", tip:"bifa", negativ:false, perWeek:3, lucratoare:true, culoare:"#AA8F26", cue:"Seara pregătesc caserola pentru a doua zi", creat:c, arhivat:false},
    {id:"h4", nume:"Engleză", identitate:"Vorbitor de engleză", tip:"bifa", negativ:false, perWeek:7, lucratoare:false, culoare:"#3E85D1", cue:"După cafeaua de dimineață, fac lecția", creat:c, arhivat:false},
    {id:"h5", nume:"Fără FB, Flashscore, Sport.ro", identitate:"Om concentrat", tip:"bifa", negativ:true, perWeek:5, lucratoare:false, culoare:"#C96A2E", cue:"Fără aplicații de distragere pe primul ecran", creat:c, arhivat:false},
    {id:"h6", nume:"Postare Raduga", identitate:"Creator",      tip:"bifa", negativ:false, perWeek:2, lucratoare:false, culoare:"#C75FA1", cue:"După cină, în zilele alese, public postarea", creat:c, arhivat:false},
    {id:"h7", nume:"Fără bad habit", identitate:"Om liber",     tip:"bifa", negativ:true, perWeek:7, lucratoare:false, culoare:"#3FA351", cue:"Seara bifez ziua curată", creat:c, arhivat:false},
  ];
}

let S;
function load(){
  try{ S = JSON.parse(localStorage.getItem(LSKEY)); }catch(e){ S=null; }
  if(!S || !S.habits){
    S = {v:1, habits:seedHabits(), entries:{}, settings:{
      notifOn:false, notifAm:"07:30", notifPm:"21:30", onboarded:false, celebrated:{}, lastNotif:{}
    }};
    save();
  }
  if(!S.settings.celebrated) S.settings.celebrated={};
  if(!S.settings.lastNotif) S.settings.lastNotif={};
}
function save(){ try{ localStorage.setItem(LSKEY, JSON.stringify(S)); }catch(e){ toast("Nu am putut salva datele — spațiu insuficient?"); } }

/* ---------------- logica obiceiurilor ---------------- */
const windowDays = h => h.lucratoare ? 5 : 7;
const isDaily    = h => h.perWeek >= windowDays(h);
const schedDay   = (h,d) => h.lucratoare ? isWorkday(d) : true;   // zi în care obiceiul „contează”
const val        = (h,d) => (S.entries[d]||{})[h.id];
const okDay      = (h,d) => { const v = val(h,d); if(v==null) return false; return h.tip==="somn" ? v>=h.tintaOre : !!v; };
const logged     = (h,d) => val(h,d) != null;

function weekDays(ws, h){ // zilele programate din săptămâna care începe la ws
  const out=[]; for(let i=0;i<7;i++){ const d=addDays(ws,i); if(schedDay(h,d)) out.push(d); } return out;
}
function weekHits(h, ws){ return weekDays(ws,h).filter(d=>okDay(h,d)).length; }
function weekMet(h, ws){ return weekHits(h,ws) >= h.perWeek; }

/* streak zilnic (pentru obiceiuri 7/7 sau 5/5): consecutiv, azi nu rupe dacă e încă nebifat */
function dailyStreak(h){
  const t = todayIso();
  let d = okDay(h,t) ? t : addDays(t,-1);
  let n = okDay(h,t) ? 1 : 0;
  if(!okDay(h,t)) { /* pornim de ieri */ }
  let cur = okDay(h,t) ? addDays(t,-1) : d;
  while(cur >= h.creat){
    if(!schedDay(h,cur)){ cur=addDays(cur,-1); continue; }
    if(okDay(h,cur)){ n++; cur=addDays(cur,-1); } else break;
  }
  return n;
}
function bestDailyStreak(h){
  let best=0, n=0, d=h.creat, t=todayIso();
  while(d<=t){
    if(schedDay(h,d)){ if(okDay(h,d)){ n++; if(n>best)best=n; } else n=0; }
    d=addDays(d,1);
  }
  return best;
}
/* streak săptămânal: săptămâni consecutive cu ținta atinsă; săpt. curentă se include doar dacă e deja atinsă */
function weeklyStreak(h){
  const cw = weekStart(todayIso());
  let n=0, w = weekMet(h,cw) ? cw : addDays(cw,-7);
  while(w >= weekStart(h.creat) || w >= addDays(weekStart(h.creat),0)){
    if(w < weekStart(h.creat)) break;
    if(weekMet(h,w)){ n++; w=addDays(w,-7); } else break;
  }
  return n;
}
function bestWeeklyStreak(h){
  let best=0,n=0, w=weekStart(h.creat); const cw=weekStart(todayIso());
  while(w<=cw){
    if(weekMet(h,w)){ n++; if(n>best)best=n; } else if(w<cw){ n=0; }
    w=addDays(w,7);
  }
  return best;
}
function streakInfo(h){
  if(isDaily(h)) return {n:dailyStreak(h), unit:"zile", best:bestDailyStreak(h)};
  return {n:weeklyStreak(h), unit:"săpt.", best:bestWeeklyStreak(h)};
}
/* voturi = totalul zilelor reușite */
function votes(h){
  let n=0, d=h.creat, t=todayIso();
  while(d<=t){ if(okDay(h,d)) n++; d=addDays(d,1); }
  return n;
}
/* puterea obiceiului — netezire exponențială pe ultimele 90 de zile programate */
function strength(h){
  const t=todayIso(); let d=addDays(t,-90); if(d<h.creat) d=h.creat;
  let s=0, k=0.06, any=false;
  while(d<t){ if(schedDay(h,d)){ s = s*(1-k) + (okDay(h,d)?1:0)*k; any=true; } d=addDays(d,1); }
  if(okDay(h,t)) s = s*(1-k)+k;
  return any? Math.round(s*100) : 0;
}
/* never miss twice: ieri programat & ratat & alaltăieri reușit (doar obiceiuri zilnice) */
function needsRescue(h){
  if(!isDaily(h)) return false;
  const t=todayIso(); if(okDay(h,t)) return false;
  let y=addDays(t,-1); while(y>=h.creat && !schedDay(h,y)) y=addDays(y,-1);
  if(y<h.creat || okDay(h,y)) return false;
  let y2=addDays(y,-1); while(y2>=h.creat && !schedDay(h,y2)) y2=addDays(y2,-1);
  return y2>=h.creat && okDay(h,y2);
}
const activeHabits = () => S.habits.filter(h=>!h.arhivat);

/* ---------------- praguri de sărbătorit ---------------- */
const MILE_D = [7,30,66,100,180,365];
const MILE_W = [4,8,12,26,52];
function checkMilestone(h){
  const si = streakInfo(h);
  const list = isDaily(h)?MILE_D:MILE_W;
  if(!list.includes(si.n)) return null;
  const key = h.id+":"+si.unit+":"+si.n;
  if(S.settings.celebrated[key]) return null;
  S.settings.celebrated[key]=1; save();
  return {n:si.n, unit:si.unit, h};
}
const MILE_MSG = {
  "7:zile":"O săptămână întreagă. Primul prag real — corpul începe să se aștepte la asta.",
  "30:zile":"O lună. Nu mai e un experiment, e un mod de viață.",
  "66:zile":"66 de zile — media științifică pentru formarea unui obicei (studiul Lally, UCL). De aici încolo merge mai mult de la sine.",
  "100:zile":"100 de zile. Ești în top 1% al oamenilor care încep un obicei.",
  "180:zile":"Jumătate de an. Identitatea nu mai e o intenție, e un fapt.",
  "365:zile":"Un an întreg. Asta nu se mai numește obicei — ești tu.",
  "4:săpt.":"O lună de săptămâni reușite. Sistemul funcționează.",
  "8:săpt.":"Două luni de constanță săptămânală.",
  "12:săpt.":"Un trimestru întreg. Ritmul e instalat.",
  "26:săpt.":"Jumătate de an de săptămâni câștigate.",
  "52:săpt.":"Un an de săptămâni reușite. Remarcabil."
};

/* ---------------- ecran & navigație ---------------- */
let scr="azi", viewDate=todayIso(), rapMode="sapt", rapAnchor=todayIso();
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

document.querySelectorAll("nav#tabs button").forEach(b=>{
  b.addEventListener("click",()=>{
    scr=b.dataset.s;
    $$("nav#tabs button").forEach(x=>x.classList.toggle("on",x===b));
    $$(".screen").forEach(x=>x.classList.remove("on"));
    $("#scr-"+scr).classList.add("on");
    $("#datenav").style.display = scr==="azi"?"":"none";
    $("#todaychip").style.display = (scr==="azi" && viewDate!==todayIso())?"block":"none";
    render();
    window.scrollTo({top:0});
  });
});
$("#dPrev").addEventListener("click",()=>{ viewDate=addDays(viewDate,-1); renderAzi(); });
$("#dNext").addEventListener("click",()=>{ if(viewDate<todayIso()){ viewDate=addDays(viewDate,1); renderAzi(); } });
$("#dToday").addEventListener("click",()=>{ viewDate=todayIso(); renderAzi(); });

/* ---------------- toast & celebrare ---------------- */
let toastT;
function toast(msg){
  const t=$("#toast"); t.innerHTML=msg; t.classList.add("show");
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),2600);
}
function celebrate(m){
  $("#celeN").textContent = m.n;
  $("#celeT").textContent = m.n+" "+(m.unit==="zile"?"zile":"săptămâni")+" — "+m.h.nume;
  $("#celeP").textContent = MILE_MSG[m.n+":"+m.unit] || "Continuă tot așa.";
  $("#cele").classList.add("show");
  if(navigator.vibrate) navigator.vibrate([40,60,40]);
}
$("#celeOk").addEventListener("click",()=>$("#cele").classList.remove("show"));

/* ---------------- AZI ---------------- */
function renderAzi(){
  const t=todayIso(), isToday=viewDate===t;
  $("#dTitle").textContent = isToday ? "Azi" : (viewDate===addDays(t,-1)?"Ieri":fmtDate(viewDate));
  $("#dSub").textContent = isToday||viewDate===addDays(t,-1) ? fmtDate(viewDate) : "";
  $("#dNext").disabled = isToday;
  $("#todaychip").style.display = (!isToday && scr==="azi") ? "block":"none";

  // onboarding
  const onb=$("#onb");
  if(!S.settings.onboarded){
    onb.innerHTML = `<div class="onb"><h2>Fiecare bifă e un vot</h2>
      <p>„Fiecare acțiune e un <b>vot pentru tipul de om care vrei să devii</b>.” — James Clear, <i>Atomic Habits</i>.</p>
      <p>Un obicei se formează în medie în <b>66 de zile</b> (între 18 și 254 — studiul Lally, UCL). O zi ratată <b>nu strică nimic</b>; regula e una singură: <b>nu rata de două ori la rând</b>.</p>
      <p>Primele săptămâni contează cel mai mult. Bifează imediat după ce faci obiceiul.</p>
      <button id="onbOk">Am înțeles — încep</button></div>`;
    $("#onbOk").addEventListener("click",()=>{ S.settings.onboarded=true; save(); renderAzi(); });
  } else onb.innerHTML="";

  // bara de voturi
  const hs = activeHabits();
  const doneToday = hs.filter(h=>okDay(h,viewDate)).length;
  const schedToday = hs.filter(h=>schedDay(h,viewDate)).length;
  const totalVotes = hs.reduce((a,h)=>a+votes(h),0);
  $("#votebar").innerHTML = `<div><div class="n num">${doneToday}<span style="font-size:15px;color:var(--ink2)">/${schedToday}</span></div>
    <div class="t">voturi ${isToday?"azi":"în această zi"}</div></div>
    <div style="text-align:right"><div class="n num" style="font-size:19px">${totalVotes}</div><div class="t">voturi în total,<br>pentru cine devii</div></div>`;

  // lista
  const list=$("#hlist"); list.innerHTML="";
  hs.forEach(h=>{
    const off = !schedDay(h,viewDate);
    const done = okDay(h,viewDate);
    const si = streakInfo(h);
    const card=document.createElement("div");
    card.className="hcard"+(done?" done":"")+(off?" offday":"");
    card.style.setProperty("--hc",h.culoare);

    let meta="";
    if(isDaily(h)){
      meta += `<span class="pill ${si.n>0?'hot':''} num">serie: ${si.n} ${si.unit}</span>`;
    } else {
      const ws=weekStart(viewDate), hits=weekHits(h,ws);
      const dots = Array.from({length:h.perWeek},(_,i)=>`<i class="${i<hits?'on':''}"></i>`).join("");
      const wd = weekDays(ws,h);
      const remaining = wd.filter(d=>d>=viewDate).length;
      meta += `<span class="pill num wkdots-wrap" style="display:flex;align-items:center;gap:7px">săpt: ${hits}/${h.perWeek} <span class="wkdots">${dots}</span></span>`;
      if(si.n>0) meta += `<span class="pill hot num">serie: ${si.n} ${si.unit}</span>`;
      if(hits<h.perWeek && remaining>0 && remaining <= (h.perWeek-hits)) meta += `<span class="pill warn">ultimele zile din săptămână</span>`;
    }
    meta += `<span class="pill num">${votes(h)} voturi</span>`;

    if(h.tip==="somn"){
      const v = val(h,viewDate);
      const shown = v!=null? v : (val(h,addDays(viewDate,-1)) ?? h.tintaOre);
      const avg = sleepWeekAvg(h, weekStart(viewDate));
      card.innerHTML = `<div class="stripe"></div>
        <div class="hbody">
          <div class="hname">${esc(h.nume)}</div>
          <div class="hcue">${esc(h.cue||"")}</div>
          <div class="sleepctl">
            <button class="stepper" data-a="-">−</button>
            <div class="val num">${v!=null?fmtH(v):"—"} <small>${v!=null?"dormite":"nescris"}</small></div>
            <button class="stepper" data-a="+">+</button>
            <button class="stepper" style="width:auto;padding:0 12px;font-size:13px;color:${v!=null&&v>=h.tintaOre?"var(--hc)":"var(--ink3)"}">${v!=null? (v>=h.tintaOre?"țintă atinsă":"sub "+fmtH(h.tintaOre)) : "notează"}</button>
          </div>
          <div class="chips">${[6,6.5,7,7.5,8].map(x=>`<button data-h="${x}" class="num">${fmtH(x)}</button>`).join("")}</div>
          <div class="hmeta">${meta}${avg!=null?`<span class="pill num">medie săpt: ${fmtH2(avg)}</span>`:""}</div>
          ${needsRescue(h)?rescueHtml(h):""}
        </div>`;
      card.querySelectorAll(".stepper[data-a]").forEach(b=>b.addEventListener("click",()=>{
        const cur = val(h,viewDate); const base = cur!=null?cur:shown;
        setVal(h, viewDate, Math.max(0,Math.min(14, base + (b.dataset.a==="+"?0.25:-0.25))), cur==null);
      }));
      card.querySelectorAll(".chips button").forEach(b=>b.addEventListener("click",()=>{
        setVal(h, viewDate, parseFloat(b.dataset.h), val(h,viewDate)==null);
      }));
    } else {
      card.innerHTML = `<div class="stripe"></div>
        <button class="checkbtn" aria-label="Bifează ${esc(h.nume)}" ${off?"disabled":""}>
          <svg viewBox="0 0 52 52"><circle class="ringbg" cx="26" cy="26" r="24"/><circle class="ringfg" cx="26" cy="26" r="24"/></svg>
          <svg class="tick" viewBox="0 0 24 24"><path d="M4 12.5l5.5 5.5L20 6.5"/></svg>
        </button>
        <div class="hbody">
          <div class="hname">${esc(h.nume)}</div>
          <div class="hcue">${esc(h.cue||"")}</div>
          <div class="hmeta">${meta}</div>
          ${off?`<div class="hcue" style="margin-top:6px">doar în zile lucrătoare</div>`:""}
          ${needsRescue(h)?rescueHtml(h):""}
        </div>`;
      const btn = card.querySelector(".checkbtn");
      if(!off) btn.addEventListener("click",()=>toggle(h));
    }
    list.appendChild(card);
  });
}
function rescueHtml(h){
  return `<div class="rescue"><b>Ai ratat ieri.</b> A rata o dată e accident — a rata de două ori e începutul unui alt obicei. Azi e de-ajuns varianta de 2 minute.</div>`;
}
function sleepWeekAvg(h, ws){
  const vals = weekDays(ws,h).map(d=>val(h,d)).filter(v=>v!=null);
  if(!vals.length) return null;
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}
function esc(s){ return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function toggle(h){
  const d=viewDate, was = okDay(h,d);
  if(was){
    delete S.entries[d][h.id];
    if(!Object.keys(S.entries[d]).length) delete S.entries[d];
    save(); renderAzi(); return;
  }
  if(!S.entries[d]) S.entries[d]={};
  S.entries[d][h.id]=1; save();
  if(navigator.vibrate) navigator.vibrate(28);
  renderAzi();
  const v=votes(h);
  const msgs = h.negativ
    ? [`Zi curată. Votul #${v} pentru: <b>${esc(h.identitate)}</b>.`,`Ai rezistat. #${v} pentru <b>${esc(h.identitate)}</b>.`]
    : [`Votul #${v} pentru: <b>${esc(h.identitate)}</b>.`,`Așa arată un ${esc(h.identitate.toLowerCase())}. Votul #${v}.`];
  toast(msgs[v%msgs.length]);
  const m=checkMilestone(h); if(m) setTimeout(()=>celebrate(m),650);
}
function setVal(h,d,v,firstSet){
  if(!S.entries[d]) S.entries[d]={};
  S.entries[d][h.id]=Math.round(v*100)/100; save();
  renderAzi();
  if(firstSet && v>=h.tintaOre){
    if(navigator.vibrate) navigator.vibrate(28);
    toast(`${fmtH(v)} dormite — votul #${votes(h)} pentru: <b>${esc(h.identitate)}</b>.`);
    const m=checkMilestone(h); if(m) setTimeout(()=>celebrate(m),650);
  }
}

/* ---------------- RAPOARTE ---------------- */
$$("#rapseg button").forEach(b=>b.addEventListener("click",()=>{
  rapMode=b.dataset.p;
  $$("#rapseg button").forEach(x=>x.classList.toggle("on",x===b));
  rapAnchor=todayIso(); renderRap();
}));
$("#rPrev").addEventListener("click",()=>{ rapAnchor=shiftPeriod(rapAnchor,-1); renderRap(); });
$("#rNext").addEventListener("click",()=>{ const n=shiftPeriod(rapAnchor,1); if(startOfPeriod(n)<=todayIso()) { rapAnchor=n; renderRap(); } });

function shiftPeriod(a,dir){
  if(rapMode==="sapt") return addDays(a,7*dir);
  const d=fromIso(a);
  if(rapMode==="luna"){ d.setDate(1); d.setMonth(d.getMonth()+dir); return iso(d); }
  d.setMonth(0); d.setDate(1); d.setFullYear(d.getFullYear()+dir); return iso(d);
}
function startOfPeriod(a){
  if(rapMode==="sapt") return weekStart(a);
  const d=fromIso(a);
  if(rapMode==="luna"){ d.setDate(1); return iso(d); }
  d.setMonth(0); d.setDate(1); return iso(d);
}
function endOfPeriod(a){
  if(rapMode==="sapt") return addDays(weekStart(a),6);
  const d=fromIso(a);
  if(rapMode==="luna"){ d.setMonth(d.getMonth()+1); d.setDate(0); return iso(d); }
  d.setMonth(11); d.setDate(31); return iso(d);
}

function renderRap(){
  const s=startOfPeriod(rapAnchor), e=endOfPeriod(rapAnchor);
  const t=todayIso();
  let title;
  if(rapMode==="sapt"){
    const a=fromIso(s), b=fromIso(e);
    title = a.getDate()+" "+(a.getMonth()===b.getMonth()?"":LUNA[a.getMonth()].slice(0,3)+" ")+"– "+b.getDate()+" "+LUNA[b.getMonth()]+" "+b.getFullYear();
    if(weekStart(t)===s) title = "Săptămâna curentă";
  } else if(rapMode==="luna"){
    const d=fromIso(s); title = LUNA[d.getMonth()][0].toUpperCase()+LUNA[d.getMonth()].slice(1)+" "+d.getFullYear();
  } else title = "Anul "+fromIso(s).getFullYear();
  $("#rapTitle").textContent=title;
  $("#rNext").disabled = startOfPeriod(shiftPeriod(rapAnchor,1))>t;

  const body=$("#rapbody"); body.innerHTML="";
  const hs=activeHabits();
  if(!hs.length){ body.innerHTML=`<div class="empty">Niciun obicei activ.</div>`; return; }

  if(rapMode==="sapt") renderRapSapt(body,s,hs);
  else if(rapMode==="luna") renderRapLuna(body,s,e,hs);
  else renderRapAn(body,s,e,hs);
}

/* --- raport SĂPTĂMÂNĂ --- */
function renderRapSapt(body,ws,hs){
  const t=todayIso();
  let met=0, poss=0;
  hs.forEach(h=>{ poss++; if(weekMet(h,ws)) met++; });
  const kp=document.createElement("div"); kp.className="kpis";
  const totV = hs.reduce((a,h)=>a+weekHits(h,ws),0);
  kp.innerHTML = `
    <div class="kpi"><div class="v num" style="color:var(--accent)">${met}/${poss}</div><div class="l">obiceiuri cu ținta săptămânii atinsă</div></div>
    <div class="kpi"><div class="v num">${totV}</div><div class="l">voturi în această săptămână</div></div>`;
  body.appendChild(kp);

  hs.forEach(h=>{
    const wd=weekDays(ws,h), hits=weekHits(h,ws);
    const pct=Math.min(100,Math.round(hits/h.perWeek*100));
    const card=document.createElement("div"); card.className="card"; card.style.setProperty("--hc",h.culoare);
    let extra="";
    if(h.tip==="somn"){
      const avg=sleepWeekAvg(h,ws);
      extra = `<div class="statrow"><span>media orelor dormite</span><b class="num">${avg!=null?fmtH2(avg):"—"}</b></div>`;
    }
    const si=streakInfo(h);
    const days = wd.map(d=>{
      const cls = d>t?"":okDay(h,d)?"p3":(logged(h,d)||d<t?"miss":"");
      return `<span title="${d}" style="width:22px;height:22px;border-radius:6px;display:inline-block;background:${d>t?"var(--raised)":cls==="p3"?h.culoare:"#2E2A25"};outline:${d===t?"1.5px solid var(--ink2)":"none"};outline-offset:1px"></span>`;
    }).join("");
    card.innerHTML = `<h3><span class="dot"></span>${esc(h.nume)}</h3>
      <div class="sub">${esc(h.identitate)} · țintă ${h.perWeek}/${wd.length}${h.lucratoare?" (zile lucrătoare)":""}</div>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <div class="statrow"><span class="num">${hits} din ${h.perWeek} · ${pct}%</span><span style="display:flex;gap:5px">${days}</span></div>
      ${extra}
      <div class="statrow"><span>serie curentă</span><b class="num">${si.n} ${si.unit}</b></div>
      <div class="statrow"><span>puterea obiceiului (ultimele 90 zile)</span><b class="num">${strength(h)}%</b></div>`;
    body.appendChild(card);
  });
}

/* --- raport LUNĂ --- */
function renderRapLuna(body,ms,me,hs){
  const t=todayIso();
  // KPI-uri lună
  let totV=0, weeksMet=0, weeksTot=0;
  hs.forEach(h=>{
    let d=ms; while(d<=me){ if(okDay(h,d)) totV++; d=addDays(d,1); }
    let w=weekStart(ms)>=ms?weekStart(ms):weekStart(addDays(ms,6));
    w=weekStart(ms); if(w<ms) w=addDays(w,7);
    while(addDays(w,6)<=me){ if(addDays(w,6)<=t){ weeksTot++; if(weekMet(h,w)) weeksMet++; } w=addDays(w,7); }
  });
  const kp=document.createElement("div"); kp.className="kpis";
  kp.innerHTML=`
    <div class="kpi"><div class="v num" style="color:var(--accent)">${totV}</div><div class="l">voturi în această lună</div></div>
    <div class="kpi"><div class="v num">${weeksTot?Math.round(weeksMet/weeksTot*100):0}%</div><div class="l">din săptămânile încheiate au ținta atinsă</div></div>`;
  body.appendChild(kp);

  hs.forEach(h=>{
    const card=document.createElement("div"); card.className="card"; card.style.setProperty("--hc",h.culoare);
    card.innerHTML=`<h3><span class="dot"></span>${esc(h.nume)}</h3><div class="sub">${esc(h.identitate)}</div>`;
    card.appendChild(heatGrid(h, ms, me));
    if(h.tip==="somn"){
      card.appendChild(sleepChart(h, ms, me));
      const lg=document.createElement("div"); lg.className="heatlbl";
      lg.innerHTML=`<span><span class="sw" style="background:color-mix(in srgb,${h.culoare} 35%,var(--raised))"></span>&lt;6h</span>
        <span><span class="sw" style="background:color-mix(in srgb,${h.culoare} 65%,var(--raised))"></span>6–7h</span>
        <span><span class="sw" style="background:${h.culoare}"></span>≥7h</span>
        <span><span class="sw" style="background:#2E2A25"></span>nescris</span>`;
      card.appendChild(lg);
    } else {
      const lg=document.createElement("div"); lg.className="heatlbl";
      lg.innerHTML=`<span><span class="sw" style="background:${h.culoare}"></span>${h.negativ?"zi curată":"făcut"}</span>
        <span><span class="sw" style="background:#2E2A25"></span>ratat</span>
        ${h.lucratoare?'<span><span class="sw" style="border:1px dashed #2A2825;background:transparent"></span>weekend</span>':""}`;
      card.appendChild(lg);
    }
    body.appendChild(card);
  });

  // tipar pe zilele săptămânii
  const dowCard=document.createElement("div"); dowCard.className="card";
  dowCard.innerHTML=`<h3>Tiparul săptămânii</h3><div class="sub">procent de reușite pe fiecare zi, toate obiceiurile, luna curentă</div>`;
  const wrap=document.createElement("div"); wrap.className="dow";
  const pct=[0,0,0,0,0,0,0], cnt=[0,0,0,0,0,0,0];
  let d=ms;
  while(d<=me && d<=t){
    const k=dow(d);
    hs.forEach(h=>{ if(schedDay(h,d)){ cnt[k]++; if(okDay(h,d)) pct[k]++; } });
    d=addDays(d,1);
  }
  let worst=-1, worstP=101;
  for(let i=0;i<7;i++){
    const p=cnt[i]?Math.round(pct[i]/cnt[i]*100):null;
    if(p!=null && p<worstP && cnt[i]>=10){ worstP=p; worst=i; }
    wrap.innerHTML+=`<div class="b"><span class="pv num">${p==null?"–":p+"%"}</span><span class="bar" style="height:${p==null?2:Math.max(3,p*0.7)}px"></span><span class="lb">${ZIS[i]}</span></div>`;
  }
  dowCard.appendChild(wrap);
  if(worst>=0 && worstP<70){
    const co=document.createElement("div"); co.className="callout";
    const zi=["lunea","marțea","miercurea","joia","vinerea","sâmbăta","duminica"][worst];
    co.innerHTML=`Cele mai multe ratări sunt <b>${zi}</b> (${worstP}% reușite). Gândește-te ce e diferit în ziua aceea — și pregătește indiciul de seara: geanta, caserola, lecția deschisă.`;
    dowCard.appendChild(co);
  }
  body.appendChild(dowCard);
}

function heatGrid(h, from, to){
  // coloane = săptămâni (luni→duminică), rânduri = zile
  const t=todayIso();
  const grid=document.createElement("div"); grid.className="heat";
  let w=weekStart(from);
  while(w<=to){
    const col=document.createElement("div"); col.className="col";
    for(let i=0;i<7;i++){
      const d=addDays(w,i);
      const c=document.createElement("span"); c.className="cell";
      if(d<from||d>to){ c.style.visibility="hidden"; }
      else if(!schedDay(h,d)) c.classList.add("off");
      else if(d>t || d<h.creat) {/* viitor sau înainte de start: neutru */}
      else if(h.tip==="somn"){
        const v=val(h,d);
        if(v==null) c.classList.add("miss");
        else c.classList.add(v>=h.tintaOre?"p3":v>=6?"p2":"p1");
      }
      else if(okDay(h,d)) c.classList.add("p3");
      else c.classList.add("miss");
      if(d===t) c.classList.add("today");
      c.title=d;
      col.appendChild(c);
    }
    grid.appendChild(col); w=addDays(w,7);
  }
  requestAnimationFrame(()=>{ grid.scrollLeft = grid.scrollWidth; });
  return grid;
}

/* grafic linie somn (SVG) */
function sleepChart(h, from, to){
  const t=todayIso();
  const pts=[]; let d=from;
  while(d<=to && d<=t){ const v=val(h,d); if(v!=null) pts.push({d,v}); d=addDays(d,1); }
  const wrap=document.createElementNS("http://www.w3.org/2000/svg","svg");
  wrap.setAttribute("class","chart"); wrap.setAttribute("viewBox","0 0 340 120");
  const days = Math.round((fromIso(to)-fromIso(from))/864e5)+1;
  const X = s => 8 + (Math.round((fromIso(s)-fromIso(from))/864e5))/(days-1) * 324;
  const lo=4, hi=10;
  const Y = v => 108 - (Math.min(hi,Math.max(lo,v))-lo)/(hi-lo)*96;
  let g=`<line x1="8" y1="${Y(h.tintaOre)}" x2="332" y2="${Y(h.tintaOre)}" stroke="#3A311F" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="332" y="${Y(h.tintaOre)-4}" text-anchor="end" font-size="9" fill="#6E675D" font-family="Karla,sans-serif">țintă ${fmtH(h.tintaOre)}</text>`;
  if(pts.length>=2){
    const line = pts.map((p,i)=>(i?"L":"M")+X(p.d).toFixed(1)+" "+Y(p.v).toFixed(1)).join(" ");
    const area = line+` L${X(pts[pts.length-1].d).toFixed(1)} 108 L${X(pts[0].d).toFixed(1)} 108 Z`;
    g+=`<path d="${area}" fill="${h.culoare}" opacity="0.12"/>
        <path d="${line}" fill="none" stroke="${h.culoare}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  pts.forEach((p,i)=>{
    const last=i===pts.length-1;
    g+=`<circle cx="${X(p.d).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="${last?3.5:2}" fill="${last?h.culoare:"#1D1B19"}" stroke="${h.culoare}" stroke-width="1.5"><title>${p.d}: ${fmtH(p.v)}</title></circle>`;
    if(last) g+=`<text x="${Math.max(24,Math.min(316,X(p.d))).toFixed(1)}" y="${(Y(p.v)-8).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#EDE7DD" font-family="Karla,sans-serif">${fmtH(p.v)}</text>`;
  });
  if(!pts.length) g+=`<text x="170" y="60" text-anchor="middle" font-size="11" fill="#6E675D" font-family="Karla,sans-serif">nicio înregistrare încă</text>`;
  wrap.innerHTML=g;
  return wrap;
}

/* --- raport AN --- */
function renderRapAn(body,ys,ye,hs){
  const t=todayIso();
  let totV=0; const perH=[];
  hs.forEach(h=>{
    let n=0,d=ys; while(d<=ye&&d<=t){ if(okDay(h,d)) n++; d=addDays(d,1); }
    totV+=n; perH.push(n);
  });
  const sleepH = hs.find(h=>h.tip==="somn");
  let sleepTot=0, sleepCnt=0;
  if(sleepH){ let d=ys; while(d<=ye&&d<=t){ const v=val(sleepH,d); if(v!=null){sleepTot+=v;sleepCnt++;} d=addDays(d,1);} }
  const kp=document.createElement("div"); kp.className="kpis";
  kp.innerHTML=`
    <div class="kpi"><div class="v num" style="color:var(--accent)">${totV}</div><div class="l">voturi în acest an</div></div>
    <div class="kpi"><div class="v num">${sleepCnt?fmtH2(sleepTot/sleepCnt):"—"}</div><div class="l">media somnului pe an</div></div>`;
  body.appendChild(kp);

  hs.forEach((h,i)=>{
    const card=document.createElement("div"); card.className="card"; card.style.setProperty("--hc",h.culoare);
    const si=streakInfo(h);
    card.innerHTML=`<h3><span class="dot"></span>${esc(h.nume)}</h3>
      <div class="sub num">${perH[i]} voturi · cea mai lungă serie: ${si.best} ${si.unit}</div>`;
    card.appendChild(heatGrid(h, ys, ye));
    body.appendChild(card);
  });

  const note=document.createElement("div"); note.className="callout"; 
  note.innerHTML=`<b>Platoul potențialului latent:</b> munca nu se pierde, se acumulează. Fiecare vot e depozitat — chiar și atunci când rezultatele nu se văd încă.`;
  body.appendChild(note);
}

/* ---------------- OBICEIURI (management) ---------------- */
function renderObi(){
  const ml=$("#mlist"); ml.innerHTML="";
  activeHabits().forEach(h=>{
    const c=document.createElement("div"); c.className="mcard"; c.style.setProperty("--hc",h.culoare);
    const freq = isDaily(h) ? (h.lucratoare?"zilnic (Lu–Vi)":"zilnic")
      : h.perWeek+"× / săpt."+(h.lucratoare?" (Lu–Vi)":"");
    c.innerHTML=`<span class="cdot"></span>
      <div class="mb"><div class="mn">${esc(h.nume)}</div>
      <div class="mi">${esc(h.identitate)} · ${freq}${h.tip==="somn"?" · țintă "+fmtH(h.tintaOre):""}${h.negativ?" · renunțare":""}</div></div>
      <div class="acts">
        <button title="Modifică" aria-label="Modifică ${esc(h.nume)}"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg></button>
        <button title="Arhivează" aria-label="Arhivează ${esc(h.nume)}"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg></button>
      </div>`;
    const [be,ba]=c.querySelectorAll(".acts button");
    be.addEventListener("click",()=>openForm(h));
    ba.addEventListener("click",()=>{ h.arhivat=true; save(); renderObi(); toast("Obicei arhivat — istoricul rămâne în rapoarte."); });
    ml.appendChild(c);
  });
  const arch=S.habits.filter(h=>h.arhivat);
  const ma=$("#marchived"); ma.innerHTML="";
  if(arch.length){
    ma.innerHTML=`<div class="arch-h">Arhivate</div>`;
    arch.forEach(h=>{
      const c=document.createElement("div"); c.className="mcard"; c.style.setProperty("--hc",h.culoare); c.style.opacity=".6";
      c.innerHTML=`<span class="cdot"></span><div class="mb"><div class="mn">${esc(h.nume)}</div><div class="mi">${votes(h)} voturi păstrate</div></div>
        <div class="acts"><button title="Reactivează">↺</button><button title="Șterge definitiv" style="color:var(--danger)">✕</button></div>`;
      const [br,bd]=c.querySelectorAll(".acts button");
      br.addEventListener("click",()=>{ h.arhivat=false; save(); renderObi(); });
      bd.addEventListener("click",()=>{
        confirmDlg(`Ștergi definitiv „${esc(h.nume)}” și tot istoricul lui?`, ()=>{
          S.habits=S.habits.filter(x=>x.id!==h.id);
          Object.keys(S.entries).forEach(d=>{ if(S.entries[d][h.id]!=null){ delete S.entries[d][h.id]; if(!Object.keys(S.entries[d]).length) delete S.entries[d]; }});
          save(); renderObi(); toast("Șters definitiv.");
        });
      });
      ma.appendChild(c);
    });
  }
}
$("#addHabit").addEventListener("click",()=>openForm(null));

function openForm(h){
  const isNew=!h;
  const f = h ? {...h} : {id:"h"+Date.now(), nume:"", identitate:"", tip:"bifa", negativ:false, perWeek:7, lucratoare:false, tintaOre:7, culoare:PALETA[activeHabits().length%PALETA.length], cue:"", creat:todayIso(), arhivat:false};
  const sheet=$("#modalSheet");
  sheet.innerHTML=`
    <h2>${isNew?"Obicei nou":"Modifică obiceiul"}</h2>
    <div class="note">Formulează-l ca intenție: <i>voi [acțiune] la [moment], în [loc]</i>.</div>
    <div class="field"><label>Nume</label><input id="f-nume" value="${esc(f.nume)}" placeholder="ex.: Citit 10 pagini"></div>
    <div class="field"><label>Cine devii? (identitatea)</label><input id="f-id" value="${esc(f.identitate)}" placeholder="ex.: Cititor">
      <div class="hint">Fiecare bifă va fi „un vot pentru: …”. Scopul nu e să citești o carte, ci să devii un cititor.</div></div>
    <div class="field"><label>Indiciul (când / după ce?)</label><input id="f-cue" value="${esc(f.cue||"")}" placeholder="ex.: După cafeaua de dimineață">
      <div class="hint">Legea 1 — fă-l evident: leagă obiceiul de un moment sau de un obicei existent.</div></div>
    <div class="field"><label>Tip</label>
      <select id="f-tip">
        <option value="bifa" ${f.tip==="bifa"?"selected":""}>Bifă (făcut / nefăcut)</option>
        <option value="somn" ${f.tip==="somn"?"selected":""}>Ore de somn (numeric, cu țintă)</option>
      </select></div>
    <div class="field" id="f-tinta-w" style="display:${f.tip==="somn"?"block":"none"}"><label>Ținta de ore pe noapte</label>
      <div class="freqrow"><button id="f-tm">−</button><span class="fv num" id="f-tv">${fmtH(f.tintaOre)}</span><button id="f-tp">+</button></div></div>
    <div class="togglerow"><span>Obicei de renunțare („fără …”)<div class="hint">Bifezi ziua curată — votul rămâne pozitiv.</div></span><button class="tg ${f.negativ?"on":""}" id="f-neg" role="switch" aria-checked="${f.negativ}"><i></i></button></div>
    <div class="togglerow"><span>Doar zile lucrătoare (Lu–Vi)</span><button class="tg ${f.lucratoare?"on":""}" id="f-luc" role="switch" aria-checked="${f.lucratoare}"><i></i></button></div>
    <div class="field"><label>De câte ori pe săptămână?</label>
      <div class="freqrow"><button id="f-fm">−</button><span class="fv num" id="f-fv"></span><button id="f-fp">+</button></div>
      <div class="hint" id="f-fh"></div></div>
    <div class="field"><label>Culoare</label><div class="swatches" id="f-cul"></div></div>
    <div class="mact">
      ${isNew?"":'<button class="btn-d" id="f-del">Șterge</button>'}
      <button class="btn-s" id="f-cancel">Renunță</button>
      <button class="btn-p" id="f-save">${isNew?"Adaugă":"Salvează"}</button>
    </div>`;
  $("#modal").classList.add("show");

  const syncFreq=()=>{
    const max=f.lucratoare?5:7;
    if(f.perWeek>max) f.perWeek=max;
    $("#f-fv").textContent=f.perWeek+" / "+max;
    $("#f-fh").textContent = f.perWeek>=max ? "Zilnic — va avea serie pe zile (never miss twice)." : "Săptămânal — seria se numără în săptămâni reușite, nu în zile.";
  };
  const syncCul=()=>{
    $("#f-cul").innerHTML=PALETA.map(c=>`<button data-c="${c}" class="${c===f.culoare?"on":""}" style="background:${c}" aria-label="culoare"></button>`).join("");
    $$("#f-cul button").forEach(b=>b.addEventListener("click",()=>{ f.culoare=b.dataset.c; syncCul(); }));
  };
  syncFreq(); syncCul();
  $("#f-tip").addEventListener("change",e=>{ f.tip=e.target.value; $("#f-tinta-w").style.display=f.tip==="somn"?"block":"none"; });
  $("#f-tm").addEventListener("click",()=>{ f.tintaOre=Math.max(4,f.tintaOre-0.5); $("#f-tv").textContent=fmtH(f.tintaOre); });
  $("#f-tp").addEventListener("click",()=>{ f.tintaOre=Math.min(12,f.tintaOre+0.5); $("#f-tv").textContent=fmtH(f.tintaOre); });
  $("#f-neg").addEventListener("click",e=>{ f.negativ=!f.negativ; e.currentTarget.classList.toggle("on",f.negativ); });
  $("#f-luc").addEventListener("click",e=>{ f.lucratoare=!f.lucratoare; e.currentTarget.classList.toggle("on",f.lucratoare); syncFreq(); });
  $("#f-fm").addEventListener("click",()=>{ f.perWeek=Math.max(1,f.perWeek-1); syncFreq(); });
  $("#f-fp").addEventListener("click",()=>{ f.perWeek=Math.min(f.lucratoare?5:7,f.perWeek+1); syncFreq(); });
  $("#f-cancel").addEventListener("click",closeModal);
  if(!isNew) $("#f-del").addEventListener("click",()=>{
    confirmDlg(`Ștergi definitiv „${esc(f.nume)}” și tot istoricul lui? (Alternativ: arhivează-l — istoricul rămâne.)`,()=>{
      S.habits=S.habits.filter(x=>x.id!==f.id);
      Object.keys(S.entries).forEach(d=>{ if(S.entries[d][f.id]!=null){ delete S.entries[d][f.id]; if(!Object.keys(S.entries[d]).length) delete S.entries[d]; }});
      save(); closeModal(); render(); toast("Șters.");
    });
  });
  $("#f-save").addEventListener("click",()=>{
    f.nume=$("#f-nume").value.trim(); f.identitate=$("#f-id").value.trim()||"Omul care își ține promisiunile"; f.cue=$("#f-cue").value.trim();
    if(!f.nume){ $("#f-nume").focus(); return; }
    if(isNew) S.habits.push(f);
    else { const i=S.habits.findIndex(x=>x.id===f.id); S.habits[i]=f; }
    save(); closeModal(); render();
    toast(isNew?"Obicei adăugat. Primul vot e cel mai important.":"Salvat.");
  });
}
function closeModal(){ $("#modal").classList.remove("show"); }
$("#modal").addEventListener("click",e=>{ if(e.target.id==="modal") closeModal(); });

function confirmDlg(msg, yes){
  const sheet=$("#modalSheet");
  const prev=sheet.innerHTML;
  sheet.innerHTML=`<h2>Ești sigur?</h2><p style="color:var(--ink2);font-size:14px;margin-top:8px;line-height:1.5">${msg}</p>
    <div class="mact"><button class="btn-s" id="c-no">Nu</button><button class="btn-d" id="c-yes">Da, șterge</button></div>`;
  $("#modal").classList.add("show");
  $("#c-no").addEventListener("click",()=>{ sheet.innerHTML=prev; closeModal(); });
  $("#c-yes").addEventListener("click",yes);
}

/* ---------------- SETĂRI ---------------- */
function renderSet(){
  const b=$("#setbody");
  const st=S.settings;
  b.innerHTML=`
  <div class="set-h">Notificări</div>
  <div class="setcard">
    <div class="setrow"><div><div class="sl">Amintiri zilnice</div><div class="sd">Funcționează cât timp aplicația e instalată pe ecranul principal. Pe unele telefoane, economisirea de baterie le poate întârzia.</div></div>
      <button class="tg ${st.notifOn?"on":""}" id="s-notif" role="switch" aria-checked="${st.notifOn}"><i></i></button></div>
    <div class="setrow"><div class="sl">Dimineața (somn, înot)</div><input type="time" id="s-am" value="${st.notifAm}"></div>
    <div class="setrow"><div class="sl">Seara (restul bifelor)</div><input type="time" id="s-pm" value="${st.notifPm}"></div>
  </div>
  <div class="set-h">Datele tale</div>
  <div class="setcard">
    <div class="setrow"><div><div class="sl">Exportă istoricul</div><div class="sd">Fișier JSON de backup — păstrează-l în Google Drive sau trimite-ți-l pe e-mail.</div></div><button id="s-exp">Exportă</button></div>
    <div class="setrow"><div><div class="sl">Importă pe alt telefon</div><div class="sd">Deschide aplicația pe noul telefon și încarcă fișierul exportat. Înlocuiește datele curente.</div></div><button id="s-imp">Importă</button></div>
    <div class="setrow"><div><div class="sl">Șterge tot</div><div class="sd">Revine la obiceiurile inițiale, fără istoric.</div></div><button class="dng" id="s-reset">Șterge</button></div>
  </div>
  <div class="set-h">Despre</div>
  <div class="setcard about">
    <p><b>Atomic GVD</b> aplică metoda din <b>Atomic Habits</b> (James Clear): fă obiceiul <b>evident</b> (indiciul de pe fiecare card), <b>atractiv</b> (identitatea pentru care votezi), <b>ușor</b> (bifare într-o atingere, regula celor 2 minute) și <b>satisfăcător</b> (lanțul, seriile, voturile).</p>
    <p>Un obicei se formează în medie în <b>66 de zile</b> (studiul Lally, UCL, interval 18–254). O zi ratată nu strică nimic. Regula de aur: <b>nu rata de două ori la rând</b>.</p>
    <p>Seriile pentru obiceiurile de 2–3 ori pe săptămână se numără în <b>săptămâni reușite</b> — o zi de luni fără înot nu e o ratare.</p>
    <p style="color:var(--ink3)">Datele rămân doar pe telefonul tău. v1.0</p>
  </div>`;
  $("#s-notif").addEventListener("click",async e=>{
    if(!st.notifOn){
      if("Notification" in window){
        const p=await Notification.requestPermission();
        if(p!=="granted"){ toast("Permisiunea de notificări a fost refuzată din browser."); return; }
      }
      st.notifOn=true;
    } else st.notifOn=false;
    e.target.closest(".tg").classList.toggle("on",st.notifOn); save();
  });
  $("#s-am").addEventListener("change",e=>{ st.notifAm=e.target.value; save(); });
  $("#s-pm").addEventListener("change",e=>{ st.notifPm=e.target.value; save(); });
  $("#s-exp").addEventListener("click",exportJson);
  $("#s-imp").addEventListener("click",importJson);
  $("#s-reset").addEventListener("click",()=>{
    confirmDlg("Ștergi TOT istoricul și toate obiceiurile? Fă întâi un export dacă vrei să păstrezi ceva.",()=>{
      localStorage.removeItem(LSKEY); load(); closeModal(); render(); toast("Totul a fost șters.");
    });
  });
}
function exportJson(){
  const data=JSON.stringify(S,null,1);
  const blob=new Blob([data],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="atomic-gvd-backup-"+todayIso().replace(/-/g,"")+".json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  toast("Backup descărcat. Păstrează-l la loc sigur.");
}
function importJson(){
  const inp=document.createElement("input");
  inp.type="file"; inp.accept="application/json,.json";
  inp.addEventListener("change",()=>{
    const file=inp.files[0]; if(!file) return;
    const r=new FileReader();
    r.onload=()=>{
      try{
        const d=JSON.parse(r.result);
        if(!d||!Array.isArray(d.habits)||typeof d.entries!=="object") throw 0;
        S=d; if(!S.settings) S.settings={notifOn:false,notifAm:"07:30",notifPm:"21:30",onboarded:true,celebrated:{},lastNotif:{}};
        save(); render();
        toast("Istoric importat: "+d.habits.length+" obiceiuri, "+Object.keys(d.entries).length+" zile.");
      }catch(e){ toast("Fișier invalid — alege un backup Atomic GVD (.json)."); }
    };
    r.readAsText(file);
  });
  inp.click();
}

/* ---------------- notificări locale (best effort) ---------------- */
function notifTick(){
  const st=S.settings;
  if(!st.notifOn || !("Notification" in window) || Notification.permission!=="granted") return;
  const now=new Date();
  const hm=pad(now.getHours())+":"+pad(now.getMinutes());
  const today=todayIso();
  [["am",st.notifAm,"Bună dimineața. Notează somnul — și, dacă e zi de înot, geanta te așteaptă."],
   ["pm",st.notifPm,"Seara e a ta: engleza, ziua curată, bifele de azi. Fiecare bifă, un vot."]].forEach(([k,tm,msg])=>{
    if(hm>=tm && st.lastNotif[k]!==today){
      st.lastNotif[k]=today; save();
      const hs=activeHabits().filter(h=>schedDay(h,today)&&!okDay(h,today));
      const body = hs.length? msg+" ("+hs.length+" rămase)" : "Totul bifat azi. Impecabil.";
      if(navigator.serviceWorker&&navigator.serviceWorker.ready){
        navigator.serviceWorker.ready.then(reg=>reg.showNotification("Atomic GVD",{body,icon:"icon-192.png",badge:"icon-192.png",tag:"agvd-"+k}));
      } else try{ new Notification("Atomic GVD",{body}); }catch(e){}
    }
  });
}
setInterval(notifTick, 60*1000);

/* ---------------- init ---------------- */
function render(){
  if(scr==="azi") renderAzi();
  else if(scr==="rap") renderRap();
  else if(scr==="obi") renderObi();
  else renderSet();
}
load();
render();
notifTick();

/* la revenirea în aplicație, sari la ziua curentă dacă s-a schimbat data */
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden){ if(viewDate!==todayIso() && scr==="azi"){} render(); notifTick(); }
});

/* service worker */
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  });
}
