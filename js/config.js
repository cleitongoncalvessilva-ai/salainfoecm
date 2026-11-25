// CONFIGURAÇÃO DO PROJETO
// 1) Crie um projeto no Google Cloud.
// 2) Ative Google Calendar API.
// 3) Crie um OAuth 2.0 Client ID do tipo "Aplicativo da Web".
// 4) Cadastre o domínio do GitHub Pages em "Origens JavaScript autorizadas".
// 5) Cole o Client ID abaixo.
// 6) Informe o ID da agenda da Sala de Informática.
//
// IMPORTANTE: não coloque Client Secret neste repositório.
// O Client ID pode ser público; o segredo nunca deve ser colocado no HTML/JS.

export const CONFIG = {
  GOOGLE_CLIENT_ID: "COLOQUE_SEU_CLIENT_ID.apps.googleusercontent.com",
  CALENDAR_ID: "COLOQUE_O_ID_DA_AGENDA",
  TIMEZONE: "America/Sao_Paulo",

  // Os horários abaixo representam os blocos que aparecem na agenda mostrada.
  // Se a configuração da sua agenda tiver outros horários, altere somente esta lista.
  // O Google Calendar continua sendo a fonte da ocupação.
  SLOT_TIMES: [
    ["07:00","07:50"],
    ["07:50","08:40"],
    ["08:40","09:30"],
    ["09:45","10:35"],
    ["10:35","11:25"],
    ["11:25","12:15"],
    ["12:30","13:20"],
    ["13:20","14:10"],
    ["14:10","15:00"],
    ["15:15","16:05"]
  ],

  DAYS_VISIBLE: 3,

  // Campos usados pelo painel.
  // Eles são gravados na descrição do evento como linhas "Campo: valor".
  EVENT_PREFIX: "[ECM-SALA-INFORMATICA]"
};
