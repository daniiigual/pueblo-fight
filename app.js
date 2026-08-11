
const TEAM_SIZE = 3;
const START_MONEY = 30;
const QUALIFIERS = 4;
const CONFIG_KEY = "puebloFightV2Config";
const GAME_KEY = "puebloFightV2Game";
const STYLES = ["Bruto","Técnico","Ágil"];

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
    fighters:names.map((name,i)=>({
      id:uid(),name,style:STYLES[i%3],
      power:50,technique:50,speed:50,stamina:50,grit:50
    }))
  };
}
function loadConfig(){
  try{
    const raw=localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : defaultConfig();
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
  ["setupScreen","orderScreen","draftScreen","qualifierScreen","lineupCoverScreen","lineupScreen","resultsScreen"]
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
    config.fighters.push({id:uid(),name:`Luchador ${n}`,style:STYLES[(n-1)%3],power:50,technique:50,speed:50,stamina:50,grit:50});
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
      <select class="fighterStyleInput" data-fighter-id="${f.id}">
        ${STYLES.map(s=>`<option ${s===f.style?"selected":""}>${s}</option>`).join("")}
      </select>
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
  document.querySelectorAll(".fighterStyleInput").forEach(el=>el.addEventListener("change",e=>{
    const f=config.fighters.find(x=>x.id===e.target.dataset.fighterId);
    if(f){f.style=e.target.value;saveConfig()}
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
  config.fighters.push({id:uid(),name:`Luchador ${n}`,style:STYLES[(n-1)%3],power:50,technique:50,speed:50,stamina:50,grit:50});
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
    <span class="styleChip">${esc(f.style)}</span>
    <div class="statGrid">
      ${statHtml("FUE",f.power)}${statHtml("TEC",f.technique)}${statHtml("VEL",f.speed)}${statHtml("AGU",f.stamina)}${statHtml("COR",f.grit)}
    </div>
    <div class="meanLine"><span>Media general</span><strong>${overall(f)}</strong></div>`;
}
function statHtml(label,v){return `<div class="stat"><b>${Number(v)}</b><span>${label}</span></div>`}
function rosterItemHtml(fid){
  const f=fighterById(fid);
  return `<div class="rosterItem"><div class="avatar">${initials(f.name)}</div><div class="rosterMeta"><b>${esc(f.name)}</b><span>${esc(f.style)} · media ${overall(f)}</span></div></div>`;
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
  game.lineupQueue=game.ranking.slice(0,QUALIFIERS);
  game.lineupIndex=0;game.phase="lineupCover";saveGame();renderLineupCover();
}
function renderLineupCover(){
  setPhase("Alineaciones");showOnly("lineupCoverScreen");
  const p=playerById(game.lineupQueue[game.lineupIndex]);
  $("lineupCoverName").textContent=p.name;
}
function openLineup(){
  game.phase="lineup";saveGame();renderLineup();
}
function renderLineup(){
  setPhase("Alineación privada");showOnly("lineupScreen");
  const p=playerById(game.lineupQueue[game.lineupIndex]);
  $("lineupTeamName").textContent=p.name;
  const labels=[
    ["1 · Apertura","Velocidad + Técnica"],
    ["2 · Choque","Fuerza + Aguante"],
    ["3 · Cierre","Coraje + Fuerza"]
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
  }else{
    playTournament();
  }
}

function styleBonus(a,b){
  const win={"Técnico":"Bruto","Bruto":"Ágil","Ágil":"Técnico"};
  if(win[a]===b)return 6;
  if(win[b]===a)return -6;
  return 0;
}
function slotAffinity(f,pos){
  if(pos===0)return f.speed*.5+f.technique*.5;
  if(pos===1)return f.power*.5+f.stamina*.5;
  return f.grit*.5+f.power*.5;
}
function duelScore(f,pos,enemy){
  const base=f.power*.25+f.technique*.22+f.speed*.19+f.stamina*.18+f.grit*.16;
  const role=(slotAffinity(f,pos)-50)*.14;
  const matchup=styleBonus(f.style,enemy.style);
  const luck=Math.floor(Math.random()*11)-5;
  return base+role+matchup+luck;
}
function playMatch(a,b,label){
  let aw=0,bw=0;const duels=[];
  for(let i=0;i<TEAM_SIZE;i++){
    const fa=fighterById(a.lineup[i]),fb=fighterById(b.lineup[i]);
    let sa=duelScore(fa,i,fb),sb=duelScore(fb,i,fa);
    if(Math.abs(sa-sb)<.001)sa+=Math.random();
    const winnerId=sa>sb?fa.id:fb.id;
    if(winnerId===fa.id)aw++;else bw++;
    duels.push({pos:i+1,faId:fa.id,fbId:fb.id,sa,sb,winnerId});
  }
  return {label,aId:a.id,bId:b.id,aw,bw,winnerId:aw>bw?a.id:b.id,duels};
}
function playTournament(){
  // Clasificación premia el draft: 1º vs 4º y 2º vs 3º.
  const q=game.ranking.slice(0,QUALIFIERS).map(playerById);
  const semi1=playMatch(q[0],q[3],"Semifinal 1");
  const semi2=playMatch(q[1],q[2],"Semifinal 2");
  const final=playMatch(playerById(semi1.winnerId),playerById(semi2.winnerId),"FINAL");
  game.tournament={semi1,semi2,final,championId:final.winnerId};
  game.phase="results";saveGame();renderResults();
}
function renderResults(){
  setPhase("Campeón");showOnly("resultsScreen");
  const champ=playerById(game.tournament.championId);
  $("championCard").innerHTML=`<div class="eyebrow">🏆 CAMPEÓN DE PUEBLO FIGHT</div><div class="championName">${esc(champ.name)}</div><p>Media de equipo ${playerAverage(champ)} · ${champ.money} monedas sin gastar.</p>`;
  $("tournamentResults").innerHTML=
    matchHtml(game.tournament.semi1)+matchHtml(game.tournament.semi2)+matchHtml(game.tournament.final);
}
function matchHtml(m){
  const a=playerById(m.aId),b=playerById(m.bId);
  return `<div class="match">
    <div class="matchTitle"><span>${m.label}</span><span>${esc(a.name)} ${m.aw}–${m.bw} ${esc(b.name)}</span></div>
    ${m.duels.map(d=>{
      const fa=fighterById(d.faId),fb=fighterById(d.fbId);
      return `<div class="duel">
        <div class="${d.winnerId===fa.id?"winner":"loser"}"><b>${esc(fa.name)}</b><br><small>${esc(fa.style)} · ${Math.round(d.sa)}</small></div>
        <div class="vs">VS<br>#${d.pos}</div>
        <div class="${d.winnerId===fb.id?"winner":"loser"}" style="text-align:right"><b>${esc(fb.name)}</b><br><small>${esc(fb.style)} · ${Math.round(d.sb)}</small></div>
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
