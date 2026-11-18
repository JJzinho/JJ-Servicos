# JJ Serviços

Sistema local de recrutamento para pequenos negócios. A aplicação abre no login. Candidato e empresa criam contas próprias. A equipe JJ revisa os perfis compatíveis antes de enviá-los à empresa.

## Rodar no Windows

Instale o Node.js 22.9 ou superior e abra um terminal na pasta do projeto.

```powershell
npm ci
Copy-Item .env.example .env
```

No painel do seu projeto Supabase, abra **Connect → Session pooler** e copie a URI PostgreSQL. Em `.env`, substitua o valor de `DATABASE_URL` por essa URI com a senha **do banco**. Codifique caracteres especiais da senha na URI (por exemplo, `@` como `%40`). O arquivo é lido somente pelo servidor. Se a conexão exigir a autoridade certificadora do projeto, baixe o certificado no painel e configure `PG_CA_FILE` em `.env`. [Documentação de conexão do Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)

```powershell
npm run db:setup
npm run admin -- triagem@minhaempresa.com.br
npm start
```

O primeiro comando cria as tabelas no schema privado `jj` e pode ser repetido. O segundo cria a conta da equipe que poderá enviar as listas. Troque o endereço por um e-mail seu e guarde a senha gerada no terminal. Execute esse comando uma vez por conta da equipe. Abra **http://localhost:3000**. Para desenvolver com reinicialização automática, use `npm run dev`.

## Percorrer um processo seletivo

1. **Candidato** — clique em **Cadastre-se**, selecione **Candidato** e informe nome, e-mail e senha. Em **Meu perfil**, preencha o CPF, telefone, formação, disponibilidade e endereço. Digite o CEP para buscar rua, bairro, cidade e UF. Complete o número e, se necessário, o complemento. Marque suas funções e preencha os anos e o resumo individual de cada experiência. Marque as competências nas listas ou use **Adicionar** para incluir uma opção. Autorize a participação na triagem e salve. A autorização pode ser retirada no mesmo formulário. A exclusão da conta requer a senha.
2. **Empresa** — cadastre a empresa e complete o setor, o endereço e o responsável. O formulário da vaga começa com o endereço da empresa e permite alterá-lo para outra unidade. Em **Abrir vaga**, defina a função, a jornada e as exigências. A vaga entra em triagem. O candidato também pode registrar interesse pelo painel de vagas.
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
- O protótipo anterior armazenava dados fictícios em cada navegador. As contas do sistema começam com a base vazia.

## Testes

Execute `npm test` para verificar os filtros e a pontuação. Para validar o fluxo completo na sua instância, percorra a sequência acima com um candidato cuja cidade, escolaridade e competências atendam à vaga.
