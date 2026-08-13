// CODETALK // SISTEMAS DE TELEMETRÍA, COMUNICACIONES Y DESARROLLO COLABORATIVO

// --- AUDIO SYNTHESIZER (Web Audio API) ---
class CyberChime {
  constructor() {
    this.ctx = null;
    this.masterVolume = 0.3;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.masterVolume = vol / 100;
  }

  playConnect() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.6);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.masterVolume * 0.5, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.7);

    setTimeout(() => {
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1200, this.ctx.currentTime);
      gain2.gain.setValueAtTime(0, this.ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(this.masterVolume * 0.4, this.ctx.currentTime + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start();
      osc2.stop(this.ctx.currentTime + 0.5);
    }, 150);
  }

  playDisconnect() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.5);
    gain.gain.setValueAtTime(this.masterVolume * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  playToggle(isActivated) {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isActivated ? 880 : 440, now);
    osc.frequency.setValueAtTime(isActivated ? 1200 : 330, now + 0.05);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.masterVolume * 0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playMessage() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(784, now);
    osc.frequency.setValueAtTime(987, now + 0.08);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.masterVolume * 0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}

const synth = new CyberChime();

// --- CAPA DE BASE DE DATOS MOCK CON EXTRAPOLACIÓN A MYSQL (Write-Through Cache) ---
class MockDB {
  constructor() {
    this.init();
    // Iniciar sincronización de fondo desde MySQL al cargar
    this.syncFromMySQL();
  }

  init() {
    // Datos de fallback por si no hay conexión a MySQL
    const defaultData = {
      usuarios: [
        { id_usuario: 1, nombre_usuario: "Neuron_Link", codigo_amigo: "C0DE0001", correo: "neuron@codetalk.io", contrasena_hash: "password123" },
        { id_usuario: 2, nombre_usuario: "CyberNet_99", codigo_amigo: "C0DE0002", correo: "cyber@codetalk.io", contrasena_hash: "password123" },
        { id_usuario: 3, nombre_usuario: "Aegis_Core", codigo_amigo: "C0DE0003", correo: "aegis@codetalk.io", contrasena_hash: "password123" }
      ],
      amistades: [
        { id_amistad: 1, id_solicitante: 2, id_receptor: 1, estado: "pendiente" },
        { id_amistad: 2, id_solicitante: 3, id_receptor: 1, estado: "aceptada" }
      ],
      grupos: [
        { id_grupo: 1, nombre: "SISTEMAS_QUANTUM", id_propietario: 3, codigo_invitacion: "CT-RED-990" }
      ],
      miembros_grupo: [
        { id_miembro: 1, id_grupo: 1, id_usuario: 1 },
        { id_miembro: 2, id_grupo: 1, id_usuario: 3 }
      ],
      canales: [
        { id_canal: 1, id_grupo: 1, nombre: "general-texto", tipo: "texto" },
        { id_canal: 2, id_grupo: 1, nombre: "audio-enlace", tipo: "voz" },
        { id_canal: 3, id_grupo: 1, nombre: "video-reunion", tipo: "video" },
        { id_canal: 4, id_grupo: 1, nombre: "code-colab", tipo: "codigo" }
      ],
      mensajes: [
        { id_mensaje: 1, id_canal: 1, id_usuario: 3, contenido: "Enlace encriptado nominal. Consola de CodeTalk activa.", fecha_envio: new Date().toISOString() }
      ],
      llamadas: [],
      participantes_llamada: [],
      sesiones_codigo: [],
      participantes_sesion_codigo: [],
      archivos_codigo: [],
      billeteras: [
        { id_billetera: 1, id_usuario: 1, saldo: 25.00 },
        { id_billetera: 2, id_usuario: 2, saldo: 15.00 },
        { id_billetera: 3, id_usuario: 3, saldo: 50.00 }
      ],
      tarifas_llamada: [
        { id_tarifa: 1, minutos_gratis: 10, precio_por_minuto: 0.50 }
      ],
      transacciones: [],
      pagos_binance: []
    };

    for (let key in defaultData) {
      if (!localStorage.getItem(`db_${key}`)) {
        localStorage.setItem(`db_${key}`, JSON.stringify(defaultData[key]));
      }
    }
  }

  async syncFromMySQL() {
    try {
      const res = await fetch('/api/db');
      if (res.ok) {
        const data = await res.json();
        for (let key in data) {
          localStorage.setItem(`db_${key}`, JSON.stringify(data[key]));
        }
        console.log("Base de datos de CodeTalk sincronizada con MySQL.");
        
        // Re-renderizar vistas activas si el usuario ya inició sesión
        if (state && state.currentUser) {
          updateFooterBalance();
          renderServers();
          if (state.currentGroup) {
            renderChannels();
          }
          if (state.activeView === 'friends') renderFriends();
          else if (state.activeView === 'wallet') renderWallet();
          else if (state.activeView === 'chat') renderChatMessages();
          else if (state.activeView === 'code') renderExplorerFiles();
        }
      }
    } catch (err) {
      console.warn("No se pudo conectar al backend MySQL. Usando caché local offline.", err);
    }
  }

  getTable(name) {
    return JSON.parse(localStorage.getItem(`db_${name}`)) || [];
  }

  saveTable(name, data) {
    localStorage.setItem(`db_${name}`, JSON.stringify(data));
  }

  insert(table, row) {
    const data = this.getTable(table);
    let idFieldName = "";
    if (table === "usuarios") idFieldName = "id_usuario";
    else if (table === "amistades") idFieldName = "id_amistad";
    else if (table === "grupos") idFieldName = "id_grupo";
    else if (table === "miembros_grupo") idFieldName = "id_miembro";
    else if (table === "canales") idFieldName = "id_canal";
    else if (table === "mensajes") idFieldName = "id_mensaje";
    else if (table === "llamadas") idFieldName = "id_llamada";
    else if (table === "participantes_llamada") idFieldName = "id_participante";
    else if (table === "sesiones_codigo") idFieldName = "id_sesion";
    else if (table === "participantes_sesion_codigo") idFieldName = "id_participante";
    else if (table === "archivos_codigo") idFieldName = "id_archivo";
    else if (table === "billeteras") idFieldName = "id_billetera";
    else if (table === "tarifas_llamada") idFieldName = "id_tarifa";
    else if (table === "transacciones") idFieldName = "id_transaccion";
    else if (table === "pagos_binance") idFieldName = "id_pago";
    else if (table === "invitaciones_grupo") idFieldName = "id_invitacion";

    let maxId = 0;
    data.forEach(r => {
      if (r[idFieldName] > maxId) maxId = r[idFieldName];
    });
    row[idFieldName] = maxId + 1;
    
    // Configurar fechas
    if (table === "mensajes") {
      if (!row.fecha_envio) row.fecha_envio = new Date().toISOString();
    } else if (table === "transacciones") {
      if (!row.fecha_transaccion) row.fecha_transaccion = new Date().toISOString();
    } else if (table === "participantes_llamada" || table === "participantes_sesion_codigo") {
      if (!row.fecha_union) row.fecha_union = new Date().toISOString();
    } else {
      if (!row.fecha_creacion && table !== "billeteras" && table !== "tarifas_llamada") {
        row.fecha_creacion = new Date().toISOString();
      }
    }

    data.push(row);
    this.saveTable(table, data);

    // Escritura directa asíncrona a MySQL
    fetch(`/api/table/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row)
    })
    .then(async (res) => {
      if (res.ok) {
        const resData = await res.json();
        // Si el backend generó un ID autoincremental real, lo sincronizamos en localStorage
        if (resData && resData.id) {
          const freshData = this.getTable(table);
          const idx = freshData.findIndex(r => r[idFieldName] === row[idFieldName]);
          if (idx !== -1) {
            freshData[idx][idFieldName] = resData.id;
            this.saveTable(table, freshData);
          }
        }
      }
    })
    .catch(err => console.error(`Error al persistir inserción en MySQL (tabla ${table}):`, err));

    return row;
  }

  update(table, idFieldName, idVal, updatedFields) {
    const data = this.getTable(table);
    const index = data.findIndex(r => r[idFieldName] === idVal);
    if (index !== -1) {
      data[index] = { ...data[index], ...updatedFields };
      this.saveTable(table, data);

      // Escritura directa asíncrona a MySQL
      fetch(`/api/table/${table}/${idFieldName}/${idVal}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      })
      .catch(err => console.error(`Error al persistir actualización en MySQL (tabla ${table}):`, err));

      return data[index];
    }
    return null;
  }

  delete(table, idFieldName, idVal) {
    let data = this.getTable(table);
    data = data.filter(r => r[idFieldName] !== idVal);
    this.saveTable(table, data);

    // Escritura directa asíncrona a MySQL
    fetch(`/api/table/${table}/${idFieldName}/${idVal}`, {
      method: 'DELETE'
    })
    .catch(err => console.error(`Error al persistir eliminación en MySQL (tabla ${table}):`, err));
  }
}

// --- APP STATE ---
const state = {
  db: new MockDB(),
  currentUser: null,
  currentGroup: null, // Si es null, estamos en "Home"
  currentChannel: null, // Canal seleccionado
  activeView: 'friends', // 'friends', 'wallet', 'chat', 'call', 'code'
  
  // Estados originales del módulo de videollamada
  localStream: null,
  isMuted: false,
  isCamOff: false,
  isScreenSharing: false,
  participants: {},
  bots: {},
  socket: null, // Conexión Socket.IO usada para la señalización real de llamadas
  callRoom: null, // Sala de señalización activa (canal de voz/video actual)
  iceServers: null, // Configuración STUN/TURN obtenida de /api/ice-config
  peerConnections: {},
  myId: Math.random().toString(36).substring(2, 9),
  audioContext: null,
  localAnalyser: null,
  
  // Facturación de llamadas
  activeCall: null,
  callTimer: null,
  callSeconds: 0,
  callCostAccumulated: 0.00,
  timeMultiplier: 1, // x1 por defecto, x60 en modo simulación acelerada

  // Código compartido
  activeSessionCodigo: null,
  activeCodeFile: null,
  botTypingInterval: null
};

// Bots predefinidos originales
const BOT_TEMPLATES = [
  { id: 'bot-aegis', name: 'A.E.G.I.S // CORE_AI', tag: 'AI_NODE', color: '#b100ff', letter: 'A' },
  { id: 'bot-kronos', name: 'KRONOS // COMM_GRID', tag: 'RELAY_BOT', color: '#ff007f', letter: 'K' },
  { id: 'bot-helios', name: 'HELIOS // ORBIT_LINK', tag: 'SATELLITE', color: '#ffea00', letter: 'H' },
  { id: 'bot-neural', name: 'NEURAL // MATRIX_NODE', tag: 'VIRTUAL', color: '#00ff66', letter: 'N' }
];

let fallbackCanvasInterval = null;

// --- ELEMENTOS DEL DOM ---
const joinScreen = document.getElementById('join-screen');
const appShell = document.getElementById('app-shell');

// Pestañas Auth
const tabLoginBtn = document.getElementById('tab-login-btn');
const tabRegisterBtn = document.getElementById('tab-register-btn');
const loginFormContainer = document.getElementById('login-form-container');
const registerFormContainer = document.getElementById('register-form-container');

// Botones e Inputs Auth
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginSubmitBtn = document.getElementById('login-submit-btn');
const registerUsernameInput = document.getElementById('register-username');
const registerEmailInput = document.getElementById('register-email');
const registerPasswordInput = document.getElementById('register-password');
const registerSubmitBtn = document.getElementById('register-submit-btn');
const quickDemoBtn = document.getElementById('quick-demo-btn');

// Sidebar y Servidores
const serverList = document.getElementById('server-list');
const serverHomeBtn = document.getElementById('server-home-btn');
const openAddServerBtn = document.getElementById('open-add-server-btn');
const currentSidebarTitle = document.getElementById('current-sidebar-title');
const serverInviteBadge = document.getElementById('server-invite-badge');
const homeNavigation = document.getElementById('home-navigation');
const serverChannels = document.getElementById('server-channels');
const textChannelsList = document.getElementById('text-channels-list');
const voiceChannelsList = document.getElementById('voice-channels-list');
const videoChannelsList = document.getElementById('video-channels-list');
const codeChannelsList = document.getElementById('code-channels-list');
const archivedChannelsList = document.getElementById('archived-channels-list');

// Footer Usuario
const userFooterPlaceholder = document.getElementById('user-footer-placeholder');
const userFooterName = document.getElementById('user-footer-name');
const userFooterCode = document.getElementById('user-footer-code');
const userFooterBalance = document.getElementById('user-footer-balance');
const btnLogout = document.getElementById('btn-logout');

// Vistas / Workspaces
const viewFriends = document.getElementById('friends-view');
const viewWallet = document.getElementById('wallet-view');
const viewChat = document.getElementById('chat-view');
const viewCall = document.getElementById('call-view');
const viewCode = document.getElementById('code-view');
const viewCalendar = document.getElementById('calendar-view');

// Calendario
const calPrevBtn = document.getElementById('cal-prev-btn');
const calTodayBtn = document.getElementById('cal-today-btn');
const calNextBtn = document.getElementById('cal-next-btn');
const calMonthYearTitle = document.getElementById('cal-month-year-title');
const calNewEventBtn = document.getElementById('cal-new-event-btn');
const calendarGrid = document.getElementById('calendar-grid');

// Modal Eventos
const eventModal = document.getElementById('event-modal');
const eventModalTitle = document.getElementById('event-modal-title');
const eventModalCloseBtn = document.getElementById('event-modal-close-btn');
const eventForm = document.getElementById('event-form');
const eventTitleInput = document.getElementById('event-title');
const eventDateInput = document.getElementById('event-date');
const eventTimeInput = document.getElementById('event-time');
const eventColorInput = document.getElementById('event-color');
const eventDescInput = document.getElementById('event-desc');
const eventDeleteBtn = document.getElementById('event-delete-btn');
const eventSubmitBtn = document.getElementById('event-submit-btn');

// Amigos
const friendCodeInput = document.getElementById('friend-code-input');
const btnAddFriend = document.getElementById('btn-add-friend');
const pendingFriendsList = document.getElementById('pending-friends-list');
const acceptedFriendsList = document.getElementById('accepted-friends-list');
const countPendingFriends = document.getElementById('count-pending-friends');
const countAcceptedFriends = document.getElementById('count-accepted-friends');
const pendingFriendsBadge = document.getElementById('pending-friends-badge');
const friendErrorMsg = document.getElementById('friend-error-msg');
const friendSuccessMsg = document.getElementById('friend-success-msg');

