// scripts/get-refresh-token.js
//
// Rode este script UMA VEZ, na sua própria máquina (não na Vercel), pra
// autorizar o app a salvar arquivos no SEU Google Drive pessoal.
// Ele abre um link, você faz login com a conta do Google que vai guardar
// as fotos, e o script imprime o "refresh token" que vai nas variáveis
// de ambiente da Vercel.
//
// Como usar:
//   node scripts/get-refresh-token.js SEU_CLIENT_ID SEU_CLIENT_SECRET
//
// (o CLIENT_ID e o CLIENT_SECRET vêm de um "OAuth Client ID" tipo
// "Desktop app", criado em APIs e serviços → Credenciais, no mesmo
// projeto do Google Cloud onde a Drive API já está ativada)

const http = require('http');
const { URL } = require('url');
const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = process.argv[2] || process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.argv[3] || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Uso: node scripts/get-refresh-token.js <CLIENT_ID> <CLIENT_SECRET>');
  process.exit(1);
}

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('\nAbra esse link no navegador e faça login com a conta do Google que vai guardar as fotos:\n');
console.log(authUrl);
console.log('\n(o Google pode avisar que o app não foi verificado — clique em "Avançado" e depois em "Acessar [nome do app] (não seguro)", é esperado pra um app pessoal que só você usa)\n');

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, REDIRECT_URI);
    const code = url.searchParams.get('code');
    if (!code) {
      res.end('Nenhum código recebido. Pode fechar essa aba e conferir o terminal.');
      return;
    }
    const { tokens } = await oAuth2Client.getToken(code);
    res.end('Autorizado! Pode fechar essa aba e voltar pro terminal.');
    console.log('\nDeu certo! Esse é o seu refresh token — cola ele na variável GOOGLE_OAUTH_REFRESH_TOKEN da Vercel:\n');
    console.log(tokens.refresh_token);
    console.log('');
    if (!tokens.refresh_token) {
      console.log(
        'Não veio um refresh token dessa vez (às vezes acontece se você já tinha autorizado antes). ' +
        'Vá em https://myaccount.google.com/permissions, remova o acesso do app, e rode o script de novo.'
      );
    }
    server.close();
    process.exit(0);
  } catch (e) {
    res.end('Erro: ' + e.message);
    console.error('\nErro ao trocar o código pelo token:', e.message);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`Aguardando você autorizar no navegador (ouvindo em ${REDIRECT_URI})...\n`);
});
