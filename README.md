# Caça-Cliques do Casamento — Iana & Wllysses

Jogo de desafios fotográficos para o casamento. Os convidados escaneiam o QR code, escolhem um desafio, tiram uma foto e ela entra direto no mural — e é salva automaticamente numa pasta do Google Drive.

Stack: frontend estático (`public/`) + funções serverless (`api/`) rodando no Vercel, sem banco de dados — as fotos e os metadados (desafio, nome, data) ficam guardados no próprio Google Drive.

## Como funciona por baixo dos panos

- `public/index.html` — a página inteira (HTML + CSS + JS), sem dependências externas além das fontes do Google Fonts.
- `api/upload.js` — recebe a foto (em base64) e sobe pro Google Drive, deixando o arquivo visível por link.
- `api/photos.js` — lista as fotos da pasta do Drive e devolve pro front já no formato que a página espera.
- Cada foto vira um arquivo no Drive com um nome tipo `wg__1735599999999__ch3__Rafa__ab12cd.jpg` — dá pra ler ali o timestamp, o número do desafio e o nome de quem mandou, então não precisa de banco de dados.

## 1. Criar a service account do Google (uma vez só)

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e crie um projeto novo (ou use um existente).
2. Em **APIs e serviços → Biblioteca**, procure por "Google Drive API" e clique em **Ativar**.
3. Em **APIs e serviços → Credenciais**, clique em **Criar credenciais → Conta de serviço**.
   - Dê um nome qualquer (ex: `caca-cliques-drive`).
   - Não precisa dar nenhum papel/role de projeto — pode pular essa etapa.
4. Depois de criada, abra a conta de serviço, vá na aba **Chaves** → **Adicionar chave → Criar nova chave** → tipo **JSON**. Isso baixa um arquivo `.json` no seu computador — guarde ele, mas **nunca** suba esse arquivo pro GitHub.
5. Abra o JSON baixado. Você vai precisar de dois campos dele:
   - `client_email` → vai virar a variável `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → vai virar a variável `GOOGLE_PRIVATE_KEY`

## 2. Criar e compartilhar a pasta do Drive

1. Crie uma pasta no seu Google Drive normal (ex: "Fotos do Casamento — Caça-Cliques").
2. Clique em **Compartilhar** e adicione o e-mail da service account (o mesmo `client_email` do passo anterior) com permissão de **Editor**.
3. Pegue o ID da pasta: é o trecho depois de `/folders/` na URL quando você abre a pasta no navegador.
   - Ex: `https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz` → o ID é `1AbCdEfGhIjKlMnOpQrStUvWxYz`.

## 3. Configurar as variáveis de ambiente no Vercel

No painel do projeto na Vercel, vá em **Settings → Environment Variables** e adicione:

| Nome | Valor |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | o `client_email` do JSON |
| `GOOGLE_PRIVATE_KEY` | o `private_key` do JSON (cole com as quebras de linha `\n` mesmo, não precisa converter) |
| `GOOGLE_DRIVE_FOLDER_ID` | o ID da pasta do passo 2 |

Veja o arquivo `.env.example` como referência do formato.

Se quiser rodar localmente antes de subir, copie `.env.example` para `.env` e preencha, depois use `vercel dev` (precisa do `vercel login` feito e do projeto linkado com `vercel link`).

## 4. Subir pro GitHub e importar na Vercel

```bash
git init
git add .
git commit -m "Caça-cliques do casamento"
git branch -M main
git remote add origin <url-do-seu-repo>
git push -u origin main
```

Depois é só importar o repositório no painel da Vercel (New Project → selecionar o repo). Como o projeto não usa nenhum framework, a Vercel detecta como "Other" — não precisa mexer em Build Command nem Install Command, o `vercel.json` já aponta a pasta `public/` como saída estática e as funções em `api/` são detectadas automaticamente.

## 5. Depois do deploy

Depois que o domínio da Vercel estiver no ar (ex: `https://caca-cliques-casamento.vercel.app`), me avisa a URL final que eu regenero o QR code do convite apontando pra ela.

## Limites e observações

- Cada foto é comprimida no navegador antes de enviar (até ~1080px no lado maior), então o upload é rápido mesmo em 4G.
- O Google Drive tem um pequeno atraso pra gerar a miniatura (`thumbnail`) de arquivos recém-criados — por isso a foto que você acabou de mandar aparece na hora usando a prévia local, e só depois passa a usar a miniatura do Drive quando a página atualiza a lista (a cada 20s).
- Não tem login nem senha — qualquer pessoa com o link pode mandar fotos e ver o mural. Isso é proposital (mesmo espírito do convite físico com QR code), mas significa que o link não deve ser divulgado publicamente fora dos convidados.
- Sem limite de armazenamento imposto pelo app — só o espaço disponível na conta do Google Drive usada.
