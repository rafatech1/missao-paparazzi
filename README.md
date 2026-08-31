# Caça-Cliques do Casamento — Iana & Wllysses

Jogo de desafios fotográficos para o casamento. Os convidados escaneiam o QR code, escolhem um desafio, tiram uma foto e ela entra direto no mural — e é salva automaticamente numa pasta do Google Drive.

Stack: frontend estático (`public/`) + funções serverless (`api/`) rodando no Vercel, sem banco de dados — as fotos e os metadados (desafio, nome, data) ficam guardados no próprio Google Drive.

## Como funciona por baixo dos panos

- `public/index.html` — a página inteira (HTML + CSS + JS), sem dependências externas além das fontes do Google Fonts.
- `api/upload.js` — recebe a foto (em base64) e sobe pro Google Drive, deixando o arquivo visível por link.
- `api/photos.js` — lista as fotos da pasta do Drive e devolve pro front já no formato que a página espera.
- Cada foto vira um arquivo no Drive com um nome tipo `wg__1735599999999__ch3__Rafa__ab12cd.jpg` — dá pra ler ali o timestamp, o número do desafio e o nome de quem mandou, então não precisa de banco de dados.
- A autenticação com o Google usa **OAuth com sua conta pessoal** (não uma "service account"), porque contas de serviço não têm cota de armazenamento própria no Drive — elas só conseguem gravar em Drives Compartilhados (recurso pago do Google Workspace) ou via delegação OAuth. Pra Drive pessoal, o caminho oficial é este mesmo.

## 1. Criar o projeto e ativar a Drive API (se ainda não fez)

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e crie um projeto (ou use um existente).
2. Em **APIs e serviços → Biblioteca**, procure "Google Drive API" e clique em **Ativar**.

## 2. Configurar a tela de consentimento OAuth

1. Vá em **APIs e serviços → Tela de permissão OAuth** (OAuth consent screen).
2. Tipo de usuário: **Externo**.
3. Preenche nome do app (ex: "Caça-cliques do Casamento"), seu e-mail de suporte e de contato. Pode deixar o resto padrão.
4. Na etapa de **Escopos**, não precisa adicionar nada manualmente (o script já pede o escopo certo na hora de autorizar).
5. Na etapa de **Usuários de teste**, adiciona o seu próprio e-mail do Google (a conta onde as fotos vão ficar guardadas).
6. Salva e finaliza.

## 3. Criar as credenciais OAuth (Client ID)

1. Vá em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**.
2. Tipo de aplicativo: **App para computador** (Desktop app).
3. Dá um nome qualquer (ex: "caca-cliques-desktop") e clica em **Criar**.
4. Vai aparecer uma tela com o **Client ID** e o **Client Secret** — guarda os dois, você vai usar já já.

## 4. Gerar o refresh token (uma vez só, na sua máquina)

Esse passo você roda no seu computador, não na Vercel. Ele abre uma tela de login do Google pra você autorizar o app a usar o seu Drive.

1. Baixa este projeto na sua máquina (ou usa o clone do GitHub) e instala as dependências:
   ```bash
   npm install
   ```
2. Roda o script, trocando pelos valores do passo 3:
   ```bash
   node scripts/get-refresh-token.js SEU_CLIENT_ID SEU_CLIENT_SECRET
   ```
3. Ele imprime um link no terminal — abre esse link no navegador, faz login com a conta do Google onde as fotos vão ficar, e autoriza o acesso.
   - O Google vai avisar que "o app não foi verificado". Isso é esperado pra um app pessoal — clica em **Avançado** → **Acessar [nome do app] (não seguro)** pra continuar.
4. Depois de autorizar, volta pro terminal: o script imprime o **refresh token**. Guarda esse valor — ele vai numa das variáveis de ambiente da Vercel.

## 5. Criar a pasta no Drive

1. Cria uma pasta normal no seu Google Drive (ex: "Fotos do Casamento — Caça-Cliques"), na mesma conta que você usou pra autorizar no passo anterior.
2. Pega o ID da pasta pela URL: é o trecho depois de `/folders/`.
   - Ex: `https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz` → o ID é `1AbCdEfGhIjKlMnOpQrStUvWxYz`.

## 6. Configurar as variáveis de ambiente no Vercel

No painel do projeto na Vercel, vá em **Settings → Environment Variables** e adicione:

| Nome | Valor |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | o Client ID do passo 3 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | o Client Secret do passo 3 |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | o refresh token gerado no passo 4 |
| `GOOGLE_DRIVE_FOLDER_ID` | o ID da pasta do passo 5 |

Veja o arquivo `.env.example` como referência do formato. Depois de configurar, força um **Redeploy** no painel da Vercel (Deployments → "..." do último deploy → Redeploy) pra ele pegar as variáveis novas.

## 7. Subir pro GitHub e importar na Vercel

```bash
git init
git add .
git commit -m "Caça-cliques do casamento"
git branch -M main
git remote add origin <url-do-seu-repo>
git push -u origin main
```

Depois é só importar o repositório no painel da Vercel (New Project → selecionar o repo). Como o projeto não usa nenhum framework, a Vercel detecta como "Other" — não precisa mexer em Build Command nem Install Command, o `vercel.json` já aponta a pasta `public/` como saída estática e as funções em `api/` são detectadas automaticamente.

## 8. Depois do deploy

Testa abrindo `https://SEU-PROJETO.vercel.app/api/photos` direto no navegador — se aparecer `{"ok":true,"photos":[],...}`, as credenciais estão certas. Depois testa mandar uma foto de verdade pelo site.

Quando o domínio da Vercel estiver 100% funcionando, me avisa a URL final que eu regenero o QR code do convite apontando pra ela.

## Limites e observações

- Cada foto é comprimida no navegador antes de enviar (até ~1080px no lado maior), então o upload é rápido mesmo em 4G.
- O Google Drive tem um pequeno atraso pra gerar a miniatura (`thumbnail`) de arquivos recém-criados — por isso a foto que você acabou de mandar aparece na hora usando a prévia local, e só depois passa a usar a miniatura do Drive quando a página atualiza a lista (a cada 20s).
- Não tem login nem senha — qualquer pessoa com o link pode mandar fotos e ver o mural. Isso é proposital (mesmo espírito do convite físico com QR code), mas significa que o link não deve ser divulgado publicamente fora dos convidados.
- O refresh token gerado no passo 4 normalmente não expira sozinho (só se for revogado manualmente em [myaccount.google.com/permissions](https://myaccount.google.com/permissions), ou se o app OAuth ficar mais de 6 meses sem uso). Se em algum momento o site voltar a dar erro de autenticação, é só rodar o script do passo 4 de novo e atualizar a variável na Vercel.
- Espaço de armazenamento é o que sua conta do Google já tem disponível (15GB grátis, ou mais se você já paga por armazenamento extra).
