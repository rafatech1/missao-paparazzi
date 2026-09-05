// api/photos.js
// Lista as fotos já enviadas, lendo direto do Vercel Blob Storage.
// Os metadados (desafio, nome, data) vêm decodificados do nome do arquivo.

const { list } = require('@vercel/blob');

// Formato: wg__<timestamp>__ch<challengeId>__<nomeCodificado>__<idAleatorio>.<ext>
const VIDEO_EXTS = ['mp4', 'mov', 'webm', 'm4v', '3gp'];

function parsePathname(name) {
  const m = /^wg__(\d+)__ch(\d+)__(.+)__([a-z0-9]+)\.(jpg|jpeg|png|mp4|mov|webm|m4v|3gp)$/i.exec(name);
  if (!m) return null;
  let decodedName = '';
  try {
    decodedName = decodeURIComponent(m[3]);
  } catch (e) {
    decodedName = m[3];
  }
  const ext = m[5].toLowerCase();
  return {
    ts: parseInt(m[1], 10),
    challengeId: parseInt(m[2], 10),
    name: decodedName,
    type: VIDEO_EXTS.indexOf(ext) !== -1 ? 'video' : 'image',
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const result = await list({ prefix: 'wg__', limit: 1000 });
    const photos = [];
    for (const blob of result.blobs) {
      const meta = parsePathname(blob.pathname);
      if (!meta) continue;
      photos.push({
        id: blob.pathname,
        challengeId: meta.challengeId,
        name: meta.name,
        ts: meta.ts,
        type: meta.type,
        url: blob.url,
        fullUrl: blob.url,
      });
    }

    res.status(200).json({ ok: true, photos });
  } catch (err) {
    console.error('photos error:', err);
    res.status(500).json({ error: 'erro_interno', message: (err && err.message) || String(err) });
  }
};
