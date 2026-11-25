import { CONFIG } from "./config.js";
import { initGoogle, signIn, signOut, isSignedIn, getProfile, listEvents, createEvent, deleteEvent } from "./google.js";

const state={startDate:startOfDay(new Date()), days:[], events:[], profile:null, selected:null};

const $=s=>document.querySelector(s);
const fmtDate=(d)=>new Intl.DateTimeFormat("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"}).format(d).replace(".","");
const fmtLong=(d)=>new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"long",year:"numeric"}).format(d);
const dateKey=d=>{const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`};
const startOfDay=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const toast=(msg,error=false)=>{const el=$("#toast");el.textContent=msg;el.className=`toast show${error?" error":""}`;clearTimeout(toast.t);toast.t=setTimeout(()=>el.className="toast",3500)};

function parseDescription(description=""){
  const out={};
  description.split(/\r?\n/).forEach(line=>{
    const m=line.match(/^([^:]+):\s*(.*)$/); if(m) out[m[1].trim()]=m[2].trim();
  });
  return out;
}
function eventStart(e){return new Date(e.start?.dateTime || e.start?.date)}
function eventEnd(e){return new Date(e.end?.dateTime || e.end?.date)}
function slotDateTime(date,time){
  const [h,m]=time.split(":").map(Number);
  return new Date(date.getFullYear(),date.getMonth(),date.getDate(),h,m,0);
}
function overlaps(aStart,aEnd,e){
  const s=eventStart(e), en=eventEnd(e);
  return s<aEnd && en>aStart;
}
function isOwnEvent(e){
  if(!state.profile) return false;
  const email=state.profile.email?.toLowerCase();
  return (e.creator?.email||"").toLowerCase()===email || (e.organizer?.email||"").toLowerCase()===email;
}
function personFromEvent(e){
  const d=parseDescription(e.description);
  if(d.Nome || d.Sobrenome) return `${d.Nome||""} ${d.Sobrenome||""}`.trim();
  return e.creator?.displayName || e.organizer?.displayName || e.creator?.email || "Usuário Google";
}

async function refresh(){
  const end=addDays(state.startDate,CONFIG.DAYS_VISIBLE);
  state.events=await listEvents(startOfDay(state.startDate),end);
  renderDays();
  renderMyReservations();
}
function renderDays(){
  const scroller=$("#daysScroller"); scroller.innerHTML="";
  for(let i=0;i<CONFIG.DAYS_VISIBLE;i++){
    const date=addDays(state.startDate,i);
    const col=document.createElement("section");col.className="day-column";
    const head=document.createElement("div");head.className="day-head";
    const dow=new Intl.DateTimeFormat("pt-BR",{weekday:"long"}).format(date).toUpperCase();
    head.innerHTML=`<div class="dow">${dow}</div><div class="date">${date.getDate()} <span class="muted">${new Intl.DateTimeFormat("pt-BR",{month:"short"}).format(date).replace(".","")}</span>${dateKey(date)===dateKey(new Date())?'<span class="today">HOJE</span>':''}</div>`;
    const slots=document.createElement("div");slots.className="slots";
    CONFIG.SLOT_TIMES.forEach(([from,to])=>{
      const s=slotDateTime(date,from), e=slotDateTime(date,to);
      const busy=state.events.find(ev=>overlaps(s,e,ev));
      const b=document.createElement("button");b.className=`slot ${busy?"busy":"free"}`;
      if(busy){
        const person=personFromEvent(busy),d=parseDescription(busy.description);
        b.innerHTML=`<div class="time">${from} – ${to}</div><div class="state">Ocupado</div><div class="person">${escapeHtml(person)}</div>${d.Turma?`<div class="details">${escapeHtml(d.Turma)}${d.Disciplina?` • ${escapeHtml(d.Disciplina)}`:""}</div>`:""}`;
        b.onclick=()=>showBusy(busy);
      }else{
        b.innerHTML=`<div class="time">${from} – ${to}</div><div class="state">Livre</div>`;
        b.onclick=()=>openBooking(date,from,to);
      }
      slots.appendChild(b);
    });
    col.append(head,slots);scroller.appendChild(col);
  }
  $("#monthTitle").textContent=new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(state.startDate).replace(/^./,c=>c.toUpperCase());
  $("#rangeTitle").textContent=`${fmtDate(state.startDate)} → ${fmtDate(addDays(state.startDate,CONFIG.DAYS_VISIBLE-1))}`;
}
function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

function openBooking(date,from,to){
  if(!isSignedIn()){toast("Entre com sua conta Google para reservar.",true);return signIn().then(refresh).catch(e=>toast("Não foi possível entrar no Google.",true))}
  state.selected={date,from,to};
  $("#bookingSlot").textContent=`${fmtLong(date)} • ${from} – ${to}`;
  $("#email").value=state.profile?.email||"";
  $("#bookingModal").classList.remove("hidden");
}
function closeBooking(){$("#bookingModal").classList.add("hidden")}
function showBusy(e){
  const d=parseDescription(e.description), person=personFromEvent(e);
  $("#busyDetails").innerHTML=`<strong>${escapeHtml(person)}</strong><span>${escapeHtml(d.Turma||"Turma não informada")}${d.Disciplina?` • ${escapeHtml(d.Disciplina)}`:""}</span><span>${escapeHtml(d["Tema da aula"]||"Tema não informado")}</span>`;
  $("#busyModal").classList.remove("hidden");
}
function closeBusy(){$("#busyModal").classList.add("hidden")}

async function submitBooking(ev){
  ev.preventDefault();
  if(!state.selected) return;
  const f=Object.fromEntries(new FormData(ev.target).entries());
  const s=slotDateTime(state.selected.date,state.selected.from), en=slotDateTime(state.selected.date,state.selected.to);
  const current=state.events.find(x=>overlaps(s,en,x));
  if(current){closeBooking();toast("Este horário acabou de ser reservado por outra pessoa.",true);return refresh()}
  const desc=[
    CONFIG.EVENT_PREFIX,
    `Nome: ${f.firstName}`,
    `Sobrenome: ${f.lastName}`,
    `E-mail: ${f.email}`,
    `Turma: ${f.className}`,
    `Disciplina: ${f.subject}`,
    `Tema da aula: ${f.lessonTopic}`
  ].join("\n");
  try{
    await createEvent({
      summary:`AGENDAMENTO SALA DE INFORMÁTICA (${f.firstName} ${f.lastName})`,
      description:desc,
      start:{dateTime:s.toISOString(),timeZone:CONFIG.TIMEZONE},
      end:{dateTime:en.toISOString(),timeZone:CONFIG.TIMEZONE},
      attendees:[{email:f.email}]
    });
    closeBooking();ev.target.reset();toast("Reserva criada com sucesso!");await refresh();
  }catch(e){console.error(e);toast("Não foi possível criar a reserva. Verifique sua permissão na agenda.",true)}
}
function renderMyReservations(){
  if(!isSignedIn()){ $("#myReservations").classList.add("hidden");return }
  $("#myReservations").classList.remove("hidden");
  const list=$("#myReservationsList");list.innerHTML="";
  const mine=state.events.filter(isOwnEvent).filter(e=>eventStart(e)>=startOfDay(new Date()));
  if(!mine.length){list.innerHTML='<div class="empty">Você não possui reservas futuras neste período.</div>';return}
  mine.slice(0,12).forEach(e=>{
    const d=parseDescription(e.description), item=document.createElement("article");item.className="reservation-item";
    item.innerHTML=`<strong>${escapeHtml(fmtLong(eventStart(e)))}</strong><div>${escapeHtml(eventStart(e).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}))} – ${escapeHtml(eventEnd(e).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}))}</div><small>${escapeHtml(d.Turma||"")} • ${escapeHtml(d.Disciplina||"")}</small><button class="cancel-btn">Cancelar minha reserva</button>`;
    item.querySelector("button").onclick=async()=>{if(!confirm("Cancelar esta reserva?"))return;try{await deleteEvent(e.id);toast("Reserva cancelada.");await refresh()}catch(err){toast("Não foi possível cancelar a reserva.",true)}};
    list.appendChild(item);
  });
}
async function boot(){
  try{
    if(!isConfigured()){$("#setupWarning").textContent="Configure GOOGLE_CLIENT_ID e CALENDAR_ID em js/config.js antes de publicar.";$("#setupWarning").classList.remove("hidden");return}
    await initGoogle();
    $("#loginBtn").onclick=async()=>{try{await signIn();state.profile=await getProfile();$("#authStatus").textContent=state.profile.email;$("#loginBtn").classList.add("hidden");$("#logoutBtn").classList.remove("hidden");await refresh()}catch(e){toast("Falha no login Google.",true)}};
    $("#logoutBtn").onclick=()=>{signOut();state.profile=null;$("#authStatus").textContent="Não conectado";$("#loginBtn").classList.remove("hidden");$("#logoutBtn").classList.add("hidden");renderMyReservations();refresh().catch(()=>{})};
    $("#bookingForm").addEventListener("submit",submitBooking);
    document.querySelectorAll("[data-close-modal]").forEach(x=>x.onclick=closeBooking);
    document.querySelectorAll("[data-close-busy]").forEach(x=>x.onclick=closeBusy);
    $("#prevDays").onclick=()=>{state.startDate=addDays(state.startDate,-CONFIG.DAYS_VISIBLE);refresh().catch(e=>toast(e.message,true))};
    $("#nextDays").onclick=()=>{state.startDate=addDays(state.startDate,CONFIG.DAYS_VISIBLE);refresh().catch(e=>toast(e.message,true))};
    state.profile=null; await refresh();
  }catch(e){console.error(e);$("#setupWarning").textContent=e.message;$("#setupWarning").classList.remove("hidden")}
}
boot();
