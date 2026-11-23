# JJ Serviços

Sistema local de recrutamento para pequenos negócios. A aplicação abre no login. Candidato e empresa criam contas próprias. A equipe JJ revisa os perfis compatíveis antes de enviá-los à empresa.

## Rodar no Windows

Instale o Node.js 22.9 ou superior e abra um terminal na pasta do projeto.

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

No painel do seu projeto Supabase, abra **Connect → Session pooler** e copie a URI PostgreSQL. Em `.env`, substitua o valor de `DATABASE_URL` por essa URI com a senha **do banco**. Codifique caracteres especiais da senha na URI (por exemplo, `@` como `%40`). O arquivo é lido somente pelo servidor. Se a conexão exigir a autoridade certificadora do projeto, baixe o certificado no painel e configure `PG_CA_FILE` em `.env`. [Documentação de conexão do Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)

```powershell
npm run db:setup
npm run admin -- triagem@minhaempresa.com.br
npm start
```

O primeiro comando cria as tabelas no schema privado `jj` e pode ser repetido. O segundo cria a conta da equipe que poderá enviar as listas. Troque o endereço por um e-mail seu e guarde a senha gerada no terminal. Execute esse comando uma vez por conta da equipe. Abra **http://localhost:3000**. Para desenvolver com reinicialização automática, use `npm run dev`.

### Configuração do servidor

| Variável no `.env` | Quando preencher |
| --- | --- |
| `DATABASE_URL` | Obrigatória. URI de conexão com o PostgreSQL. Para um banco local, use `postgresql://usuario:senha@localhost:5432/nome_do_banco` com um banco existente e um usuário que possa criar o schema `jj`. |
| `PORT` | Opcional. Porta HTTP, com padrão `3000`. |
| `PG_CA_FILE` | Caminho para o arquivo PEM da autoridade certificadora, se necessário para validar a conexão com o banco remoto. |
| `GEMINI_API_KEY` | Chave usada nas consultas ao Gemini. A triagem local funciona sem essa configuração. |
| `GEMINI_MODEL` | Identificador do modelo usado pelo servidor. O padrão do projeto é `gemini-3.1-flash-lite`. |

## Publicar na Vercel

Importe o repositório usando a raiz do projeto (a pasta que contém `server.js` e `package.json`). Use o preset **Express** e os comandos e diretório de saída padrão. A Vercel serve os arquivos em `public/` e encaminha as rotas da API ao Express. Para rodar no PC, continue usando `npm start`.

Em **Settings → Environment Variables**, configure `DATABASE_URL` com a URI do pooler Supabase para o ambiente que você vai publicar. Se o banco exigir o certificado, configure `PG_CA_PEM` com o conteúdo completo do arquivo do Supabase, incluindo as linhas BEGIN e END CERTIFICATE. O caminho de arquivo `PG_CA_FILE` é destinado à instalação local. Para ativar a IA, configure também `GEMINI_API_KEY` e, se necessário, `GEMINI_MODEL`.

Após salvar as variáveis, publique um novo deploy. Para testar a ligação com a API, abra `/api/me` em uma janela anônima. A resposta esperada antes do login é HTTP 401 com a mensagem JSON “Entre para acessar o sistema.”. O primeiro login com uma conta existente confirma também a conexão com o banco.

## Cadastro e configurações da empresa

Em **Cadastre-se**, escolha **Empresa** e informe nome da empresa, e-mail e senha de 8 a 128 caracteres. Depois do primeiro acesso, abra **Minha empresa** e preencha o cadastro.

| Seção | O que preencher |
| --- | --- |
| **Dados da empresa** | Nome, CNPJ e um setor de atuação. Ao escolher **Outro**, escreva o nome do setor no campo que aparece. A descrição da empresa é opcional. |
| **Endereço** | CEP, rua ou avenida, número, bairro, cidade e UF. O complemento é opcional. Use **S/N** quando o imóvel não tiver número. |
| **Dados do empresário** | Nome completo e telefone de contato com DDD. |

O formulário aplica máscaras ao CNPJ, ao CEP e ao telefone e converte a UF para maiúsculas. O CNPJ aceita o formato numérico e o alfanumérico e passa pela validação dos dígitos verificadores ao salvar.

Após **Salvar cadastro**, abra **Configurações da empresa** no menu. Os três campos dessa tela são opcionais e podem ser editados depois.

| Campo | Exemplo de preenchimento |
| --- | --- |
| **Quantidade de funcionários** | `18`. Informe um número inteiro a partir de zero ou deixe em branco. |
| **Setores internos** | “Atendimento, estoque e financeiro”. Aqui a empresa descreve suas áreas internas. O ramo de atividade, como **Comércio**, fica em **Minha empresa**. |
| **Informações adicionais** | “Temos duas unidades em Olinda e uma equipe administrativa compartilhada.” |