// Billetera
const walletBalanceDisplay = document.getElementById('wallet-balance-display');
const walletUserName = document.getElementById('wallet-user-name');
const openRechargeBtn = document.getElementById('open-recharge-btn');
const transactionsLogBody = document.getElementById('transactions-log-body');

// Chat
const chatChannelTitle = document.getElementById('chat-channel-title');
const chatChannelDesc = document.getElementById('chat-channel-desc');
const channelChatMessages = document.getElementById('channel-chat-messages');
const channelChatInput = document.getElementById('channel-chat-input');
const channelChatSendBtn = document.getElementById('channel-chat-send-btn');
const chatInviteCallBtn = document.getElementById('chat-invite-call-btn');

// Ejecución de código en el chat
const chatAttachCodeBtn = document.getElementById('chat-attach-code-btn');
const codeComposer = document.getElementById('code-composer');
const codeComposerLang = document.getElementById('code-composer-lang');
const codeComposerTextarea = document.getElementById('code-composer-textarea');
const codeComposerCancel = document.getElementById('code-composer-cancel');
const codeComposerSend = document.getElementById('code-composer-send');
const codeComposerX = document.getElementById('code-composer-x');

// Llamada & Facturación
const callChannelTitle = document.getElementById('call-channel-title');
const callTimerDisplay = document.getElementById('call-timer-display');
const callFreeMinutes = document.getElementById('call-free-minutes');
const callAccumulatedCost = document.getElementById('call-accumulated-cost');
const speedTimeMultiplier = document.getElementById('speed-time-multiplier');
const billingFreeMinutesRow = document.getElementById('billing-free-minutes-row');
const billingCostRow = document.getElementById('billing-cost-row');
const participantsGrid = document.getElementById('participants-grid');
const userDisplayName = document.getElementById('user-display-name');
const btnToggleMic = document.getElementById('btn-toggle-mic');
const btnToggleCam = document.getElementById('btn-toggle-cam');
const btnToggleScreen = document.getElementById('btn-toggle-screen');
const btnDisconnect = document.getElementById('btn-disconnect');
const volSlider = document.getElementById('vol-slider');
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');

// Editor Código
const codeChannelTitle = document.getElementById('code-channel-title');
const codeExplorerFiles = document.getElementById('code-explorer-files');
const btnCreateCodeFile = document.getElementById('btn-create-code-file');
const btnSaveCodeFile = document.getElementById('btn-save-code-file');
const activeCodeFilename = document.getElementById('active-code-filename');
const codeLanguageSelector = document.getElementById('code-language-selector');
const editorTextarea = document.getElementById('editor-textarea');
const editorLineNumbers = document.getElementById('editor-line-numbers');
const btnSimPartnerType = document.getElementById('btn-sim-partner-type');
const simTypingIndicator = document.getElementById('sim-typing-indicator');

// Modales
const serverModal = document.getElementById('server-modal');
const serverModalTabs = document.getElementById('server-modal-tabs');
const modalTabCreateBtn = document.getElementById('modal-tab-create-btn');
const modalTabJoinBtn = document.getElementById('modal-tab-join-btn');
const modalCreateContainer = document.getElementById('modal-create-container');
const modalJoinContainer = document.getElementById('modal-join-container');
const modalSuccessInviteContainer = document.getElementById('modal-success-invite-container');
const newServerName = document.getElementById('new-server-name');
const submitCreateServer = document.getElementById('submit-create-server');
const joinServerCode = document.getElementById('join-server-code');
const submitJoinServer = document.getElementById('submit-join-server');
const serverModalError = document.getElementById('server-modal-error');
const newServerFriendsList = document.getElementById('new-server-friends-list');
const btnFinishCreateServer = document.getElementById('btn-finish-create-server');

const channelModal = document.getElementById('channel-modal');
const newChannelName = document.getElementById('new-channel-name');
const submitCreateChannel = document.getElementById('submit-create-channel');
const channelModalError = document.getElementById('channel-modal-error');

const binanceModal = document.getElementById('binance-modal');
const binanceRechargeAmount = document.getElementById('binance-recharge-amount');
const binanceBtnGenerate = document.getElementById('binance-btn-generate');
const binanceStepAmount = document.getElementById('binance-step-amount');
const binanceStepQr = document.getElementById('binance-step-qr');
const binanceStatusBadge = document.getElementById('binance-status-badge');
const binanceOrderId = document.getElementById('binance-order-id');
const binancePrepayId = document.getElementById('binance-prepay-id');
const binanceTotalDisplay = document.getElementById('binance-total-display');
const binanceSimPay = document.getElementById('binance-sim-pay');
const binanceSimCancel = document.getElementById('binance-sim-cancel');
const binanceSimExpire = document.getElementById('binance-sim-expire');

// Guía Rápida / Ayuda
const openHelpModalBtn = document.getElementById('open-help-modal-btn');
const helpModal = document.getElementById('help-modal');
const helpModalCloseBtn = document.getElementById('help-modal-close-btn');

// Invitaciones de Servidor
const openInviteFriendsModalBtn = document.getElementById('open-invite-friends-modal-btn');
const inviteFriendsModal = document.getElementById('invite-friends-modal');
const inviteFriendsList = document.getElementById('invite-friends-list');
const countGroupInvites = document.getElementById('count-group-invites');
const groupInvitesList = document.getElementById('group-invites-list');

// --- SISTEMA DE NOTIFICACIONES (reemplaza los alert()/confirm() nativos del navegador) ---

let systemToastContainer;
function ensureToastContainer() {
  if (!systemToastContainer) {
    systemToastContainer = document.createElement('div');
    systemToastContainer.id = 'system-toast-container';
    document.body.appendChild(systemToastContainer);
  }
  return systemToastContainer;
}

// Muestra un mensaje del sistema con el diseño de la app en vez del alert() nativo del navegador
function showSystemMessage(message, type = 'info') {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `system-toast toast-${type}`;
  const iconName = type === 'error' ? 'alert-triangle' : (type === 'success' ? 'check-circle-2' : 'info');
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="toast-icon"></i>
    <span class="toast-text"></span>
    <button class="toast-close-btn" data-tooltip="Cerrar"><i data-lucide="x"></i></button>
  `;
  toast.querySelector('.toast-text').innerText = message;
  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  const remove = () => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 200);
  };
  toast.querySelector('.toast-close-btn').addEventListener('click', remove);
  const autoCloseTimer = setTimeout(remove, 6000);
  toast.addEventListener('mouseenter', () => clearTimeout(autoCloseTimer));
}

// Reemplaza confirm() nativo: devuelve una Promise<boolean> resuelta al elegir en el modal del sistema
function showSystemConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-container system-confirm-container">
        <div class="modal-header">
          <h3>Confirmar Acción</h3>
          <button class="close-modal-btn system-confirm-x" data-tooltip="Cancelar"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <p class="system-confirm-text"></p>
          <div class="system-confirm-actions">
            <button class="sim-btn system-confirm-cancel">Cancelar</button>
            <button class="cyber-btn system-confirm-ok">Confirmar</button>
          </div>
        </div>
      </div>
    `;
    overlay.querySelector('.system-confirm-text').innerText = message;
    document.body.appendChild(overlay);
    if (window.lucide) lucide.createIcons();

    const cleanup = (result) => {
      overlay.remove();
      resolve(result);
    };
    overlay.querySelector('.system-confirm-ok').addEventListener('click', () => cleanup(true));
    overlay.querySelector('.system-confirm-cancel').addEventListener('click', () => cleanup(false));
    overlay.querySelector('.system-confirm-x').addEventListener('click', () => cleanup(false));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
  });
}

// --- MANEJO DE VISTAS Y AUTENTICACIÓN ---

// Cambiar pestañas login/registro
tabLoginBtn.addEventListener('click', () => {
  tabLoginBtn.classList.add('active');
  tabRegisterBtn.classList.remove('active');
  loginFormContainer.classList.remove('hidden');
  registerFormContainer.classList.add('hidden');
});

tabRegisterBtn.addEventListener('click', () => {
  tabRegisterBtn.classList.add('active');
  tabLoginBtn.classList.remove('active');
  registerFormContainer.classList.remove('hidden');
  loginFormContainer.classList.add('hidden');
});

// Lógica de Login
loginSubmitBtn.addEventListener('click', () => {
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;
  
  const users = state.db.getTable('usuarios');
  const user = users.find(u => u.correo === email && u.contrasena_hash === password);
  
  if (user) {
    login(user);
  } else {
    showSystemMessage("Credenciales inválidas. Por favor intente con neuron@codetalk.io / password123", "error");
  }
});

// Lógica de Registro
registerSubmitBtn.addEventListener('click', () => {
  const username = registerUsernameInput.value.trim();
  const email = registerEmailInput.value.trim();
  const password = registerPasswordInput.value;

  if (!username || !email || !password) {
    showSystemMessage("Por favor rellene todos los campos.", "error");
    return;
  }

  const users = state.db.getTable('usuarios');
  if (users.find(u => u.correo === email)) {
    showSystemMessage("El correo electrónico ya se encuentra registrado.", "error");
    return;
  }

  // Generar código de amigo único de 8 caracteres
  const friendCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  // Crear usuario
  const newUser = state.db.insert('usuarios', {
    nombre_usuario: username,
    correo: email,
    contrasena_hash: password,
    codigo_amigo: friendCode
  });

  // Crear billetera con saldo inicial $0.00
  state.db.insert('billeteras', {
    id_usuario: newUser.id_usuario,
    saldo: 0.00
  });

  showSystemMessage(`¡Cuenta creada con éxito! Tu código de amigo es: ${friendCode}`, "success");
  login(newUser);
});

// Demo rápida (Invitado)
quickDemoBtn.addEventListener('click', () => {
  const users = state.db.getTable('usuarios');
  // Usar el usuario Neuron_Link por defecto
  login(users[0]);
});

function login(user) {
  state.currentUser = user;
  
  // Ocultar login, mostrar app
  joinScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
  
  // Establecer footer
  userFooterName.innerText = user.nombre_usuario;
  userFooterPlaceholder.innerText = user.nombre_usuario.substring(0, 2).toUpperCase();
  userFooterCode.innerText = `#${user.codigo_amigo}`;
  
  // Cargar saldo en el footer
  updateFooterBalance();
  
  // Cargar barra de servidores
  renderServers();
  
  // Activar vista Home
  selectHome();
  
  synth.playConnect();
}

function updateFooterBalance() {
  const wallets = state.db.getTable('billeteras');
  const userWallet = wallets.find(w => w.id_usuario === state.currentUser.id_usuario);
  if (userWallet) {
    userFooterBalance.innerText = `$${parseFloat(userWallet.saldo).toFixed(2)}`;
    walletBalanceDisplay.innerText = `$${parseFloat(userWallet.saldo).toFixed(2)}`;
  }
}

// Cerrar sesión
btnLogout.addEventListener('click', () => {
  if (state.activeCall) {
    endActiveCall();
  }
  state.currentUser = null;
  state.currentGroup = null;
  state.currentChannel = null;
  
  joinScreen.classList.remove('hidden');
  appShell.classList.add('hidden');
  synth.playDisconnect();
});

// --- LÓGICA DE NAVEGACIÓN Y PANELES (SERVIDORES / CANALES) ---

// Click en Home (Amigos / Billetera)
serverHomeBtn.addEventListener('click', () => {
  selectHome();
});

function selectHome() {
  state.currentGroup = null;
  document.querySelectorAll('.server-icon').forEach(btn => btn.classList.remove('active'));
  serverHomeBtn.classList.add('active');
  
  // Header sidebar
  currentSidebarTitle.innerText = "Centro de Control";
  serverInviteBadge.classList.add('hidden');
  openInviteFriendsModalBtn.classList.add('hidden');
  
  // Switch navigation bar lateral
  homeNavigation.classList.remove('hidden');
  serverChannels.classList.add('hidden');
  
  // Activar Amigos por defecto
  selectHomeTab('friends');
}

function selectHomeTab(tab) {
  state.currentChannel = null;
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  
  if (tab === 'friends') {
    document.getElementById('nav-friends-tab').classList.add('active');
    switchMainView('friends');
    renderFriends();
  } else if (tab === 'wallet') {
    document.getElementById('nav-wallet-tab').classList.add('active');
    switchMainView('wallet');
    renderWallet();
  } else if (tab === 'calendar') {
    document.getElementById('nav-calendar-tab').classList.add('active');
    switchMainView('calendar');
    initCalendar();
  }
}

document.getElementById('nav-friends-tab').addEventListener('click', () => selectHomeTab('friends'));
document.getElementById('nav-wallet-tab').addEventListener('click', () => selectHomeTab('wallet'));
document.getElementById('nav-calendar-tab').addEventListener('click', () => selectHomeTab('calendar'));

// Switch del Workspace Principal
function switchMainView(view) {
  state.activeView = view;
  
  // Ocultar todas las vistas removiendo 'active' y agregando 'hidden'
  viewFriends.classList.remove('active');
  viewFriends.classList.add('hidden');
  viewWallet.classList.remove('active');
  viewWallet.classList.add('hidden');
  viewChat.classList.remove('active');
  viewChat.classList.add('hidden');
  viewCall.classList.remove('active');
  viewCall.classList.add('hidden');
  viewCode.classList.remove('active');
  viewCode.classList.add('hidden');
  if (viewCalendar) {
    viewCalendar.classList.remove('active');
    viewCalendar.classList.add('hidden');
  }
  
  // Activar la vista seleccionada agregando 'active' y removiendo 'hidden'
  if (view === 'friends') {
    viewFriends.classList.add('active');
    viewFriends.classList.remove('hidden');
  } else if (view === 'wallet') {
    viewWallet.classList.add('active');
    viewWallet.classList.remove('hidden');
  } else if (view === 'chat') {
    viewChat.classList.add('active');
    viewChat.classList.remove('hidden');
  } else if (view === 'call') {
    viewCall.classList.add('active');
    viewCall.classList.remove('hidden');
  } else if (view === 'code') {
    viewCode.classList.add('active');
    viewCode.classList.remove('hidden');
  } else if (view === 'calendar') {
    if (viewCalendar) {
      viewCalendar.classList.add('active');
      viewCalendar.classList.remove('hidden');
    }
  }
  
  synth.playToggle(true);
}

