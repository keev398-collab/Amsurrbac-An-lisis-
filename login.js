const { redis, crearCookie, iguales } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const U = process.env.EDITOR_USER;
  const P = process.env.EDITOR_PASSWORD;
  if (!U || !P || !process.env.SESSION_SECRET) {
    console.error('Faltan variables de entorno: EDITOR_USER, EDITOR_PASSWORD o SESSION_SECRET');
    return res.status(500).json({ error: 'Servidor sin configurar' });
  }

  // Límite de intentos por IP: 8 cada 10 minutos
  try {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'desconocida';
    const key = `rl:login:${ip}`;
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, 600);
    if (n > 8) return res.status(429).json({ error: 'Demasiados intentos' });
  } catch (e) {
    console.error('Rate limit (Redis) falló:', e.message);
  }

  const { usuario = '', clave = '' } = req.body || {};
  const okU = iguales(usuario, U);
  const okP = iguales(clave, P);
  if (okU && okP) {
    res.setHeader('Set-Cookie', crearCookie());
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ error: 'Credenciales incorrectas' });
};
