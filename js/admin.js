import { CONFIG } from "./config.js";
import { initGoogle, signIn, getProfile, listEvents } from "./google.js";

const $=s=>document.querySelector(s);
const state={events:[],rows:[]};
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const parseDescription=(description="")=>{const o={};description.split(/\r?\n/).forEach(l=>{const m=l.match(/^([^:]+):\s*(.*)$/);if(m)o[m[1].trim()]=m[2].trim()});return o};
const eventStart=e=>new Date(e.start?.dateTime||e.start?.date);
const eventEnd=e=>new Date(e.end?.dateTime||e.end?.date);
const dateOnly=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`};
function toast(msg,error=false){const el=$("#toast");el.textContent=msg;el.className=`toast show${error?" error":""}`;setTimeout(()=>el.className="toast",3500)}
function countBy(rows,key){const m=new Map();rows.forEach(r=>m.set(r[key],(m.get(r[key])||0)+1));return [...m.entries()].sort((a,b)=>b[1]-a[1])}
function fillSelect(id,values){const el=$(id);const current=el.value;el.innerHTML='<option value="">Todos</option>';[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR")).forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;el.appendChild(o)});el.value=current}
function buildRows(){
  state.rows=state.events.map(e=>{
    const d=parseDescription(e.description);
    return {id:e.id,date:dateOnly(eventStart(e)),time:`${eventStart(e).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} – ${eventEnd(e).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`,teacher:`${d.Nome||""} ${d.Sobrenome||""}`.trim()||e.creator?.displayName||e.creator?.email||"Não informado",className:d.Turma||"Não informado",subject:d.Disciplina||"Não informado",topic:d["Tema da aula"]||"Não informado",email:d["E-mail"]||""};
  }).filter(r=>state.events.length && true);
}
function apply(){
  const teacher=$("#teacherFilter").value, cls=$("#classFilter").value, subj=$("#subjectFilter").value, from=$("#fromDate").value, to=$("#toDate").value;
  const rows=state.rows.filter(r=>(!teacher||r.teacher===teacher)&&(!cls||r.className===cls)&&(!subj||r.subject===subj)&&(!from||r.date>=from)&&(!to||r.date<=to));
  $("#totalReservations").textContent=rows.length;
  const top=(key)=>countBy(rows,key)[0]?.[0]||"—";
  $("#topTeacher").textContent=top("teacher");$("#topClass").textContent=top("className");$("#topSubject").textContent=top("subject");
  $("#dataBody").innerHTML=rows.map(r=>`<tr><td>${escapeHtml(new Intl.DateTimeFormat("pt-BR").format(new Date(r.date+"T12:00:00")))}</td><td>${escapeHtml(r.time)}</td><td>${escapeHtml(r.teacher)}</td><td>${escapeHtml(r.className)}</td><td>${escapeHtml(r.subject)}</td><td>${escapeHtml(r.topic)}</td><td>${escapeHtml(r.email)}</td></tr>`).join("");
  $("#emptyState").classList.toggle("hidden",rows.length!==0);
}
async function boot(){
  try{
    if(!CONFIG.GOOGLE_CLIENT_ID||CONFIG.GOOGLE_CLIENT_ID.startsWith("COLOQUE_")||!CONFIG.CALENDAR_ID||CONFIG.CALENDAR_ID.startsWith("COLOQUE_")){
      $("#adminSetupWarning").textContent="Configure js/config.js antes de usar o painel.";$("#adminSetupWarning").classList.remove("hidden");return;
    }
    await initGoogle();
    await signIn(); await getProfile();
    const start=new Date(); start.setMonth(start.getMonth()-12);
    const end=new Date(); end.setMonth(end.getMonth()+1);
    state.events=(await listEvents(start,end)).filter(e=>(e.description||"").includes(CONFIG.EVENT_PREFIX));
    buildRows();
    fillSelect("#teacherFilter",state.rows.map(r=>r.teacher));fillSelect("#classFilter",state.rows.map(r=>r.className));fillSelect("#subjectFilter",state.rows.map(r=>r.subject));
    ["#teacherFilter","#classFilter","#subjectFilter","#fromDate","#toDate"].forEach(id=>$(id).addEventListener("change",apply));
    $("#clearFilters").onclick=()=>{["#teacherFilter","#classFilter","#subjectFilter","#fromDate","#toDate"].forEach(id=>$(id).value="");apply()};
    apply();
  }catch(e){console.error(e);$("#adminSetupWarning").textContent=e.message||"Não foi possível carregar o painel.";$("#adminSetupWarning").classList.remove("hidden")}
}
boot();
