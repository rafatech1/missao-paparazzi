// api/_lib/media.js
// Coisas compartilhadas entre api/upload.js e api/upload-video.js: contar
// quantos envios um desafio já tem (lendo direto do Blob Storage, já que não
// tem banco de dados) e os limites do jogo.

const { list } = require('@vercel/blob');

// Precisa bater com CHALLENGES.length em public/index.html.
const CHALLENGE_COUNT = 30;

// Depois de atingir esse número, o desafio fica "completo" e para de aceitar
// novos envios. Atenção: como não tem banco de dados nem lock, dois envios
// simultâneos pro mesmo desafio no exato mesmo instante podem, em raríssimos
// casos, passar os dois — não é um limite 100% à prova de corrida, só o
// suficiente pra manter os desafios equilibrados num casamento.
const MAX_PER_CHALLENGE = 5;

// Índices de desafios sem limite de envio. "Registre sua presença" (índice 4)
// fica de fora do limite de 3 de propósito, pra todo mundo poder marcar
// presença. Precisa bater com UNLIMITED_CHALLENGES em public/index.html.
const UNLIMITED_CHALLENGES = [4];

// Depois desse instante (fim do dia 13/09/2026 no horário de Brasília), o
// site vira a retrospectiva e para de aceitar fotos/vídeos novos. Precisa
// bater com RETRO_CUTOFF_MS em public/index.html.
const SUBMISSIONS_CUTOFF_MS = new Date('2026-09-14T00:00:00-03:00').getTime();

function submissionsClosed() {
  return Date.now() >= SUBMISSIONS_CUTOFF_MS;
}

function parsePathnameChallengeId(pathname) {
  const m = /^wg__\d+__ch(\d+)__/.exec(pathname);
  return m ? parseInt(m[1], 10) : null;
}

async function countForChallenge(chId) {
  const result = await list({ prefix: 'wg__', limit: 1000 });
  let n = 0;
  for (const blob of result.blobs) {
    if (parsePathnameChallengeId(blob.pathname) === chId) n++;
  }
  return n;
}

module.exports = {
  CHALLENGE_COUNT,
  MAX_PER_CHALLENGE,
  UNLIMITED_CHALLENGES,
  SUBMISSIONS_CUTOFF_MS,
  submissionsClosed,
  parsePathnameChallengeId,
  countForChallenge,
};