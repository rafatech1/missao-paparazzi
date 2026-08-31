// api/photos.js
// Lista as fotos já enviadas, lendo direto da pasta do Google Drive.
// Os metadados (desafio, nome, data) vêm decodificados do nome do arquivo.

const { OAuth2Client } = require('google-auth-library');

// Contas de serviço não têm cota de armazenamento própria no Drive, então
// usamos OAuth com a conta pessoal do Google (via refresh token gerado uma
// vez com scripts/get-refresh-token.js) — os arquivos ficam no Drive normal
// da pessoa, dentro do espaço que ela já tem.
function getClient() {
  const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim();
  const refreshToken = (process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '').trim();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Credenciais OAuth do Google não configuradas (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN).'
    );
  }
  const client = new OAuth2Client(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

// Formato: wg__<timestamp>__ch<challengeId>__<nomeCodificado>__<idAleatorio>.<ext>
function parseFilename(name) {
  const m = /^wg__(\d+)__ch(\d+)__(.+)__([a-z0-9]+)\.(jpg|jpeg|png)$/i.exec(name);
  if (!m) return null;
  let decodedName = '';
  try {
    decodedName = decodeURIComponent(m[3]);
  } catch (e) {
    decodedName = m[3];
  }
  return {
    ts: parseInt(m[1], 10),
    challengeId: parseInt(m[2], 10),
    name: decodedName,
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID não configurada.');

    const client = getClient();
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const fields = encodeURIComponent('files(id,name,createdTime)');
    const orderBy = encodeURIComponent('createdTime desc');
    const url =
      'https://www.googleapis.com/drive/v3/files?q=' +
      q +
      '&fields=' +
      fields +
      '&orderBy=' +
      orderBy +
      '&pageSize=1000';

    const result = await client.request({ url, method: 'GET' });
    const files = (result.data && result.data.files) || [];

    const photos = [];
    for (const f of files) {
      const meta = parseFilename(f.name);
      if (!meta) continue;
      photos.push({
        id: f.id,
        challengeId: meta.challengeId,
        name: meta.name,
        ts: meta.ts,
        url: 'https://drive.google.com/thumbnail?id=' + f.id + '&sz=w800',
        fullUrl: 'https://drive.google.com/uc?export=view&id=' + f.id,
      });
    }

    res.status(200).json({
      ok: true,
      photos,
      folderUrl: 'https://drive.google.com/drive/folders/' + folderId,
    });
  } catch (err) {
    console.error('photos error:', err);
    res.status(500).json({ error: 'erro_interno', message: (err && err.message) || String(err) });
  }
};