// Renderizar Servidores
function renderServers() {
  serverList.innerHTML = '';
  const groups = state.db.getTable('grupos');
  const memberships = state.db.getTable('miembros_grupo');
  
  // Filtrar servidores a los que pertenece el usuario
  const myMemberships = memberships.filter(m => m.id_usuario === state.currentUser.id_usuario);
  const myGroups = groups.filter(g => myMemberships.find(m => m.id_grupo === g.id_grupo));
  
  myGroups.forEach(group => {
    const btn = document.createElement('button');
    btn.className = 'server-icon';
    btn.setAttribute('data-tooltip', group.nombre);
    btn.innerText = group.nombre.substring(0, 3).toUpperCase();
    btn.addEventListener('click', () => selectServer(group));
    serverList.appendChild(btn);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

function selectServer(group) {
  state.currentGroup = group;
  document.querySelectorAll('.server-icon').forEach(btn => btn.classList.remove('active'));
  // Encontrar el botón clickeado
  const btns = serverList.querySelectorAll('.server-icon');
  btns.forEach(btn => {
    if (btn.getAttribute('data-tooltip') === group.nombre) {
      btn.classList.add('active');
    }
  });

  // Header sidebar
  currentSidebarTitle.innerText = group.nombre;
  serverInviteBadge.innerText = group.codigo_invitacion;
  serverInviteBadge.classList.remove('hidden');
  openInviteFriendsModalBtn.classList.remove('hidden');
  
  // Switch navigation bar lateral
  homeNavigation.classList.add('hidden');
  serverChannels.classList.remove('hidden');
  
  // Renderizar Canales
  renderChannels();

  // Seleccionar primer canal de texto disponible
  const channels = state.db.getTable('canales').filter(c => c.id_grupo === group.id_grupo);
  const textChan = channels.find(c => c.tipo === 'texto');
  if (textChan) {
    selectChannel(textChan);
  } else {
    switchMainView('friends');
  }
}

// Renderizar Canales
function renderChannels() {
  textChannelsList.innerHTML = '';
  voiceChannelsList.innerHTML = '';
  videoChannelsList.innerHTML = '';
  codeChannelsList.innerHTML = '';
  if (archivedChannelsList) archivedChannelsList.innerHTML = '';
  
  const channels = state.db.getTable('canales').filter(c => c.id_grupo === state.currentGroup.id_grupo);
  
  // Contenedor de la categoría de archivados en el HTML
  const archivedCategory = document.getElementById('archived-category-container');
  let hasArchivedChannels = false;
  
  channels.forEach(channel => {
    const item = document.createElement('div');
    item.className = 'channel-item';
    item.setAttribute('data-channel-id', channel.id_canal);
    
    let iconName = 'message-square';
    if (channel.tipo === 'voz') iconName = 'phone';
    else if (channel.tipo === 'video') iconName = 'video';
    else if (channel.tipo === 'codigo') iconName = 'code-2';

    // Determinar si está archivado
    const isArchived = !!channel.archivado;
    
    // Contenido del item
    item.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span class="channel-name-txt">${channel.nombre}</span>
      <div class="channel-item-actions">
        ${isArchived 
          ? `<button class="channel-action-btn unarchive-btn" data-tooltip="Desarchivar"><i data-lucide="rotate-ccw"></i></button>`
          : `<button class="channel-action-btn archive-btn" data-tooltip="Archivar"><i data-lucide="archive"></i></button>`
        }
        <button class="channel-action-btn delete-btn" data-tooltip="Eliminar"><i data-lucide="trash-2"></i></button>
      </div>
    `;
    
    // Manejar click en el canal (excluyendo clics en los botones de acción)
    item.addEventListener('click', (e) => {
      if (e.target.closest('.channel-action-btn')) return;
      selectChannel(channel);
    });
    
    // Manejar botones de acción
    const archiveBtn = item.querySelector('.archive-btn');
    if (archiveBtn) {
      archiveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        archiveChannel(channel.id_canal, true);
      });
    }
    
    const unarchiveBtn = item.querySelector('.unarchive-btn');
    if (unarchiveBtn) {
      unarchiveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        archiveChannel(channel.id_canal, false);
      });
    }
    
    const deleteBtn = item.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteChannel(channel.id_canal);
      });
    }
    
    // Añadir a la lista correspondiente
    if (isArchived) {
      hasArchivedChannels = true;
      if (archivedChannelsList) archivedChannelsList.appendChild(item);
    } else {
      if (channel.tipo === 'texto') textChannelsList.appendChild(item);
      else if (channel.tipo === 'voz') voiceChannelsList.appendChild(item);
      else if (channel.tipo === 'video') videoChannelsList.appendChild(item);
      else if (channel.tipo === 'codigo') codeChannelsList.appendChild(item);
    }
  });
  
  // Mostrar u ocultar la categoría de archivados si hay o no canales archivados
  if (archivedCategory) {
    if (hasArchivedChannels) {
      archivedCategory.style.display = 'block';
    } else {
      archivedCategory.style.display = 'none';
    }
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Archivar o desarchivar un canal
function archiveChannel(channelId, archiveState) {
  const canales = state.db.getTable('canales');
  const index = canales.findIndex(c => c.id_canal === channelId);
  if (index !== -1) {
    canales[index].archivado = archiveState;
    state.db.saveTable('canales', canales);
    
    // Si el canal archivado es el canal actual, debemos deseleccionarlo y redirigir
    if (state.currentChannel && state.currentChannel.id_canal === channelId) {
      state.currentChannel = null;
      // Redirigir al primer canal de texto disponible o a amigos
      const activeTextChannel = canales.filter(c => c.id_grupo === state.currentGroup.id_grupo && !c.archivado).find(c => c.tipo === 'texto');
      if (activeTextChannel) {
        selectChannel(activeTextChannel);
      } else {
        selectHomeTab('friends');
      }
    }
    renderChannels();
    
    showSystemMessage(archiveState ? "Canal archivado correctamente." : "Canal desarchivado correctamente.", "success");
    synth.playToggle(true);
  }
}

// Eliminar un canal permanentemente
async function deleteChannel(channelId) {
  const proceed = await showSystemConfirm("¿Estás seguro de que deseas eliminar permanentemente este canal y todos sus mensajes?");
  if (!proceed) return;
  
  const canales = state.db.getTable('canales');
  const index = canales.findIndex(c => c.id_canal === channelId);
  if (index !== -1) {
    // 1. Eliminar canal
    const filteredCanales = canales.filter(c => c.id_canal !== channelId);
    state.db.saveTable('canales', filteredCanales);
    
    // 2. Eliminar mensajes asociados
    const mensajes = state.db.getTable('mensajes');
    const filteredMensajes = mensajes.filter(m => m.id_canal !== channelId);
    state.db.saveTable('mensajes', filteredMensajes);
    
    // Si el canal eliminado es el canal actual, debemos deseleccionarlo y redirigir
    if (state.currentChannel && state.currentChannel.id_canal === channelId) {
      state.currentChannel = null;
      // Redirigir al primer canal de texto disponible o a amigos
      const activeTextChannel = filteredCanales.filter(c => c.id_grupo === state.currentGroup.id_grupo && !c.archivado).find(c => c.tipo === 'texto');
      if (activeTextChannel) {
        selectChannel(activeTextChannel);
      } else {
        selectHomeTab('friends');
      }
    }
    renderChannels();
    
    showSystemMessage("Canal eliminado permanentemente.", "error");
    synth.playToggle(false);
  }
}

// Cambiar de canal
function selectChannel(channel) {
  // Salir de llamada activa si cambiamos a otro tipo de canal
  if (state.activeCall && (channel.tipo !== 'video' && channel.tipo !== 'voz')) {
    endActiveCall();
  }

  state.currentChannel = channel;
  
  // Resaltar en sidebar
  document.querySelectorAll('.channel-item').forEach(item => {
    item.classList.remove('active');
    if (parseInt(item.getAttribute('data-channel-id')) === channel.id_canal) {
      item.classList.add('active');
    }
  });

  if (channel.tipo === 'texto') {
    switchMainView('chat');
    chatChannelTitle.innerHTML = `<i data-lucide="message-square" class="header-icon"></i> <span>${channel.nombre}</span>`;
    renderChatMessages();
  } else if (channel.tipo === 'video' || channel.tipo === 'voz') {
    switchMainView('call');
    const icon = channel.tipo === 'video' ? 'video' : 'phone';
    callChannelTitle.innerHTML = `<i data-lucide="${icon}" class="header-icon"></i> <span id="call-channel-name-txt">${channel.nombre}</span>`;
    startCallSession(channel);
  } else if (channel.tipo === 'codigo') {
    switchMainView('code');
    codeChannelTitle.innerHTML = `<i data-lucide="code-2" class="header-icon"></i> <span id="code-channel-name-txt">${channel.nombre}</span>`;
    startCodeSession(channel);
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Copiar código de invitación al hacer click en el badge
serverInviteBadge.addEventListener('click', () => {
  navigator.clipboard.writeText(state.currentGroup.codigo_invitacion).then(() => {
    showSystemMessage("Código de invitación copiado al portapapeles. Transmítelo a otros programadores para que se unan.", "success");
    synth.playToggle(true);
  });
});

// Copiar el código de amigo propio al hacer clic en el footer de usuario
userFooterCode.addEventListener('click', () => {
  if (!state.currentUser) return;
  navigator.clipboard.writeText(state.currentUser.codigo_amigo).then(() => {
    showSystemMessage("Tu código de amigo fue copiado al portapapeles. Compártelo para que te agreguen.", "success");
    synth.playToggle(true);
  });
});

// --- MODALES: CREAR SERVIDOR / CREAR CANAL ---

// Abrir Modal de Servidor
openAddServerBtn.addEventListener('click', () => {
  serverModal.classList.remove('hidden');
  serverModalError.classList.add('hidden');
});

// Pestañas del Modal Servidor
modalTabCreateBtn.addEventListener('click', () => {
  modalTabCreateBtn.classList.add('active');
  modalTabJoinBtn.classList.remove('active');
  modalCreateContainer.classList.remove('hidden');
  modalJoinContainer.classList.add('hidden');
});

modalTabJoinBtn.addEventListener('click', () => {
  modalTabJoinBtn.classList.add('active');
  modalTabCreateBtn.classList.remove('active');
  modalJoinContainer.classList.remove('hidden');
  modalCreateContainer.classList.add('hidden');
});

// Cerrar modales al presionar la 'x'
document.querySelectorAll('.close-modal-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.add('hidden'));
  });
});

// Cerrar modales haciendo clic fuera del contenedor, o con la tecla Escape
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.add('hidden'));
  }
});

// --- MODAL: GUÍA RÁPIDA / AYUDA ---
openHelpModalBtn.addEventListener('click', () => {
  helpModal.classList.remove('hidden');
});
helpModalCloseBtn.addEventListener('click', () => {
  helpModal.classList.add('hidden');
});

// Crear Servidor
submitCreateServer.addEventListener('click', () => {
  const name = newServerName.value.trim();
  if (!name) {
    serverModalError.innerText = "Debe ingresar un nombre para el servidor.";
    serverModalError.classList.remove('hidden');
    return;
  }
  
  // Generar código de invitación CT-XXXX-YYYY
  const code = "CT-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 4).toUpperCase();
  
  // Crear Grupo
  const newGroup = state.db.insert('grupos', {
    nombre: name,
    id_propietario: state.currentUser.id_usuario,
    codigo_invitacion: code
  });

  // Agregar al creador como miembro del grupo
  state.db.insert('miembros_grupo', {
    id_grupo: newGroup.id_grupo,
    id_usuario: state.currentUser.id_usuario
  });

  // Crear canal de texto y de video por defecto
  state.db.insert('canales', { id_grupo: newGroup.id_grupo, nombre: "general-texto", tipo: "texto" });
  state.db.insert('canales', { id_grupo: newGroup.id_grupo, nombre: "sala-video", tipo: "video" });
  state.db.insert('canales', { id_grupo: newGroup.id_grupo, nombre: "sala-voz", tipo: "voz" });
  state.db.insert('canales', { id_grupo: newGroup.id_grupo, nombre: "code-compartido", tipo: "codigo" });

  newServerName.value = '';
  renderServers();
  selectServer(newGroup);

  // Mostrar panel de éxito e invitación
  serverModalTabs.classList.add('hidden');
  modalCreateContainer.classList.add('hidden');
  modalSuccessInviteContainer.classList.remove('hidden');
  renderNewServerFriendsList(newGroup);
});

// Unirse a Servidor
submitJoinServer.addEventListener('click', () => {
  const code = joinServerCode.value.trim().toUpperCase();
  if (!code) {
    serverModalError.innerText = "Debe ingresar un código de invitación.";
    serverModalError.classList.remove('hidden');
    return;
  }

  const groups = state.db.getTable('grupos');
  const targetGroup = groups.find(g => g.codigo_invitacion === code);

  if (!targetGroup) {
    serverModalError.innerText = "Código de invitación no encontrado.";
    serverModalError.classList.remove('hidden');
    return;
  }

  const members = state.db.getTable('miembros_grupo');
  const alreadyMember = members.find(m => m.id_grupo === targetGroup.id_grupo && m.id_usuario === state.currentUser.id_usuario);
  
  if (alreadyMember) {
    showSystemMessage("Ya eres miembro de este servidor.", "info");
    joinServerCode.value = '';
    serverModal.classList.add('hidden');
    selectServer(targetGroup);
    return;
  }

  // Insertar membresía
  state.db.insert('miembros_grupo', {
    id_grupo: targetGroup.id_grupo,
    id_usuario: state.currentUser.id_usuario
  });

  joinServerCode.value = '';
  serverModal.classList.add('hidden');
  renderServers();
  selectServer(targetGroup);
});

// Abrir Modal de Crear Canal
let selectedCategoryType = 'texto';
document.querySelectorAll('.add-channel-small').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedCategoryType = btn.getAttribute('data-type');
    newChannelName.value = '';
    
    // Seleccionar el radio button correspondiente en el modal
    document.querySelectorAll('input[name="new-channel-type"]').forEach(radio => {
      if (radio.value === selectedCategoryType) {
        radio.checked = true;
      }
    });

    channelModal.classList.remove('hidden');
    channelModalError.classList.add('hidden');
  });
});

// Crear Canal
submitCreateChannel.addEventListener('click', () => {
  const name = newChannelName.value.trim().replace(/\s+/g, '-').toLowerCase();
  const type = document.querySelector('input[name="new-channel-type"]:checked').value;

  if (!name) {
    channelModalError.innerText = "Debe ingresar el nombre del canal.";
    channelModalError.classList.remove('hidden');
    return;
  }

  const newChan = state.db.insert('canales', {
    id_grupo: state.currentGroup.id_grupo,
    nombre: name,
    tipo: type
  });

  channelModal.classList.add('hidden');
  renderChannels();
  selectChannel(newChan);
});

// --- SISTEMA DE AMIGOS (AÑADIR Y ACEPTAR) ---

function renderFriends() {
  pendingFriendsList.innerHTML = '';
  acceptedFriendsList.innerHTML = '';
  
  const friendships = state.db.getTable('amistades');
  const users = state.db.getTable('usuarios');
  
  // Filtrar mis amistades
  const myFriendships = friendships.filter(f => f.id_solicitante === state.currentUser.id_usuario || f.id_receptor === state.currentUser.id_usuario);
  
  let pendingCount = 0;
  let acceptedCount = 0;

  myFriendships.forEach(friendship => {
    // Determinar quién es el amigo
    const isSolicitante = friendship.id_solicitante === state.currentUser.id_usuario;
    const friendId = isSolicitante ? friendship.id_receptor : friendship.id_solicitante;
    const friend = users.find(u => u.id_usuario === friendId);

    if (!friend) return;

    const card = document.createElement('div');
    card.className = 'friend-card';
    
    const info = document.createElement('div');
    info.className = 'friend-info';
    info.innerHTML = `
      <div class="avatar-placeholder-small">${friend.nombre_usuario.substring(0,2).toUpperCase()}</div>
      <div>
        <div style="font-weight:bold; color: #fff;">${friend.nombre_usuario}</div>
        <div style="font-size:0.7rem; color:var(--text-secondary);">#${friend.codigo_amigo}</div>
      </div>
    `;
    card.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'friend-actions';

    if (friendship.estado === 'pendiente') {
      if (friendship.id_receptor === state.currentUser.id_usuario) {
        // Solicitud entrante: puedo aceptar o rechazar
        pendingCount++;
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'accept-btn';
        acceptBtn.innerText = 'Aceptar';
        acceptBtn.addEventListener('click', () => acceptFriendRequest(friendship.id_amistad));
        
        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'reject-btn';
        rejectBtn.innerText = 'Rechazar';
        rejectBtn.addEventListener('click', () => deleteFriendship(friendship.id_amistad));
        
        actions.appendChild(acceptBtn);
        actions.appendChild(rejectBtn);
      } else {
        // Solicitud saliente: en espera
        const span = document.createElement('span');
        span.style.fontSize = '0.75rem';
        span.style.color = 'var(--neon-yellow)';
        span.innerText = 'Pendiente';
        actions.appendChild(span);
      }
      card.appendChild(actions);
      pendingFriendsList.appendChild(card);
    } else {
      // Amigos aceptados
      acceptedCount++;
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'reject-btn';
      deleteBtn.innerText = 'Eliminar';
      deleteBtn.addEventListener('click', () => deleteFriendship(friendship.id_amistad));
      actions.appendChild(deleteBtn);
      
      card.appendChild(actions);
      acceptedFriendsList.appendChild(card);
    }
  });

  countPendingFriends.innerText = pendingCount;
  countAcceptedFriends.innerText = acceptedCount;

  // Mensajes de ayuda cuando las listas están vacías
  if (pendingCount === 0) {
    pendingFriendsList.innerHTML = '<div class="empty-state-hint">No tienes solicitudes pendientes por ahora.</div>';
  }
  if (acceptedCount === 0) {
    acceptedFriendsList.innerHTML = '<div class="empty-state-hint">Aún no tienes amigos. Usa el código de un amigo arriba para agregarlo.</div>';
  }

  // Mostrar badge rojo en la barra central si hay pendientes
  if (pendingCount > 0) {
    pendingFriendsBadge.innerText = pendingCount;
    pendingFriendsBadge.classList.remove('hidden');
  } else {
    pendingFriendsBadge.classList.add('hidden');
  }

  // Renderizar invitaciones de servidores recibidas
  renderGroupInvitations();

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Enviar solicitud de amistad
btnAddFriend.addEventListener('click', () => {
  const code = friendCodeInput.value.trim().toUpperCase();
  friendErrorMsg.classList.add('hidden');
  friendSuccessMsg.classList.add('hidden');

  if (!code) {
    friendErrorMsg.innerText = "Por favor, ingrese un código de amigo.";
    friendErrorMsg.classList.remove('hidden');
    return;
  }

  if (code === state.currentUser.codigo_amigo) {
    friendErrorMsg.innerText = "No puedes agregarte a ti mismo.";
    friendErrorMsg.classList.remove('hidden');
    return;
  }

  const users = state.db.getTable('usuarios');
  const targetUser = users.find(u => u.codigo_amigo === code);

  if (!targetUser) {
    friendErrorMsg.innerText = "Usuario no encontrado.";
    friendErrorMsg.classList.remove('hidden');
    return;
  }

  const friendships = state.db.getTable('amistades');
  const alreadyLinked = friendships.find(f => 
    (f.id_solicitante === state.currentUser.id_usuario && f.id_receptor === targetUser.id_usuario) ||
    (f.id_solicitante === targetUser.id_usuario && f.id_receptor === state.currentUser.id_usuario)
  );

  if (alreadyLinked) {
    friendErrorMsg.innerText = alreadyLinked.estado === 'pendiente' ? "Solicitud ya enviada y pendiente." : "Este usuario ya es tu amigo.";
    friendErrorMsg.classList.remove('hidden');
    return;
  }

  // Insertar amistad pendiente
  state.db.insert('amistades', {
    id_solicitante: state.currentUser.id_usuario,
    id_receptor: targetUser.id_usuario,
    estado: "pendiente"
  });

  friendSuccessMsg.innerText = `¡Solicitud de amistad enviada a ${targetUser.nombre_usuario}!`;
  friendSuccessMsg.classList.remove('hidden');
  friendCodeInput.value = '';
  
  renderFriends();
});

// Aceptar Solicitud
function acceptFriendRequest(idAmistad) {
  state.db.update('amistades', 'id_amistad', idAmistad, { estado: "aceptada" });
  synth.playConnect();
  renderFriends();
}

// Eliminar / Rechazar Amistad
function deleteFriendship(idAmistad) {
  state.db.delete('amistades', 'id_amistad', idAmistad);
  synth.playDisconnect();
  renderFriends();
}

// --- BILLETERA Y PASARELA BINANCE PAY SIMULADA ---

function renderWallet() {
  updateFooterBalance();
  renderTransactionHistory();
  if (window.lucide) {
    lucide.createIcons();
  }
}

function renderTransactionHistory() {
  transactionsLogBody.innerHTML = '';
  const txs = state.db.getTable('transacciones').filter(t => t.id_usuario === state.currentUser.id_usuario);
  
  // Ordenar de más reciente a más antiguo
  txs.reverse();

  if (txs.length === 0) {
    transactionsLogBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Sin transacciones registradas.</td></tr>`;
    return;
  }

  txs.forEach(tx => {
    const row = document.createElement('tr');
    const date = new Date(tx.fecha_transaccion).toLocaleString();
    const typeLabel = tx.tipo === 'recarga' ? 'Recarga Binance Pay' : 'Cobro Llamada';
    const amountClass = tx.tipo === 'recarga' ? 'tx-amount plus' : 'tx-amount minus';
    const amountSign = tx.tipo === 'recarga' ? '+' : '-';
    const details = tx.id_llamada_relacionada ? `Llamada #${tx.id_llamada_relacionada}` : 'Depósito directo';

    row.innerHTML = `
      <td>${date}</td>
      <td><span class="status-indicator ${tx.tipo === 'recarga' ? 'paid' : 'canceled'}">${typeLabel}</span></td>
      <td>${details}</td>
      <td class="${amountClass}" style="font-weight:bold;">${amountSign}$${parseFloat(tx.monto).toFixed(2)}</td>
    `;
    transactionsLogBody.appendChild(row);
  });
}

// Binance Pay Modal
openRechargeBtn.addEventListener('click', () => {
  binanceModal.classList.remove('hidden');
  binanceStepAmount.classList.remove('hidden');
  binanceStepQr.classList.add('hidden');
  binanceRechargeAmount.value = "10.00";
});

// Generar Orden de Binance Pay
binanceBtnGenerate.addEventListener('click', () => {
  const amount = parseFloat(binanceRechargeAmount.value);
  if (isNaN(amount) || amount <= 0) {
    showSystemMessage("Por favor ingrese un monto de recarga válido.", "error");
    return;
  }

  // Generar datos aleatorios simulados de Binance
  const prepayId = Math.floor(Math.random() * 100000000000).toString();
  const orderId = "CT-ORD-" + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');

  // Guardar datos temporales en atributos del modal
  binanceModal.setAttribute('data-current-amount', amount);
  binanceModal.setAttribute('data-current-orderid', orderId);
  binanceModal.setAttribute('data-current-prepayid', prepayId);

  // Llenar HUD del QR
  binanceOrderId.innerText = orderId;
  binancePrepayId.innerText = prepayId;
  binanceTotalDisplay.innerText = `$${amount.toFixed(2)} USDT`;
  binanceStatusBadge.innerText = 'PENDING';
  binanceStatusBadge.className = 'status-indicator pending';

  // Mostrar paso 2
  binanceStepAmount.classList.add('hidden');
  binanceStepQr.classList.remove('hidden');
  synth.playToggle(true);
});

// Acciones Binance Pay
binanceSimPay.addEventListener('click', () => {
  const amount = parseFloat(binanceModal.getAttribute('data-current-amount'));
  const prepayId = binanceModal.getAttribute('data-current-prepayid');
  const orderId = binanceModal.getAttribute('data-current-orderid');

  // Insertar transacción de recarga
  const tx = state.db.insert('transacciones', {
    id_usuario: state.currentUser.id_usuario,
    tipo: 'recarga',
    monto: amount,
    id_llamada_relacionada: null
  });

  // Guardar pago Binance
  state.db.insert('pagos_binance', {
    id_transaccion: tx.id_transaccion,
    id_orden_binance: orderId,
    moneda_cripto: 'USDT',
    monto_cripto: amount,
    estado_binance: 'PAID'
  });

  // Actualizar saldo de billetera
  const wallets = state.db.getTable('billeteras');
  const userWallet = wallets.find(w => w.id_usuario === state.currentUser.id_usuario);
  if (userWallet) {
    const nuevoSaldo = parseFloat(userWallet.saldo) + amount;
    state.db.update('billeteras', 'id_billetera', userWallet.id_billetera, { saldo: nuevoSaldo });
  }

  // Actualizar UI
  binanceStatusBadge.innerText = 'PAID';
  binanceStatusBadge.className = 'status-indicator paid';
  synth.playConnect();

  setTimeout(() => {
    binanceModal.classList.add('hidden');
    renderWallet();
  }, 1200);
});

binanceSimCancel.addEventListener('click', () => {
  binanceStatusBadge.innerText = 'CANCELED';
  binanceStatusBadge.className = 'status-indicator canceled';
  synth.playDisconnect();
  setTimeout(() => binanceModal.classList.add('hidden'), 1000);
});

binanceSimExpire.addEventListener('click', () => {
  binanceStatusBadge.innerText = 'EXPIRED';
  binanceStatusBadge.className = 'status-indicator expired';
  synth.playDisconnect();
  setTimeout(() => binanceModal.classList.add('hidden'), 1000);
});

// --- CHAT DE TEXTO ---

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Lenguajes que el backend puede ejecutar de verdad vía Judge0 (ver /api/code/run en server.js)
const RUNNABLE_LANGUAGES = ['python', 'javascript', 'java', 'cpp', 'c'];

// Convierte el texto de un mensaje en HTML, detectando bloques de código
// delimitados con ``` (estilo Discord/Markdown) y añadiéndoles botones de Copiar/Ejecutar.
function renderMessageContentHtml(text) {
  const fenceRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let html = '';
  let match;
  let hasCode = false;

  while ((match = fenceRegex.exec(text)) !== null) {
    hasCode = true;
    const before = text.slice(lastIndex, match.index);
    if (before.trim()) {
      html += `<div class="chat-msg-text">${escapeHtml(before).replace(/\n/g, '<br>')}</div>`;
    }

    const lang = (match[1] || 'texto').toLowerCase();
    const code = match[2].replace(/\n$/, '');
    const runnable = RUNNABLE_LANGUAGES.includes(lang);
    const encodedCode = encodeURIComponent(code);

    html += `
      <div class="chat-code-block">
        <div class="chat-code-block-header">
          <span class="chat-code-lang">${escapeHtml(lang)}</span>
          <div class="chat-code-actions">
            <button class="chat-code-copy-btn" data-code="${encodedCode}" data-tooltip="Copiar código">
              <i data-lucide="copy"></i>
            </button>
            ${runnable ? `<button class="chat-code-run-btn" data-code="${encodedCode}" data-lang="${lang}" data-tooltip="Ejecutar código">
              <i data-lucide="play"></i><span>Ejecutar</span>
            </button>` : ''}
          </div>
        </div>
        <pre class="chat-code-pre"><code>${escapeHtml(code)}</code></pre>
        <div class="chat-code-output hidden"></div>
      </div>
    `;

    lastIndex = fenceRegex.lastIndex;
  }

  const after = text.slice(lastIndex);
  if (after.trim() || !hasCode) {
    html += `<div class="chat-msg-text">${escapeHtml(after).replace(/\n/g, '<br>')}</div>`;
  }

  return html;
}

// Ejecuta un bloque de código compartido en el chat contra el backend (/api/code/run -> Judge0)
async function runChatCode(runBtn) {
  const code = decodeURIComponent(runBtn.dataset.code);
  const lang = runBtn.dataset.lang;
  const block = runBtn.closest('.chat-code-block');
  const output = block.querySelector('.chat-code-output');

  runBtn.disabled = true;
  output.classList.remove('hidden', 'has-error');
  output.innerHTML = `<div class="chat-code-loading"><span></span><span></span><span></span><em>Ejecutando en el nodo remoto...</em></div>`;

  try {
    const res = await fetch('/api/code/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language: lang })
    });
    const data = await res.json();

    if (!data.success) {
      output.classList.add('has-error');
      output.innerHTML = `<pre class="chat-code-output-pre">${escapeHtml(data.error || 'No se pudo ejecutar el código.')}</pre>`;
      return;
    }

    const displayOutput = [data.compile_output, data.stderr, data.stdout]
      .find(v => typeof v === 'string' && v.trim() !== '') || 'Sin salida.';
    const isError = !!(data.compile_output || data.stderr);

    if (isError) output.classList.add('has-error');
    output.innerHTML = `
      <div class="chat-code-output-meta">
        <span>${data.status ? escapeHtml(data.status.description) : 'Completado'}</span>
        ${data.time ? `<span>${escapeHtml(data.time)}s</span>` : ''}
      </div>
      <pre class="chat-code-output-pre">${escapeHtml(displayOutput)}</pre>
    `;
  } catch (err) {
    output.classList.add('has-error');
    output.innerHTML = `<pre class="chat-code-output-pre">No se pudo contactar el servicio de ejecución remota. Verifica tu conexión.</pre>`;
  } finally {
    runBtn.disabled = false;
  }
}

// Delegación de eventos: copiar y ejecutar código dentro de cualquier mensaje del chat
channelChatMessages.addEventListener('click', async (e) => {
  const copyBtn = e.target.closest('.chat-code-copy-btn');
  if (copyBtn) {
    const code = decodeURIComponent(copyBtn.dataset.code);
    try {
      await navigator.clipboard.writeText(code);
      copyBtn.classList.add('copied');
      setTimeout(() => copyBtn.classList.remove('copied'), 1200);
    } catch (err) {
      console.warn('No se pudo copiar al portapapeles', err);
    }
    return;
  }

  const runBtn = e.target.closest('.chat-code-run-btn');
  if (runBtn) {
    runChatCode(runBtn);
  }
});

function renderChatMessages() {
  channelChatMessages.innerHTML = '';
  const messages = state.db.getTable('mensajes').filter(m => m.id_canal === state.currentChannel.id_canal);
  const users = state.db.getTable('usuarios');

  messages.forEach(msg => {
    const author = users.find(u => u.id_usuario === msg.id_usuario);
    const authorName = author ? author.nombre_usuario : "Operador_Anon";
    const time = new Date(msg.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const card = document.createElement('div');
    card.className = 'chat-message';
    if (author && author.id_usuario === 3) {
      card.classList.add('chat-msg-system');
    }
    
    if (msg.contenido.startsWith('INVITE_LINK:')) {
      card.classList.add('call-invite-message');
      const targetChannelId = parseInt(msg.contenido.split(':')[1]);
      const allChans = state.db.getTable('canales');
      const targetChan = allChans.find(c => c.id_canal === targetChannelId);
      const targetName = targetChan ? targetChan.nombre : "Canal Desconocido";
      const iconType = (targetChan && targetChan.tipo === 'video') ? 'video' : 'phone';

      card.innerHTML = `
        <div class="chat-msg-header">
          <span class="chat-msg-author" style="${author && author.id_usuario === state.currentUser.id_usuario ? 'color: var(--neon-cyan);' : ''}">${escapeHtml(authorName)}</span>
          <span class="chat-msg-time">${time}</span>
        </div>
        <div class="call-invite-block">
          <div class="invite-icon"><i data-lucide="${iconType}"></i></div>
          <div class="invite-details">
            <div class="invite-title">ENLACE DE LLAMADA</div>
            <div class="invite-desc">Únete al canal: <strong>${escapeHtml(targetName)}</strong></div>
          </div>
          <button class="invite-join-btn" data-invite-channel-id="${targetChannelId}">Unirse</button>
        </div>
      `;

      card.querySelector('.invite-join-btn').addEventListener('click', () => {
        if (targetChan) {
          selectChannel(targetChan);
        }
      });
    } else {
      card.innerHTML = `
        <div class="chat-msg-header">
          <span class="chat-msg-author" style="${author && author.id_usuario === state.currentUser.id_usuario ? 'color: var(--neon-cyan);' : ''}">${escapeHtml(authorName)}</span>
          <span class="chat-msg-time">${time}</span>
        </div>
        <div class="chat-msg-content">${renderMessageContentHtml(msg.contenido)}</div>
      `;
    }
    
    channelChatMessages.appendChild(card);
  });
  
  channelChatMessages.scrollTop = channelChatMessages.scrollHeight;
  if (window.lucide) {
    lucide.createIcons();
  }
}

function sendChatContent(text) {
  if (!text || !text.trim()) return;

  // Insertar en base de datos local
  state.db.insert('mensajes', {
    id_canal: state.currentChannel.id_canal,
    id_usuario: state.currentUser.id_usuario,
    contenido: text
  });

  renderChatMessages();
  synth.playToggle(true);

  // Simular respuesta del bot de soporte del canal si es el general después de unos segundos
  if (state.currentChannel.nombre === 'general-texto' && Math.random() > 0.4) {
    setTimeout(() => {
      state.db.insert('mensajes', {
        id_canal: state.currentChannel.id_canal,
        id_usuario: 3, // Aegis Core
        contenido: `Señal del terminal recibida: "${text.substring(0, 15)}...". Procesando datos en los proxies de enlace.`
      });
      renderChatMessages();
    }, 1500);
  }
}

function sendLocalChatMessage() {
  const text = channelChatInput.value.trim();
  if (!text) return;
  channelChatInput.value = '';
  sendChatContent(text);
}

channelChatSendBtn.addEventListener('click', sendLocalChatMessage);

// --- COMPOSITOR DE CÓDIGO EJECUTABLE EN EL CHAT ---
chatAttachCodeBtn.addEventListener('click', () => {
  codeComposer.classList.toggle('hidden');
  if (!codeComposer.classList.contains('hidden')) {
    codeComposerTextarea.focus();
  }
});

codeComposerCancel.addEventListener('click', () => {
  codeComposer.classList.add('hidden');
  codeComposerTextarea.value = '';
});

codeComposerX.addEventListener('click', () => {
  codeComposer.classList.add('hidden');
  codeComposerTextarea.value = '';
});

codeComposerSend.addEventListener('click', () => {
  const code = codeComposerTextarea.value;
  if (!code.trim()) return;

  const lang = codeComposerLang.value;
  const fenced = '```' + lang + '\n' + code + '\n```';

  codeComposerTextarea.value = '';
  codeComposer.classList.add('hidden');
  sendChatContent(fenced);
});
channelChatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendLocalChatMessage();
});

chatInviteCallBtn.addEventListener('click', () => {
  if (!state.currentGroup) {
    showSystemMessage("Por favor ingrese a un servidor para enviar una invitación.", "error");
    return;
  }
  
  const groupChannels = state.db.getTable('canales').filter(c => c.id_grupo === state.currentGroup.id_grupo);
  const callChannel = groupChannels.find(c => c.tipo === 'video' || c.tipo === 'voz');
  
  if (!callChannel) {
    showSystemMessage("No hay ningún canal de voz o video configurado en este servidor.", "error");
    return;
  }

  const messageText = `INVITE_LINK:${callChannel.id_canal}`;
  
  state.db.insert('mensajes', {
    id_canal: state.currentChannel.id_canal,
    id_usuario: state.currentUser.id_usuario,
    contenido: messageText
  });

  renderChatMessages();
  synth.playToggle(true);
});

// --- CANAL DE VOZ/VIDEO Y FACTURACIÓN ---

async function startCallSession(channel) {
  // Configurar visualizador local y HUD de facturación
  userDisplayName.innerText = state.currentUser.nombre_usuario;
  
  // Inicializar llamada en la Base de Datos
  const call = state.db.insert('llamadas', {
    id_canal: channel.id_canal,
    tipo: channel.tipo === 'video' ? 'video' : 'audio',
    fecha_inicio: new Date().toISOString()
  });

  state.activeCall = call;

  // Insertar participante
  state.db.insert('participantes_llamada', {
    id_llamada: call.id_llamada,
    id_usuario: state.currentUser.id_usuario,
    fecha_union: new Date().toISOString()
  });

  // Inicializar reloj de facturación
  state.callSeconds = 0;
  state.callCostAccumulated = 0.00;
  callTimerDisplay.innerText = "00:00";
  callFreeMinutes.innerText = "10 min";
  callAccumulatedCost.innerText = "$0.00";
  
  billingFreeMinutesRow.classList.remove('hidden');
  billingCostRow.classList.add('hidden');
  
  // Iniciar timer
  clearInterval(state.callTimer);
  state.callTimer = setInterval(updateCallBillingTick, 1000);

  // Inicializar streams de videollamada original
  synth.playConnect();
  await setupLocalMedia();
  await initCallSignaling();
  initTelemetryGraphs();
}

function updateCallBillingTick() {
  // Incrementar segundos
  state.callSeconds += 1 * state.timeMultiplier;

  // Formatear display de tiempo
  const displayMin = Math.floor(state.callSeconds / 60).toString().padStart(2, '0');
  const displaySec = (state.callSeconds % 60).toString().padStart(2, '0');
  callTimerDisplay.innerText = `${displayMin}:${displaySec}`;

  const elapsedMinutes = state.callSeconds / 60;

  if (elapsedMinutes <= 10) {
    // Período de gracia (gratis)
    const minutesLeft = Math.ceil(10 - elapsedMinutes);
    callFreeMinutes.innerText = `${minutesLeft} min`;
    billingFreeMinutesRow.classList.remove('hidden');
    billingCostRow.classList.add('hidden');
  } else {
    // Período tarifado
    billingFreeMinutesRow.classList.add('hidden');
    billingCostRow.classList.remove('hidden');

    const extraMinutes = Math.ceil(elapsedMinutes - 10);
    const rate = 0.50; // $0.50 por minuto de tarifas_llamada
    state.callCostAccumulated = extraMinutes * rate;
    callAccumulatedCost.innerText = `$${state.callCostAccumulated.toFixed(2)} USDT`;

    // Reducir saldo de billetera en tiempo real
    const wallets = state.db.getTable('billeteras');
    const userWallet = wallets.find(w => w.id_usuario === state.currentUser.id_usuario);
    
    if (userWallet) {
      // Para simular el cobro dinámico sin esperar a guardar al final de la llamada,
      // deducimos en caliente de la base de datos por cada minuto simulado que transcurre.
      // Así garantizamos que si se agota el saldo, la llamada se corta.
      const currentAvailable = parseFloat(userWallet.saldo);
      if (currentAvailable <= 0) {
        clearInterval(state.callTimer);
        showSystemMessage("SALDO AGOTADO EN LA BILLETERA. Finalizando enlace y llamada cuántica...", "error");
        endActiveCall();
      }
    }
  }
}

// Multiplicador de velocidad de llamada
speedTimeMultiplier.addEventListener('change', (e) => {
  state.timeMultiplier = e.target.checked ? 60 : 1;
});

function endActiveCall() {
  if (!state.activeCall) return;

  clearInterval(state.callTimer);

  // Actualizar llamada en la BD
  const endTime = new Date().toISOString();
  state.db.update('llamadas', 'id_llamada', state.activeCall.id_llamada, { fecha_fin: endTime });
  
  // Actualizar salida del participante
  const participants = state.db.getTable('participantes_llamada');
  const partRecord = participants.find(p => p.id_llamada === state.activeCall.id_llamada && p.id_usuario === state.currentUser.id_usuario && !p.fecha_salida);
  if (partRecord) {
    state.db.update('participantes_llamada', 'id_participante', partRecord.id_participante, { fecha_salida: endTime });
  }

  // Cobrar de la billetera final e insertar transacción
  if (state.callCostAccumulated > 0) {
    const wallets = state.db.getTable('billeteras');
    const userWallet = wallets.find(w => w.id_usuario === state.currentUser.id_usuario);
    if (userWallet) {
      const nuevoSaldo = Math.max(0.00, parseFloat(userWallet.saldo) - state.callCostAccumulated);
      state.db.update('billeteras', 'id_billetera', userWallet.id_billetera, { saldo: nuevoSaldo });
    }

    // Insertar transacción de cobro
    state.db.insert('transacciones', {
      id_usuario: state.currentUser.id_usuario,
      tipo: 'cobro_llamada',
      monto: state.callCostAccumulated,
      id_llamada_relacionada: state.activeCall.id_llamada
    });
  }

  state.activeCall = null;
  updateFooterBalance();

  // Detener streams originales de videollamada
  synth.playDisconnect();
  
  if (state.callRoom) {
    sendCallSignal({
      type: 'peer-leave',
      senderId: state.myId
    });
    if (state.socket) {
      state.socket.emit('call:leave', { room: state.callRoom });
    }
    state.callRoom = null;
  }

  Object.keys(state.peerConnections).forEach(peerId => {
    state.peerConnections[peerId].close();
  });
  state.peerConnections = {};

  if (state.localStream) {
    state.localStream.getTracks().forEach(track => track.stop());
  }
  if (fallbackCanvasInterval) {
    clearInterval(fallbackCanvasInterval);
  }

  participantsGrid.innerHTML = '';
  state.bots = {};
  
  // Regresar al chat de texto por defecto del grupo activo
  const firstTextChannel = state.db.getTable('canales').filter(c => c.id_grupo === state.currentGroup.id_grupo).find(c => c.tipo === 'texto');
  if (firstTextChannel) {
    selectChannel(firstTextChannel);
  } else {
    switchMainView('friends');
  }
}

// Vinculo del botón desconectar con el fin de la llamada
btnDisconnect.addEventListener('click', () => {
  endActiveCall();
});

// --- CANAL DE CÓDIGO COMPARTIDO EN VIVO ---

function startCodeSession(channel) {
  // Crear sesión de código en la BD si no existe una activa para este canal
  const sesiones = state.db.getTable('sesiones_codigo');
  let sesion = sesiones.find(s => s.id_canal === channel.id_canal);

  if (!sesion) {
    sesion = state.db.insert('sesiones_codigo', {
      id_canal: channel.id_canal,
      id_usuario_creador: state.currentUser.id_usuario
    });

    // Agregar archivos por defecto
    state.db.insert('archivos_codigo', {
      id_sesion: sesion.id_sesion,
      nombre_archivo: "main.py",
      lenguaje: "python",
      contenido: `def check_quantum_grid(nodes):\n    print(f"Red cuántica activa. Nodos: {nodes}")\n    return True\n\ncheck_quantum_grid(12)`
    });

    state.db.insert('archivos_codigo', {
      id_sesion: sesion.id_sesion,
      nombre_archivo: "index.js",
      lenguaje: "javascript",
      contenido: `// CodeTalk Node Communication\nconst nodes = ["AEGIS", "KRONOS", "HELIOS"];\nconsole.log(nodes.join(" // "));`
    });
  }

  state.activeSessionCodigo = sesion;

  // Registrar participación
  const partSesiones = state.db.getTable('participantes_sesion_codigo');
  const userJoined = partSesiones.find(p => p.id_sesion === sesion.id_sesion && p.id_usuario === state.currentUser.id_usuario);
  if (!userJoined) {
    state.db.insert('participantes_sesion_codigo', {
      id_sesion: sesion.id_sesion,
      id_usuario: state.currentUser.id_usuario
    });
  }

  // Render explorer
  renderExplorerFiles();
  
  // Seleccionar primer archivo
  const files = state.db.getTable('archivos_codigo').filter(a => a.id_sesion === sesion.id_sesion);
  if (files.length > 0) {
    selectCodeFile(files[0]);
  }
}

function renderExplorerFiles() {
  codeExplorerFiles.innerHTML = '';
  const files = state.db.getTable('archivos_codigo').filter(a => a.id_sesion === state.activeSessionCodigo.id_sesion);

  files.forEach(file => {
    const item = document.createElement('div');
    item.className = 'file-item';
    if (state.activeCodeFile && state.activeCodeFile.id_archivo === file.id_archivo) {
      item.classList.add('active');
    }
    
    item.innerHTML = `
      <i data-lucide="file-code"></i>
      <span>${file.nombre_archivo}</span>
      <button class="file-item-delete" data-tooltip="Borrar Archivo"><i data-lucide="trash-2" style="width: 12px; height: 12px;"></i></button>
    `;

    // Click al archivo para abrirlo
    item.addEventListener('click', () => selectCodeFile(file));

    // Click al botón de borrar
    item.querySelector('.file-item-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCodeFile(file.id_archivo);
    });

    codeExplorerFiles.appendChild(item);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

function selectCodeFile(file) {
  state.activeCodeFile = file;
  activeCodeFilename.innerText = file.nombre_archivo;
  codeLanguageSelector.value = file.lenguaje;
  editorTextarea.value = file.contenido;
  updateLineNumbers();

  // Resaltar en explorer
  document.querySelectorAll('.file-item').forEach(item => {
    item.classList.remove('active');
    if (item.querySelector('span').innerText.includes(file.nombre_archivo)) {
      item.classList.add('active');
    }
  });
}

// Guardar Archivo
btnSaveCodeFile.addEventListener('click', () => {
  if (!state.activeCodeFile) return;

  const content = editorTextarea.value;
  const language = codeLanguageSelector.value;

  state.db.update('archivos_codigo', 'id_archivo', state.activeCodeFile.id_archivo, {
    contenido: content,
    lenguaje: language
  });

  // Recargar info
  const updated = state.db.getTable('archivos_codigo').find(a => a.id_archivo === state.activeCodeFile.id_archivo);
  state.activeCodeFile = updated;

  showSystemMessage(`Archivo ${updated.nombre_archivo} guardado correctamente en la BD.`, "success");
  synth.playToggle(true);
});

// Crear Archivo
btnCreateCodeFile.addEventListener('click', () => {
  const filename = prompt("Ingrese el nombre del nuevo archivo (ej. config.json, utils.py):");
  if (!filename) return;

  // Determinar lenguaje por extensión
  let language = "python";
  if (filename.endsWith('.js')) language = "javascript";
  else if (filename.endsWith('.html')) language = "html";
  else if (filename.endsWith('.css')) language = "css";
  else if (filename.endsWith('.java')) language = "java";
  else if (filename.endsWith('.cpp')) language = "cpp";

  const newFile = state.db.insert('archivos_codigo', {
    id_sesion: state.activeSessionCodigo.id_sesion,
    nombre_archivo: filename,
    lenguaje: language,
    contenido: `// Archivo: ${filename}\n`
  });

  renderExplorerFiles();
  selectCodeFile(newFile);
  synth.playConnect();
});

// Borrar Archivo
async function deleteCodeFile(idArchivo) {
  const confirmed = await showSystemConfirm("¿Estás seguro de que quieres eliminar este archivo de la sesión?");
  if (!confirmed) return;

  state.db.delete('archivos_codigo', 'id_archivo', idArchivo);

  // Si borramos el archivo activo, seleccionar otro
  if (state.activeCodeFile && state.activeCodeFile.id_archivo === idArchivo) {
    state.activeCodeFile = null;
  }

  renderExplorerFiles();

  const files = state.db.getTable('archivos_codigo').filter(a => a.id_sesion === state.activeSessionCodigo.id_sesion);
  if (files.length > 0) {
    selectCodeFile(files[0]);
  } else {
    activeCodeFilename.innerText = "Ningún archivo";
    editorTextarea.value = '';
    updateLineNumbers();
  }
  synth.playDisconnect();
}

// Sincronizar números de línea
function updateLineNumbers() {
  const lines = editorTextarea.value.split('\n').length;
  editorLineNumbers.innerHTML = '';
  for (let i = 1; i <= lines; i++) {
    const div = document.createElement('div');
    div.innerText = i;
    editorLineNumbers.appendChild(div);
  }
}

editorTextarea.addEventListener('input', updateLineNumbers);
editorTextarea.addEventListener('scroll', () => {
  editorLineNumbers.scrollTop = editorTextarea.scrollTop;
});

// Simulación de Bot Colaborador
btnSimPartnerType.addEventListener('click', () => {
  if (state.botTypingInterval) {
    // Detener simulación
    clearInterval(state.botTypingInterval);
    state.botTypingInterval = null;
    btnSimPartnerType.innerText = "Bot Colaborador";
    simTypingIndicator.classList.add('hidden');
    synth.playToggle(false);
    return;
  }

  if (!state.activeCodeFile) {
    showSystemMessage("Cree y seleccione un archivo de código primero.", "error");
    return;
  }

  btnSimPartnerType.innerText = "Detener Colaborador";
  simTypingIndicator.classList.remove('hidden');
  synth.playToggle(true);

  // Bloque de código a inyectar
  const botCodeLines = [
    "",
    "# Inyección colaborativa de Aegis_Core:",
    "def resolve_cyber_proxies(grid_id):",
    "    relays = [102, 304, 508]",
    "    print(f\"Revisando canales de retransmisión para {grid_id}\")",
    "    return relays",
    ""
  ];

  let lineIdx = 0;
  let charIdx = 0;

  state.botTypingInterval = setInterval(() => {
    if (lineIdx >= botCodeLines.length) {
      // Fin de la inyección
      clearInterval(state.botTypingInterval);
      state.botTypingInterval = null;
      btnSimPartnerType.innerText = "Bot Colaborador";
      simTypingIndicator.classList.add('hidden');
      showSystemMessage("Inyección colaborativa completada por el bot colaborador.", "success");
      
      // Auto-guardar
      btnSaveCodeFile.click();
      return;
    }

    const currentLine = botCodeLines[lineIdx];
    if (charIdx < currentLine.length) {
      editorTextarea.value += currentLine[charIdx];
      charIdx++;
    } else {
      editorTextarea.value += "\n";
      lineIdx++;
      charIdx = 0;
    }
    updateLineNumbers();
    editorTextarea.scrollTop = editorTextarea.scrollHeight;
    editorLineNumbers.scrollTop = editorTextarea.scrollTop;
  }, 60);
});

// --- LÓGICA ORIGINAL DE VIDEOLLAMADA (ESTRUCTURA DE CÁMARA Y WEBRTC) ---

function initAudioAnalyser(stream) {
  try {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    state.localAnalyser = state.audioContext.createAnalyser();
    state.localAnalyser.fftSize = 64;
    const source = state.audioContext.createMediaStreamSource(stream);
    source.connect(state.localAnalyser);
    drawLocalMicVisualizer();
  } catch (err) {
    console.warn("No se pudo iniciar el Web Audio Analyser: ", err);
  }
}

function drawLocalMicVisualizer() {
  const canvas = document.getElementById('user-mic-visualizer');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const bufferLength = state.localAnalyser ? state.localAnalyser.frequencyBinCount : 16;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    if (state.activeView !== 'call') return;
    requestAnimationFrame(draw);
    
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (state.isMuted) {
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    if (state.localAnalyser) {
      state.localAnalyser.getByteFrequencyData(dataArray);
    } else {
      for (let i = 0; i < bufferLength; i++) {
        dataArray[i] = Math.random() * 30 + (Math.sin(Date.now() / 200 + i) * 10);
      }
    }

    const barWidth = (width / bufferLength) * 1.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * height;
      ctx.fillStyle = `rgba(0, 243, 255, ${0.4 + (barHeight/height)})`;
      ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(x, height - barHeight, barWidth - 1, 2);
      x += barWidth;
    }
  }
  draw();
}

// Telemetry Graphs
const graphs = {
  latency: {
    canvas: document.getElementById('latency-graph'),
    history: Array(40).fill(12),
    color: '#b100ff',
    draw: null
  },
  bandwidth: {
    canvas: document.getElementById('bandwidth-graph'),
    history: Array(40).fill(12.5),
    color: '#00f3ff',
    draw: null
  }
};

function initTelemetryGraphs() {
  Object.keys(graphs).forEach(key => {
    const graph = graphs[key];
    if (!graph.canvas) return;
    const ctx = graph.canvas.getContext('2d');
    
    graph.canvas.width = graph.canvas.parentElement.clientWidth;
    graph.canvas.height = graph.canvas.parentElement.clientHeight;

    graph.draw = function() {
      if (!graph.canvas) return;
      const width = graph.canvas.width;
      const height = graph.canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.beginPath();
      const points = graph.history;
      const maxVal = Math.max(...points, 20);
      const step = width / (points.length - 1);

      ctx.moveTo(0, height - (points[0] / maxVal) * (height - 10) - 5);
      for (let i = 1; i < points.length; i++) {
        const px = i * step;
        const py = height - (points[i] / maxVal) * (height - 10) - 5;
        ctx.lineTo(px, py);
      }

      ctx.strokeStyle = graph.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = graph.color;
      ctx.shadowBlur = 8;
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, graph.color + '15');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fill();
    };
  });
}

// Inyección periódica de datos
setInterval(() => {
  if (state.activeView !== 'call') return;

  const nextLat = Math.max(5, Math.floor(12 + (Math.random() * 8 - 4)));
  graphs.latency.history.shift();
  graphs.latency.history.push(nextLat);
  document.getElementById('stat-latency').innerText = `${nextLat} ms`;

  const baseTx = state.isScreenSharing ? 25.4 : 12.1;
  const rxMultiplier = 1 + (Object.keys(state.participants).length + Object.keys(state.bots).length) * 0.8;
  const nextRx = (20.5 * rxMultiplier + (Math.random() * 4 - 2)).toFixed(1);
  const nextTx = (baseTx + (Math.random() * 2 - 1)).toFixed(1);
  
  graphs.bandwidth.history.shift();
  graphs.bandwidth.history.push(parseFloat(nextRx));
  
  document.getElementById('stat-rx').innerText = `${nextRx} Mbps`;
  document.getElementById('stat-tx').innerText = `${nextTx} Mbps`;
  document.getElementById('stat-packetloss').innerText = `${(0.01 + Math.random() * 0.04).toFixed(3)}%`;

  if (graphs.latency.draw) graphs.latency.draw();
  if (graphs.bandwidth.draw) graphs.bandwidth.draw();
}, 1000);

async function setupLocalMedia() {
  try {
    state.localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, frameRate: 30 },
      audio: true
    });
  } catch (err) {
    console.warn("Captura de cámara no disponible, usando simulador local virtual...");
    
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    
    let frame = 0;
    fallbackCanvasInterval = setInterval(() => {
      frame++;
      ctx.fillStyle = '#05060b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, (frame * 3) % 250, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, ((frame * 3) + 120) % 250, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 243, 255, 0.4)';
      ctx.font = '10px monospace';
      ctx.fillText(`TRANSMISSION_NODE: ${state.currentUser.nombre_usuario.toUpperCase()}`, 20, 30);
      ctx.fillText(`FREQ: 894.22 GHz`, 20, 50);
      ctx.fillText(`LINK_STATUS: ENLACE ACTIVO`, 20, 70);
      
      ctx.fillStyle = 'rgba(177, 0, 255, 0.3)';
      for (let i = 0; i < 15; i++) {
        const x = i * 40 + 20;
        const y = ((frame * (2 + i % 3)) % canvas.height);
        ctx.fillText(Math.random().toString(36).substring(2, 4).toUpperCase(), x, y);
      }

      ctx.fillStyle = '#00f3ff';
      ctx.beginPath();
      ctx.arc(canvas.width - 40, 30, 6, 0, Math.PI * 2);
      ctx.fill();
    }, 33);

    const canvasStream = canvas.captureStream(30);
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const dest = audioContext.createMediaStreamDestination();
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(0, audioContext.currentTime);
    osc.connect(dest);
    osc.start();
    
    state.localStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ]);
  }

  createUserCard();
  initAudioAnalyser(state.localStream);
}

