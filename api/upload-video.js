// api/upload-video.js
// Vídeos não cabem no limite de 4.5MB do corpo das funções serverless da
// Vercel (mesmo no plano pago), então usamos o "client upload" do Vercel
// Blob: o navegador do convidado manda o arquivo DIRETO pro Blob Storage,
// sem passar pelo corpo desta função. Esta função só faz duas coisas:
//  1) autoriza o upload (confere se o nome do arquivo e o tamanho batem
//     com o esperado) e devolve um token de upload de curta duração;
//  2) recebe um aviso da própria Vercel quando o upload termina (não
//     precisamos fazer nada além de logar, pois os metadados já estão
//     codificados no nome do arquivo — igual às fotos).

const { handleUpload } = require('@vercel/blob/client');
const { CHALLENGE_COUNT, MAX_PER_CHALLENGE, countForChallenge } = require('./_lib/media');

// ~150MB dá folga confortável pra um vídeo de até 15s gravado num celular
// (mesmo em 4K), sem deixar o armazenamento gratuito estourar rápido.
const MAX_VIDEO_BYTES = 150 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'video/3gpp',
];

// Mesmo formato de nome usado pelas fotos: wg__<timestamp>__ch<challengeId>__<nome>__<id>.<ext>
function parseVideoPathname(pathname) {
  return /^wg__(\d+)__ch(\d+)__(.+)__([a-z0-9]+)\.(mp4|mov|webm|m4v|3gp)$/i.exec(pathname);
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
    const body = req.body;

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const match = parseVideoPathname(pathname);
        if (!match) {
          throw new Error('nome_de_arquivo_invalido');
        }
        const chId = parseInt(match[2], 10);
        if (isNaN(chId) || chId < 0 || chId >= CHALLENGE_COUNT) {
          throw new Error('desafio_invalido');
        }
        const jaEnviados = await countForChallenge(chId);
        if (jaEnviados >= MAX_PER_CHALLENGE) {
          throw new Error('desafio_completo');
        }
        return {
          allowedContentTypes: ALLOWED_VIDEO_TYPES,
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          addRandomSuffix: false,
          tokenPayload: pathname,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('vídeo salvo no Blob:', blob.pathname);
      },
    });

    res.status(200).json(jsonResponse);
  } catch (err) {
    console.error('upload-video error:', err);
    res.status(400).json({ error: 'erro_upload_video', message: (err && err.message) || String(err) });
  }
};
