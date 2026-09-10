# Missão Paparazzi — Iana & Wllysses

Jogo de desafios fotográficos para o casamento. Os convidados escaneiam o QR code, escolhem um desafio, tiram uma foto e ela entra direto no mural.

Stack: frontend estático (`public/`) + funções serverless (`api/`) rodando no Vercel, com as fotos guardadas no **Vercel Blob Storage** — sem Google Cloud, sem OAuth, sem service account, sem banco de dados.

## Como funciona por baixo dos panos

- `public/index.html` — a página inteira (HTML + CSS + JS). A única dependência externa além das fontes do Google Fonts é um `import` de `@vercel/blob/client` (via esm.sh) usado só pra mandar vídeo direto pro Blob Storage.
- `api/upload.js` — recebe a foto (em base64) e salva no Vercel Blob.
- `api/upload-video.js` — autoriza o upload de vídeo. Diferente da foto, o vídeo vai **direto do navegador do convidado pro Blob Storage**, sem passar pelo corpo desta função — isso é necessário porque a Vercel tem um limite fixo de 4.5MB no corpo de qualquer função serverless (mesmo no plano pago), o que inviabilizaria mandar vídeo do jeito que a foto é mandada.
- `api/photos.js` — lista as fotos e vídeos salvos e devolve pro front já no formato que a página espera.
- `api/_lib/media.js` — código compartilhado entre `upload.js` e `upload-video.js` pra contar quantos envios cada desafio já tem e pra saber se o evento já encerrou.
- Cada foto ou vídeo vira um arquivo com um nome tipo `wg__1735599999999__ch3__Rafa__ab12cd.jpg` (ou `.mp4`, `.mov`, `.webm`...) — dá pra ler ali o timestamp, o número do desafio e o nome de quem mandou, então não precisa de banco de dados separado.

### Vídeos

Os convidados também podem mandar vídeos de até **15 segundos** (o site bloqueia na hora, antes de enviar, se passar disso) e até 150MB. Não tem compressão de vídeo no navegador (ao contrário da foto, que é comprimida antes de enviar), então um vídeo consome mais armazenamento do Blob — vale de olho no uso lá no painel da Vercel se o casamento tiver muita gente mandando vídeo.

### Retrospectiva pós-evento

A partir da meia-noite de 14/09/2026 (fim do dia 13/09 no horário de Brasília), o site inteiro para de mostrar os desafios e passa a mostrar uma retrospectiva em tela cheia: todas as fotos e vídeos enviados, passando sozinhos em ordem cronológica, com o nome de quem mandou e o desafio de cada um. Quem abrir o link ou o QR code depois desse horário cai direto nela — não dá mais pra enviar foto/vídeo novo (isso é bloqueado tanto na tela quanto no servidor). Pra mudar esse horário, é só trocar `RETRO_CUTOFF_MS` em `public/index.html` e `SUBMISSIONS_CUTOFF_MS` em `api/_lib/media.js` (os dois têm que ficar iguais).

## 0. Renomear o projeto na Vercel (de caca-click-casamento pra missao-paparazzi)

1. No painel da Vercel, abre o projeto → **Settings** → **General**.
2. No campo **Project Name**, troca `caca-click-casamento` por `missao-paparazzi` (minúsculo, sem acento, hífen no lugar de espaço) → **Save**.
3. Vai em **Settings** → **Domains** e confere qual ficou o domínio novo (normalmente `missao-paparazzi.vercel.app`, mas pode vir com um sufixo dependendo da sua conta) — copia essa URL certinha.
4. Me manda essa URL final aqui que eu regenero o QR code e o convite impresso apontando pra ela.

**Atenção:** a URL antiga (`caca-click-casamento.vercel.app`) para de funcionar depois do rename e não redireciona — ela pode inclusive ser reaproveitada por outro projeto de outra pessoa no futuro. Se algum convite já foi impresso ou enviado com o QR antigo, ele vai parar de funcionar assim que você renomear. O código do site (`public/index.html`, `api/`) não referencia a URL em lugar nenhum, então o rename não quebra nada da aplicação — só o QR/convite precisa ser regerado.

O nome do repositório no GitHub é independente do nome do projeto na Vercel — você pode deixar `caca-click-casamento-main` como está no GitHub sem afetar nada, ou renomear os dois pra manter consistência (isso é só estético).

## 1. Ativar o Vercel Blob no seu projeto

1. No painel da Vercel, abre o seu projeto.
2. Vai na aba **Storage**.
3. Clica em **Create Database** → escolhe **Blob**.
4. Dá um nome (pode deixar o padrão) e confirma.

Só isso. A Vercel já conecta o Blob ao projeto e cria sozinha a variável de ambiente `BLOB_READ_WRITE_TOKEN` — não precisa copiar nem colar nada.

## 2. Subir pro GitHub e importar na Vercel (se ainda não fez)

```bash
git init
git add .
git commit -m "Missão Paparazzi"
git branch -M main
git remote add origin <url-do-seu-repo>
git push -u origin main
```

Depois é só importar o repositório no painel da Vercel (New Project → selecionar o repo). Como o projeto não usa nenhum framework, a Vercel detecta como "Other" — não precisa mexer em Build Command nem Install Command, o `vercel.json` já aponta a pasta `public/` como saída estática e as funções em `api/` são detectadas automaticamente.

Se você já tinha importado o projeto antes (com a versão que usava Google Drive), é só substituir os arquivos pelos desse zip, dar commit e push — a Vercel faz o redeploy sozinha. Depois de criar o Blob Store (passo 1), força um **Redeploy** uma vez (Deployments → "..." do último deploy → Redeploy) pra garantir que a variável nova já esteja disponível.

## 3. Testar

Abre `https://SEU-PROJETO.vercel.app/api/photos` direto no navegador — se aparecer `{"ok":true,"photos":[]}`, está tudo certo. Depois testa mandar uma foto de verdade pelo site.

Quando o domínio da Vercel estiver 100% funcionando, me avisa a URL final que eu regenero o QR code do convite apontando pra ela.

## Limites e observações

- Cada foto é comprimida no navegador antes de enviar (até ~1080px no lado maior), então o upload é rápido mesmo em 4G. Vídeo não é comprimido — vai do jeito que foi gravado, respeitando só o limite de 15s e 150MB.
- Cada desafio aceita no máximo **3 fotos/vídeos**. Depois disso ele fica marcado como "completo" no site (botão desabilitado) e novos envios pra aquele desafio são recusados também no servidor — então dá pra contar com o limite mesmo se alguém tentar mandar por fora do site.
- O plano gratuito da Vercel inclui 5GB de armazenamento e 100GB de transferência por mês no Blob — bem mais do que um casamento normalmente usa pra fotos (algumas centenas de fotos comprimidas ficam na casa de 50-150MB no total). Vídeo pesa bem mais que foto — algumas dezenas de vídeos de 15s já podem passar de 1GB, então é mais fácil chegar perto do limite gratuito se muita gente mandar vídeo. Não precisa de cartão de crédito.
- Não tem login nem senha — qualquer pessoa com o link pode mandar fotos e ver o mural. Isso é proposital (mesmo espírito do convite físico com QR code), mas significa que o link não deve ser divulgado publicamente fora dos convidados.
- As fotos ficam guardadas na própria Vercel (não no seu Google Drive pessoal). O mural dentro do site já funciona como o "álbum" — dá pra ver e rever todas as fotos por lá a qualquer momento enquanto o projeto estiver no ar.
