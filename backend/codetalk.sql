-- =====================================================================
-- ESQUEMA DE BASE DE DATOS: "CodeTalk" (Discord + Videollamadas + Código)
-- Motor: MySQL 8.0+
-- Versión simplificada: solo lo pedido, sin extras
-- =====================================================================

CREATE DATABASE IF NOT EXISTS codetalk
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE codetalk;

-- =====================================================================
-- 1. USUARIOS Y LOGIN
-- =====================================================================
CREATE TABLE usuarios (
    id_usuario        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre_usuario     VARCHAR(32)  NOT NULL,
    codigo_amigo        VARCHAR(8)   NOT NULL UNIQUE,   -- código único para que otros te agreguen
    correo             VARCHAR(120) NOT NULL UNIQUE,
    contrasena_hash      VARCHAR(255) NOT NULL,
    fecha_creacion       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================================
-- 2. AMISTADES (agregar personas por código de amigo)
-- =====================================================================
CREATE TABLE amistades (
    id_amistad       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_solicitante     BIGINT UNSIGNED NOT NULL,
    id_receptor        BIGINT UNSIGNED NOT NULL,
    estado            ENUM('pendiente','aceptada') NOT NULL DEFAULT 'pendiente',
    fecha_solicitud     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_solicitante) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_receptor)    REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    UNIQUE KEY uq_par_amistad (id_solicitante, id_receptor)
) ENGINE=InnoDB;

-- =====================================================================
-- 3. GRUPOS (servidores) Y MIEMBROS
-- =====================================================================
CREATE TABLE grupos (
    id_grupo           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL,
    id_propietario        BIGINT UNSIGNED NOT NULL,
    codigo_invitacion      VARCHAR(10) NOT NULL UNIQUE,
    fecha_creacion         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_propietario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE miembros_grupo (
    id_miembro        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_grupo            BIGINT UNSIGNED NOT NULL,
    id_usuario           BIGINT UNSIGNED NOT NULL,
    fecha_union           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_grupo)   REFERENCES grupos(id_grupo) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    UNIQUE KEY uq_miembro_grupo (id_grupo, id_usuario)
) ENGINE=InnoDB;

-- =====================================================================
-- 4. CANALES DE CHAT (dentro de un grupo)
-- =====================================================================
CREATE TABLE canales (
    id_canal          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_grupo            BIGINT UNSIGNED NOT NULL,
    nombre              VARCHAR(80) NOT NULL,
    tipo                ENUM('texto','voz','video','codigo') NOT NULL DEFAULT 'texto',
    fecha_creacion        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_grupo) REFERENCES grupos(id_grupo) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE mensajes (
    id_mensaje       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_canal           BIGINT UNSIGNED NOT NULL,
    id_usuario          BIGINT UNSIGNED NOT NULL,
    contenido          TEXT NOT NULL,
    fecha_envio         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_canal)  REFERENCES canales(id_canal) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 5. LLAMADAS (audio / video)
-- =====================================================================
CREATE TABLE llamadas (
    id_llamada        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_canal            BIGINT UNSIGNED NOT NULL,
    tipo                ENUM('audio','video') NOT NULL DEFAULT 'video',
    fecha_inicio          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin            DATETIME DEFAULT NULL,
    FOREIGN KEY (id_canal) REFERENCES canales(id_canal) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE participantes_llamada (
    id_participante    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_llamada           BIGINT UNSIGNED NOT NULL,
    id_usuario            BIGINT UNSIGNED NOT NULL,
    fecha_union            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_salida           DATETIME DEFAULT NULL,
    FOREIGN KEY (id_llamada) REFERENCES llamadas(id_llamada) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 6. CÓDIGO COMPARTIDO EN VIVO
-- =====================================================================
CREATE TABLE sesiones_codigo (
    id_sesion         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_canal            BIGINT UNSIGNED NOT NULL,
    id_usuario_creador    BIGINT UNSIGNED NOT NULL,
    fecha_creacion        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_canal) REFERENCES canales(id_canal) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario_creador) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE participantes_sesion_codigo (
    id_participante    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_sesion            BIGINT UNSIGNED NOT NULL,
    id_usuario            BIGINT UNSIGNED NOT NULL,
    fecha_union            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_sesion)  REFERENCES sesiones_codigo(id_sesion) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    UNIQUE KEY uq_part_sesion (id_sesion, id_usuario)
) ENGINE=InnoDB;

CREATE TABLE archivos_codigo (
    id_archivo          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_sesion             BIGINT UNSIGNED NOT NULL,
    nombre_archivo         VARCHAR(150) NOT NULL,       -- ej: "main.py"
    lenguaje              VARCHAR(30) NOT NULL,          -- python, java, javascript, etc.
    contenido             LONGTEXT NOT NULL,
    fecha_actualizacion     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_sesion) REFERENCES sesiones_codigo(id_sesion) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 7. SALDO Y COBRO POR LLAMADAS (después de 10 min)
-- =====================================================================
CREATE TABLE billeteras (
    id_billetera      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario          BIGINT UNSIGNED NOT NULL UNIQUE,
    saldo              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CHECK (saldo >= 0)
) ENGINE=InnoDB;

-- Tarifa: minutos gratis y precio por minuto extra
CREATE TABLE tarifas_llamada (
    id_tarifa          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    minutos_gratis        INT UNSIGNED NOT NULL DEFAULT 10,
    precio_por_minuto      DECIMAL(6,2) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE transacciones (
    id_transaccion       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario             BIGINT UNSIGNED NOT NULL,
    tipo                  ENUM('recarga','cobro_llamada') NOT NULL,
    monto                 DECIMAL(10,2) NOT NULL,
    id_llamada_relacionada   BIGINT UNSIGNED DEFAULT NULL,
    fecha_transaccion        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_llamada_relacionada) REFERENCES llamadas(id_llamada) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================================
-- 8. RECARGAS CON BINANCE PAY
-- =====================================================================
CREATE TABLE pagos_binance (
    id_pago             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_transaccion         BIGINT UNSIGNED NOT NULL,
    id_orden_binance        VARCHAR(64) NOT NULL UNIQUE,   -- prepayId / merchantTradeNo de Binance
    moneda_cripto          VARCHAR(10) NOT NULL,            -- ej. USDT
    monto_cripto           DECIMAL(20,8) NOT NULL,
    estado_binance          ENUM('PENDING','PAID','CANCELED','EXPIRED') NOT NULL DEFAULT 'PENDING',
    fecha_creacion           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_transaccion) REFERENCES transacciones(id_transaccion) ON DELETE CASCADE
) ENGINE=InnoDB;