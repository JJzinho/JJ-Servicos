# JJ Serviços — Plataforma de recrutamento (MVP demonstrativo)

Projeto de **HTML, CSS e JavaScript puro**, baseado na apresentação de 17 páginas **JJ Serviços — Recrutamento rápido e acessível para pequenos negócios**, idealizada por Tiago Pereira da Silva.

É um **protótipo funcional de interface** para uma apresentação acadêmica: oferece telas responsivas, navegação, dados fictícios, cadastro, vagas, inscrições, pontuação e revisão humana, sem exigir instalação de pacotes ou servidor.

## Como executar (Windows, macOS ou Linux)

1. Extraia o ZIP em uma pasta.
2. Dê **dois cliques em `index.html`**.
3. O site será aberto no navegador. Recomendado: Chrome, Edge ou Firefox atualizados.
4. Para recomeçar a demonstração, entre na área administrativa → **Configurações** → **Restaurar demonstração**.

Não é necessário Node.js nem internet. Todas as rotas utilizam `#` (ex.: `index.html#/vagas`), para funcionar também a partir do arquivo local.

## Contas de demonstração

Na página **Entrar**, clique em **Acesso rápido de demonstração**, escolhendo o tipo de conta:

| Perfil | E-mail exibido | Acesso |
| --- | --- | --- |
| Candidato | `candidato@demo.jj` | Painel, perfil, vagas, inscrições, notificações |
| Empresa | `empresa@demo.jj` | Vagas, abertura de vaga, lista de talentos, etapas e configurações |
| Administração | `admin@demo.jj` | Visão geral, fila de triagem, publicação de listas, relatórios CSV e restauração |

**Atenção:** o login é somente uma simulação; não há senha real, backend, controle de permissões seguro ou dados sincronizados. Não insira informações pessoais verdadeiras.

## Todas as telas incluídas

### Institucionais e públicas
1. Página inicial
2. Catálogo de vagas com busca e filtros
3. Detalhes de cada vaga e registro de interesse
4. Para empresas
5. Como funciona (incluindo critérios e pontuação)
6. Planos e preços
7. Sobre a JJ
8. Privacidade
9. Contato
10. Entrar / escolher perfil
11. Cadastrar candidato
12. Cadastrar empresa

### Área do candidato
13. Painel do candidato
14. Meu perfil (edição e exclusão local)
15. Minhas candidaturas
16. Notificações e atualização de leitura

### Área da empresa
17. Painel da empresa
18. Minhas vagas
19. Nova vaga (requisitos obrigatórios e desejáveis)
20. Acompanhamento individual da vaga
21. Candidatos recebidos
22. Configurações da empresa

### Área da administração
23. Painel administrativo
24. Todas as vagas
25. Triagem individual e revisão humana (máximo de cinco perfis)
26. Base de talentos
27. Empresas cadastradas
28. Configurações, exportação CSV e restauração de dados

O projeto usa **uma aplicação de página única (SPA)**: todas as telas são renderizadas por `app.js` e a navegação ocorre sem atualização completa da página. Assim, uma única página HTML abriga todas as telas e cada uma tem endereço próprio.

## Roteiro de apresentação (5 minutos)

1. Abra `index.html`: mostre a página inicial, os benefícios e o catálogo de vagas.
2. Entre como **empresa**: abra uma nova vaga, descreva os requisitos e veja o status **Em triagem**.
3. Saia e entre como **administrador**: selecione a vaga e mostre a pontuação de experiência, habilidades, região e disponibilidade; escolha até 5 perfis e envie a lista.
4. Volte para **empresa**: na vaga, confira a lista de candidatos e marque alguém como **Entrevista**.
5. Entre como **candidato**: apresente o perfil, as candidaturas e as notificações. Para mostrar imediatamente uma alteração, entre na conta do candidato que foi selecionado — os profissionais de teste possuem e-mails individuais na base; o acesso ao protótipo é por e-mail, sem senha.

## Como a compatibilidade funciona

**Primeiro, requisitos obrigatórios:**
- Escolaridade igual ou acima da mínima exigida.
- Todas as competências obrigatórias informadas na vaga.
- Mesma cidade, **somente se** a empresa marcar o requisito como eliminatório.

Perfis que não atendem a esses critérios ficam fora da lista. Na segunda etapa, o sistema atribui até **100 pontos**:

| Critério | Pontuação máxima | Regra demonstrativa |
| --- | ---: | --- |
| Experiência na função | 40 | Proporção dos anos declarados vs. experiência desejável |
| Competências desejáveis | 25 | Proporção das habilidades desejáveis presentes no perfil |
| Região | 25 | Mesma cidade = 25; outra cidade da região de demonstração = 17; demais = 5 |
| Disponibilidade | 10 | Jornada igual, integral ou flexível = 10; demais = 4 |

Uma vaga sem experiência mínima desejável ou habilidades desejáveis atribui o total desses componentes. **A nota não é decisão de contratação**, e a equipe administrativa revisa as listas antes da publicação. Nenhum filtro usa idade, sexo, gênero, raça, cor, religião, estado civil ou filhos.

## Como os dados ficam salvos

Os dados fictícios e as edições são guardados no `localStorage` sob a chave `jj-servicos-mvp-demo-v1`. No mesmo navegador, as mudanças permanecem após atualizar a aba. O botão de restauração gera novamente os dados fictícios iniciais. Navegadores distintos não compartilham dados.

## Estrutura

```text
JJ_Servicos_Web/
├── index.html              Entrada do site
├── styles.css              Layout responsivo e identidade visual
├── app.js                  Rotas, telas, modelos, dados e ações
├── assets/
│   └── favicon.svg         Ícone da marca JJ
└── README.md               Guia do projeto e roteiro
```

## O que NÃO está implementado (necessário em produção)

- Login seguro, senha, recuperação de acesso e controle de autorização real.
- Backend/API e banco de dados compartilhado (sugestão: Node.js + Express + PostgreSQL).
- Integração real de e-mail, WhatsApp e notificações push.
- Cobrança e gestão de assinaturas. Os valores R$ 79, R$ 149 e R$ 299 são hipotéticos, conforme o PDF.
- Fluxo de privacidade e LGPD de produção (controlador/operador, política real, direitos, retenção, gestão de consentimento e incidentes).
- Revisão de vieses e validação estatística das regras de pontuação em operação real.

O MVP já está estruturado para **demonstrar visualmente e testar o fluxo**, mas não deve ser publicado como plataforma de recrutamento em produção sem essas etapas.
