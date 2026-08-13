const express = require('express');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos del cliente (sin resolver "/" automáticamente a index.html,
// para poder mostrar primero la landing y dejar la app en /app)
app.use(express.static(__dirname, { index: false }));

// Landing page en la raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'));
});

// Aplicación (login / chat / videollamadas / editor)
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Configuración de conexión de base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'codetalk'
};

let pool;

async function initDB() {
  try {
    pool = mysql.createPool(dbConfig);
    // Realizar una consulta de ping rápido
    await pool.query('SELECT 1');
    console.log(`Conectado exitosamente al pool de MySQL en ${dbConfig.host}:${dbConfig.port} (esquema: ${dbConfig.database})`);
    
    // Crear tabla de invitaciones de grupo si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invitaciones_grupo (
        id_invitacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id_grupo BIGINT UNSIGNED NOT NULL,
        id_anfitrion BIGINT UNSIGNED NOT NULL,
        id_invitado BIGINT UNSIGNED NOT NULL,
        estado ENUM('pendiente', 'aceptada', 'rechazada') NOT NULL DEFAULT 'pendiente',
        fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_grupo) REFERENCES grupos(id_grupo) ON DELETE CASCADE,
        FOREIGN KEY (id_anfitrion) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (id_invitado) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    
    // Verificar conexión y sembrar datos si es necesario
    await seedDatabaseIfNeeded();
  } catch (err) {
    console.error('No se pudo conectar a la base de datos MySQL:', err.message);
    console.warn('--------------------------------------------------------------------------------');
    console.warn('ATENCIÓN: El servidor de CodeTalk seguirá funcionando en MODO CACHÉ LOCAL.');
    console.warn('Por favor, edite su contraseña de MySQL en el archivo .env y reinicie el servidor.');
    console.warn('--------------------------------------------------------------------------------');
    pool = null;
  }
}

// Sembrado automático de base de datos
async function seedDatabaseIfNeeded() {
  const [rows] = await pool.query('SELECT COUNT(*) as count FROM usuarios');
  const count = rows[0].count;
  
  if (count > 0) {
    console.log('La base de datos ya contiene registros. Omitiendo sembrado de datos.');
    return;
  }

  console.log('Detectada base de datos vacía. Sembrando datos iniciales...');

  // 1. Usuarios
  await pool.query(`INSERT INTO usuarios (id_usuario, nombre_usuario, codigo_amigo, correo, contrasena_hash) VALUES 
    (1, 'Neuron_Link', 'C0DE0001', 'neuron@codetalk.io', 'password123'),
    (2, 'CyberNet_99', 'C0DE0002', 'cyber@codetalk.io', 'password123'),
    (3, 'Aegis_Core', 'C0DE0003', 'aegis@codetalk.io', 'password123')
  `);

  // 2. Amistades
  await pool.query(`INSERT INTO amistades (id_amistad, id_solicitante, id_receptor, estado) VALUES 
    (1, 2, 1, 'pendiente'),
    (2, 3, 1, 'aceptada')
  `);

  // 3. Grupos
  await pool.query(`INSERT INTO grupos (id_grupo, nombre, id_propietario, codigo_invitacion) VALUES 
    (1, 'SISTEMAS_QUANTUM', 3, 'CT-RED-990')
  `);

  // 4. Miembros de grupo
  await pool.query(`INSERT INTO miembros_grupo (id_miembro, id_grupo, id_usuario) VALUES 
    (1, 1, 1),
    (2, 1, 3)
  `);

  // 5. Canales
  await pool.query(`INSERT INTO canales (id_canal, id_grupo, nombre, tipo) VALUES 
    (1, 1, 'general-texto', 'texto'),
    (2, 1, 'audio-enlace', 'voz'),
    (3, 1, 'video-reunion', 'video'),
    (4, 1, 'code-colab', 'codigo')
  `);

  // 6. Mensajes
  await pool.query(`INSERT INTO mensajes (id_mensaje, id_canal, id_usuario, contenido) VALUES 
    (1, 1, 3, 'Enlace encriptado nominal. Consola de CodeTalk activa.')
  `);

  // 7. Billeteras
  await pool.query(`INSERT INTO billeteras (id_billetera, id_usuario, saldo) VALUES 
    (1, 1, 25.00),
    (2, 2, 15.00),
    (3, 3, 50.00)
  `);

  // 8. Tarifas de llamada
  await pool.query(`INSERT INTO tarifas_llamada (id_tarifa, minutos_gratis, precio_por_minuto) VALUES 
    (1, 10, 0.50)
  `);

  console.log('¡Sembrado de base de datos MySQL completado con éxito!');
}

// Helper para convertir fechas ISO a formato MySQL
function formatSQLValue(val) {
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
    return val.slice(0, 19).replace('T', ' ');
  }
  return val;
}

