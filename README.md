# Missão Paparazzi — Iana & Wllysses

Jogo de desafios fotográficos para o casamento. Os convidados escaneiam o QR code, escolhem um desafio, tiram uma foto e ela entra direto no mural.

Stack: frontend estático (`public/`) + funções serverless (`api/`) rodando no Vercel, com as fotos guardadas no **Vercel Blob Storage** — sem Google Cloud, sem OAuth, sem service account, sem banco de dados.

## Como funciona por baixo dos panos

- `public/index.html` — a página inteira (HTML + CSS + JS), sem dependências externas além das fontes do Google Fonts.
- `api/upload.js` — recebe a foto (em base64) e salva no Vercel Blob.
- `api/photos.js` — lista as fotos salvas e devolve pro front já no formato que a página espera.
- Cada foto vira um arquivo com um nome tipo `wg__1735599999999__ch3__Rafa__ab12cd.jpg` — dá pra ler ali o timestamp, o número do desafio e o nome de quem mandou, então não precisa de banco de dados separado.

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

- Cada foto é comprimida no navegador antes de enviar (até ~1080px no lado maior), então o upload é rápido mesmo em 4G.
- O plano gratuito da Vercel inclui 5GB de armazenamento e 100GB de transferência por mês no Blob — bem mais do que um casamento normalmente usa (algumas centenas de fotos comprimidas ficam na casa de 50-150MB no total). Não precisa de cartão de crédito.
- Não tem login nem senha — qualquer pessoa com o link pode mandar fotos e ver o mural. Isso é proposital (mesmo espírito do convite físico com QR code), mas significa que o link não deve ser divulgado publicamente fora dos convidados.
- As fotos ficam guardadas na própria Vercel (não no seu Google Drive pessoal). O mural dentro do site já funciona como o "álbum" — dá pra ver e rever todas as fotos por lá a qualquer momento enquanto o projeto estiver no ar.
