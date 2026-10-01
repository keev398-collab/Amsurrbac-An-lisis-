const crypto = require('crypto');
const { Redis } = require('@upstash/redis');

// Funciona con la integración Upstash/Vercel KV (cualquiera de los dos juegos de variables)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  automaticDeserialization: false, // guardamos/leemos el JSON como texto, tal como lo espera el front
});

const COOKIE = 'club_sesion';
const DURACION = 60 * 60 * 24 * 7; // 7 días

function firmar(texto) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET || '').update(texto).digest('base64url');
}

function iguales(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function crearCookie() {
  const exp = Math.floor(Date.now() / 1000) + DURACION;
  const payload = `editor.${exp}`;
  const valor = `${payload}.${firmar(payload)}`;
  return `${COOKIE}=${valor}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${DURACION}`;
}

function cookieBorrada() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function esEditor(req) {
  if (!process.env.SESSION_SECRET) return false;
  const cookies = (req.headers.cookie || '').split(';').map(c => c.trim());
  const c = cookies.find(c => c.startsWith(COOKIE + '='));
  if (!c) return false;
  const valor = c.slice(COOKIE.length + 1);
  const partes = valor.split('.');
  if (partes.length !== 3) return false;
  const payload = `${partes[0]}.${partes[1]}`;
  if (!iguales(partes[2], firmar(payload))) return false;
  return partes[0] === 'editor' && Number(partes[1]) > Math.floor(Date.now() / 1000);
}

module.exports = { redis, crearCookie, cookieBorrada, esEditor, iguales };