// Endpoint: Obtener base de datos completa para sincronización
app.get('/api/db', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database connection pool is inactive' });
  }
  const tables = [
    'usuarios',
    'amistades',
    'grupos',
    'miembros_grupo',
    'canales',
    'mensajes',
    'llamadas',
    'participantes_llamada',
    'sesiones_codigo',
    'participantes_sesion_codigo',
    'archivos_codigo',
    'billeteras',
    'tarifas_llamada',
    'transacciones',
    'pagos_binance',
    'invitaciones_grupo'
  ];

  try {
    const data = {};
    for (let table of tables) {
      const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
      
      // Convertir fechas a strings ISO
      data[table] = rows.map(row => {
        const cleaned = {};
        for (let col in row) {
          const val = row[col];
          if (val instanceof Date) {
            cleaned[col] = val.toISOString();
          } else {
            cleaned[col] = val;
          }
        }
        return cleaned;
      });
    }
    res.json(data);
  } catch (error) {
    console.error('Error al descargar estado de MySQL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Insertar registro (Write-Through)
app.post('/api/table/:name', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database connection pool is inactive' });
  }
  const table = req.params.name;
  const row = req.body;
  
  const keys = Object.keys(row);
  if (keys.length === 0) {
    return res.status(400).json({ error: 'Fila vacía no permitida' });
  }

  const values = keys.map(k => formatSQLValue(row[k]));
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;

  try {
    const [result] = await pool.execute(sql, values);
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error(`Error al insertar en MySQL (tabla: ${table}):`, error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Actualizar registro (Write-Through)
app.put('/api/table/:name/:idField/:idVal', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database connection pool is inactive' });
  }
  const { name: table, idField, idVal } = req.params;
  const fields = req.body;

  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.json({ success: true });
  }

  const values = keys.map(k => formatSQLValue(fields[k]));
  const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
  const sql = `UPDATE \`${table}\` SET ${setClause} WHERE \`${idField}\` = ?`;

  try {
    await pool.execute(sql, [...values, idVal]);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error al actualizar en MySQL (tabla: ${table}):`, error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Eliminar registro (Write-Through)
app.delete('/api/table/:name/:idField/:idVal', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database connection pool is inactive' });
  }
  const { name: table, idField, idVal } = req.params;
  const sql = `DELETE FROM \`${table}\` WHERE \`${idField}\` = ?`;

  try {
    await pool.execute(sql, [idVal]);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error al eliminar en MySQL (tabla: ${table}):`, error);
    res.status(500).json({ error: error.message });
  }
});

// --- EJECUCIÓN DE CÓDIGO EN TIEMPO REAL (canal de chat colaborativo) ---
// Adaptado de https://github.com/Kaur-Osu/RealTimeCodeExecution : usa Judge0 CE
// (instancia pública, sin API key) para compilar/ejecutar el código enviado en el chat.
const JUDGE0_URL = 'https://ce.judge0.com';
const CODE_LANGUAGE_IDS = {
  python: 71,
  javascript: 63,
  java: 62,
  cpp: 54,
  c: 50
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.post('/api/code/run', async (req, res) => {
  const { code, language, stdin } = req.body || {};
  const normalizedLanguage = (language || 'python').toLowerCase();
  const languageId = CODE_LANGUAGE_IDS[normalizedLanguage];

  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, error: 'No hay código para ejecutar.' });
  }
  if (!languageId) {
    return res.status(400).json({ success: false, error: `Lenguaje no soportado: ${language}` });
  }

  try {
    const submission = await axios.post(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
      { language_id: languageId, source_code: code, stdin: stdin || '' },
      { timeout: 10000 }
    );

    const token = submission.data.token;
    let result;
    let attempts = 0;

    while (attempts < 20) {
      await sleep(500);
      const response = await axios.get(
        `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`,
        { timeout: 10000 }
      );
      result = response.data;
      if (result.status.id !== 1 && result.status.id !== 2) break; // ni "In Queue" ni "Processing"
      attempts++;
    }

    res.json({
      success: true,
      stdout: result.stdout ?? '',
      stderr: result.stderr,
      compile_output: result.compile_output,
      status: result.status,
      time: result.time,
      memory: result.memory,
      language: normalizedLanguage
    });
  } catch (error) {
    console.error('Error al ejecutar código vía Judge0:', error.message);
    res.status(502).json({
      success: false,
      error: 'El servicio de ejecución remota no está disponible en este momento. Intenta de nuevo más tarde.'
    });
  }
});

// --- LLAMADAS Y VIDEOLLAMADAS GRATUITAS (WebRTC) ---
// Antes la señalización usaba BroadcastChannel, que solo conecta pestañas del MISMO navegador.
// Ahora usamos Socket.IO (autoalojado en este mismo servidor, sin costo) para que dos
// dispositivos/usuarios distintos puedan intercambiar las ofertas SDP y candidatos ICE
// necesarios para establecer la llamada peer-to-peer real.

// Configuración ICE: servidores STUN públicos y gratuitos de Google/Cloudflare (sin API key,
// suficientes en la mayoría de redes). Si se define un TURN propio en el .env (recomendado
// para redes muy restrictivas / NAT simétrico), se añade automáticamente. Un TURN gratuito
// se puede obtener creando una cuenta gratis en https://www.metered.ca/tools/openrelay/ o
// autoalojando "coturn"; mientras no esté configurado, la app funciona solo con STUN.
app.get('/api/ice-config', (req, res) => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ];

  if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL
    });
  }

  res.json({ iceServers });
});

const io = new SocketIOServer(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  // El cliente se une a una "sala" = el canal de voz/video al que entró
  socket.on('call:join', ({ room, senderId }) => {
    if (!room) return;
    socket.join(room);
    socket.data.room = room;
    socket.data.senderId = senderId;
  });

  // Reenvía cualquier mensaje de señalización (peer-join, oferta/respuesta SDP, candidatos ICE)
  // a los demás miembros de la sala, sin tocar su contenido.
  socket.on('call:signal', ({ room, ...payload }) => {
    if (!room) return;
    socket.to(room).emit('call:signal', payload);
  });

  socket.on('call:leave', ({ room }) => {
    if (room) socket.leave(room);
  });

  // Si el usuario cierra la pestaña/pierde conexión sin avisar, notificamos su salida igual
  socket.on('disconnect', () => {
    const { room, senderId } = socket.data;
    if (room && senderId) {
      socket.to(room).emit('call:signal', { type: 'peer-leave', senderId });
    }
  });
});

// Iniciar servidor
server.listen(PORT, async () => {
  console.log(`Servidor de CodeTalk activo en http://localhost:${PORT}`);
  await initDB();
});