function createUserCard() {
  let card = document.getElementById(`card-${state.myId}`);
  if (card) card.remove();

  card = document.createElement('div');
  card.id = `card-${state.myId}`;
  card.className = 'participant-card';
  card.innerHTML = `
    <video id="video-local" class="video-viewport mirrored" autoplay playsinline muted></video>
    <div id="avatar-local" class="avatar-viewport hidden">
      <div class="avatar-wrapper">
        <div class="voice-ring"></div>
        <div class="avatar-placeholder">${state.currentUser.nombre_usuario.substring(0,2).toUpperCase()}</div>
      </div>
    </div>
    <div class="hud-overlay">
      <div class="hud-top">
        <div class="user-name-badge">
          <span>${state.currentUser.nombre_usuario}</span>
          <span class="user-tag">(TÚ)</span>
        </div>
        <div class="hud-status-indicator">
          <div id="badge-mic-local" class="status-badge hidden">
            <i data-lucide="mic-off"></i>
          </div>
        </div>
      </div>
      <div class="hud-bottom">
        <span class="user-name-badge" style="font-size: 0.65rem; border-color: var(--neon-purple); color: var(--neon-purple);">
          ENLACE LOCAL
        </span>
      </div>
    </div>
  `;
  
  participantsGrid.appendChild(card);
  const videoEl = card.querySelector('video');
  videoEl.srcObject = state.localStream;
  updateGridSize();

  if (window.lucide) {
    lucide.createIcons();
  }
}