Use **Salvar configurações** para registrar as alterações.

## Percorrer um processo seletivo

1. **Candidato** — clique em **Cadastre-se**, selecione **Candidato** e informe nome, e-mail e senha. Em **Meu perfil**, preencha o CPF, telefone, formação, disponibilidade e endereço. Digite o CEP para buscar rua, bairro, cidade e UF. Complete o número e, se necessário, o complemento. Marque suas funções e clique no nome de cada uma para abrir os campos de anos e descrição. CPF, telefone e CEP são formatados durante a digitação. Marque as competências nas listas ou use **Adicionar** para incluir uma opção. Autorize a participação na triagem e salve. A autorização pode ser retirada no mesmo formulário. A exclusão da conta requer a senha.
2. **Empresa** — após completar o cadastro, acesse **Abrir vaga** e defina a função, a jornada e as exigências. O formulário começa com o endereço da empresa e permite alterá-lo para outra unidade. A vaga entra em triagem. O candidato também pode registrar interesse pelo painel de vagas.
3. **Equipe JJ** — entre pelo link **Acesso da equipe JJ**. Abra a vaga, confira o detalhamento das notas, revise a seleção e clique em **Enviar lista à empresa**. O sistema considera todo perfil autorizado e compatível, mesmo sem interesse registrado.
4. **Empresa** — abra a vaga para ver os contatos dos perfis enviados, marcar entrevistas, registrar o resultado e encerrar o processo.
5. **Candidato** — acompanhe as etapas em **Meus processos** e os retornos em **Avisos**. O envio da lista, a mudança de etapa e o encerramento geram avisos dentro do sistema.

O acesso às vagas, processos e avisos é liberado após o cadastro completo. Candidatos e empresas cadastrados na versão anterior podem entrar para completar o perfil. A função e o resumo antigos aparecem no formulário. O consentimento para participar da triagem continua opcional. O complemento também é opcional.

## Recomendar perfis com Gemini

