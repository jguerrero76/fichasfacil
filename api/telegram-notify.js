export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return response.status(503).json({ ok: false, error: 'Telegram is not configured' });
  }

  let body = request.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  const allowedActivities = new Set([
    'Sumas', 'Restas', 'Multiplicaciones', 'Divisiones', 'Problemas',
    'Comprensión lectora', 'Copiado', 'Ortografía', 'Lógica', 'Horas y reloj',
    'Dinero', 'Medidas', 'Fracciones', 'Geometría', 'Series', 'Vocabulario',
    'Caligrafía', 'Ficha mixta', 'Ficha diaria'
  ]);
  const allowedDifficulties = new Set(['Inicial', 'Medio', 'Avanzado']);
  const activity = typeof body.activity === 'string' ? body.activity : '';
  const difficulty = typeof body.difficulty === 'string' ? body.difficulty : '';
  const count = Number.isInteger(body.count) ? body.count : null;
  if (!allowedActivities.has(activity) || !allowedDifficulties.has(difficulty) || count === null || count < 1 || count > 100) {
    return response.status(400).json({ ok: false, error: 'Invalid notification data' });
  }

  const text = [
    '📚 Nueva ficha generada en FichasFacil',
    `Actividad: ${activity}`,
    `Dificultad: ${difficulty}`,
    `Ejercicios: ${count}`
  ].join('\n');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let telegramResponse;
    try {
      telegramResponse = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!telegramResponse.ok) return response.status(502).json({ ok: false, error: 'Telegram rejected the message' });
    return response.status(204).end();
  } catch {
    return response.status(502).json({ ok: false, error: 'Telegram request failed' });
  }
}
