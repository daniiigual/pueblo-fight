
const TEAM_SIZE = 3;
const START_MONEY = 30;
const QUALIFIERS = 4;
const CONFIG_KEY = "puebloFightV2Config";
const GAME_KEY = "puebloFightV6Game";

const $ = id => document.getElementById(id);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const shuffle = arr => {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
};
const esc = v => String(v ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const attr = esc;

let config = loadConfig();
let game = loadGame();

function defaultConfig(){
  const names=["El Pana","La Chispa","Toni Martillo","María la Fiera","El Zurdo","Paco Turbo","La Nati","Juanito Hierro","Marta Flash","El Chato","Rosi Técnica","Sergio Muro"];
  return {
    players:["Jugador 1","Jugador 2","Jugador 3","Jugador 4"].map(name=>({id:uid(),name})),
    fighters:names.map(name=>({
      id:uid(),name,
      power:50,technique:50,speed:50,stamina:50,grit:50
    }))
  };
}
function loadConfig(){
  try{
    const raw=localStorage.getItem(CONFIG_KEY);
    const cfg=raw ? JSON.parse(raw) : defaultConfig();
    if(Array.isArray(cfg.fighters)) cfg.fighters.forEach(f=>{ if("style" in f) delete f.style; });
    return cfg;
  }catch{return defaultConfig()}
}
function saveConfig(){
  localStorage.setItem(CONFIG_KEY,JSON.stringify(config));
}
function loadGame(){
  try{
    const raw=localStorage.getItem(GAME_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch{return null}
}
function saveGame(){
  if(game) localStorage.setItem(GAME_KEY,JSON.stringify(game));
}
function clearGame(){
  game=null; localStorage.removeItem(GAME_KEY);
}
function setPhase(text){$("phasePill").textContent=text}
function showOnly(id){
  ["setupScreen","orderScreen","draftScreen","qualifierScreen","lineupCoverScreen","lineupScreen","tournamentScreen","resultsScreen"]
    .forEach(x=>$(x).classList.toggle("hidden",x!==id));
  window.scrollTo({top:0,behavior:"smooth"});
}
function toast(msg){
  $("toast").textContent=msg;$("toast").classList.remove("hidden");
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(()=>$("toast").classList.add("hidden"),1900);
}
function overall(f){
  return Math.round((Number(f.power)+Number(f.technique)+Number(f.speed)+Number(f.stamina)+Number(f.grit))/5);
}
function requiredFighters(){return config.players.length*TEAM_SIZE}
function initials(name){return String(name).trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()}
function playerById(id){return game.players.find(p=>p.id===id)}
function fighterById(id){return game.fighters.find(f=>f.id===id)}
function playerAverage(p){
  if(!p.roster.length)return 0;
  return Math.round(p.roster.reduce((s,id)=>s+overall(fighterById(id)),0)/p.roster.length*10)/10;
}

function ensureMinimumFighters(){
  const need=requiredFighters();
  while(config.fighters.length<need){
    const n=config.fighters.length+1;
    config.fighters.push({id:uid(),name:`Luchador ${n}`,power:50,technique:50,speed:50,stamina:50,grit:50});
  }
}
function renderSetup(){
  ensureMinimumFighters();
  saveConfig();
  $("continuePanel").classList.toggle("hidden",!game);

  $("playersEditor").innerHTML=config.players.map((p,i)=>`
    <div class="playerRow">
      <div class="orderNum">${i+1}</div>
      <input data-player-id="${p.id}" value="${attr(p.name)}" maxlength="28" aria-label="Nombre jugador ${i+1}">
      <button class="iconBtn removePlayer" data-player-id="${p.id}" ${config.players.length<=4?"disabled":""}>×</button>
    </div>`).join("");

  const need=requiredFighters();
  $("fighterRequirement").innerHTML=`Para ${config.players.length} jugadores hacen falta <b>${need} luchadores</b> en el draft. Tienes ${config.fighters.length}. ${config.fighters.length>need?`Se sortearán ${need} de los ${config.fighters.length} guardados.`:"Todos entrarán en esta partida."}`;

  $("fightersEditor").innerHTML=config.fighters.map((f,i)=>fighterEditorHtml(f,i)).join("");
  bindSetupInputs();
}
function fighterEditorHtml(f,i){
  return `<div class="fighterEditCard">
    <div class="fighterEditTop">
      <input class="fighterNameInput" data-fighter-id="${f.id}" value="${attr(f.name)}" maxlength="30" aria-label="Nombre luchador ${i+1}">
      <button class="iconBtn removeFighter" data-fighter-id="${f.id}" ${config.fighters.length<=requiredFighters()?"disabled":""}>×</button>
    </div>
    <div class="statsEditor">
      ${statInput("FUE","power",f)}
      ${statInput("TEC","technique",f)}
      ${statInput("VEL","speed",f)}
      ${statInput("AGU","stamina",f)}
      ${statInput("COR","grit",f)}
    </div>
    <div class="fighterAverage">Media <b id="avg-${f.id}">${overall(f)}</b></div>
  </div>`;
}
function statInput(label,key,f){
  return `<label>${label}<input type="number" inputmode="numeric" min="1" max="100" class="fighterStatInput" data-fighter-id="${f.id}" data-stat="${key}" value="${Number(f[key])}"></label>`;
}
function bindSetupInputs(){
  document.querySelectorAll("[data-player-id]:not(.removePlayer)").forEach(el=>el.addEventListener("input",e=>{
    const p=config.players.find(x=>x.id===e.target.dataset.playerId);
    if(p){p.name=e.target.value;saveConfig()}
  }));
  document.querySelectorAll(".removePlayer").forEach(btn=>btn.addEventListener("click",()=>{
    if(config.players.length<=4)return;
    config.players=config.players.filter(p=>p.id!==btn.dataset.playerId);
    renderSetup();
  }));
  document.querySelectorAll(".fighterNameInput").forEach(el=>el.addEventListener("input",e=>{
    const f=config.fighters.find(x=>x.id===e.target.dataset.fighterId);
    if(f){f.name=e.target.value;saveConfig()}
  }));
  document.querySelectorAll(".fighterStatInput").forEach(el=>el.addEventListener("change",e=>{
    const f=config.fighters.find(x=>x.id===e.target.dataset.fighterId);
    if(!f)return;
    f[e.target.dataset.stat]=clamp(parseInt(e.target.value||50,10),1,100);
    e.target.value=f[e.target.dataset.stat];
    $(`avg-${f.id}`).textContent=overall(f);
    saveConfig();
  }));
  document.querySelectorAll(".removeFighter").forEach(btn=>btn.addEventListener("click",()=>{
    if(config.fighters.length<=requiredFighters())return;
    config.fighters=config.fighters.filter(f=>f.id!==btn.dataset.fighterId);
    renderSetup();
  }));
}
function addPlayer(){
  config.players.push({id:uid(),name:`Jugador ${config.players.length+1}`});
  ensureMinimumFighters();renderSetup();
}
function addFighter(){
  const n=config.fighters.length+1;
  config.fighters.push({id:uid(),name:`Luchador ${n}`,power:50,technique:50,speed:50,stamina:50,grit:50});
  renderSetup();
}
function validateSetup(){
  if(config.players.length<4)return "Necesitáis al menos 4 jugadores.";
  if(config.players.some(p=>!p.name.trim()))return "Todos los jugadores deben tener nombre.";
  if(new Set(config.players.map(p=>p.name.trim().toLowerCase())).size!==config.players.length)return "No repitas nombres de jugadores.";
  if(config.fighters.length<requiredFighters())return `Faltan luchadores. Necesitas ${requiredFighters()}.`;
  if(config.fighters.some(f=>!f.name.trim()))return "Todos los luchadores deben tener nombre.";
  return null;
}

function startGame(){
  const err=validateSetup();if(err){toast(err);return}
  saveConfig();
  const selected=shuffle(config.fighters).slice(0,requiredFighters()).map(f=>({...f}));
  const players=config.players.map(p=>({id:p.id,name:p.name.trim(),money:START_MONEY,roster:[],lineup:[],qualified:false}));
  const order=shuffle(players.map(p=>p.id));
  game={
    version:2,phase:"order",players,fighters:selected,
    playerOrder:order,fighterOrder:shuffle(selected.map(f=>f.id)),
    fighterIndex:0,openerCursor:0,auction:null,history:[],
    ranking:[],lineupQueue:[],lineupIndex:0,tournament:null
  };
  saveGame();renderOrder();
}
function renderOrder(){
  setPhase("Orden sorteado");showOnly("orderScreen");
  $("orderList").innerHTML=game.playerOrder.map((id,i)=>`
    <div class="orderItem"><div class="orderBadge">${i+1}</div><div><b>${esc(playerById(id).name)}</b><div class="version">${i===0?"Abre la primera subasta":"Después continúa el círculo"}</div></div></div>`).join("");
}
function beginDraft(){
  game.phase="draft";saveGame();setPhase("Subasta");showOnly("draftScreen");startNextAuction();
}
function maxBidFor(p){
  if(p.roster.length>=TEAM_SIZE)return 0;
  const remainingAfterWin=TEAM_SIZE-(p.roster.length+1);
  return Math.max(0,p.money-Math.max(0,remainingAfterWin));
}
function activeForFuture(p){return p.roster.length<TEAM_SIZE && maxBidFor(p)>=1}
function nextOpener(){
  const n=game.playerOrder.length;
  for(let k=0;k<n;k++){
    const idx=(game.openerCursor+k)%n;
    const p=playerById(game.playerOrder[idx]);
    if(activeForFuture(p))return {id:p.id,index:idx};
  }
  return null;
}
function startNextAuction(){
  if(game.players.every(p=>p.roster.length>=TEAM_SIZE)){finishDraft();return}
  if(game.fighterIndex>=game.fighterOrder.length){finishDraft();return}
  const opener=nextOpener();
  if(!opener){finishDraft();return}
  const fighterId=game.fighterOrder[game.fighterIndex];
  game.auction={
    fighterId,openerId:opener.id,openerIndex:opener.index,
    leaderId:opener.id,bid:1,passed:[],
    turnId:null,log:[`${playerById(opener.id).name} abre obligatoriamente con 1 moneda.`]
  };
  game.openerCursor=(opener.index+1)%game.playerOrder.length;
  game.auction.turnId=findNextBidder(opener.index);
  saveGame();
  renderDraft();
  if(!game.auction.turnId)setTimeout(settleAuction,450);
}
function findNextBidder(afterIndex){
  const a=game.auction,n=game.playerOrder.length;
  for(let k=1;k<=n;k++){
    const idx=(afterIndex+k)%n,id=game.playerOrder[idx],p=playerById(id);
    if(id===a.leaderId)continue;
    if(a.passed.includes(id))continue;
    if(p.roster.length>=TEAM_SIZE)continue;
    if(maxBidFor(p)<a.bid+1)continue;
    return id;
  }
  return null;
}
function currentTurnIndex(){
  return game.playerOrder.indexOf(game.auction.turnId);
}
function bid(step){
  const a=game.auction;if(!a?.turnId)return;
  const p=playerById(a.turnId);
  const target=a.bid+step;
  const max=maxBidFor(p);
  if(target>max){toast(`Máximo permitido para ${p.name}: ${max} monedas.`);return}
  const oldLeader=playerById(a.leaderId);
  a.bid=target;a.leaderId=p.id;
  a.log.unshift(`${p.name} sube a ${target}.`);
  const idx=game.playerOrder.indexOf(p.id);
  a.turnId=findNextBidder(idx);
  saveGame();renderDraft();
  if(!a.turnId)setTimeout(settleAuction,350);
}
function passBid(){
  const a=game.auction;if(!a?.turnId)return;
  const p=playerById(a.turnId);
  if(!a.passed.includes(p.id))a.passed.push(p.id);
  a.log.unshift(`${p.name} pasa.`);
  const idx=game.playerOrder.indexOf(p.id);
  a.turnId=findNextBidder(idx);
  saveGame();renderDraft();
  if(!a.turnId)setTimeout(settleAuction,350);
}
function settleAuction(){
  const a=game.auction;if(!a)return;
  const winner=playerById(a.leaderId);
  const fighter=fighterById(a.fighterId);
  if(winner.roster.length>=TEAM_SIZE)return;
  winner.money-=a.bid;
  winner.roster.push(fighter.id);
  winner.lineup=[...winner.roster];
  game.history.push({fighterId:fighter.id,winnerId:winner.id,price:a.bid});
  game.fighterIndex++;
  game.auction=null;
  saveGame();
  toast(`${winner.name} ficha a ${fighter.name} por ${a.bid} 🪙`);
  setTimeout(startNextAuction,600);
}
function renderDraft(){
  setPhase("Subasta");showOnly("draftScreen");
  const a=game.auction;if(!a)return;
  const f=fighterById(a.fighterId);
  const filled=game.players.reduce((s,p)=>s+p.roster.length,0);
  const total=game.players.length*TEAM_SIZE;
  $("draftCount").textContent=`${filled} / ${total} fichajes`;
  $("draftProgress").style.width=`${filled/total*100}%`;
  $("currentFighterCard").innerHTML=fighterCardHtml(f);
  $("auctionPrice").textContent=a.bid;
  $("auctionLeader").textContent=playerById(a.leaderId).name;
  $("auctionLog").innerHTML=a.log.slice(0,12).map(x=>`<div>${esc(x)}</div>`).join("");
  if(a.turnId){
    const p=playerById(a.turnId);
    $("turnPlayer").textContent=p.name;
    $("turnMoney").textContent=`Tiene ${p.money} 🪙 · máximo legal ahora: ${maxBidFor(p)} 🪙`;
    $("bidActions").classList.remove("hidden");
    document.querySelectorAll(".bidBtn").forEach(btn=>{
      btn.disabled=a.bid+Number(btn.dataset.step)>maxBidFor(p);
    });
  }else{
    $("turnPlayer").textContent="Cerrando subasta…";
    $("turnMoney").textContent="";
    $("bidActions").classList.add("hidden");
  }
  $("draftTeams").innerHTML=game.playerOrder.map(id=>teamCardHtml(playerById(id))).join("");
}
function fighterCardHtml(f){
  return `<div class="fighterName">${esc(f.name)}</div>
    <div class="statGrid">
      ${statHtml("FUE",f.power)}${statHtml("TEC",f.technique)}${statHtml("VEL",f.speed)}${statHtml("AGU",f.stamina)}${statHtml("COR",f.grit)}
    </div>
    <div class="meanLine"><span>Media general</span><strong>${overall(f)}</strong></div>`;
}
function statHtml(label,v){return `<div class="stat"><b>${Number(v)}</b><span>${label}</span></div>`}
function rosterItemHtml(fid){
  const f=fighterById(fid);
  return `<div class="rosterItem"><div class="avatar">${initials(f.name)}</div><div class="rosterMeta"><b>${esc(f.name)}</b><span>Media ${overall(f)}</span></div></div>`;
}
function teamCardHtml(p){
  const full=p.roster.length>=TEAM_SIZE;
  return `<div class="teamCard">
    <div class="teamHead"><div><b>${esc(p.name)}</b>${full?`<div class="fullBadge">EQUIPO COMPLETO</div>`:""}</div><div class="money">${p.money} 🪙</div></div>
    <div class="roster">${p.roster.length?p.roster.map(rosterItemHtml).join(""):`<span class="version">Sin fichajes</span>`}</div>
  </div>`;
}

function finishDraft(){
  const ranking=[...game.players].sort((a,b)=>{
    const d=playerAverage(b)-playerAverage(a);
    if(Math.abs(d)>.0001)return d;
    if(b.money!==a.money)return b.money-a.money;
    return game.playerOrder.indexOf(a.id)-game.playerOrder.indexOf(b.id);
  });
  ranking.forEach((p,i)=>p.qualified=i<QUALIFIERS);
  game.ranking=ranking.map(p=>p.id);
  game.phase="qualifiers";game.auction=null;saveGame();renderQualifiers();
}
function renderQualifiers(){
  setPhase("Clasificación");showOnly("qualifierScreen");
  const eliminated=Math.max(0,game.players.length-QUALIFIERS);
  $("qualificationText").textContent=eliminated
    ? `Pasan los 4 mejores equipos por media. ${eliminated} equipo${eliminated===1?" queda":"s quedan"} eliminado${eliminated===1?"":"s"} antes del torneo.`
    : "Sois 4, así que todos pasáis al torneo.";
  $("rankingList").innerHTML=game.ranking.map((id,i)=>{
    const p=playerById(id),inside=i<QUALIFIERS;
    return `<div class="rankRow">
      <div class="rankPos">${i+1}</div>
      <div class="rankInfo"><b>${esc(p.name)}</b><span>Media ${playerAverage(p)} · ${p.money} 🪙 restantes</span></div>
      <div class="rankStatus ${inside?"in":"out"}">${inside?"TORNEO":"ELIMINADO"}</div>
    </div>`;
  }).join("");
}
function prepareLineups(){
  game.lineupPurpose="semis";
  game.lineupQueue=game.ranking.slice(0,QUALIFIERS);
  game.lineupIndex=0;game.phase="lineupCover";saveGame();renderLineupCover();
}
function renderLineupCover(){
  const isFinal=game.lineupPurpose==="final";
  setPhase(isFinal?"Final · estrategia":"Alineaciones");
  showOnly("lineupCoverScreen");
  const p=playerById(game.lineupQueue[game.lineupIndex]);
  $("lineupCoverName").textContent=p.name;
  $("lineupCoverEyebrow").textContent=isFinal?"🔥 ALINEACIÓN SECRETA DE LA FINAL":"🔒 ALINEACIÓN PRIVADA";
  $("lineupCoverTitle").textContent=isFinal?"La final permite cambiar el orden. Pásale el móvil a":"Pásale el móvil a";
  $("openLineupBtn").textContent=isFinal?"Preparar mi final":"Abrir mi equipo";
}
function openLineup(){
  game.phase="lineup";saveGame();renderLineup();
}
function renderLineup(){
  const isFinal=game.lineupPurpose==="final";
  setPhase(isFinal?"Alineación de la final":"Alineación privada");
  showOnly("lineupScreen");
  const p=playerById(game.lineupQueue[game.lineupIndex]);
  $("lineupTeamName").textContent=p.name;
  $("lineupEyebrow").textContent=isFinal?"🔥 TU ORDEN PARA LA FINAL":"TU ALINEACIÓN";
  $("lineupSubtitle").textContent=isFinal
    ?"Puedes cambiar completamente el orden respecto a la semifinal. El rival hará lo mismo en secreto."
    :"Ordena tus 3 luchadores. Cada posición decide contra quién se cruzarán.";
  $("saveLineupBtn").textContent=isFinal?"Cerrar mi alineación de la final":"Guardar y pasar el móvil";
  const labels=[
    ["1 · Primer enfrentamiento","Tu luchador 1 contra el luchador 1 rival"],
    ["2 · Segundo enfrentamiento","Tu luchador 2 contra el luchador 2 rival"],
    ["3 · Tercer enfrentamiento","Tu luchador 3 contra el luchador 3 rival"]
  ];
  $("lineupSlots").innerHTML=p.lineup.map((fid,i)=>`
    <div class="slot">
      <div class="slotHead">
        <div><b>${labels[i][0]}</b><span>${labels[i][1]}</span></div>
        <div class="reorder">
          <button class="iconBtn lineupMove" data-index="${i}" data-dir="-1">↑</button>
          <button class="iconBtn lineupMove" data-index="${i}" data-dir="1">↓</button>
        </div>
      </div>
      ${rosterItemHtml(fid)}
    </div>`).join("");
  document.querySelectorAll(".lineupMove").forEach(btn=>btn.addEventListener("click",()=>{
    moveLineup(Number(btn.dataset.index),Number(btn.dataset.dir));
  }));
}
function moveLineup(i,dir){
  const p=playerById(game.lineupQueue[game.lineupIndex]);
  const j=i+dir;if(j<0||j>=p.lineup.length)return;
  [p.lineup[i],p.lineup[j]]=[p.lineup[j],p.lineup[i]];
  saveGame();renderLineup();
}
function saveCurrentLineup(){
  game.lineupIndex++;
  if(game.lineupIndex<game.lineupQueue.length){
    game.phase="lineupCover";saveGame();renderLineupCover();
    return;
  }

  if(game.lineupPurpose==="final"){
    createFinalAfterLineups();
  }else{
    startTournament();
  }
}

function combatBonuses(fa,fb){
  // Única fuente de ventaja: diferencia de MEDIA GENERAL.
  // Misma media = +0. 1–5 = +1. 6–12 = +2. 13+ = +3.
  const diff=overall(fa)-overall(fb);
  const ad=Math.abs(diff);
  let advantage=0;
  if(ad===0) advantage=0;
  else if(ad<=5) advantage=1;
  else if(ad<=12) advantage=2;
  else advantage=3;
  return diff>0?[advantage,0]:diff<0?[0,advantage]:[0,0];
}
function resolveExchange(rollA,rollB,bonusA,bonusB){
  if(rollA===6 && rollB!==6)return "A";
  if(rollB===6 && rollA!==6)return "B";
  if(rollA===1 && rollB!==1)return "B";
  if(rollB===1 && rollA!==1)return "A";
  const totalA=rollA+bonusA,totalB=rollB+bonusB;
  if(totalA>totalB)return "A";
  if(totalB>totalA)return "B";
  return "T";
}
function exchangeWinChance(bonusA,bonusB){
  let a=0,b=0;
  for(let ra=1;ra<=6;ra++){
    for(let rb=1;rb<=6;rb++){
      const r=resolveExchange(ra,rb,bonusA,bonusB);
      if(r==="A")a++;else if(r==="B")b++;
    }
  }
  return a/(a+b);
}
function duelWinChance(bonusA,bonusB){
  const p=exchangeWinChance(bonusA,bonusB);
  return p*p*(3-2*p);
}
function rollDie(){return Math.floor(Math.random()*6)+1}
function makeExchange(fa,fb,bonusA,bonusB){
  let rollA,rollB,result;
  do{
    rollA=rollDie();rollB=rollDie();
    result=resolveExchange(rollA,rollB,bonusA,bonusB);
  }while(result==="T");
  let event="normal";
  if(result==="A" && rollA===6 && rollB!==6)event="criticalA";
  else if(result==="B" && rollB===6 && rollA!==6)event="criticalB";
  else if(result==="B" && rollA===1 && rollB!==1)event="failA";
  else if(result==="A" && rollB===1 && rollA!==1)event="failB";
  return {
    rollA,rollB,
    totalA:rollA+bonusA,totalB:rollB+bonusB,
    winnerId:result==="A"?fa.id:fb.id,event
  };
}
function makeDuel(fa,fb,pos){
  const [bonusA,bonusB]=combatBonuses(fa,fb);
  const rounds=[];
  let hitsA=0,hitsB=0;
  while(hitsA<2 && hitsB<2){
    const round=makeExchange(fa,fb,bonusA,bonusB);
    rounds.push(round);
    if(round.winnerId===fa.id)hitsA++;else hitsB++;
  }
  return {
    pos:pos+1,faId:fa.id,fbId:fb.id,
    bonusA,bonusB,
    chanceA:duelWinChance(bonusA,bonusB),
    rounds,winnerId:hitsA>hitsB?fa.id:fb.id,
    hitsA,hitsB
  };
}
function playMatch(a,b,label){
  let aw=0,bw=0;const duels=[];
  for(let i=0;i<TEAM_SIZE;i++){
    const fa=fighterById(a.lineup[i]),fb=fighterById(b.lineup[i]);
    const duel=makeDuel(fa,fb,i);
    if(duel.winnerId===fa.id)aw++;else bw++;
    duels.push(duel);
  }
  return {label,aId:a.id,bId:b.id,aw,bw,winnerId:aw>bw?a.id:b.id,duels};
}
function startTournament(){
  // Las semifinales se calculan una sola vez.
  // La final NO se calcula todavía: los dos finalistas podrán cambiar su orden.
  const q=game.ranking.slice(0,QUALIFIERS).map(playerById);
  const semi1=playMatch(q[0],q[3],"Semifinal 1");
  const semi2=playMatch(q[1],q[2],"Semifinal 2");
  game.tournament={
    semi1,semi2,final:null,championId:null,
    reveal:{matchKey:"semi1",stage:"intro",duelIndex:0,exchangeIndex:0,resolved:false}
  };
  game.phase="tournament";
  saveGame();
  renderTournament();
}

function prepareFinalLineups(){
  const finalistA=game.tournament.semi1.winnerId;
  const finalistB=game.tournament.semi2.winnerId;
  game.lineupPurpose="final";
  game.lineupQueue=[finalistA,finalistB];
  game.lineupIndex=0;
  game.phase="lineupCover";
  saveGame();
  renderLineupCover();
}

function createFinalAfterLineups(){
  const finalistA=playerById(game.tournament.semi1.winnerId);
  const finalistB=playerById(game.tournament.semi2.winnerId);
  const final=playMatch(finalistA,finalistB,"FINAL");
  game.tournament.final=final;
  game.tournament.championId=final.winnerId;
  game.tournament.reveal={
    matchKey:"final",stage:"intro",duelIndex:0,exchangeIndex:0,resolved:false
  };
  game.phase="tournament";
  saveGame();
  renderTournament();
}
function currentTournamentMatch(){
  return game.tournament[game.tournament.reveal.matchKey];
}
function tournamentSeed(playerId){
  const i=game.ranking.indexOf(playerId);
  return i>=0?i+1:"—";
}
function roundRole(pos){
  return [
    ["1 · PRIMER ENFRENTAMIENTO","Posición 1 contra posición 1"],
    ["2 · SEGUNDO ENFRENTAMIENTO","Posición 2 contra posición 2"],
    ["3 · TERCER ENFRENTAMIENTO","Posición 3 contra posición 3"]
  ][pos];
}
function revealedScore(m){
  const r=game.tournament.reveal;
  let completed=r.duelIndex;
  if(r.stage==="winner")completed=TEAM_SIZE;
  else if(r.stage==="duel"){
    const d=m.duels[r.duelIndex];
    if(r.resolved && r.exchangeIndex===d.rounds.length-1)completed++;
  }
  let a=0,b=0;
  m.duels.slice(0,completed).forEach(d=>d.winnerId===d.faId?a++:b++);
  return [a,b];
}
function revealedHits(d){
  const r=game.tournament.reveal;
  const count=r.exchangeIndex+(r.resolved?1:0);
  let a=0,b=0;
  d.rounds.slice(0,count).forEach(x=>x.winnerId===d.faId?a++:b++);
  return [a,b];
}
function renderTournament(){
  setPhase(game.tournament.reveal.matchKey==="final"?"La Final":"Torneo");
  showOnly("tournamentScreen");
  const r=game.tournament.reveal;
  if(r.stage==="intro") renderMatchIntro();
  else if(r.stage==="duel") renderDuelStage();
  else if(r.stage==="winner") renderMatchWinner();
}
function renderMatchIntro(){
  const r=game.tournament.reveal,m=currentTournamentMatch();
  const a=playerById(m.aId),b=playerById(m.bId);
  const isFinal=r.matchKey==="final";
  $("tournamentStage").innerHTML=`
    <div class="panel tournamentHero tournamentStep">
      <div class="roundTitle">${isFinal?"🔥 LA GRAN FINAL":esc(m.label)}</div>
      <div class="matchupTitle">${esc(a.name)} <span class="matchupVs">VS</span> ${esc(b.name)}</div>
      <div class="teamVsGrid">
        ${teamIntroHtml(a)}
        <div class="bigVs">VS</div>
        ${teamIntroHtml(b)}
      </div>
      ${isFinal?`<div class="finalWarning">Aquí se decide el campeón. La media da ventaja, pero los dados pueden destrozar cualquier pronóstico.</div>`:
      `<div class="cinematicNote">Cada duelo es al mejor de 3 golpes. Un 6 natural puede cambiarlo todo.</div>`}
      <button id="enterMatchBtn" class="btn giant">${isFinal?"Que empiece la FINAL":"Abrir el corro"}</button>
    </div>`;
  $("enterMatchBtn").addEventListener("click",()=>{
    r.stage="duel";r.duelIndex=0;r.exchangeIndex=0;r.resolved=false;saveGame();renderTournament();
  });
}
function teamIntroHtml(p){
  return `<div class="teamIntro">
    <span class="teamSeed">Cabeza de serie #${tournamentSeed(p.id)}</span>
    <b>${esc(p.name)}</b>
    <div class="teamMean">${playerAverage(p)}</div>
    <span class="teamMeanLabel">media del equipo</span>
  </div>`;
}
function diceChar(n){return ["","⚀","⚁","⚂","⚃","⚄","⚅"][n]||"?"}
function chanceLabel(chance){
  const pct=Math.round(chance*100);
  if(pct>=78)return "Favorito claro";
  if(pct>=65)return "Favorito";
  if(pct>=55)return "Ligera ventaja";
  if(pct<=22)return "Gran sorpresa si gana";
  if(pct<=35)return "No favorito";
  if(pct<=45)return "Ligera desventaja";
  return "Muy igualado";
}
function exchangeEventText(round,fa,fb){
  if(round.event==="criticalA")return `🔥 ¡6 NATURAL! ${fa.name} conecta un crítico.`;
  if(round.event==="criticalB")return `🔥 ¡6 NATURAL! ${fb.name} conecta un crítico.`;
  if(round.event==="failA")return `💥 ${fa.name} saca un 1 y falla por completo.`;
  if(round.event==="failB")return `💥 ${fb.name} saca un 1 y falla por completo.`;
  const winner=round.winnerId===fa.id?fa:fb;
  return `⚔️ ${winner.name} se lleva el intercambio.`;
}
function renderDuelStage(){
  const r=game.tournament.reveal,m=currentTournamentMatch();
  const a=playerById(m.aId),b=playerById(m.bId);
  const d=m.duels[r.duelIndex],fa=fighterById(d.faId),fb=fighterById(d.fbId);
  const round=d.rounds[r.exchangeIndex];
  const role=roundRole(r.duelIndex);
  const [as,bs]=revealedScore(m);
  const [ha,hb]=revealedHits(d);
  const resolved=r.resolved;
  const duelFinished=resolved && r.exchangeIndex===d.rounds.length-1;
  const isLastDuel=r.duelIndex===TEAM_SIZE-1;

  $("tournamentStage").innerHTML=`
    <div class="panel tournamentStep">
      <div class="roundTitle">${r.matchKey==="final"?"LA FINAL":esc(m.label)}</div>
      <div class="scoreboard">
        <div class="scoreboardTeam">${esc(a.name)}</div>
        <div class="scoreboardScore">${as} – ${bs}</div>
        <div class="scoreboardTeam right">${esc(b.name)}</div>
      </div>

      <div class="duelStage">
        <div class="duelPosition">
          <b>${role[0]}</b>
          <span>${role[1]} · primero en conseguir 2 golpes</span>
        </div>

        <div class="duelHits">
          <span>${esc(fa.name)} <b>${ha}</b></span>
          <div>GOLPES</div>
          <span><b>${hb}</b> ${esc(fb.name)}</span>
        </div>

        <div class="duelFighters">
          ${diceFighterHtml(fa,d,true,resolved,round)}
          <div class="bigVs">VS</div>
          ${diceFighterHtml(fb,d,false,resolved,round)}
        </div>

        ${resolved?`
          <div class="diceResultText ${round.event!=="normal"?"specialEvent":""}">
            ${esc(exchangeEventText(round,fa,fb))}
          </div>
          ${duelFinished?`<div class="revealWinner">
            <div class="eyebrow">DUELO TERMINADO</div>
            <b>${esc(fighterById(d.winnerId).name)} gana ${d.hitsA}–${d.hitsB}</b>
          </div>`:""}
        `:""}
      </div>

      <div class="combatRuleHint">
        <b>Regla:</b> 6 natural = crítico · 1 natural = fallo · si no, dado + bono por diferencia de media.
      </div>

      <div style="margin-top:13px">
        ${resolved
          ? `<button id="nextDuelBtn" class="btn giant">${
              duelFinished
                ? (isLastDuel?"Ver ganador del combate":"Siguiente enfrentamiento")
                : "Siguiente tirada"
            }</button>`
          : `<button id="resolveDuelBtn" class="btn giant">🎲 Que rueden los dados</button>`
        }
      </div>
    </div>`;

  if(resolved){
    $("nextDuelBtn").addEventListener("click",()=>{
      if(duelFinished){
        if(isLastDuel){
          r.stage="winner";
        }else{
          r.duelIndex++;r.exchangeIndex=0;r.resolved=false;
        }
      }else{
        r.exchangeIndex++;r.resolved=false;
      }
      saveGame();renderTournament();
    });
  }else{
    $("resolveDuelBtn").addEventListener("click",runCountdownAndReveal);
  }
}
function diceFighterHtml(f,d,isA,resolved,round){
  const bonus=isA?d.bonusA:d.bonusB;
  const chance=isA?d.chanceA:1-d.chanceA;
  const roll=isA?round.rollA:round.rollB;
  const naturalSpecial=resolved && (roll===1||roll===6);
  return `<div class="duelFighter">
    <div class="fighterAvatarBig">${initials(f.name)}</div>
    <h3>${esc(f.name)}</h3>
    <div class="duelMean">${overall(f)}<small>media</small></div>

    <div class="oddsLine">
      <b>≈${Math.round(chance*100)}%</b>
      <span>${chanceLabel(chance)}</span>
    </div>
    <div class="bonusLine">Bono por media <b>+${bonus}</b></div>

    <div class="dieBox ${resolved?"revealed":"rolling"} ${naturalSpecial?"naturalSpecial":""}">
      <div class="dieFace">${resolved?diceChar(roll):"?"}</div>
      <div class="dieNumber">${resolved?`Dado ${roll}`:"Dado oculto"}</div>
    </div>

    ${resolved && roll!==1 && roll!==6
      ? `<div class="totalLine">${roll} + ${bonus} = <b>${roll+bonus}</b></div>`
      : resolved
        ? `<div class="totalLine"><b>${roll===6?"CRÍTICO":"FALLO"}</b></div>`
        : `<div class="totalLine">Esperando tirada…</div>`
    }
  </div>`;
}
function runCountdownAndReveal(){
  const btn=$("resolveDuelBtn");
  if(btn)btn.disabled=true;
  const overlay=document.createElement("div");
  overlay.className="countdownOverlay";
  document.body.appendChild(overlay);
  let values=["3","2","1","¡YA!"],i=0;
  const tick=()=>{
    overlay.innerHTML=`<div class="countdownNumber" key="${i}">${values[i]}</div>`;
    // Reinicia la animación cambiando el nodo.
    i++;
    if(i<values.length)setTimeout(tick,580);
    else setTimeout(()=>{
      overlay.remove();
      game.tournament.reveal.resolved=true;
      saveGame();renderTournament();
    },520);
  };
  tick();
}
function renderMatchWinner(){
  const r=game.tournament.reveal,m=currentTournamentMatch();
  const winner=playerById(m.winnerId);
  const loser=playerById(m.winnerId===m.aId?m.bId:m.aId);
  const winnerScore=m.winnerId===m.aId?m.aw:m.bw;
  const loserScore=m.winnerId===m.aId?m.bw:m.aw;
  const isFinal=r.matchKey==="final";
  $("tournamentStage").innerHTML=`
    <div class="panel matchWinnerStage tournamentStep">
      <div class="winnerIcon">${isFinal?"🏆":"⚔️"}</div>
      <div class="roundTitle">${isFinal?"FINAL TERMINADA":esc(m.label)+" TERMINADA"}</div>
      <div class="matchWinnerName">${esc(winner.name)}</div>
      <p>${isFinal
        ? `ha ganado la final ${winnerScore}–${loserScore} y es el nuevo campeón de Pueblo Fight.`
        : `elimina a ${esc(loser.name)} por ${winnerScore}–${loserScore} y avanza a la final.`}</p>
      <button id="advanceTournamentBtn" class="btn giant">${nextTournamentButtonLabel()}</button>
    </div>`;
  $("advanceTournamentBtn").addEventListener("click",advanceTournament);
}
function nextTournamentButtonLabel(){
  const key=game.tournament.reveal.matchKey;
  if(key==="semi1")return "Que pase la siguiente semifinal";
  if(key==="semi2")return "Preparar alineaciones de la FINAL";
  return "Levantar el trofeo";
}
function advanceTournament(){
  const r=game.tournament.reveal;
  if(r.matchKey==="semi1"){
    r.matchKey="semi2";r.stage="intro";r.duelIndex=0;r.exchangeIndex=0;r.resolved=false;
    saveGame();renderTournament();
  }else if(r.matchKey==="semi2"){
    prepareFinalLineups();
  }else{
    game.phase="results";saveGame();renderResults();
  }
}
function renderResults(){
  setPhase("Campeón");showOnly("resultsScreen");
  const champ=playerById(game.tournament.championId);
  $("championCard").innerHTML=`
    <div class="eyebrow">🏆 CAMPEÓN DE PUEBLO FIGHT</div>
    <div class="championName">${esc(champ.name)}</div>
    <div class="championSubtitle">Sobrevivió al draft, a la semifinal y a la final.</div>
    <p>Media de equipo ${playerAverage(champ)} · ${champ.money} monedas sin gastar.</p>`;
  $("tournamentResults").innerHTML=
    matchHtml(game.tournament.semi1)+matchHtml(game.tournament.semi2)+(game.tournament.final?matchHtml(game.tournament.final):"");
}
function matchHtml(m){
  const a=playerById(m.aId),b=playerById(m.bId);
  return `<div class="match">
    <div class="matchTitle"><span>${m.label}</span><span>${esc(a.name)} ${m.aw}–${m.bw} ${esc(b.name)}</span></div>
    ${m.duels.map(d=>{
      const fa=fighterById(d.faId),fb=fighterById(d.fbId);
      return `<div class="duel">
        <div class="${d.winnerId===fa.id?"winner":"loser"}"><b>${esc(fa.name)}</b><br><small>Media ${overall(fa)} · ${d.hitsA} golpes</small></div>
        <div class="vs">VS<br>#${d.pos}<br>🎲</div>
        <div class="${d.winnerId===fb.id?"winner":"loser"}" style="text-align:right"><b>${esc(fb.name)}</b><br><small>Media ${overall(fb)} · ${d.hitsB} golpes</small></div>
      </div>`;
    }).join("")}
  </div>`;
}

function resumeGame(){
  if(!game)return;
  switch(game.phase){
    case "order":renderOrder();break;
    case "draft":
      setPhase("Subasta");showOnly("draftScreen");
      if(game.auction) renderDraft(); else startNextAuction();
      break;
    case "qualifiers":renderQualifiers();break;
    case "lineupCover":renderLineupCover();break;
    case "lineup":renderLineup();break;
    case "tournament":
      if(game.tournament?.reveal)renderTournament();
      else startTournament();
      break;
    case "results":renderResults();break;
    default:showOnly("setupScreen");
  }
}
function samePlayersRematch(){
  clearGame();renderSetup();startGame();
}
function backToSetup(){
  clearGame();setPhase("Preparación");showOnly("setupScreen");renderSetup();
}

$("addPlayerBtn").addEventListener("click",addPlayer);
$("addFighterBtn").addEventListener("click",addFighter);
$("startGameBtn").addEventListener("click",startGame);
$("beginDraftBtn").addEventListener("click",beginDraft);
$("passBidBtn").addEventListener("click",passBid);
document.querySelectorAll(".bidBtn").forEach(btn=>btn.addEventListener("click",()=>bid(Number(btn.dataset.step))));
$("prepareLineupsBtn").addEventListener("click",prepareLineups);
$("openLineupBtn").addEventListener("click",openLineup);
$("saveLineupBtn").addEventListener("click",saveCurrentLineup);
$("rematchBtn").addEventListener("click",samePlayersRematch);
$("backSetupBtn").addEventListener("click",backToSetup);
$("continueBtn").addEventListener("click",resumeGame);
$("discardGameBtn").addEventListener("click",()=>{clearGame();renderSetup();toast("Partida borrada.")});

renderSetup();
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