Crie uma chave em um projeto do **Google AI Studio no nível gratuito** e configure o arquivo `.env`. A cota depende do modelo e do projeto. [Criar chave](https://aistudio.google.com/apikey) · [Preços e cota gratuita](https://ai.google.dev/gemini-api/docs/pricing) · [Limites](https://ai.google.dev/gemini-api/docs/rate-limits)

```dotenv
GEMINI_API_KEY=sua_chave
GEMINI_MODEL=gemini-3.1-flash-lite
```

Se já tem uma instalação, preserve o seu `.env`, acrescente essas linhas, rode `npm run db:setup` para atualizar as tabelas e reinicie o Node com `npm start`.

1. Na conta **Equipe JJ**, abra uma vaga em triagem e clique em **Consultar Gemini**. O Node envia as competências desejáveis e, quando a vaga pede experiência, o título do cargo. A consulta acontece uma vez por vaga após uma resposta válida. As sugestões ficam no Supabase.
2. Revise as equivalências e clique em **Aplicar e recomendar perfis**. Por exemplo, ao aprovar “PDV” como equivalente a “ponto de venda”, um candidato que declarou “PDV” passa a pontuar nessa competência desejável. O cálculo usa dados locais e preserva os requisitos eliminatórios e os pesos da tabela abaixo. Desmarcar uma equivalência e reaplicar remove seu efeito.
3. A equipe vê os perfis em ordem de pontuação, pode alterar a seleção e envia até cinco à empresa. Na lista publicada, a empresa vê a nota e as equivalências que contribuíram para ela.

4. Em cada perfil da triagem ou da lista publicada, **Analisar habilidades e distância com IA** consulta o Gemini com as competências desejáveis identificadas, as pendentes e a distância aproximada em quilômetros (quando disponível). A análise é exibida junto dos dados que a fundamentam. A publicação salva os indicadores usados naquele momento. Cada solicitação dessa análise usa uma chamada à API.

A chave fica no servidor. CPF, nomes, contatos, endereços e coordenadas individuais ficam fora das requisições ao Gemini. A consulta de endereço envia apenas o CEP à BrasilAPI e usa o ViaCEP quando necessário. Se a consulta estiver indisponível, o endereço pode ser preenchido à mão. Em caso de chave ausente, cota esgotada ou falha do serviço, a equipe ainda pode publicar a lista pela triagem local. Reabrir a vaga e recalcular com sugestões salvas não consome outra chamada à API.

## Regras da triagem

Escolaridade abaixo do mínimo, falta de competência obrigatória e divergência de cidade quando a residência é exigida eliminam o perfil. A pontuação seguinte classifica os candidatos elegíveis.

| Critério | Máximo | Cálculo |
| --- | ---: | --- |
| Experiência | 40 | Maior experiência entre as funções compatíveis com a vaga, proporcional ao tempo desejado, até 40. As equivalências aprovadas também participam da comparação. |
| Competências | 25 | Fração de competências desejáveis presentes no perfil. |
| Região | 25 | Distância aproximada em linha reta entre os CEPs: até 5 km = 25, até 15 km = 20, até 30 km = 15, acima = 5. Sem as duas coordenadas, o sistema mostra distância indisponível e usa cidade e região para pontuar (25, 17 ou 5). |
| Disponibilidade | 10 | Turno coincidente, integral ou flexível recebe 10. Demais casos recebem 4. |

Experiência ou competências desejáveis sem exigência recebem a pontuação máxima daquele critério. A comparação de texto ignora acentos, caixa e espaços excedentes. Empates priorizam o cadastro mais antigo e depois o identificador. A revisão humana publica de um a cinco perfis por vaga. Ao retirar o consentimento, o candidato sai da triagem e seus dados deixam de aparecer à empresa.

## Arquitetura

- Frontend responsivo em HTML, CSS e JavaScript, servido pelo próprio Node.
- API Express com autenticação por e-mail e senha, hashes scrypt e sessões persistidas no PostgreSQL. O cookie HttpOnly identifica uma sessão de sete dias. Os dados e as permissões são conferidos no servidor.
- PostgreSQL do Supabase acessado pelo driver `pg`. A aplicação usa contas próprias, sem depender de configuração do Supabase Auth. O servidor escuta na interface local `127.0.0.1`.

### Onde encontrar cada parte

| Arquivos | Responsabilidade |
| --- | --- |
| [index.html](public/index.html), [app.js](public/app.js) e [styles.css](public/styles.css) | Entrada da aplicação, navegação por perfil, telas, envio dos formulários e estilos. |
| [public/ui/](public/ui/) | Campos reutilizáveis, máscaras, seleção de competências e opções de setor. |
| [server.js](server.js) e [server/auth.js](server/auth.js) | Rotas sob `/api`, controle de acesso, sessões e entrega do frontend. |
| [server/domain.js](server/domain.js) | Validação de perfis, configurações e vagas, critérios de elegibilidade e cálculo da nota. |
| [server/address.js](server/address.js) e [server/gemini.js](server/gemini.js) | Consulta de CEP, cálculo de distância e integração com o Gemini. |
| [server/db.js](server/db.js), [db/schema.sql](db/schema.sql) e [scripts/](scripts/) | Conexões e transações PostgreSQL, estrutura do banco, preparação da base e criação de administradores. |

### Como os dados são gravados

O navegador envia JSON à API na mesma origem. O servidor identifica a conta pelo cookie de sessão, verifica as permissões e valida os campos antes de gravar no PostgreSQL.

| Tabela | Conteúdo |
| --- | --- |
| `jj.accounts` | Identidade, perfil de acesso, hash da senha e data do consentimento. O campo JSONB `profile` guarda o cadastro. A API grava as configurações da empresa em `profile.settings` por meio de `PUT /api/me/settings`, liberado após a conclusão do cadastro. |
| `jj.sessions` | Hash do token de sessão, conta associada e expiração. |
| `jj.jobs` | Empresa titular, cargo, requisitos, situação da vaga e sugestões de equivalência. |
| `jj.interests` | Vínculo entre o candidato e a vaga em que ele registrou interesse. |
| `jj.selections` | Posição na lista enviada, nota, evidências da triagem e etapa de cada candidato selecionado. |
| `jj.notices` | Avisos do candidato e registro de leitura. |

## Testes

Execute `npm test` na raiz do projeto. A suíte em [test/](test/) verifica máscaras, validação dos cadastros e das configurações, filtros, pontuação e comportamento da integração com o Gemini. Esses testes rodam sem conexão com PostgreSQL e sem chave de IA.

Para conferir o fluxo completo em uma base de teste, cadastre uma empresa com **Outro**, salve o ramo informado e reabra **Minha empresa**. Em **Configurações da empresa**, salve a quantidade de funcionários e os setores internos, recarregue a página e confira os valores. Em seguida, percorra o processo seletivo com um candidato que tenha autorizado a triagem e atenda aos requisitos da vaga.

## Solução de problemas

| Situação | Como proceder |
| --- | --- |
| O servidor informa “Banco indisponível” ao iniciar | Confira a URI em `DATABASE_URL`, a conectividade e o certificado do banco remoto. Execute `npm run db:setup` para aplicar o schema e inicie o servidor novamente. |
| Somente o cadastro aparece no menu | Complete os campos obrigatórios e clique em **Salvar cadastro**. Para empresas com setor **Outro**, preencha também o nome do setor. |
| A consulta de CEP falhou | Preencha o endereço manualmente. A triagem usa cidade e região quando as coordenadas dos CEPs estão indisponíveis. |
| Um candidato não aparece na triagem | Confira o consentimento, a escolaridade mínima, as competências obrigatórias e, quando exigida, a residência na localidade da vaga. |