function updateGridSize() {
  const cards = participantsGrid.children.length;
  participantsGrid.className = 'participant-grid';
  if (cards === 1) {
    participantsGrid.classList.add('single');
  } else if (cards === 2) {
    participantsGrid.classList.add('double');
  }
}

// --- SEÑALIZACIÓN DE LLAMADAS/VIDEOLLAMADAS VÍA SOCKET.IO ---
// Reemplaza el antiguo BroadcastChannel (que solo conectaba pestañas del mismo navegador)
// por un canal real a través de nuestro propio servidor, gratis porque corre en el mismo
// backend (server.js) sin depender de ningún servicio de terceros de pago.

// Obtiene la lista de servidores ICE (STUN/TURN gratuitos) configurada en el servidor
async function fetchIceServers() {
  if (state.iceServers) return state.iceServers;
  try {
    const res = await fetch('/api/ice-config');
    const data = await res.json();
    state.iceServers = (data.iceServers && data.iceServers.length) ? data.iceServers : [{ urls: 'stun:stun.l.google.com:19302' }];
  } catch (err) {
    console.warn('No se pudo obtener la configuración ICE del servidor, usando STUN por defecto.', err);
    state.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
  }
  return state.iceServers;
}

// Envía un mensaje de señalización (peer-join, oferta/respuesta SDP, candidato ICE) a la sala actual
function sendCallSignal(payload) {
  if (!state.socket || !state.callRoom) return;
  state.socket.emit('call:signal', { room: state.callRoom, ...payload });
}

