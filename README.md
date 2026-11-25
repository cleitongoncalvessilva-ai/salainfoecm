# Agenda da Sala de Informática — ECM

Site para consultar disponibilidade e criar reservas usando a Google Calendar API.

## O que já está implementado

- Identidade visual baseada no logo da Escola Estadual Emília Cabral Mota.
- Visualização de 3 dias por vez.
- Navegação horizontal para os próximos/anteriores dias.
- Horários livres em verde.
- Horários ocupados em vermelho.
- Clique no horário livre abre o formulário de reserva.
- Clique no horário ocupado mostra quem reservou e os dados resumidos.
- Login Google.
- Criação de evento no calendário compartilhado.
- Cancelamento das próprias reservas.
- Painel administrativo em `admin.html`.
- Filtros por professor, turma, disciplina e período.
- Indicadores de total, professor, turma e disciplina com maior utilização.

## Antes de publicar

### 1. Google Cloud

Crie/seleciona um projeto no Google Cloud e ative:

- Google Calendar API
- Google Identity Services / OAuth 2.0

Crie uma credencial OAuth 2.0 do tipo **Aplicativo da Web**.

Em `Origens JavaScript autorizadas`, adicione a URL do GitHub Pages, por exemplo:

`https://SEU-USUARIO.github.io`

Se usar domínio próprio, adicione também o domínio.

> Não coloque Client Secret no repositório.

### 2. Configurar o projeto

Abra:

`js/config.js`

e preencha:

```js
GOOGLE_CLIENT_ID: "seu-client-id.apps.googleusercontent.com",
CALENDAR_ID: "id-da-agenda"
```

O ID da agenda pode ser encontrado nas configurações do Google Calendar.

### 3. Permissão da agenda

A conta Google que fizer a reserva precisa ter permissão para criar/editar eventos na agenda da sala.

### 4. GitHub Pages

Suba todos os arquivos mantendo a estrutura:

```text
/
├── index.html
├── admin.html
├── README.md
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   ├── google.js
│   ├── app.js
│   └── admin.js
└── assets/
    └── logo-ecm.png
```

Depois, no GitHub:

Settings → Pages → Deploy from a branch → `main` → `/ (root)`.

## Sobre os horários

O Google Calendar é usado como fonte de ocupação. A lista de blocos de horário em `js/config.js` representa os horários exibidos na agenda fornecida.

Se a agenda tiver uma grade diferente, altere somente `SLOT_TIMES`.

## Segurança

Este projeto não coloca senha administrativa no JavaScript. O painel usa autenticação Google. Para restringir o painel a determinadas contas, a versão de produção deve adicionar uma allowlist de e-mails em um backend seguro ou Google Apps Script/Cloud Function.

O `admin.html` é uma interface de gestão, mas o controle real de permissões de eventos continua sendo feito pelo Google Calendar.

## Observação importante sobre a Agenda de horários

O Google Calendar possui o recurso de página de agendamento (appointment schedule). A API pública do Calendar trabalha diretamente com calendários e eventos; ela não deve ser tratada como se fosse uma API que simplesmente devolve a mesma grade visual da página de appointment schedule.

Por isso, este projeto usa:
1. os horários configurados no arquivo de configuração para desenhar a grade;
2. a Google Calendar API para determinar se cada bloco está ocupado;
3. o próprio Google Calendar para criar/cancelar os eventos.

Isso evita criar uma segunda base de reservas.
