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

1. **Candidato** — clique em **Cadastre-se**, selecione **Candidato** e informe nome, e-mail e senha. Em **Meu perfil**, preencha cidade, contato, formação, função, experiência, competências e disponibilidade. Autorize a participação na triagem e salve. A autorização pode ser retirada no mesmo formulário. A exclusão da conta requer a senha.
2. **Empresa** — cadastre a empresa e complete o setor, a cidade e o responsável. Em **Abrir vaga**, defina a função, a jornada e as exigências. A vaga entra em triagem. O candidato também pode registrar interesse pelo painel de vagas.
3. **Equipe JJ** — entre pelo link **Acesso da equipe JJ**. Abra a vaga, confira o detalhamento das notas, revise a seleção e clique em **Enviar lista à empresa**. O sistema considera todo perfil autorizado e compatível, mesmo sem interesse registrado.
4. **Empresa** — abra a vaga para ver os contatos dos perfis enviados, marcar entrevistas, registrar o resultado e encerrar o processo.
5. **Candidato** — acompanhe as etapas em **Meus processos** e os retornos em **Avisos**. O envio da lista, a mudança de etapa e o encerramento geram avisos dentro do sistema.

## Regras da triagem

Escolaridade abaixo do mínimo, falta de competência obrigatória e divergência de cidade quando a residência é exigida eliminam o perfil. A pontuação seguinte classifica os candidatos elegíveis.

| Critério | Máximo | Cálculo |
| --- | ---: | --- |
| Experiência | 40 | Anos na função de referência proporcionais ao desejado, até 40. A função é comparada ao título da vaga após normalização. |
| Competências | 25 | Fração de competências desejáveis presentes no perfil. |
| Região | 25 | Mesma cidade recebe 25. Duas cidades distintas entre Recife, Olinda, Jaboatão dos Guararapes, Paulista e Camaragibe recebem 17. Demais casos recebem 5. |
| Disponibilidade | 10 | Turno coincidente, integral ou flexível recebe 10. Demais casos recebem 4. |

Experiência ou competências desejáveis sem exigência recebem a pontuação máxima daquele critério. A comparação de texto ignora acentos, caixa e espaços excedentes. Empates priorizam o cadastro mais antigo e depois o identificador. A revisão humana publica de um a cinco perfis por vaga. Ao retirar o consentimento, o candidato sai da triagem e seus dados deixam de aparecer à empresa.

## Arquitetura

- Frontend responsivo em HTML, CSS e JavaScript, servido pelo próprio Node.
- API Express com autenticação por e-mail e senha, hashes scrypt e sessões persistidas no PostgreSQL. O cookie HttpOnly identifica uma sessão de sete dias. Os dados e as permissões são conferidos no servidor.
- PostgreSQL do Supabase acessado pelo driver `pg`. A aplicação usa contas próprias, sem depender de configuração do Supabase Auth. O servidor escuta na interface local `127.0.0.1`.
- O protótipo anterior armazenava dados fictícios em cada navegador. As contas do sistema começam com a base vazia.

## Testes

Execute `npm test` para verificar os filtros e a pontuação. Para validar o fluxo completo na sua instância, percorra a sequência acima com um candidato cuja cidade, escolaridade e competências atendam à vaga.