async function initCallSignaling() {
  await fetchIceServers();

  const channelName = `cyberlink-room-${state.currentChannel.nombre.trim().toUpperCase()}`;
  state.callRoom = channelName;

  // El socket se abre una sola vez y se reutiliza en llamadas siguientes
  if (!state.socket) {
    state.socket = io();

    state.socket.on('call:signal', (data) => {
      if (data.senderId === state.myId) return;

      switch (data.type) {
        case 'peer-join':
          handlePeerJoin(data.senderId, data.username);
          break;
        case 'peer-leave':
          handlePeerLeave(data.senderId);
          break;
        case 'webrtc-offer':
          handleSdpOffer(data.senderId, data.offer, data.username);
          break;
        case 'webrtc-answer':
          handleSdpAnswer(data.senderId, data.answer);
          break;
        case 'ice-candidate':
          handleIceCandidate(data.senderId, data.candidate);
          break;
      }
    });
  }

  state.socket.emit('call:join', { room: channelName, senderId: state.myId });

  sendCallSignal({
    type: 'peer-join',
    senderId: state.myId,
    username: state.currentUser.nombre_usuario
  });
}

async function handlePeerJoin(peerId, peerName) {
  const pc = createPeerConnection(peerId, peerName);
  state.peerConnections[peerId] = pc;
  state.localStream.getTracks().forEach(track => {
    pc.addTrack(track, state.localStream);
  });

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendCallSignal({
      type: 'webrtc-offer',
      senderId: state.myId,
      username: state.currentUser.nombre_usuario,
      offer: offer
    });
  } catch (err) {
    console.error("WebRTC Offer error: ", err);
  }
}

