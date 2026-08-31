// api/upload.js
// Recebe uma foto (base64) e salva no Google Drive, dentro da pasta configurada.
// Não usa banco de dados: os metadados (desafio, nome, data) ficam codificados
// no próprio nome do arquivo salvo no Drive.

const { JWT } = require('google-auth-library');

function getClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
  const key = rawKey.replace(/\\n/g, '\n');
  if (!email || !key) {
    throw new Error('Credenciais do Google não configuradas (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY).');
  }
  return new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

function sanitizeName(name) {
  return String(name || '')
    .trim()
    .slice(0, 40)
    .replace(/[\r\n]/g, ' ');
}

async function uploadToDrive(client, { filename, mimeType, base64Data, folderId }) {
  const boundary = 'wgboundary' + Date.now() + Math.random().toString(36).slice(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metadata = { name: filename, parents: [folderId] };

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data +
    closeDelim;

  const res = await client.request({
    url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
    data: multipartBody,
  });
  return res.data;
}

async function makePublic(client, fileId) {
  await client.request({
    url: `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    method: 'POST',
    data: { role: 'reader', type: 'anyone' },
  });
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
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID não configurada.');

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

    const cleanName = sanitizeName(name);
    const ts = Date.now();
    const rid = Math.random().toString(36).slice(2, 8);
    const filename =
      'wg__' + ts + '__ch' + chId + '__' + encodeURIComponent(cleanName || 'convidado') + '__' + rid + '.' + ext;

    const client = getClient();
    const uploaded = await uploadToDrive(client, { filename, mimeType, base64Data, folderId });
    await makePublic(client, uploaded.id);

    res.status(200).json({
      ok: true,
      id: uploaded.id,
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
