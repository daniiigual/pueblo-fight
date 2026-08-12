
const TEAM_SIZE = 3;
const START_MONEY = 20;
const QUALIFIERS = 4;
const CONFIG_KEY = "puebloFightV8Config";
const GAME_KEY = "puebloFightV9Game";
const UNDO_KEY = "puebloFightV9Undo";

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

let duelUi = null;
let uiTimers=[];
let auctionTimer=null;
let pendingConfirm=null;
let undoStack=loadUndoStack();

let config = loadConfig();
let game = loadGame();

function defaultConfig(){
  const playerNames=["Unai","Pol","Fran","Andres","Dani","Peke"];
  const fighterData=[
    ["Carlos",30,5,66,18,10],
    ["Funko pop",20,10,75,20,10],
    ["Yanik",40,1,25,30,70],
    ["Gon",30,20,84,25,1],
    ["Maclovin",15,1,10,2,99],
    ["Fulko",90,95,15,60,99],
    ["Emo",90,70,22,70,95],
    ["Pepito",99,65,15,85,70],
    ["Titaco",95,50,30,90,45],
    ["Dani edo",85,80,80,80,4],
    ["Marcos perras",80,40,40,65,95],
    ["Ivan",92,80,55,88,30],
    ["Emilio",70,30,70,85,20],
    ["Manolo",90,85,80,80,1],
    ["Pablete",70,77,65,30,99],
    ["Palomitas",10,5,10,30,95],
    ["Salva",65,85,50,10,85],
    ["Kameni",55,90,80,30,70]
  ];
  return {
    players:playerNames.map(name=>({id:uid(),name})),
    fighters:fighterData.map(([name,power,technique,speed,stamina,grit])=>({
      id:uid(),name,power,technique,speed,stamina,grit
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
  if(game)localStorage.setItem(GAME_KEY,JSON.stringify(game));
  else localStorage.removeItem(GAME_KEY);
  updateChrome();
}
function loadUndoStack(){
  try{return JSON.parse(localStorage.getItem(UNDO_KEY)||"[]")}catch{return []}
}
function saveUndoStack(){
  localStorage.setItem(UNDO_KEY,JSON.stringify(undoStack.slice(-35)));
}
function clearUiTimers(){
  uiTimers.forEach(clearTimeout);uiTimers=[];
  if(auctionTimer){clearTimeout(auctionTimer);auctionTimer=null}
  document.querySelectorAll('.countdownOverlay').forEach(x=>x.remove());
  duelUi=null;
}
function later(fn,ms){const id=setTimeout(()=>{uiTimers=uiTimers.filter(x=>x!==id);fn()},ms);uiTimers.push(id);return id}
function snapshot(label){
  const snap={
    label,
    game:game?JSON.parse(JSON.stringify(game)):null,
    config:JSON.parse(JSON.stringify(config))
  };
  const encoded=JSON.stringify(snap);
  const last=undoStack.length?JSON.stringify(undoStack[undoStack.length-1]):null;
  if(encoded!==last){undoStack.push(snap);undoStack=undoStack.slice(-35);saveUndoStack()}
  updateChrome();
}
function clearUndo(){undoStack=[];localStorage.removeItem(UNDO_KEY);updateChrome()}
function undoLast(){
  if(!undoStack.length){toast("No hay nada que deshacer.");return}
  clearUiTimers();
  const snap=undoStack.pop();saveUndoStack();
  game=snap.game?JSON.parse(JSON.stringify(snap.game)):null;
  config=JSON.parse(JSON.stringify(snap.config));
  saveConfig();saveGame();closeSheet();
  renderCurrent();
  toast(`↶ ${snap.label}`);
}
function clearGame(){
  clearUiTimers();
  game=null;localStorage.removeItem(GAME_KEY);
  updateChrome();
}
function setPhase(text){$("phasePill").textContent=text;updateChrome()}
function showOnly(id){
  ["setupScreen","orderScreen","draftScreen","qualifierScreen","lineupCoverScreen","lineupScreen","tournamentScreen","resultsScreen"]
    .forEach(x=>$(x).classList.toggle("hidden",x!==id));
  updateChrome();
  window.scrollTo({top:0,behavior:"smooth"});
}
function currentStep(){
  if(!game)return null;
  if(game.phase==="order"||game.phase==="draft"||game.phase==="qualifiers")return "draft";
  if(game.phase==="lineup"||game.phase==="lineupCover")return "lineup";
  if(game.phase==="tournament")return "tournament";
  if(game.phase==="results")return "results";
  return null;
}
function updateChrome(){
  const back=$("backBtn"),rail=$("phaseRail");
  if(back){back.disabled=!undoStack.length;back.classList.toggle("hasHistory",!!undoStack.length)}
  if(rail){
    const step=currentStep();rail.classList.toggle("hidden",!step);
    const order=["draft","lineup","tournament","results"],idx=order.indexOf(step);
    rail.querySelectorAll("span").forEach((el,i)=>{el.classList.toggle("active",i===idx);el.classList.toggle("done",i<idx)});
  }
  if($("sheetFinishBtn"))$("sheetFinishBtn").classList.toggle("hidden",!game);
  if($("sheetResumeBtn"))$("sheetResumeBtn").classList.toggle("hidden",!game);
  if($("sheetUndoBtn")){
    $("sheetUndoBtn").disabled=!undoStack.length;
    $("undoDescription").textContent=undoStack.length?undoStack[undoStack.length-1].label:"Nada que deshacer";
  }
}
function renderCurrent(){
  renderSetup();
  if(!game){setPhase("Preparación");showOnly("setupScreen");return}
  switch(game.phase){
    case "order":renderOrder();break;
    case "draft":setPhase("Subasta");showOnly("draftScreen");if(game.auction)renderDraft();else startNextAuction();break;
    case "qualifiers":renderQualifiers();break;
    case "lineupCover":renderLineupCover();break;
    case "lineup":renderLineup();break;
    case "tournament":game.tournament?.reveal?renderTournament():startTournament();break;
    case "results":renderResults();break;
    default:setPhase("Preparación");showOnly("setupScreen");
  }
}
function openSheet(){
  $("appSheet").classList.remove("hidden");$("sheetBackdrop").classList.remove("hidden");
  $("sheetPhaseDescription").textContent=game?`Fase actual: ${$("phasePill").textContent} · guardado automático`:"Configura la próxima partida";
  updateChrome();
}
function closeSheet(){$("appSheet").classList.add("hidden");$("sheetBackdrop").classList.add("hidden")}
function askConfirm(title,text,confirmText,onConfirm){
  pendingConfirm=onConfirm;
  $("confirmTitle").textContent=title;$("confirmText").textContent=text;$("confirmOkBtn").textContent=confirmText;
  $("confirmDialog").classList.remove("hidden");$("confirmBackdrop").classList.remove("hidden");
}
function closeConfirm(){pendingConfirm=null;$("confirmDialog").classList.add("hidden");$("confirmBackdrop").classList.add("hidden")}
function finishGameNow(){
  clearGame();clearUndo();closeSheet();closeConfirm();renderSetup();setPhase("Preparación");showOnly("setupScreen");toast("Partida terminada. La configuración se conserva.")
}
function resetDefaults(){
  config=defaultConfig();saveConfig();clearGame();clearUndo();closeSheet();closeConfirm();renderSetup();showOnly("setupScreen");toast("Datos de ejemplo restaurados.")
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
  ensureMinimumFighters();saveConfig();
  $("continuePanel").classList.toggle("hidden",!game);
  if(game){
    $("continueTitle").textContent=`Partida en curso · ${$("phasePill").textContent||"guardada"}`;
    $("continueDescription").textContent="Puedes continuar o terminarla sin perder tus jugadores ni luchadores.";
  }
  $("setupPlayerMetric").textContent=config.players.length;
  $("playersSummaryCount").textContent=`${config.players.length} configurados`;
  $("fightersSummaryCount").textContent=`${config.fighters.length} configurados`;

  $("playersEditor").innerHTML=config.players.map((p,i)=>`
    <div class="playerRow">
      <div class="orderNum">${i+1}</div>
      <input data-player-id="${p.id}" value="${attr(p.name)}" maxlength="28" aria-label="Nombre jugador ${i+1}">
      <button class="iconBtn removePlayer" data-player-id="${p.id}" ${config.players.length<=4?"disabled":""} aria-label="Eliminar ${attr(p.name)}">×</button>
    </div>`).join("");

  const need=requiredFighters();
  $("fighterRequirement").innerHTML=`Necesitas <b>${need}</b> para ${config.players.length} jugadores. Tienes <b>${config.fighters.length}</b>. ${config.fighters.length>need?`Se sortearán ${need}.`:"Entran todos."}`;
  $("setupReadyText").textContent=config.fighters.length>=need?`${config.players.length} jugadores · ${need} luchadores entrarán al draft`:`Faltan ${need-config.fighters.length} luchadores`;

  $("fightersEditor").innerHTML=config.fighters.map((f,i)=>fighterEditorHtml(f,i)).join("");
  bindSetupInputs();
  const search=$("fighterSearch");if(search){search.value="";search.oninput=()=>filterFighters(search.value)}
  updateChrome();
}
function fighterEditorHtml(f,i){
  return `<details class="fighterEditCard fighterAccordion" data-fighter-name="${attr(f.name.toLowerCase())}">
    <summary class="fighterEditSummary">
      <div><span class="fighterIndex">${i+1}</span><b class="fighterSummaryName">${esc(f.name)}</b></div>
      <span class="fighterSummaryAverage">Media <strong id="summary-avg-${f.id}">${overall(f)}</strong></span>
    </summary>
    <div class="fighterEditBody">
      <div class="fighterEditTop">
        <input class="fighterNameInput" data-fighter-id="${f.id}" value="${attr(f.name)}" maxlength="30" aria-label="Nombre luchador ${i+1}">
        <button class="iconBtn removeFighter" data-fighter-id="${f.id}" ${config.fighters.length<=requiredFighters()?"disabled":""} aria-label="Eliminar ${attr(f.name)}">×</button>
      </div>
      <div class="statsEditor">
        ${statInput("FUE","power",f)}
        ${statInput("TEC","technique",f)}
        ${statInput("VEL","speed",f)}
        ${statInput("AGU","stamina",f)}
        ${statInput("COR","grit",f)}
      </div>
      <div class="fighterAverage">Media <b id="avg-${f.id}">${overall(f)}</b></div>
    </div>
  </details>`;
}
function filterFighters(query){
  const q=String(query||"").trim().toLowerCase();
  document.querySelectorAll(".fighterAccordion").forEach(el=>el.classList.toggle("searchHidden",q && !el.dataset.fighterName.includes(q)));
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
    if(f){
      f.name=e.target.value;saveConfig();
      const card=e.target.closest(".fighterAccordion");if(card){card.dataset.fighterName=f.name.toLowerCase();card.querySelector(".fighterSummaryName").textContent=f.name}
    }
  }));
  document.querySelectorAll(".fighterStatInput").forEach(el=>el.addEventListener("change",e=>{
    const f=config.fighters.find(x=>x.id===e.target.dataset.fighterId);
    if(!f)return;
    f[e.target.dataset.stat]=clamp(parseInt(e.target.value||50,10),1,100);
    e.target.value=f[e.target.dataset.stat];
    $(`avg-${f.id}`).textContent=overall(f);
    const summary=$(`summary-avg-${f.id}`);if(summary)summary.textContent=overall(f);
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
  snapshot("Volver a configuración")
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
  snapshot("Volver al sorteo");
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
  const openerPlayer=playerById(opener.id);

  game.auction={
    fighterId,
    openerId:opener.id,
    openerIndex:opener.index,
    leaderId:null,
    bid:0,
    passed:[],
    turnId:opener.id,
    log:[`🎤 ${openerPlayer.name} abre esta subasta. Tiene que pujar, pero elige la cantidad.`]
  };

  game.openerCursor=(opener.index+1)%game.playerOrder.length;
  saveGame();
  renderDraft();
}
function findNextBidder(afterIndex){
  const a=game.auction,n=game.playerOrder.length;
  if(!a?.leaderId)return null;

  for(let k=1;k<=n;k++){
    const idx=(afterIndex+k)%n;
    const id=game.playerOrder[idx];
    const p=playerById(id);

    if(id===a.leaderId)continue;
    if(a.passed.includes(id))continue;
    if(p.roster.length>=TEAM_SIZE)continue;
    if(maxBidFor(p)<a.bid+1)continue;
    return id;
  }
  return null;
}
function renderQuickBidShortcuts(min,max){
  const row=$("quickBidRow");if(!row)return;
  const raw=[min,min+1,min+2,min+5,max].filter(v=>v>=min&&v<=max);
  const values=[...new Set(raw)];
  row.innerHTML=values.map((v,i)=>`<button type="button" class="quickBidBtn ${v===max?"maxQuick":""}" data-amount="${v}">${i===0?`Mín. ${v}`:v===max?`Máx. ${v}`:`${v} 🪙`}</button>`).join("");
  row.querySelectorAll(".quickBidBtn").forEach(btn=>btn.addEventListener("click",()=>{
    $("bidAmount").value=btn.dataset.amount;$("bidAmount").focus();
    row.querySelectorAll(".quickBidBtn").forEach(x=>x.classList.toggle("selected",x===btn));
  }));
}
function placeBid(){
  const a=game.auction;
  if(!a?.turnId)return;

  const p=playerById(a.turnId);
  const input=$("bidAmount");
  const target=parseInt(input.value,10);
  const max=maxBidFor(p);
  const min=a.leaderId ? a.bid+1 : 1;

  if(!Number.isFinite(target)){
    toast("Escribe una cantidad de monedas.");
    input.focus();
    return;
  }
  if(target<min){
    toast(a.leaderId ? `La puja mínima es ${min} 🪙.` : "La apertura mínima es 1 🪙.");
    return;
  }
  if(target>max){
    toast(`Máximo legal para ${p.name}: ${max} 🪙.`);
    return;
  }

  snapshot(`Deshacer puja de ${p.name}`);
  const opening=!a.leaderId;
  a.bid=target;
  a.leaderId=p.id;
  a.log.unshift(opening
    ? `🔥 ${p.name} abre fuerte con ${target} 🪙.`
    : `💰 ${p.name} toma la delantera con ${target} 🪙.`
  );

  const idx=game.playerOrder.indexOf(p.id);
  a.turnId=findNextBidder(idx);

  saveGame();
  renderDraft();

  if(!a.turnId){auctionTimer=setTimeout(()=>{auctionTimer=null;settleAuction()},500)}
}
function passBid(){
  const a=game.auction;
  if(!a?.turnId)return;

  const p=playerById(a.turnId);

  if(!a.leaderId){
    toast(`${p.name} es el abridor: tiene que hacer una puja.`);
    return;
  }

  snapshot(`Deshacer paso de ${p.name}`);
  if(!a.passed.includes(p.id))a.passed.push(p.id);
  a.log.unshift(`✋ ${p.name} pasa.`);

  const idx=game.playerOrder.indexOf(p.id);
  a.turnId=findNextBidder(idx);

  saveGame();
  renderDraft();

  if(!a.turnId){auctionTimer=setTimeout(()=>{auctionTimer=null;settleAuction()},450)}
}
function settleAuction(){
  const a=game.auction;
  if(!a?.leaderId)return;

  const winner=playerById(a.leaderId);
  const fighter=fighterById(a.fighterId);

  winner.money-=a.bid;
  winner.roster.push(fighter.id);
  winner.lineup=[...winner.roster];

  game.history.push({fighterId:fighter.id,winnerId:winner.id,price:a.bid});
  game.fighterIndex++;
  game.auction=null;

  saveGame();
  toast(`🔨 ${winner.name} ficha a ${fighter.name} por ${a.bid} 🪙`);
  auctionTimer=setTimeout(()=>{auctionTimer=null;startNextAuction()},650);
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

  const leader=a.leaderId?playerById(a.leaderId):null;
  $("auctionPrice").textContent=leader?`${a.bid} 🪙`:"—";
  $("auctionLeader").textContent=leader?leader.name:"Aún sin puja";

  $("leaderVisual").classList.toggle("isActive",!!leader);
  $("auctionLog").innerHTML=a.log.slice(0,12).map(x=>`<div>${esc(x)}</div>`).join("");

  if(a.turnId){
    const p=playerById(a.turnId);
    const max=maxBidFor(p);
    const min=leader?a.bid+1:1;
    const isOpener=!leader && p.id===a.openerId;

    $("turnPlayer").textContent=p.name;
    $("turnMoney").textContent=`${p.money} 🪙 disponibles · máximo legal ${max} 🪙`;
    $("turnBox").classList.add("isActive");
    $("bidComposer").classList.remove("hidden");

    const input=$("bidAmount");
    input.min=min;
    input.max=max;
    input.value="";
    input.placeholder=isOpener ? `1–${max}` : `${min}–${max}`;

    $("bidHint").innerHTML=isOpener
      ? `<b>${esc(p.name)} abre.</b> Puede empezar con cualquier cantidad entre <strong>1 y ${max}</strong> monedas.`
      : `Para ponerse primero debe pujar al menos <strong>${min} 🪙</strong>. Máximo: <strong>${max} 🪙</strong>.`;
    renderQuickBidShortcuts(min,max);

    $("passBidBtn").disabled=isOpener;
    $("passBidBtn").textContent=isOpener?"El abridor no puede pasar":"Paso en este luchador";
    $("placeBidBtn").disabled=max<min;
  }else{
    $("turnPlayer").textContent="Adjudicando…";
    $("turnMoney").textContent="";
    $("turnBox").classList.remove("isActive");
    $("bidComposer").classList.add("hidden");
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
  const a=game?.auction;
  const isTurn=a?.turnId===p.id;
  const isLeader=a?.leaderId===p.id;
  return `<div class="teamCard ${isTurn?"teamIsTurn":""} ${isLeader?"teamIsLeader":""}">
    <div class="teamHead">
      <div>
        <b>${esc(p.name)}</b>
        ${isLeader?`<div class="auctionBadge leaderBadge">👑 VA GANANDO</div>`:""}
        ${isTurn?`<div class="auctionBadge turnBadge">👉 LE TOCA PUJAR</div>`:""}
        ${full?`<div class="fullBadge">EQUIPO COMPLETO</div>`:""}
      </div>
      <div class="money">${p.money} 🪙</div>
    </div>
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
  snapshot("Volver a clasificación");
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
  snapshot("Deshacer cambio de alineación");
  const p=playerById(game.lineupQueue[game.lineupIndex]);
  const j=i+dir;if(j<0||j>=p.lineup.length)return;
  [p.lineup[i],p.lineup[j]]=[p.lineup[j],p.lineup[i]];
  saveGame();renderLineup();
}
function saveCurrentLineup(){
  snapshot("Volver a la alineación anterior");
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

function rollDie(){return Math.floor(Math.random()*6)+1}
function makeInitiative(fa,fb){
  let rollA,rollB;
  do{
    rollA=rollDie();
    rollB=rollDie();
  }while(rollA===rollB);
  return {
    rollA,rollB,
    firstId:rollA>rollB?fa.id:fb.id
  };
}
function makeDuel(fa,fb,pos){
  const initiative=makeInitiative(fa,fb);
  return {
    pos:pos+1,
    faId:fa.id,
    fbId:fb.id,
    rollA:initiative.rollA,
    rollB:initiative.rollB,
    firstId:initiative.firstId,
    winnerId:null
  };
}
function createMatch(a,b,label){
  const duels=[];
  for(let i=0;i<TEAM_SIZE;i++){
    duels.push(makeDuel(fighterById(a.lineup[i]),fighterById(b.lineup[i]),i));
  }
  return {label,aId:a.id,bId:b.id,aw:0,bw:0,winnerId:null,duels};
}
function recalcMatch(m){
  m.aw=m.duels.filter(d=>d.winnerId===d.faId).length;
  m.bw=m.duels.filter(d=>d.winnerId===d.fbId).length;
  if(m.duels.every(d=>!!d.winnerId)){
    m.winnerId=m.aw>m.bw?m.aId:m.bId;
    if(game.tournament?.reveal?.matchKey==="final"){
      game.tournament.championId=m.winnerId;
    }
  }
}
function startTournament(){
  const q=game.ranking.slice(0,QUALIFIERS).map(playerById);
  const semi1=createMatch(q[0],q[3],"Semifinal 1");
  const semi2=createMatch(q[1],q[2],"Semifinal 2");

  game.tournament={
    semi1,semi2,final:null,championId:null,
    reveal:{
      matchKey:"semi1",
      stage:"intro",
      duelIndex:0,
      initiativeRevealed:false,
      resolved:false
    }
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

  game.tournament.final=createMatch(finalistA,finalistB,"FINAL");
  game.tournament.championId=null;
  game.tournament.reveal={
    matchKey:"final",
    stage:"intro",
    duelIndex:0,
    initiativeRevealed:false,
    resolved:false
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
  return [m.aw,m.bw];
}
function renderTournament(){
  setPhase(game.tournament.reveal.matchKey==="final"?"La Final":"Torneo");
  showOnly("tournamentScreen");
  const r=game.tournament.reveal;
  if(r.stage==="intro")renderMatchIntro();
  else if(r.stage==="duel")renderDuelStage();
  else if(r.stage==="winner")renderMatchWinner();
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

      <div class="decisionRule">
        <b>🎲 Dados:</b> solo deciden quién golpea primero.<br>
        <b>🗣️ Victoria:</b> la decidís vosotros y tú marcas al ganador.
      </div>

      ${isFinal
        ? `<div class="finalWarning">Los dos finalistas ya han podido cambiar su orden en secreto. Ahora manda el debate.</div>`
        : `<div class="cinematicNote">Discutid el enfrentamiento y elegid quién ha ganado cuando llegue el momento.</div>`}

      <button id="enterMatchBtn" class="btn giant">${isFinal?"Que empiece la FINAL":"Abrir el corro"}</button>
    </div>`;

  $("enterMatchBtn").addEventListener("click",()=>{
    r.stage="duel";
    r.duelIndex=0;
    r.initiativeRevealed=false;
    r.resolved=false;
    duelUi=null;
    saveGame();
    renderTournament();
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
function getUiStage(r){
  if(!duelUi)return null;
  if(duelUi.matchKey!==r.matchKey)return null;
  if(duelUi.duelIndex!==r.duelIndex)return null;
  return duelUi.stage;
}
function uiStageText(stage,fa,fb){
  if(stage==="rollA")return `🎲 Tirando el dado de ${fa.name}...`;
  if(stage==="revealA")return `✅ ${fa.name}: ${duelUi.rollA}. Ahora tira ${fb.name}.`;
  if(stage==="rollB")return `🎲 Tirando el dado de ${fb.name}...`;
  return "Listos.";
}
function renderDuelStage(){
  const r=game.tournament.reveal,m=currentTournamentMatch();
  const a=playerById(m.aId),b=playerById(m.bId);
  const d=m.duels[r.duelIndex];
  const fa=fighterById(d.faId),fb=fighterById(d.fbId);
  const first=fighterById(d.firstId);
  const role=roundRole(r.duelIndex);
  const [as,bs]=revealedScore(m);
  const uiStage=getUiStage(r);
  const animating=!!uiStage;
  const initiativeReady=r.initiativeRevealed;
  const resolved=r.resolved;
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
          <span>${role[1]}</span>
        </div>

        <div class="rollDirector ${animating?"active":""}">
          <div class="rollDirectorLabel">${
            animating
              ? esc(uiStageText(uiStage,fa,fb))
              : initiativeReady
                ? `🥊 ${esc(first.name)} golpea primero`
                : "🎲 Primero decidimos quién tiene la iniciativa"
          }</div>
          <div class="rollProgress">
            <span class="${uiStage==='rollA'||uiStage==='revealA'||uiStage==='rollB'||initiativeReady?'done':''}">${esc(fa.name)}</span>
            <i></i>
            <span class="${uiStage==='rollB'||initiativeReady?'done':''}">${esc(fb.name)}</span>
          </div>
        </div>

        <div class="duelFighters">
          ${initiativeFighterHtml(fa,d,true,uiStage,initiativeReady)}
          <div class="bigVs">VS</div>
          ${initiativeFighterHtml(fb,d,false,uiStage,initiativeReady)}
        </div>

        ${initiativeReady && !resolved ? `
          <div class="manualDecision">
            <div class="eyebrow">EL DADO YA HA HABLADO. AHORA HABLA EL PUEBLO.</div>
            <h3>¿Quién ha ganado este enfrentamiento?</h3>
            <p>Debatidlo entre vosotros y pulsa directamente al ganador.</p>
            <div class="winnerChoiceGrid">
              <button class="winnerChoiceBtn" data-winner-id="${fa.id}">
                <span class="choiceAvatar">${initials(fa.name)}</span>
                <small>MARCAR VICTORIA</small>
                <b>${esc(fa.name)}</b>
              </button>
              <button class="winnerChoiceBtn" data-winner-id="${fb.id}">
                <span class="choiceAvatar">${initials(fb.name)}</span>
                <small>MARCAR VICTORIA</small>
                <b>${esc(fb.name)}</b>
              </button>
            </div>
          </div>
        `:""}

        ${resolved ? `
          <div class="revealWinner manualWinnerReveal">
            <div class="eyebrow">VICTORIA DECIDIDA</div>
            <b>${esc(fighterById(d.winnerId).name)} gana el enfrentamiento</b>
          </div>
        `:""}
      </div>

      <div class="combatRuleHint">
        Los dados <b>no deciden el ganador</b>. Solo indican quién golpea primero.
      </div>

      <div style="margin-top:13px">
        ${resolved
          ? `<button id="nextDuelBtn" class="btn giant">${isLastDuel?"Ver ganador del combate":"Siguiente enfrentamiento"}</button>`
          : animating
            ? `<div class="animLock">🎬 Lanzamiento en curso…</div>`
            : initiativeReady
              ? `<div class="animLock decisionLock">☝️ Elige arriba quién ha ganado</div>`
              : `<button id="resolveDuelBtn" class="btn giant">🎲 Lanzar para ver quién golpea primero</button>`
        }
      </div>
    </div>`;

  if(!resolved && initiativeReady){
    document.querySelectorAll(".winnerChoiceBtn").forEach(btn=>{
      btn.addEventListener("click",()=>chooseDuelWinner(btn.dataset.winnerId));
    });
  }

  if(resolved){
    $("nextDuelBtn").addEventListener("click",()=>{
      if(isLastDuel){
        recalcMatch(m);
        r.stage="winner";
      }else{
        r.duelIndex++;
        r.initiativeRevealed=false;
        r.resolved=false;
        duelUi=null;
      }
      saveGame();
      renderTournament();
    });
  }else if(!animating && !initiativeReady){
    $("resolveDuelBtn").addEventListener("click",runCountdownAndReveal);
  }
}
function initiativeFighterHtml(f,d,isA,uiStage,initiativeReady){
  let mode="hidden";
  let roll=null;

  if(initiativeReady){
    mode="revealed";
    roll=isA?d.rollA:d.rollB;
  }else if(uiStage){
    if(isA){
      if(uiStage==="rollA")mode="rolling";
      else if(uiStage==="revealA"||uiStage==="rollB"){
        mode="revealed";
        roll=d.rollA;
      }
    }else if(uiStage==="rollB"){
      mode="rolling";
    }
  }

  const isFirst=initiativeReady && d.firstId===f.id;

  return `<div class="duelFighter ${isFirst?"initiativeWinner":""}">
    <div class="fighterAvatarBig">${initials(f.name)}</div>
    <h3>${esc(f.name)}</h3>
    <div class="duelMean">${overall(f)}<small>media</small></div>

    <div class="miniStatsCombat">
      <span>FUE <b>${f.power}</b></span>
      <span>TEC <b>${f.technique}</b></span>
      <span>VEL <b>${f.speed}</b></span>
      <span>AGU <b>${f.stamina}</b></span>
      <span>COR <b>${f.grit}</b></span>
    </div>

    <div class="dieBox ${mode}">
      <div class="dieFace">${mode==="revealed"?diceChar(roll):(mode==="rolling"?"🎲":"?")}</div>
      <div class="dieNumber">${mode==="revealed"?`Dado ${roll}`:mode==="rolling"?"Rodando…":"Dado oculto"}</div>
    </div>

    <div class="totalLine">${
      isFirst
        ? "<b>🥊 GOLPEA PRIMERO</b>"
        : initiativeReady
          ? "Golpea después"
          : mode==="rolling"
            ? "El dado está rodando…"
            : "Esperando tirada…"
    }</div>
  </div>`;
}
function chooseDuelWinner(fighterId){
  const r=game.tournament.reveal;
  const m=currentTournamentMatch();
  const d=m.duels[r.duelIndex];

  if(!r.initiativeRevealed || r.resolved)return;
  if(fighterId!==d.faId && fighterId!==d.fbId)return;

  snapshot("Cambiar ganador del enfrentamiento");
  d.winnerId=fighterId;
  r.resolved=true;
  recalcMatch(m);

  saveGame();
  renderTournament();
}
function runCountdownAndReveal(){
  const btn=$("resolveDuelBtn");
  if(btn)btn.disabled=true;

  const overlay=document.createElement("div");
  overlay.className="countdownOverlay";
  document.body.appendChild(overlay);

  let values=["3","2","1","¡YA!"],i=0;
  const tick=()=>{
    overlay.innerHTML=`<div class="countdownNumber">${values[i]}</div>`;
    i++;
    if(i<values.length){
      later(tick,520);
    }else{
      later(()=>{
        overlay.remove();
        startSequentialInitiativeReveal();
      },400);
    }
  };
  tick();
}
function startSequentialInitiativeReveal(){
  const r=game.tournament.reveal;
  const d=currentTournamentMatch().duels[r.duelIndex];

  duelUi={
    matchKey:r.matchKey,
    duelIndex:r.duelIndex,
    stage:"rollA",
    rollA:d.rollA,
    rollB:d.rollB
  };
  renderTournament();

  later(()=>{
    if(!duelUi)return;
    duelUi.stage="revealA";
    renderTournament();
  },900);

  later(()=>{
    if(!duelUi)return;
    duelUi.stage="rollB";
    renderTournament();
  },1650);

  later(()=>{
    duelUi=null;
    r.initiativeRevealed=true;
    saveGame();
    renderTournament();
  },2650);
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
  snapshot("Volver al resultado anterior");
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
    <div class="matchTitle">
      <span>${m.label}</span>
      <span>${esc(a.name)} ${m.aw}–${m.bw} ${esc(b.name)}</span>
    </div>
    ${m.duels.map(d=>{
      const fa=fighterById(d.faId),fb=fighterById(d.fbId),first=fighterById(d.firstId);
      return `<div class="duel">
        <div class="${d.winnerId===fa.id?"winner":"loser"}">
          <b>${esc(fa.name)}</b><br>
          <small>Media ${overall(fa)} · dado ${d.rollA}</small>
        </div>
        <div class="vs">VS<br>#${d.pos}<br><small>🥊 ${esc(first.name)}</small></div>
        <div class="${d.winnerId===fb.id?"winner":"loser"}" style="text-align:right">
          <b>${esc(fb.name)}</b><br>
          <small>Media ${overall(fb)} · dado ${d.rollB}</small>
        </div>
      </div>`;
    }).join("")}
  </div>`;
}

function resumeGame(){renderCurrent();}

function samePlayersRematch(){
  clearGame();clearUndo();renderSetup();startGame();
}
function backToSetup(){
  clearGame();clearUndo();setPhase("Preparación");showOnly("setupScreen");renderSetup();
}

$("addPlayerBtn").addEventListener("click",addPlayer);
$("addFighterBtn").addEventListener("click",addFighter);
$("startGameBtn").addEventListener("click",startGame);
$("beginDraftBtn").addEventListener("click",beginDraft);
$("placeBidBtn").addEventListener("click",placeBid);
$("bidAmount").addEventListener("keydown",e=>{if(e.key==="Enter")placeBid()});
$("passBidBtn").addEventListener("click",passBid);
$("prepareLineupsBtn").addEventListener("click",prepareLineups);
$("openLineupBtn").addEventListener("click",openLineup);
$("saveLineupBtn").addEventListener("click",saveCurrentLineup);
$("rematchBtn").addEventListener("click",samePlayersRematch);
$("backSetupBtn").addEventListener("click",backToSetup);
$("continueBtn").addEventListener("click",resumeGame);
$("discardGameBtn").addEventListener("click",()=>askConfirm("¿Terminar esta partida?","Volverás a configuración. Los jugadores y luchadores se conservarán.","Terminar",finishGameNow));

$("backBtn").addEventListener("click",undoLast);
$("menuBtn").addEventListener("click",openSheet);
$("closeSheetBtn").addEventListener("click",closeSheet);
$("sheetBackdrop").addEventListener("click",closeSheet);
$("sheetUndoBtn").addEventListener("click",undoLast);
$("sheetResumeBtn").addEventListener("click",()=>{closeSheet();renderCurrent()});
$("sheetFinishBtn").addEventListener("click",()=>askConfirm("¿Terminar la partida?","Se eliminará la partida en curso, pero conservarás toda la configuración de jugadores y luchadores.","Terminar partida",finishGameNow));
$("sheetResetDefaultsBtn").addEventListener("click",()=>askConfirm("¿Restaurar datos de ejemplo?","Esto reemplaza tu configuración actual por los 6 jugadores y 18 luchadores originales.","Restaurar",resetDefaults));
$("confirmCancelBtn").addEventListener("click",closeConfirm);
$("confirmBackdrop").addEventListener("click",closeConfirm);
$("confirmOkBtn").addEventListener("click",()=>{const fn=pendingConfirm;pendingConfirm=null;if(fn)fn()});

document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"){saveConfig();saveGame()}});

renderSetup();updateChrome();
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
