/** Datos de cobro del proyecto. Todo es público por naturaleza (un Pay ID y una
 * dirección de depósito se comparten para recibir), así que vive en el bundle y
 * no en el backend.
 *
 * ⚠️ SUSTITUYE los placeholders por tus datos reales de Binance. Una dirección
 * equivocada significa fondos perdidos de forma irreversible: cópialas desde la
 * app de Binance (Depositar → elegir red → Copiar dirección), no a mano.
 *
 * Las clases de Tailwind se escriben completas (no interpoladas) para que el
 * compilador las detecte al escanear el código. */

/** Binance → Pay → tu ID de pago (Pay ID), visible bajo tu nombre */
export const BINANCE_PAY_ID = "000000000";
/** Nickname de Binance Pay: sirve para verificar que se paga a la cuenta correcta */
export const BINANCE_NICKNAME = "nexa_dev";

/** QR de cobro exportado desde la app de Binance (Pay → Recibir → Guardar
 * imagen), colocado en frontend/public/donaciones/. Si el archivo no existe la
 * tarjeta simplemente no muestra imagen: no se genera un QR falso porque el de
 * Binance Pay lleva un payload propio que no se puede reconstruir desde el ID. */
export const BINANCE_PAY_QR = "/donaciones/binance-pay-qr.png";

export type Wallet = {
  id: string;
  /** activo que acepta esta dirección */
  asset: string;
  /** red exacta tal y como la nombra Binance al retirar */
  network: string;
  address: string;
  /** clases completas del acento de la tarjeta */
  text: string;
  dot: string;
};

export const WALLETS: Wallet[] = [
  {
    id: "usdt-bep20",
    asset: "USDT",
    network: "BEP20 · BNB Smart Chain",
    address: "0x0000000000000000000000000000000000000000",
    text: "text-amber",
    dot: "bg-amber",
  },
  {
    id: "usdt-trc20",
    asset: "USDT",
    network: "TRC20 · Tron",
    address: "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    text: "text-green",
    dot: "bg-green",
  },
  {
    id: "btc",
    asset: "BTC",
    network: "Bitcoin",
    address: "bc1qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    text: "text-purple",
    dot: "bg-purple",
  },
];