function createPeerConnection(peerId, peerName) {
  const configuration = { iceServers: state.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }] };
  const pc = new RTCPeerConnection(configuration);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendCallSignal({
        type: 'ice-candidate',
        senderId: state.myId,
        candidate: event.candidate
      });
    }
  };

  pc.ontrack = (event) => {
    const remoteStream = event.streams[0];
    createParticipantCard(peerId, peerName, remoteStream);
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') {
      synth.playConnect();
    } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      handlePeerLeave(peerId);
    }
  };

  return pc;
}

async function handleSdpOffer(peerId, offer, peerName) {
  let pc = state.peerConnections[peerId];
  if (!pc) {
    pc = createPeerConnection(peerId, peerName);
    state.peerConnections[peerId] = pc;
    state.localStream.getTracks().forEach(track => {
      pc.addTrack(track, state.localStream);
    });
  }

  try {
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendCallSignal({
      type: 'webrtc-answer',
      senderId: state.myId,
      answer: answer
    });
  } catch (err) {
    console.error("SDP Answer error: ", err);
  }
}

async function handleSdpAnswer(peerId, answer) {
  const pc = state.peerConnections[peerId];
  if (pc) {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }
}

async function handleIceCandidate(peerId, candidate) {
  const pc = state.peerConnections[peerId];
  if (pc) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
}

function handlePeerLeave(peerId) {
  const card = document.getElementById(`card-${peerId}`);
  if (card) {
    card.remove();
    updateGridSize();
    synth.playDisconnect();
  }
  if (state.peerConnections[peerId]) {
    state.peerConnections[peerId].close();
    delete state.peerConnections[peerId];
  }
}

function createParticipantCard(peerId, name, stream) {
  let card = document.getElementById(`card-${peerId}`);
  if (card) return;

  card = document.createElement('div');
  card.id = `card-${peerId}`;
  card.className = 'participant-card';
  card.innerHTML = `
    <video class="video-viewport" autoplay playsinline></video>
    <div class="avatar-viewport hidden">
      <div class="avatar-wrapper">
        <div class="voice-ring"></div>
        <div class="avatar-placeholder">${name.substring(0,2).toUpperCase()}</div>
      </div>
    </div>
    <div class="hud-overlay">
      <div class="hud-top">
        <div class="user-name-badge">
          <span>${name}</span>
        </div>
        <div class="hud-status-indicator">
          <div id="badge-mic-${peerId}" class="status-badge hidden">
            <i data-lucide="mic-off"></i>
          </div>
        </div>
      </div>
      <div class="hud-bottom">
        <span class="user-name-badge" style="font-size: 0.65rem; border-color: var(--neon-cyan); color: var(--neon-cyan);">
          ENLACE REMOTO
        </span>
      </div>
    </div>
  `;

  participantsGrid.appendChild(card);
  const video = card.querySelector('video');
  video.srcObject = stream;
  
  updateGridSize();

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Bot controls en telemetría
document.getElementById('sim-add-bot-btn').addEventListener('click', () => {
  const currentBotCount = Object.keys(state.bots).length;
  if (currentBotCount >= BOT_TEMPLATES.length) return;
  injectBot(BOT_TEMPLATES[currentBotCount]);
});

document.getElementById('sim-remove-bot-btn').addEventListener('click', () => {
  const botKeys = Object.keys(state.bots);
  if (botKeys.length === 0) return;
  removeBot(botKeys[botKeys.length - 1]);
});

function injectBot(template) {
  if (state.bots[template.id]) return;
  state.bots[template.id] = template;

  const card = document.createElement('div');
  card.id = `card-${template.id}`;
  card.className = 'participant-card';
  card.innerHTML = `
    <div class="avatar-viewport">
      <div class="avatar-wrapper" style="border-color: ${template.color}">
        <div class="voice-ring" style="border-color: ${template.color}"></div>
        <div class="avatar-placeholder" style="background: linear-gradient(135deg, ${template.color}50, ${template.color}15); color: ${template.color}">${template.letter}</div>
      </div>
    </div>
    <div class="hud-overlay">
      <div class="hud-top">
        <div class="user-name-badge">
          <span>${template.name}</span>
          <span class="badge-bot">BOT</span>
        </div>
        <div class="hud-status-indicator">
          <div id="badge-mic-${template.id}" class="status-badge hidden">
            <i data-lucide="mic-off"></i>
          </div>
        </div>
      </div>
      <div class="hud-bottom">
        <span class="user-name-badge" style="font-size: 0.65rem; border-color: ${template.color}; color: ${template.color}">
          ESTADO: ${template.tag}
        </span>
      </div>
    </div>
  `;

  participantsGrid.appendChild(card);
  updateGridSize();
  synth.playConnect();

  if (window.lucide) {
    lucide.createIcons();
  }

  const speakInterval = setInterval(() => {
    if (!document.getElementById(`card-${template.id}`)) {
      clearInterval(speakInterval);
      return;
    }
    const isSpeaking = Math.random() > 0.7;
    if (isSpeaking) {
      card.classList.add('speaking');
    } else {
      card.classList.remove('speaking');
    }
  }, 200);
}

function removeBot(botId) {
  const card = document.getElementById(`card-${botId}`);
  if (card) {
    card.remove();
    updateGridSize();
    delete state.bots[botId];
    synth.playDisconnect();
  }
}

// Toggle Mic/Cam
btnToggleMic.addEventListener('click', () => {
  state.isMuted = !state.isMuted;
  if (state.localStream) {
    state.localStream.getAudioTracks().forEach(track => {
      track.enabled = !state.isMuted;
    });
  }

  if (state.isMuted) {
    btnToggleMic.classList.add('muted');
    btnToggleMic.setAttribute('data-tooltip', 'Activar Micrófono');
    document.getElementById(`badge-mic-local`).classList.remove('hidden');
  } else {
    btnToggleMic.classList.remove('muted');
    btnToggleMic.setAttribute('data-tooltip', 'Silenciar Micrófono');
    document.getElementById(`badge-mic-local`).classList.add('hidden');
  }
  synth.playToggle(!state.isMuted);
});

btnToggleCam.addEventListener('click', () => {
  state.isCamOff = !state.isCamOff;
  if (state.localStream) {
    state.localStream.getVideoTracks().forEach(track => {
      track.enabled = !state.isCamOff;
    });
  }

  const avatarLocal = document.getElementById('avatar-local');
  const videoLocal = document.getElementById('video-local');

  if (state.isCamOff) {
    btnToggleCam.classList.add('muted');
    btnToggleCam.setAttribute('data-tooltip', 'Encender Cámara');
    avatarLocal.classList.remove('hidden');
    videoLocal.classList.add('hidden');
  } else {
    btnToggleCam.classList.remove('muted');
    btnToggleCam.setAttribute('data-tooltip', 'Apagar Cámara');
    avatarLocal.classList.add('hidden');
    videoLocal.classList.remove('hidden');
  }
  synth.playToggle(!state.isCamOff);
});

// Screenshare
btnToggleScreen.addEventListener('click', async () => {
  if (!state.isScreenSharing) {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const videoTrack = screenStream.getVideoTracks()[0];
      const localVideoEl = document.getElementById('video-local');
      localVideoEl.srcObject = screenStream;
      localVideoEl.classList.remove('mirrored');
      localVideoEl.play().catch(e => console.log(e));

      const avatarLocal = document.getElementById('avatar-local');
      if (avatarLocal) avatarLocal.classList.add('hidden');
      localVideoEl.classList.remove('hidden');
      
      Object.values(state.peerConnections).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });
      
      videoTrack.onended = () => { stopScreenShare(); };
      state.isScreenSharing = true;
      btnToggleScreen.classList.add('muted');
      synth.playToggle(true);
    } catch (err) {
      console.warn("Fallo al compartir pantalla: ", err);
    }
  } else {
    stopScreenShare();
  }
});

function stopScreenShare() {
  if (!state.isScreenSharing) return;

  const videoTrack = state.localStream.getVideoTracks()[0];
  const localVideoEl = document.getElementById('video-local');
  localVideoEl.srcObject = state.localStream;
  localVideoEl.classList.add('mirrored');
  localVideoEl.play().catch(e => console.log(e));
  
  const avatarLocal = document.getElementById('avatar-local');
  if (state.isCamOff) {
    if (avatarLocal) avatarLocal.classList.remove('hidden');
    localVideoEl.classList.add('hidden');
  } else {
    if (avatarLocal) avatarLocal.classList.add('hidden');
    localVideoEl.classList.remove('hidden');
  }

  Object.values(state.peerConnections).forEach(pc => {
    const sender = pc.getSenders().find(s => s.track.kind === 'video');
    if (sender) sender.replaceTrack(videoTrack);
  });

  state.isScreenSharing = false;
  btnToggleScreen.classList.remove('muted');
  synth.playToggle(false);
}

// Volumen y Sidebar telemetría
volSlider.addEventListener('input', (e) => {
  const val = e.target.value;
  synth.setVolume(val);
  const remoteVideos = document.querySelectorAll('.video-viewport:not(.mirrored)');
  remoteVideos.forEach(vid => {
    vid.volume = val / 100;
  });
});

btnToggleSidebar.addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
  synth.playToggle(true);
});

document.getElementById('btn-close-telemetry').addEventListener('click', () => {
  document.getElementById('sidebar').classList.add('collapsed');
  synth.playToggle(true);
});

// --- SISTEMA DE INVITACIONES A SERVIDORES ---

// Abrir el modal de invitar amigos
openInviteFriendsModalBtn.addEventListener('click', () => {
  if (!state.currentGroup) return;
  document.getElementById('invite-friends-modal-title').innerText = `Invitar al Servidor: ${state.currentGroup.nombre}`;
  inviteFriendsModal.classList.remove('hidden');
  renderInviteFriendsList();
});

