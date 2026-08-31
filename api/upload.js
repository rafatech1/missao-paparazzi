// api/upload.js
// Recebe uma foto (base64) e salva no Vercel Blob Storage — nada de Google
// Cloud, OAuth ou service account. O token de acesso (BLOB_READ_WRITE_TOKEN)
// é injetado automaticamente pela Vercel quando o projeto tem um Blob Store
// conectado (Storage → Create Database → Blob no painel da Vercel).

const { put } = require('@vercel/blob');

function sanitizeName(name) {
  return String(name || '')
    .trim()
    .slice(0, 40)
    .replace(/[\r\n]/g, ' ');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const body = req.body || {};
    const { challengeId, name, photo } = body;

    if (challengeId === undefined || challengeId === null || !photo) {
      res.status(400).json({ error: 'dados_incompletos' });
      return;
    }

    const chId = parseInt(challengeId, 10);
    if (isNaN(chId) || chId < 0 || chId > 19) {
      res.status(400).json({ error: 'desafio_invalido' });
      return;
    }

    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(photo);
    if (!match) {
      res.status(400).json({ error: 'foto_invalida' });
      return;
    }
    const mimeType = match[1];
    const base64Data = match[2];
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';

    // Guarda contra fotos gigantes (base64 ~ 1.37x o binário; ~8MB base64 ~ 5.8MB binário)
    if (base64Data.length > 8000000) {
      res.status(413).json({ error: 'foto_grande_demais' });
      return;
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const cleanName = sanitizeName(name);
    const ts = Date.now();
    const rid = Math.random().toString(36).slice(2, 8);
    // Metadados (desafio, nome, data) codificados no próprio nome do arquivo —
    // não precisa de banco de dados pra guardar isso separadamente.
    const filename =
      'wg__' + ts + '__ch' + chId + '__' + encodeURIComponent(cleanName || 'convidado') + '__' + rid + '.' + ext;

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: false,
    });

    res.status(200).json({
      ok: true,
      id: blob.pathname,
      url: blob.url,
      challengeId: chId,
      name: cleanName,
      ts,
    });
  } catch (err) {
    console.error('upload error:', err);
    res.status(500).json({ error: 'erro_interno', message: (err && err.message) || String(err) });
  }
};

module.exports.config = { api: { bodyParser: { sizeLimit: '10mb' } } };
