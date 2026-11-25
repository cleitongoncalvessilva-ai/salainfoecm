import { CONFIG } from "./config.js";

let tokenClient = null;
let accessToken = null;
let initialized = false;

export function isConfigured(){
  return CONFIG.GOOGLE_CLIENT_ID && !CONFIG.GOOGLE_CLIENT_ID.startsWith("COLOQUE_")
    && CONFIG.CALENDAR_ID && !CONFIG.CALENDAR_ID.startsWith("COLOQUE_");
}

export async function initGoogle(){
  if(!isConfigured()) throw new Error("Configure o Client ID e o ID da agenda em js/config.js.");
  await waitForGoogle();
  await new Promise((resolve,reject)=>{
    gapi.load("client", async ()=>{
      try{
        await gapi.client.init({
          discoveryDocs:["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"]
        });
        initialized=true;
        resolve();
      }catch(e){reject(e)}
    });
  });
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope:"https://www.googleapis.com/auth/calendar",
    callback:()=>{}
  });
}

function waitForGoogle(){
  return new Promise((resolve,reject)=>{
    const start=Date.now();
    const t=setInterval(()=>{
      if(window.gapi && window.google?.accounts?.oauth2){
        clearInterval(t); resolve();
      }else if(Date.now()-start>15000){
        clearInterval(t); reject(new Error("Google APIs não carregaram. Verifique sua conexão."));
      }
    },100);
  });
}

export async function signIn(){
  if(!initialized) await initGoogle();
  return new Promise((resolve,reject)=>{
    tokenClient.callback=(response)=>{
      if(response.error){reject(response);return}
      accessToken=response.access_token;
      gapi.client.setToken({access_token:accessToken});
      resolve(response);
    };
    tokenClient.requestAccessToken({prompt: accessToken ? "" : "consent"});
  });
}

export function signOut(){
  if(accessToken && window.google?.accounts?.oauth2){
    google.accounts.oauth2.revoke(accessToken,()=>{});
  }
  accessToken=null;
  if(window.gapi?.client) gapi.client.setToken(null);
}

export function isSignedIn(){ return Boolean(accessToken); }

export async function getProfile(){
  const r=await fetch("https://www.googleapis.com/oauth2/v3/userinfo",{
    headers:{Authorization:`Bearer ${accessToken}`}
  });
  if(!r.ok) throw new Error("Não foi possível obter a conta Google.");
  return r.json();
}

export async function listEvents(timeMin,timeMax){
  if(!isSignedIn()) await signIn();
  const response=await gapi.client.calendar.events.list({
    calendarId:CONFIG.CALENDAR_ID,
    timeMin:new Date(timeMin).toISOString(),
    timeMax:new Date(timeMax).toISOString(),
    singleEvents:true,
    orderBy:"startTime",
    maxResults:2500
  });
  return response.result.items || [];
}

export async function createEvent(event){
  if(!isSignedIn()) await signIn();
  const response=await gapi.client.calendar.events.insert({
    calendarId:CONFIG.CALENDAR_ID,
    sendUpdates:"all",
    resource:event
  });
  return response.result;
}

export async function deleteEvent(eventId){
  if(!isSignedIn()) await signIn();
  return gapi.client.calendar.events.delete({
    calendarId:CONFIG.CALENDAR_ID,
    eventId,
    sendUpdates:"all"
  });
}

export function getAccessToken(){return accessToken;}