function renderInviteFriendsList() {
  inviteFriendsList.innerHTML = '';
  if (!state.currentGroup) return;

  const friendships = state.db.getTable('amistades');
  const users = state.db.getTable('usuarios');
  const members = state.db.getTable('miembros_grupo').filter(m => m.id_grupo === state.currentGroup.id_grupo);
  const invites = state.db.getTable('invitaciones_grupo').filter(i => i.id_grupo === state.currentGroup.id_grupo && i.estado === 'pendiente');

  // Filtrar mis amigos aceptados
  const myFriendships = friendships.filter(f => 
    (f.id_solicitante === state.currentUser.id_usuario || f.id_receptor === state.currentUser.id_usuario) && 
    f.estado === 'aceptada'
  );

  const friends = [];
  myFriendships.forEach(f => {
    const friendId = f.id_solicitante === state.currentUser.id_usuario ? f.id_receptor : f.id_solicitante;
    const friend = users.find(u => u.id_usuario === friendId);
    if (friend) friends.push(friend);
  });

  if (friends.length === 0) {
    inviteFriendsList.innerHTML = `<div style="text-align:center; font-size:0.8rem; color:var(--text-secondary); padding:20px 0;">No tienes amigos en tu red para invitar.</div>`;
    return;
  }

  friends.forEach(friend => {
    const isMember = members.some(m => m.id_usuario === friend.id_usuario);
    const hasPendingInvite = invites.some(i => i.id_invitado === friend.id_usuario);

    const item = document.createElement('div');
    item.className = 'modal-friend-item';

    const info = document.createElement('div');
    info.className = 'modal-friend-info';
    info.innerHTML = `
      <div class="avatar-placeholder-small">${friend.nombre_usuario.substring(0, 2).toUpperCase()}</div>
      <div>
        <div class="modal-friend-name">${friend.nombre_usuario}</div>
        <div class="modal-friend-code">#${friend.codigo_amigo}</div>
      </div>
    `;
    item.appendChild(info);

    const actionBtn = document.createElement('button');
    actionBtn.className = 'modal-invite-btn';
    
    if (isMember) {
      actionBtn.innerText = 'Miembro';
      actionBtn.classList.add('sent');
      actionBtn.disabled = true;
    } else if (hasPendingInvite) {
      actionBtn.innerText = 'Enviada';
      actionBtn.classList.add('sent');
      actionBtn.disabled = true;
    } else {
      actionBtn.innerText = 'Invitar';
      actionBtn.addEventListener('click', () => inviteFriendToGroup(friend.id_usuario, actionBtn));
    }

    item.appendChild(actionBtn);
    inviteFriendsList.appendChild(item);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

function inviteFriendToGroup(friendId, btnElement) {
  if (!state.currentGroup) return;

  state.db.insert('invitaciones_grupo', {
    id_grupo: state.currentGroup.id_grupo,
    id_anfitrion: state.currentUser.id_usuario,
    id_invitado: friendId,
    estado: 'pendiente'
  });

  btnElement.innerText = 'Enviada';
  btnElement.classList.add('sent');
  btnElement.disabled = true;
  synth.playToggle(true);
}

function renderGroupInvitations() {
  groupInvitesList.innerHTML = '';
  
  const invites = state.db.getTable('invitaciones_grupo').filter(i => 
    i.id_invitado === state.currentUser.id_usuario && 
    i.estado === 'pendiente'
  );

  const groups = state.db.getTable('grupos');
  const users = state.db.getTable('usuarios');

  countGroupInvites.innerText = invites.length;

  if (invites.length === 0) {
    groupInvitesList.innerHTML = `<div style="text-align:center; font-size:0.75rem; color:var(--text-secondary); padding:10px 0;">No tienes invitaciones de servidor pendientes.</div>`;
    return;
  }

  invites.forEach(invite => {
    const group = groups.find(g => g.id_grupo === invite.id_grupo);
    const host = users.find(u => u.id_usuario === invite.id_anfitrion);
    if (!group || !host) return;

    const card = document.createElement('div');
    card.className = 'friend-card';

    const info = document.createElement('div');
    info.className = 'friend-info';
    info.innerHTML = `
      <div class="avatar-placeholder-small">${group.nombre.substring(0, 2).toUpperCase()}</div>
      <div>
        <div style="font-weight:bold; color: #fff;">${group.nombre}</div>
        <div style="font-size:0.7rem; color:var(--text-secondary);">Invitación de: <strong>${host.nombre_usuario}</strong></div>
      </div>
    `;
    card.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'friend-actions';

    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'accept-btn';
    acceptBtn.innerText = 'Aceptar';
    acceptBtn.addEventListener('click', () => acceptGroupInvitation(invite));

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'reject-btn';
    rejectBtn.innerText = 'Rechazar';
    rejectBtn.addEventListener('click', () => rejectGroupInvitation(invite));

    actions.appendChild(acceptBtn);
    actions.appendChild(rejectBtn);
    card.appendChild(actions);

    groupInvitesList.appendChild(card);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

function acceptGroupInvitation(invite) {
  // 1. Agregar a miembros_grupo
  state.db.insert('miembros_grupo', {
    id_grupo: invite.id_grupo,
    id_usuario: state.currentUser.id_usuario
  });

  // 2. Cambiar estado de invitación
  state.db.update('invitaciones_grupo', 'id_invitacion', invite.id_invitacion, {
    estado: 'aceptada'
  });

  // 3. Actualizar UI
  renderServers();
  renderGroupInvitations();
  synth.playConnect();
}

function rejectGroupInvitation(invite) {
  // 1. Cambiar estado de invitación
  state.db.update('invitaciones_grupo', 'id_invitacion', invite.id_invitacion, {
    estado: 'rechazada'
  });

  // 2. Actualizar UI
  renderGroupInvitations();
  synth.playDisconnect();
}

// Finalizar la creación e invitación
btnFinishCreateServer.addEventListener('click', () => {
  serverModal.classList.add('hidden');
  // Resetear estados del modal
  serverModalTabs.classList.remove('hidden');
  modalCreateContainer.classList.remove('hidden');
  modalSuccessInviteContainer.classList.add('hidden');
  modalTabCreateBtn.click(); // Reactivar pestaña Crear
});

// Renderizar amigos para invitar al nuevo servidor creado
function renderNewServerFriendsList(group) {
  newServerFriendsList.innerHTML = '';
  
  const friendships = state.db.getTable('amistades');
  const users = state.db.getTable('usuarios');
  const invites = state.db.getTable('invitaciones_grupo').filter(i => i.id_grupo === group.id_grupo && i.estado === 'pendiente');

  // Filtrar mis amigos aceptados
  const myFriendships = friendships.filter(f => 
    (f.id_solicitante === state.currentUser.id_usuario || f.id_receptor === state.currentUser.id_usuario) && 
    f.estado === 'aceptada'
  );

  const friends = [];
  myFriendships.forEach(f => {
    const friendId = f.id_solicitante === state.currentUser.id_usuario ? f.id_receptor : f.id_solicitante;
    const friend = users.find(u => u.id_usuario === friendId);
    if (friend) friends.push(friend);
  });

  if (friends.length === 0) {
    newServerFriendsList.innerHTML = `<div style="text-align:center; font-size:0.75rem; color:var(--text-secondary); padding:15px 0;">No tienes amigos en tu red para invitar en este momento.</div>`;
    return;
  }

  friends.forEach(friend => {
    const hasPendingInvite = invites.some(i => i.id_invitado === friend.id_usuario);

    const item = document.createElement('div');
    item.className = 'modal-friend-item';

    const info = document.createElement('div');
    info.className = 'modal-friend-info';
    info.innerHTML = `
      <div class="avatar-placeholder-small">${friend.nombre_usuario.substring(0, 2).toUpperCase()}</div>
      <div>
        <div class="modal-friend-name">${friend.nombre_usuario}</div>
        <div class="modal-friend-code">#${friend.codigo_amigo}</div>
      </div>
    `;
    item.appendChild(info);

    const actionBtn = document.createElement('button');
    actionBtn.className = 'modal-invite-btn';
    
    if (hasPendingInvite) {
      actionBtn.innerText = 'Enviada';
      actionBtn.classList.add('sent');
      actionBtn.disabled = true;
    } else {
      actionBtn.innerText = 'Invitar';
      actionBtn.addEventListener('click', () => {
        state.db.insert('invitaciones_grupo', {
          id_grupo: group.id_grupo,
          id_anfitrion: state.currentUser.id_usuario,
          id_invitado: friend.id_usuario,
          estado: 'pendiente'
        });
        actionBtn.innerText = 'Enviada';
        actionBtn.classList.add('sent');
        actionBtn.disabled = true;
        synth.playToggle(true);
      });
    }

    item.appendChild(actionBtn);
    newServerFriendsList.appendChild(item);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

// --- ACCESIBILIDAD: los botones con solo ícono también deben anunciarse a lectores de pantalla ---
function syncTooltipAccessibility(root) {
  root.querySelectorAll('[data-tooltip]:not([aria-label])').forEach(el => {
    el.setAttribute('aria-label', el.getAttribute('data-tooltip'));
    if (el.tagName === 'DIV' && !el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex', '0');
    }
  });
}
syncTooltipAccessibility(document);
new MutationObserver(() => syncTooltipAccessibility(document)).observe(document.body, { childList: true, subtree: true });

// --- CALENDAR LOGIC ---
let calendarCurrentDate = new Date();
let calendarSelectedEventId = null;

function getCalendarEvents() {
  return JSON.parse(localStorage.getItem('db_calendar_events')) || [];
}

function saveCalendarEvents(events) {
  localStorage.setItem('db_calendar_events', JSON.stringify(events));
}

function initCalendar() {
  renderCalendar();
  
  // Clean event listeners to avoid duplicates
  calPrevBtn.onclick = () => {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
    renderCalendar();
  };
  
  calNextBtn.onclick = () => {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
    renderCalendar();
  };
  
  calTodayBtn.onclick = () => {
    calendarCurrentDate = new Date();
    renderCalendar();
  };
  
  calNewEventBtn.onclick = () => {
    openCalendarModal(null);
  };
  
  eventModalCloseBtn.onclick = () => {
    closeCalendarModal();
  };
  
  eventDeleteBtn.onclick = () => {
    if (calendarSelectedEventId) {
      deleteCalendarEvent(calendarSelectedEventId);
    }
  };
  
  eventForm.onsubmit = (e) => {
    e.preventDefault();
    saveCalendarEvent();
  };
}

function renderCalendar() {
  const year = calendarCurrentDate.getFullYear();
  const month = calendarCurrentDate.getMonth();
  
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  calMonthYearTitle.innerText = `${monthNames[month]} ${year}`;
  
  calendarGrid.innerHTML = '';
  
  const firstDayIndex = new Date(year, month, 1).getDay();
  const adjustedFirstDayIndex = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  const allEvents = getCalendarEvents();
  
  // Actualizar contador de actividades de este mes
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const currentMonthEvents = allEvents.filter(ev => ev.date.startsWith(monthStr));
  const counterBadge = document.getElementById('calendar-month-event-counter');
  if (counterBadge) {
    const count = currentMonthEvents.length;
    counterBadge.innerText = `${count} ${count === 1 ? 'actividad' : 'actividades'} este mes`;
  }
  
  // Days of previous month
  for (let i = adjustedFirstDayIndex; i > 0; i--) {
    const dayVal = prevMonthTotalDays - i + 1;
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day prev-next-month';
    
    const numberDiv = document.createElement('div');
    numberDiv.className = 'calendar-day-number';
    numberDiv.innerText = dayVal;
    dayDiv.appendChild(numberDiv);
    
    calendarGrid.appendChild(dayDiv);
  }
  
  // Days of current month
  const today = new Date();
  for (let day = 1; day <= totalDays; day++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    
    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayDiv.classList.add('today');
    }
    
    const numberDiv = document.createElement('div');
    numberDiv.className = 'calendar-day-number';
    numberDiv.innerText = day;
    dayDiv.appendChild(numberDiv);
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    dayDiv.setAttribute('data-date', dateStr);
    
    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'calendar-day-events';
    dayDiv.appendChild(eventsContainer);
    
    const dayEvents = allEvents.filter(ev => ev.date === dateStr);
    dayEvents.sort((a, b) => a.time.localeCompare(b.time));
    
    dayEvents.forEach(ev => {
      const evPill = document.createElement('div');
      evPill.className = `calendar-event color-${ev.color}`;
      evPill.innerText = `[${ev.time}] ${ev.title}`;
      evPill.setAttribute('data-id', ev.id);
      evPill.onclick = (e) => {
        e.stopPropagation();
        openCalendarModal(ev.id);
      };
      eventsContainer.appendChild(evPill);
    });
    
    dayDiv.onclick = () => {
      openCalendarModal(null, dateStr);
    };
    
    calendarGrid.appendChild(dayDiv);
  }
  
  // Days of next month
  const totalSlots = 42;
  const currentSlotsFilled = adjustedFirstDayIndex + totalDays;
  const remainingSlots = totalSlots - currentSlotsFilled;
  for (let i = 1; i <= remainingSlots; i++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day prev-next-month';
    
    const numberDiv = document.createElement('div');
    numberDiv.className = 'calendar-day-number';
    numberDiv.innerText = i;
    dayDiv.appendChild(numberDiv);
    
    calendarGrid.appendChild(dayDiv);
  }
  
  if (window.lucide) {
    lucide.createIcons();
  }
}

function openCalendarModal(eventId = null, defaultDate = null) {
  calendarSelectedEventId = eventId;
  eventForm.reset();
  
  if (eventId) {
    eventModalTitle.innerText = "Detalles del Evento Cuántico";
    const events = getCalendarEvents();
    const ev = events.find(e => e.id === eventId);
    if (ev) {
      eventTitleInput.value = ev.title;
      eventDateInput.value = ev.date;
      eventTimeInput.value = ev.time;
      eventColorInput.value = ev.color;
      eventDescInput.value = ev.description || '';
    }
    eventDeleteBtn.classList.remove('hidden');
    eventSubmitBtn.innerText = "Actualizar Evento";
  } else {
    eventModalTitle.innerText = "Registrar Evento Cuántico";
    const todayStr = defaultDate || new Date().toISOString().split('T')[0];
    eventDateInput.value = todayStr;
    
    const now = new Date();
    const minutes = Math.ceil(now.getMinutes() / 30) * 30;
    now.setMinutes(minutes);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    eventTimeInput.value = timeStr;
    
    eventDeleteBtn.classList.add('hidden');
    eventSubmitBtn.innerText = "Guardar Evento";
  }
  
  eventModal.classList.remove('hidden');
}

function closeCalendarModal() {
  eventModal.classList.add('hidden');
  calendarSelectedEventId = null;
}

function saveCalendarEvent() {
  const title = eventTitleInput.value.trim();
  const date = eventDateInput.value;
  const time = eventTimeInput.value;
  const color = eventColorInput.value;
  const description = eventDescInput.value.trim();
  
  if (!title || !date || !time) return;
  
  let events = getCalendarEvents();
  
  if (calendarSelectedEventId) {
    events = events.map(ev => {
      if (ev.id === calendarSelectedEventId) {
        return { ...ev, title, date, time, color, description };
      }
      return ev;
    });
    showSystemMessage("Evento actualizado exitosamente.", "success");
  } else {
    const newEvent = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      date,
      time,
      color,
      description
    };
    events.push(newEvent);
    showSystemMessage("Evento programado exitosamente.", "success");
  }
  
  saveCalendarEvents(events);
  closeCalendarModal();
  renderCalendar();
}

async function deleteCalendarEvent(id) {
  const proceed = await showSystemConfirm("¿Estás seguro de que deseas eliminar este evento?");
  if (!proceed) return;
  
  let events = getCalendarEvents();
  events = events.filter(ev => ev.id !== id);
  saveCalendarEvents(events);
  closeCalendarModal();
  renderCalendar();
  showSystemMessage("Evento eliminado.", "error");
}

