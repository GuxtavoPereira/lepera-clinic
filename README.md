<div align="center">

# 🧠 Leperapia Clinic

**Gestão de uma clínica de psicologia, do primeiro contato ao acompanhamento das sessões.**

Next.js 16 · NestJS 11 · PostgreSQL · Aplicativo de pacientes com Expo SDK 58

[🌐 Site e portal](https://lepera-clinic.vercel.app) · [⬇️ APK Android](https://github.com/GuxtavoPereira/lepera-clinic/releases/download/android-v0.1.0-preview.1/leperapia-paciente-0.1.0-android-preview-arm64.apk) · [📋 Checklist de conclusão](CHECKLIST.md) · [📱 Código mobile](https://github.com/GuxtavoPereira/lepera-clinic-mobile) · [🗂️ Trello](https://trello.com/b/gbfJq3qw/lepera-clinic)

</div>

## Estado do projeto

**Documentação revisada em 14/11/2026.** O sistema web já possui os fluxos principais de pacientes, recepção, profissionais e administração. Os relatórios estão ativos. O aplicativo de pacientes tem uma prévia Android publicada, mas ainda precisa de aceite em aparelho físico e integração da sua branch à `main`.

A versão `1.0.0` do pacote não significa que todo o escopo esteja concluído. Há três telas em construção, integrações aguardando validação real e tarefas de preparação para operação. A [checklist canônica](CHECKLIST.md) reúne o que está entregue, o que falta implementar, o que falta testar e as decisões pendentes. Não há uma release formal web/API publicada no GitHub até esta revisão.

| Referência verificada | Estado em 14/11/2026 |
| --- | --- |
| Web/API — `main` | Código em [`db5747d`](https://github.com/GuxtavoPereira/lepera-clinic/commit/db5747d6e2f7da585ceecebe53edf72fef7c7095), CI aprovada e frontend/backend publicados nesse commit |
| Mobile — `codex/v1.2-expo-sdk-58` | SDK 58 em [`a7fe849`](https://github.com/GuxtavoPereira/lepera-clinic-mobile/commit/a7fe849ef807636dcbe7a0f1149c3db92b97886f); [PR #1](https://github.com/GuxtavoPereira/lepera-clinic-mobile/pull/1) aberto |
| Android | [Prévia disponível neste repositório](https://github.com/GuxtavoPereira/lepera-clinic/releases/tag/android-v0.1.0-preview.1), ARM64, assinatura de teste, API de demonstração na rede local |
| Gmail | Variáveis SMTP presentes no backend de produção; entrega real e recuperação completa ainda precisam de aceite |
| Google | ID do cliente configurado e fluxo de consulta temporária implementado; autenticação interativa com conta real ainda precisa de aceite |

## Navegação do README

- [Acessos e usuários de teste](#acessos-e-usuários-de-teste)
- [Funcionalidades e permissões](#funcionalidades-e-permissões)
- [Arquitetura](#arquitetura)
- [Rodar web e API localmente](#rodar-web-e-api-localmente)
- [Google e recuperação de senha](#google-e-recuperação-de-senha)
- [Aplicativo e Expo Go](#aplicativo-e-expo-go)
- [Testes e evidências](#testes-e-evidências)
- [Publicação e manutenção](#publicação-e-manutenção)
- [Limites e próximos passos](#limites-e-próximos-passos)

## Acessos e usuários de teste

| Serviço | Endereço |
| --- | --- |
| Site público e portal | [lepera-clinic.vercel.app](https://lepera-clinic.vercel.app) |
| Login | [Entrar no sistema](https://lepera-clinic.vercel.app/auth/login) |
| API | [lepera-clinic-backend.vercel.app/api](https://lepera-clinic-backend.vercel.app/api) |
| Saúde da API e conexão com o banco | [Health check](https://lepera-clinic-backend.vercel.app/api/health) |
| Código mobile | [lepera-clinic-mobile](https://github.com/GuxtavoPereira/lepera-clinic-mobile) |
| Referência visual | [Clinical Project no Figma](https://www.figma.com/design/ULPrWNUl7Fo9ITcJCmuNIC/Clinical-Project?node-id=305-373) |

A API é um serviço HTTP; sua URL base não abre a interface. A hospedagem utiliza os projetos Vercel `lepera-clinic-front` e `lepera-clinic-backend`.

### Contas do seed local

As contas abaixo são criadas por `pnpm db:seed` em uma base de desenvolvimento vazia: **16 usuários, sendo 1 superadmin, 3 administradores, 3 recepcionistas, 3 profissionais e 6 pacientes**. A existência dessas contas no seed não garante que todas estejam provisionadas no ambiente publicado.

**Senha padrão de demonstração: `Senha@123`**, salvo quando substituída por `SEED_PASSWORD` antes da carga. Os dados são sintéticos; os e-mails não devem ser usados para testar entrega real de mensagens. Endereços `.invalid` não recebem e-mails.

| Perfil | E-mail | Demonstração |
| --- | --- | --- |
| Superadministrador | `super@leperapia.com` | Gestão de administradores e operações administrativas autorizadas |
| Administração | `admin@leperapia.com` | Painel, usuários, financeiro, estoque e relatórios |
| Administração | `admin2@demo.invalid` | Segundo acesso administrativo |
| Administração | `admin3@demo.invalid` | Terceiro acesso administrativo |
| Recepção | `recepcao@leperapia.com` | Pacientes, solicitações, agenda e recebimentos |
| Recepção | `mariana.recepcao@leperapia.com` | Segundo acesso de recepção |
| Recepção | `recepcao3@demo.invalid` | Terceiro acesso de recepção |
| Profissional | `roberto.silva@leperapia.com` | Agenda, disponibilidade e prontuários vinculados |
| Profissional | `camila.almeida@leperapia.com` | Segundo profissional e isolamento dos atendimentos |
| Profissional | `profissional3@demo.invalid` | Terceiro profissional e configuração de disponibilidade |
| Paciente | `lucas.paciente@email.com` | Calendário, solicitação, consultas e perfil |
| Paciente | `beatriz.oliveira@email.com` | Consultas e lista de espera |
| Paciente | `rafael.santos@email.com` | Isolamento entre pacientes |
| Paciente | `isabela.ferreira@email.com` | Cadastro e histórico de demonstração |
| Paciente | `pedro.carvalho@email.com` | Cadastro e histórico de demonstração |
| Paciente | `sofia.rodrigues@email.com` | Cadastro e histórico de demonstração |

### Roteiro de demonstração

1. Apresente a Home, a equipe, os ambientes ilustrativos, Sobre e Contato; alterne o tema claro/escuro.
2. Entre como paciente, escolha um profissional e uma vaga futura, confirme a modalidade e envie a solicitação.
3. Entre como recepção, analise o pedido e aprove o mesmo horário. Confira a consulta na agenda e a notificação do paciente.
4. Entre como profissional, consulte a própria agenda, abra **Ver ficha**, registre uma sessão elegível e assine o prontuário fictício.
5. Entre como administração e apresente os indicadores, filtros, financeiro, estoque e relatórios PDF/CSV.
6. Demonstre a remarcação em outra consulta futura sem prontuário ou cobrança ativa, preservando o registro anterior.

Use somente a base de demonstração. O fluxo Google e o recebimento de e-mail precisam de uma conta controlada pelo responsável pelo teste.

## Funcionalidades e permissões

| Área | O que já existe | Limite importante |
| --- | --- | --- |
| Site público | Landing page inspirada no Figma, equipe da clínica com detalhes, fotos ilustrativas, Sobre, Contato, tema claro/escuro | O contato prepara uma mensagem no aplicativo de e-mail do visitante; não é uma caixa de atendimento no backend |
| Cadastro e acesso | CPF obrigatório, único e com dígitos verificadores válidos; login, cadastro público e interno; perfil e recuperação de senha | Validar CPF não comprova identidade; e-mail de boas-vindas/verificação de endereço ainda não está implementado |
| Paciente | Consultas próprias, calendário, horários livres, solicitação exata ou flexível, cancelamento conforme regras e lista de espera | Solicitação enviada ainda não reserva nem confirma uma vaga |
| Recepção | Busca e cadastro de pacientes, ficha cadastral, aprovação/recusa, encaixe, agenda, remarcação, cancelamentos e recebimentos | Não acessa conteúdo do prontuário clínico |
| Profissional | Disponibilidade, agenda própria, lista e resumo dos pacientes vinculados, registro e assinatura de sessão | Só acessa prontuários de atendimentos autorizados; escalas ainda não estão completas |
| Administração | Usuários, indicadores com filtros, busca de pacientes, financeiro, estoque, relatórios e auditoria | Não recebe acesso automático ao conteúdo clínico |
| Superadministração | Gestão de administradores e operações administrativas ampliadas | Também não recebe acesso irrestrito a prontuários |
| Notificações | Avisos internos de decisões e alterações, leitura individual e atalhos para consultas | Push e lembretes automáticos ainda pendentes |
| Relatórios | Consulta, indicadores e exportação PDF/CSV com escopo por perfil | Relatório de satisfação existe, mas a coleta de avaliações ainda está incompleta |

### Rotas principais

| Acesso | Rotas |
| --- | --- |
| Público | `/`, `/about`, `/contact`, `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` |
| Prévia Google | `/explore/calendar` |
| Compartilhado autenticado | `/profile`, `/notifications`, `/reports`, `/settings/security` |
| Paciente | `/patient/dashboard`, `/patient/calendar`, `/patient/appointments`, `/patient/request-appointment`, `/patient/waitlist`, `/patient/profile` |
| Recepção | `/reception/dashboard`, `/reception/patients`, `/reception/patients/[id]`, `/reception/requests`, `/reception/calendar`, `/reception/appointments`, `/reception/appointments/new`, `/reception/waitlist`, `/reception/payments`, `/reception/profile` |
| Profissional | `/doctor/dashboard`, `/doctor/calendar`, `/doctor/availability`, `/doctor/patients`, `/doctor/clinical-history/[patientId]`, `/doctor/records`, `/doctor/session/[id]`, `/doctor/profile` |
| Administração | `/admin/dashboard`, `/admin/users`, `/admin/patients/[id]`, `/admin/appointments/today`, `/admin/financial`, `/admin/inventory`, `/admin/inventory/movements` |

Os identificadores entre colchetes são preenchidos pela navegação. Os grupos `(public)` e `(dashboard)` organizam o código e não aparecem na URL. O menu limita os caminhos visíveis; **a API aplica a autorização de cada operação**.

### Agenda e atendimento

- Grade **semanal ou diária**, cores por profissional, legenda, filtro, navegação por data e horários exibidos em `America/Sao_Paulo`.
- O paciente vê as próprias consultas e vagas futuras disponíveis; a prévia Google vê somente equipe e disponibilidade, sem dados dos pacientes.
- A solicitação **EXACT** preserva profissional e horário escolhido. A recepção decide sobre essa vaga; a aprovação verifica novamente os conflitos.
- **Encaixe** permite flexibilidade de horário, com atribuição e justificativa pela equipe. Não permite sobrepor atendimentos do mesmo paciente ou profissional.
- O cancelamento pelo paciente tem antecedência mínima de 24 horas. A possível regra adicional de 24 horas para solicitar/aprovar ainda depende de decisão; não é a mesma regra.
- A **remarcação** é autorizada na API para recepção/admin/superadmin e está disponível na agenda da recepção. Mantém participantes, duração, modalidade, tipo e local; preserva a origem como **Remarcada**, cria o novo agendamento e notifica os envolvidos.
- Só é possível remarcar consulta futura agendada/confirmada, sem prontuário, avaliação, cobrança ativa ou pedido de cancelamento pendente. Troca de profissional e transferência de pagamentos não fazem parte desse fluxo.
- A assinatura do prontuário bloqueia sua edição e marca o atendimento como realizado. Trata-se de assinatura interna do sistema; não representa certificação de assinatura digital qualificada.

Os endpoints autenticados `/api/appointments/calendar` e `/api/appointments/available-slots` recebem `from`, `to` e `doctorId` opcional. As datas usam `AAAA-MM-DD`, início inclusivo, fim exclusivo e intervalo máximo de 42 dias.

### Financeiro, estoque e relatórios

**Financeiro:** administração/superadmin usam `/admin/financial`; recepção usa `/reception/payments`, limitada a receitas e cobranças. Há lançamento pendente, quitação integral, cancelamento, estorno do registro, reabertura autorizada e exportação CSV. Uma consulta pode ter um lançamento vinculado. O saldo é a diferença entre receitas e despesas quitadas **com vencimento no período filtrado**, não o saldo bancário.

Pagamentos são registrados manualmente. O sistema não movimenta dinheiro, não devolve valores no banco, não emite nota fiscal e não oferece parcelamento ou pagamento parcial. Alterações são auditadas; versões desatualizadas e quitações duplicadas são recusadas.

**Estoque:** materiais, saldo mínimo, entradas/saídas justificadas e histórico com responsável. Materiais novos começam com saldo zero; entradas registram o saldo inicial. O alerta considera saldo igual ou inferior ao mínimo. Movimentações não podem deixar saldo negativo.

**Relatórios ativos em `/reports`:** consultas, financeiro, estoque, profissionais, demanda, pacientes, movimentações de estoque, satisfação e auditoria. Administração/superadmin acessam os nove tipos; os demais papéis acessam consultas dentro do próprio escopo. Período inclusivo de até 366 dias, exportação até 5.000 registros e prévia até 100 linhas. São relatórios operacionais, não documentos psicológicos formais ou documentos fiscais.

### Busca, perfil e segurança

O menu da conta abre o perfil correto. **Buscar** ou `/` oferece páginas permitidas; recepção/admin/superadmin também pesquisam pacientes por nome, e-mail ou CPF. Indicadores relevantes levam a listagens filtradas. Formulários agrupam acesso, dados pessoais e contato/plano, com validação de campos.

O backend valida papel atual, usuário ativo e versão da sessão. Campos clínicos são cifrados, e leituras autorizadas são auditadas. Prontuários e relatórios enviam `Cache-Control: private, no-store`. O JWT web dura até oito horas e fica no armazenamento local do navegador; o logout remove a sessão local. O reset de senha invalida sessões anteriores. Limitação distribuída de tentativas, revisão completa de armazenamento/sessões, backup e demais controles de operação estão na checklist.

## Arquitetura

| Camada | Tecnologia | Local |
| --- | --- | --- |
| Web | Next.js **16.3.2**, React **19.2.8**, Tailwind CSS 4, shadcn/ui com Base UI, Lucide | `apps/web` |
| API | NestJS 11, TypeScript, JWT, validação e autorização por recurso | `apps/api` |
| Banco | PostgreSQL 17 no Compose, Prisma **7.10.0**, adaptador PostgreSQL | `packages/database` |
| Contratos | TypeScript e Zod | `packages/contracts` |
| Desenvolvimento | Node.js **24** (`.nvmrc`), pnpm **11.24.0**, Turborepo | Raiz |
| Aplicativo | Expo **58.0.23**, React Native **0.88.1**, React **19.3.0**, Expo Router e React Native Paper **5.15.3** | Repositório separado |

```text
Navegador → Next.js ───────┐
                          ├─ HTTP → API NestJS → Prisma → PostgreSQL
Aplicativo Expo / RN ─────┘
```

Somente a API acessa o banco. Os contratos web/API são compartilhados no monorepo; o aplicativo tem seus próprios contratos, que precisam ser mantidos compatíveis.

```text
lepera-clinic/
├── apps/api/                 # Regras, autorização, endpoints e testes
├── apps/web/                 # Site público e portal por perfil
├── packages/contracts/      # Tipos e validações compartilhados
├── packages/database/       # Schema, migrations e seeds
├── scripts/qa/               # Carga local e matriz de permissões
├── docs/qa/                  # Evidências e limites dos testes
├── .github/workflows/        # CI
├── docker-compose.yml       # PostgreSQL local
├── CHECKLIST.md              # Pendências canônicas de conclusão
└── README.md
```

## Rodar web e API localmente

### 1. Preparar e instalar

Requisitos: Node.js 24, Git, pnpm 11.24.0 e Docker com Compose ou PostgreSQL próprio.

```bash
npm install --global pnpm@11.24.0
git clone https://github.com/GuxtavoPereira/lepera-clinic.git
cd lepera-clinic
pnpm install --frozen-lockfile
docker compose up -d postgres
docker compose ps
```

Aguarde `postgres` ficar `healthy`. O Compose usa banco `lepera_db`, usuário `lepera`, senha local `lepera_dev` e porta `5432`. Se utilizar outro PostgreSQL, ajuste as URLs abaixo.

**PowerShell:** se a política de execução bloquear scripts, use `npm.cmd`, `pnpm.cmd` e `npx.cmd` no lugar de `npm`, `pnpm` e `npx`. Não é necessário mudar a política do computador.

### 2. Criar os arquivos de ambiente

Crie os três arquivos abaixo com valores locais. Não reutilize a chave ilustrativa dos arquivos de exemplo como segredo de um ambiente real.

**`apps/api/.env`**

```dotenv
NODE_ENV=development
PORT=3333
DATABASE_URL="postgresql://lepera:lepera_dev@localhost:5432/lepera_db?schema=public"
JWT_SECRET="SUBSTITUA_POR_UMA_CHAVE_ALEATORIA"
ENCRYPTION_KEY="SUBSTITUA_POR_64_CARACTERES_HEXADECIMAIS"
WEB_URL="http://localhost:3000"
TRUST_PROXY=0
```

**`apps/web/.env.local`**

```dotenv
NEXT_PUBLIC_API_URL="http://localhost:3333"
```

**`packages/database/.env`**

```dotenv
NODE_ENV=development
DATABASE_URL="postgresql://lepera:lepera_dev@localhost:5432/lepera_db?schema=public"
ENCRYPTION_KEY="MESMA_CHAVE_DE_ENCRYPTION_KEY_DA_API"
```

Gere duas chaves diferentes executando duas vezes:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use uma em `JWT_SECRET` e outra em `ENCRYPTION_KEY`. API e seed precisam da **mesma chave de criptografia e da mesma base/schema**. Preserve essa chave enquanto existirem registros cifrados com ela.

A URL pública da API no **web não inclui `/api`** nem barra final: o cliente adiciona o prefixo. Arquivos `.env.local` têm precedência sobre `.env`; confira ambos se uma configuração parecer ignorada. Arquivos com segredos são ignorados pelo Git.

### 3. Preparar o banco

```bash
pnpm db:generate
pnpm --filter @lepera/db migrate:deploy
pnpm db:seed
```

O último comando é apenas para **banco vazio de desenvolvimento**. Cria 16 usuários, 18 consultas, 12 prontuários fictícios cifrados e dados de apoio. O seed recusa `NODE_ENV=production` e bases com usuários; executa a carga em transação.

Para escolher outra senha, configure `SEED_PASSWORD` no ambiente do processo antes da carga. Não rode seed ao atualizar um banco que deva ser preservado.

<details>
<summary>Recriar intencionalmente uma base descartável de demonstração</summary>

`RESET_DATABASE=true` **apaga os dados da base configurada**. Confira a conexão e use somente uma base de testes que possa ser substituída. Em PowerShell:

```powershell
$env:RESET_DATABASE = "true"
pnpm.cmd db:seed
Remove-Item Env:RESET_DATABASE
```

No Linux/macOS: `RESET_DATABASE=true pnpm db:seed`.

</details>

### 4. Iniciar

```bash
pnpm dev
```

O Turborepo prepara os pacotes compartilhados e inicia web/API. Acesse [localhost:3000](http://localhost:3000) e confira [localhost:3333/api/health](http://localhost:3333/api/health), que retorna `{"status":"ok"}` quando a API alcança o banco.

Para executar a versão compilada, rode `pnpm build` e abra dois terminais na raiz: `pnpm --filter api start:prod` e `pnpm --filter web start`.

### Carga de novembro e dezembro de 2026

Após migrations e seed inicial, existe uma carga adicional **aditiva e repetível**, sem apagar consultas ou cadastros existentes:

```powershell
$env:ALLOW_DEMO_SEED = "true"
pnpm.cmd --filter @lepera/db db:presentation
Remove-Item Env:ALLOW_DEMO_SEED
```

No Linux/macOS: `ALLOW_DEMO_SEED=true pnpm --filter @lepera/db db:presentation`.

A carga usa disponibilidades cadastradas e deixa vagas livres. Na execução de referência de 02/11 foram acrescentadas 228 consultas (109 em novembro e 119 em dezembro), 16 solicitações exatas, quatro encaixes e lançamentos financeiros. Esses números descrevem aquela execução, não um total garantido para qualquer base. O período é fixo em **2026**, não se atualiza automaticamente a cada ano.

## Google e recuperação de senha

O restante do sistema pode ser desenvolvido sem essas integrações. Configure-as no **backend**, em `apps/api/.env.local` ou nas variáveis do projeto da API na Vercel:

```dotenv
GOOGLE_CLIENT_ID=SEU_ID_PUBLICO.apps.googleusercontent.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=leperapiaoficial@gmail.com
SMTP_FROM=leperapiaoficial@gmail.com
SMTP_PASSWORD=SENHA_DE_APP_PRIVADA
```

**Google:** a interface consulta `/api/auth/google/config` em tempo de execução. O fluxo oferece acesso por 30 minutos à equipe e aos horários livres; não cria paciente, não vincula contas e não permite solicitar sem concluir o cadastro obrigatório com CPF.

Cadastre a origem exata do frontend no cliente Web do Google Cloud, incluindo protocolo e porta: produção `https://lepera-clinic.vercel.app`, desenvolvimento `http://localhost:3000` e demais origens efetivamente usadas. O erro `origin_mismatch` exige conferir essa correspondência. Veja o [guia do Google Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid). `enabled: false` na configuração indica que o ambiente da API não disponibilizou o ID. Reinicie a API local após mudar suas variáveis.

**Gmail:** use a senha de app, com verificação em duas etapas, no campo privado `SMTP_PASSWORD`. Na Vercel, ela deve ser **Sensitive**, aplicada ao ambiente correto, seguida de nova implantação. Nunca coloque essa senha no código ou em `NEXT_PUBLIC_*`/`EXPO_PUBLIC_*`.

Em 14/11, foi confirmada a presença das variáveis SMTP de produção, incluindo a senha protegida, sem ler ou divulgar o valor. Isso não comprova credenciais válidas nem entrega na caixa postal. O aceite pendente é solicitar a recuperação para um e-mail controlado, receber o link, redefinir a senha e verificar expiração, uso único e rejeição da sessão antiga. Tokens de recuperação duram 30 minutos. Cadastro com mensagem de boas-vindas/verificação de e-mail ainda é uma etapa separada.

## Aplicativo e Expo Go

O **Leperapia Paciente** é um aplicativo nativo separado, exclusivo para pacientes nesta fase. Usa **Expo SDK 58**, Expo Router e **React Native Paper 5 / Material Design 3** para os componentes. Tem login de conta existente, início, consultas, solicitações por horário exato, calendário, perfil de leitura, temas, atualização e logout. No dispositivo nativo, a sessão utiliza SecureStore; na prévia web, o token fica em memória.

### Abrir a versão atual no celular

A `main` mobile ainda contém a base anterior. Até a integração do PR #1, clone explicitamente a branch com SDK 58:

```powershell
git clone --branch codex/v1.2-expo-sdk-58 https://github.com/GuxtavoPereira/lepera-clinic-mobile.git
cd lepera-clinic-mobile
npm.cmd ci
Copy-Item .env.example .env
npm.cmd start -- --go --lan
```

Execute a cópia de `.env.example` apenas na configuração inicial. Ajuste `.env` com a API desejada antes de iniciar. Celular e computador devem estar na mesma rede; use uma versão do Expo Go compatível com SDK 58 e leia o QR code. Os detalhes e alternativas estão no [README da branch mobile](https://github.com/GuxtavoPereira/lepera-clinic-mobile/blob/codex/v1.2-expo-sdk-58/README.md).

```dotenv
EXPO_PUBLIC_API_URL=https://lepera-clinic-backend.vercel.app/api
```

**No aplicativo, a URL inclui `/api`.** Para uma API sintética local, use o IP do computador, por exemplo `http://192.168.1.100:3333/api`, substituindo o endereço. `localhost` no celular é o próprio celular. A porta da API precisa estar acessível na rede. A prévia no navegador (`npm.cmd run web`) também exige que `WEB_URL` da API autorize sua origem.

### APK existente e próximas builds

**[⬇️ Baixar APK Android — Leperapia Paciente](https://github.com/GuxtavoPereira/lepera-clinic/releases/download/android-v0.1.0-preview.1/leperapia-paciente-0.1.0-android-preview-arm64.apk)**

O APK está nos [Releases deste repositório](https://github.com/GuxtavoPereira/lepera-clinic/releases/tag/android-v0.1.0-preview.1), com instruções e arquivo de verificação SHA-256. É o mesmo artefato da [prévia mobile original](https://github.com/GuxtavoPereira/lepera-clinic-mobile/releases/tag/v0.1.0-preview.1), sem recompilação: `leperapia-paciente-0.1.0-android-preview-arm64.apk`, 31.019.965 bytes, pacote `com.leperapia.paciente.preview`.

No Android ARM64, baixe e abra o arquivo; permita a instalação dessa origem quando solicitado e abra **Leperapia Paciente (Prévia)**. Para login e agenda, mantenha o celular na rede da API de demonstração `http://192.168.1.111:8083/api`, com a API ligada. Alterar o `.env` no PC não muda o endereço incluído neste APK; outra API exige nova build.

- JavaScript incluído; não precisa do Metro ou Expo Go para abrir.
- Login e consultas dependem da **API sintética na LAN indicada na release**. Não é uma edição autônoma conectada à produção.
- Assinatura de teste, sem distribuição na Play Store. Aceite físico e iOS ainda pendentes.
- SHA-256: `87fda6ceacfd77792f08b7a762dea66a334543629f91f5ec77d470ed14a55fac`.

`eas.json` já define development, preview APK e production AAB. Ainda é necessário concluir o vínculo/configuração de distribuição, assinatura de produção e homologação nativa. Edição de perfil, cancelamento, recuperação dentro do app e notificações fazem parte da [checklist](CHECKLIST.md#aplicativo-de-pacientes).

## Testes e evidências

Os resultados abaixo são **evidências das rodadas registradas**, não uma promessa de ausência de bugs nem uma nova execução de toda a suíte nesta revisão documental.

| Verificação | Resultado mais recente registrado | Evidência e limites |
| --- | --- | --- |
| CI web/API — 14/11 | Lint, tipos, builds; **462 testes API + 6 financeiro web + 3 datas web + 5 utilitários QA = 476** | [Execução no GitHub](https://github.com/GuxtavoPereira/lepera-clinic/actions/runs/43641624683) |
| Autorização HTTP — 14/11 | **91 verificações**, sete contas sintéticas/cinco papéis; isolamento clínico, relatórios, notificações e sessão | [Permissões e privacidade](docs/qa/permissoes-privacidade.md); Google com token sintético, sem login interativo real |
| Carga local — 13/11, conferida 14/11 | **99.831 respostas HTTP 200**; 10/50/200 usuários virtuais por 60 s cada; p95 **493,2 ms** com 200 usuários | [Relatório de carga](docs/qa/relatorio-carga.md); base pequena, loopback, somente leitura; não mede capacidade da Vercel |
| Agenda e interface | Concorrência, remarcação, autoria, notificações, temas e verificações em 390/1440 px registradas | [Validação 1.2](docs/qa/validacao-1.2.md); cobertura por fluxo, não aceite de todas as telas/dispositivos |
| Mobile — 09–10/11 | Lint, tipos, exportações web/Android e **Expo Doctor 20/20**, CI aprovada | [CI mobile](https://github.com/GuxtavoPereira/lepera-clinic-mobile/actions/runs/42831316430); falta aceite em Android físico |

### Comandos de desenvolvimento e verificação

Execute na raiz do monorepo:

| Comando | Finalidade |
| --- | --- |
| `pnpm dev` / `pnpm dev:web` / `pnpm dev:api` | Iniciar os serviços locais |
| `pnpm db:generate` | Gerar cliente Prisma |
| `pnpm --filter @lepera/db migrate:deploy` | Aplicar migrations versionadas |
| `pnpm db:migrate` | Criar/aplicar migration em desenvolvimento |
| `pnpm db:seed` / `pnpm db:studio` | Carregar demo / inspecionar banco |
| `pnpm lint` / `pnpm check-types` / `pnpm build` | Padrões, tipos e compilação |
| `pnpm --filter api test --runInBand` | Suíte da API |
| `pnpm --filter web test:financial` | Valores e exportação financeira |
| `pnpm --filter web test:dates` | Formatação e fuso das datas |
| `pnpm test:qa` | Utilitários e proteções da carga |
| `pnpm qa:permissions` | Matriz HTTP em base sintética local |
| `pnpm qa:load` | Carga de leitura em base sintética local |

Os executores de permissões e carga têm configuração própria: siga os documentos de QA antes de rodar. A matriz registra leituras autorizadas na auditoria e cria/remove notificações temporárias; não é uma operação sem qualquer escrita. Não use esses executores contra produção.

## Publicação e manutenção

Frontend e backend são projetos Vercel separados, ligados ao GitHub. Configure cada ambiente de forma independente; o frontend usa `NEXT_PUBLIC_API_URL`, e a API depende de `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `WEB_URL` e das integrações habilitadas.

Para atualizar uma base existente: obtenha backup adequado, confira a versão e a conexão, execute `pnpm db:generate` e `pnpm --filter @lepera/db migrate:deploy`, e publique a versão compatível. **Atualização não exige reset nem seed.** Não substitua a chave de criptografia sem um procedimento de migração dos dados. Confira API, banco, login e fluxos afetados após a publicação.

A migration `20261110150000_notification_appointment_link` é necessária para os atalhos novos das notificações e preserva avisos anteriores. As migrations financeiras também devem estar aplicadas; use a sequência versionada completa. O retorno à versão anterior precisa considerar a compatibilidade do banco.

Para criar um superadmin fora do seed, `pnpm db:super-admin` exige `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` (mínimo 12 caracteres) e `SUPER_ADMIN_CPF`; `SUPER_ADMIN_NAME` é opcional. O comando pode redefinir uma conta de superadmin existente. Forneça valores por ambiente privado, não pelo histórico de comandos compartilhado.

### Problemas comuns

| Sintoma | Conferir |
| --- | --- |
| PowerShell bloqueia um comando | Usar o executável `.cmd`, sem executar o `.ps1` bloqueado |
| API não conecta ao banco | PostgreSQL iniciado, porta, URL e schema iguais nos arquivos da API/banco |
| Seed recusa execução | Base vazia de desenvolvimento, chave válida e senha de demo compatível |
| Erro ao ler campos clínicos | Mesma `ENCRYPTION_KEY` usada na gravação; não gerar outra para tentar corrigir |
| Web não alcança a API | API na porta configurada; `NEXT_PUBLIC_API_URL` sem `/api`; reiniciar após alteração |
| CORS no navegador | `WEB_URL` igual à origem aberta, incluindo porta |
| Google indisponível / `origin_mismatch` | Configuração pública da API e origens do cliente Google |
| Recuperação não chega | Variáveis SMTP no backend/ambiente implantado, senha de app válida, destinatário controlado e caixa de spam |
| Expo não conecta | Branch SDK 58, `.env` com `/api`, IP acessível, mesma rede e porta liberada |
| Login do seed falha | Contas provisionadas na base usada pela API e senha padrão ou `SEED_PASSWORD` correta |

## Limites e próximos passos

A lista detalhada, priorizada e com critérios de aceite está em [CHECKLIST.md](CHECKLIST.md). Os pontos mais imediatos são:

1. Concluir escalas em `/doctor/session/[id]/scales` e avaliações em `/patient/reviews/[appointmentId]`.
2. Resolver a tela `/reception/new-session`, hoje em construção, alinhando o fluxo de quatro etapas ao agendamento funcional em `/reception/appointments/new`.
3. Validar Google e recuperação real por Gmail; concluir a comunicação de cadastro planejada.
4. Integrar o PR mobile, homologar em aparelho físico e preparar distribuição com API estável e assinatura apropriada.
5. Fechar decisões da agenda, completar validação de usabilidade/acessibilidade e preparar segurança, backups, monitoramento e operação.

SaaS multiclínica, Electron, pagamento online/fiscal e login Google completo são expansões/decisões de escopo, não funcionalidades prontas. A versão atual é para uma clínica, com app de pacientes. Os controles existentes não equivalem a certificação de conformidade ou autorização de uso com dados reais.

## Créditos e contexto acadêmico

Projeto de **Análise e Projeto de Sistemas**, curso de **Análise e Desenvolvimento de Sistemas — Centro Universitário Módulo**. Docente: **Cristiano S. Negrão**. Planejamento no [Trello](https://trello.com/b/gbfJq3qw/lepera-clinic); contribuição e histórico no [GitHub](https://github.com/GuxtavoPereira/lepera-clinic).

A referência visual é o Clinical Project no Figma, adaptada à identidade Leperapia Clinic. As fotos de ambientes são ilustrativas, de [Beyza Kılıçdere](https://www.pexels.com/photo/modern-minimalist-living-room-interior-design-28905874/), [Dilan Turhan](https://www.pexels.com/photo/potted-indoor-plant-by-a-minimalist-couch-34909829/), [Renee B](https://www.pexels.com/photo/modern-office-waiting-area-with-chairs-and-plant-29637410/) e [Tori Gordon](https://www.pexels.com/photo/beige-sofa-with-cushions-in-the-middle-of-a-living-room-24304750/), sob a [licença do Pexels](https://www.pexels.com/license/). Não representam instalações ou profissionais reais da clínica.

`work/` e `outputs/` são materiais locais ignorados pelo Git. Documentos acadêmicos e capturas de referência são entregues separadamente; as telas são implementadas em código. O [registro de preparação da 1.0 de 02/11](docs/release-1.0.md) é histórico; o estado atual é o deste README e da checklist.
