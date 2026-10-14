<div align="center">

# 🧠 Leperapia Clinic

### Gestão clínica com foco em saúde mental

Projeto acadêmico para organizar pacientes, consultas e a rotina de uma clínica de psicologia.

**Next.js 16 · React 19 · NestJS 11 · Prisma 7 · PostgreSQL**

[🌐 Acessar o sistema](https://lepera-clinic.vercel.app) · [💻 GitHub](https://github.com/GuxtavoPereira/lepera-clinic) · [📋 Trello](https://trello.com/b/gbfJq3qw/lepera-clinic)

</div>

---

## 📌 Sobre o projeto

O **Leperapia Clinic** centraliza informações que, em uma rotina manual, ficam distribuídas entre papéis, planilhas e agendas. O sistema conecta pacientes, profissionais, recepção e administração, com funcionalidades disponíveis conforme o perfil de acesso.

O objetivo é facilitar o cadastro e a localização de pacientes, organizar solicitações e consultas, reduzir conflitos de agenda e apoiar o registro das sessões clínicas.

### Funcionalidades implementadas

- **Área pública:** Home, Sobre nós, Contato / Agende, login e cadastro de paciente.
- **Pacientes:** perfil, solicitação de atendimento, acompanhamento de consultas e lista de espera.
- **Recepção:** cadastro, busca e ficha de pacientes; análise de solicitações; agenda e cancelamentos.
- **Profissionais:** agenda, disponibilidade de atendimento e prontuários das sessões vinculadas ao profissional.
- **Administração:** painel e gestão de usuários, com permissões específicas para o superadministrador.
- **Regras e segurança:** CPF obrigatório, único e validado por dígitos verificadores; controle de acesso na API; criptografia dos campos clínicos e auditoria das operações previstas.

## 🌐 Acessos na Vercel

| Serviço | Endereço |
| --- | --- |
| **Sistema web** | **[lepera-clinic.vercel.app](https://lepera-clinic.vercel.app)** |
| Login | [Acessar área restrita](https://lepera-clinic.vercel.app/auth/login) |
| API | [lepera-clinic-backend.vercel.app/api](https://lepera-clinic-backend.vercel.app/api) |
| Verificação da API e do banco | [Consultar health check](https://lepera-clinic-backend.vercel.app/api/health) |

A interface e a API são hospedadas em projetos separados: `lepera-clinic-front` e `lepera-clinic-backend`. A API é um serviço HTTP; sua URL base não é uma página com a interface do sistema.

## 🧪 Usuários de teste

As contas abaixo são criadas pelo **seed de demonstração**. São dados fictícios para desenvolvimento e apresentação acadêmica. No ambiente publicado, o acesso depende de o banco conectado à API conter esse mesmo seed.

**Senha padrão de todas as contas: `Senha@123`**

| Perfil | E-mail | O que demonstrar |
| --- | --- | --- |
| Superadministrador | `super@leperapia.com` | Gestão de administradores e recursos autorizados |
| Administrador | `admin@leperapia.com` | Painel e gestão de usuários permitidos |
| Recepção | `recepcao@leperapia.com` | Pacientes, fichas, solicitações e agenda |
| Recepção | `mariana.recepcao@leperapia.com` | Segundo acesso de recepção |
| Profissional | `roberto.silva@leperapia.com` | Agenda, disponibilidade e prontuários próprios |
| Profissional | `camila.almeida@leperapia.com` | Segundo profissional e isolamento dos atendimentos |
| Paciente | `lucas.paciente@email.com` | Perfil, consultas e solicitação de atendimento |

<details>
<summary><strong>Ver os demais pacientes de demonstração</strong></summary>

| Paciente | E-mail |
| --- | --- |
| Beatriz Oliveira | `beatriz.oliveira@email.com` |
| Rafael Santos | `rafael.santos@email.com` |
| Isabela Ferreira | `isabela.ferreira@email.com` |
| Pedro Carvalho | `pedro.carvalho@email.com` |
| Sofia Rodrigues | `sofia.rodrigues@email.com` |

Todos utilizam a mesma senha padrão indicada acima, salvo se `SEED_PASSWORD` tiver sido personalizado na criação da base.

</details>

### Roteiro rápido para apresentar

1. Abra a **Home**, navegue por **Sobre nós** e **Contato / Agende**.
2. Entre com `recepcao@leperapia.com` e a senha de demonstração.
3. Abra **Pacientes**, pesquise por `Lucas` e selecione o registro.
4. Confira a ficha cadastral e as últimas consultas; use **Voltar para pacientes**.
5. Saia e entre como paciente para acompanhar consultas ou solicitar atendimento.

> O cadastro e a lista de pacientes da recepção ficam disponíveis para **recepção e superadministrador**. O administrador possui sua própria área de gestão.

## 🛠️ Tecnologias e arquitetura

O projeto utiliza um **monorepo TypeScript** com pnpm Workspaces e Turborepo.

| Camada | Tecnologias | Diretório |
| --- | --- | --- |
| Interface | Next.js 16, React 19, Tailwind CSS 4 e shadcn/ui com Base UI | `apps/web` |
| API e regras de negócio | NestJS 11, JWT, validação de dados e autorização por perfil | `apps/api` |
| Persistência | PostgreSQL, Prisma ORM 7 e adaptador PostgreSQL | `packages/database` |
| Contratos compartilhados | TypeScript e Zod | `packages/contracts` |
| Ferramentas | Node.js 24, pnpm 11.24.0 e Turborepo | Raiz |

```text
Navegador → Next.js → API NestJS → Prisma → PostgreSQL
```

O navegador acessa a API por HTTP. Somente o backend se comunica com o banco; as credenciais de persistência não são enviadas à interface.

```text
lepera-clinic/
├── apps/
│   ├── api/                  # API NestJS e regras de negócio
│   └── web/                  # Interface Next.js com App Router
├── packages/
│   ├── contracts/            # Tipos e validações compartilhados
│   └── database/             # Pacote @lepera/db
│       ├── prisma/           # Schema, migrações e seed
│       └── prisma.config.ts
├── .github/workflows/        # Integração contínua
├── docker-compose.yml        # PostgreSQL local
├── pnpm-workspace.yaml
└── turbo.json
```

## 🚀 Como rodar localmente

### 1. Preparar o ambiente

Instale:

- **Node.js 24**, conforme `.nvmrc`.
- **pnpm 11.24.0**, conforme `packageManager` do projeto.
- **Git** para clonar o repositório.
- **Docker com Compose** para iniciar o PostgreSQL, ou uma instalação própria do PostgreSQL.

Com Node.js instalado, o pnpm pode ser instalado com:

```bash
npm install --global pnpm@11.24.0
```

Clone o projeto e instale as dependências:

```bash
git clone https://github.com/GuxtavoPereira/lepera-clinic.git
cd lepera-clinic
pnpm install --frozen-lockfile
```

> **Windows / PowerShell:** se a política do sistema bloquear `pnpm.ps1`, utilize `pnpm.cmd` no lugar de `pnpm`. Não é necessário alterar a política de execução.

### 2. Iniciar o PostgreSQL

Na raiz do projeto:

```bash
docker compose up -d postgres
docker compose ps
```

Aguarde o serviço ficar saudável (`healthy`). A configuração de desenvolvimento é:

| Configuração | Valor |
| --- | --- |
| Banco | `lepera_db` |
| Usuário | `lepera` |
| Senha local | `lepera_dev` |
| Porta | `5432` |

Se utilizar PostgreSQL próprio, crie o banco e ajuste a URL de conexão nos arquivos de ambiente da próxima etapa.

### 3. Configurar os arquivos de ambiente

Crie os três arquivos abaixo. As chaves são marcadores: substitua-as pelos valores gerados localmente.

**Backend — `apps/api/.env`**

```env
NODE_ENV=development
PORT=3333
DATABASE_URL="postgresql://lepera:lepera_dev@localhost:5432/lepera_db?schema=public"
JWT_SECRET="COLE_AQUI_UMA_CHAVE_ALEATORIA"
ENCRYPTION_KEY="COLE_AQUI_64_CARACTERES_HEXADECIMAIS"
WEB_URL="http://localhost:3000"
TRUST_PROXY=0
```

**Frontend — `apps/web/.env.local`**

```env
NEXT_PUBLIC_API_URL="http://localhost:3333"
```

**Banco e seed — `packages/database/.env`**

```env
NODE_ENV=development
DATABASE_URL="postgresql://lepera:lepera_dev@localhost:5432/lepera_db?schema=public"
ENCRYPTION_KEY="COLE_A_MESMA_CHAVE_DE_ENCRYPTION_KEY_DA_API"
```

Gere duas chaves diferentes executando este comando **duas vezes**:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use um resultado em `JWT_SECRET` e o outro em `ENCRYPTION_KEY`. Cada resultado contém 64 caracteres hexadecimais.

**Confira antes de continuar:**

- `DATABASE_URL` da API e do pacote de banco deve apontar para **a mesma base e schema**.
- `ENCRYPTION_KEY` do seed deve ser **idêntica à da API**, para permitir a leitura dos prontuários fictícios criptografados.
- `NEXT_PUBLIC_API_URL` deve conter somente a origem, **sem `/api` e sem barra final**. O cliente acrescenta `/api` automaticamente.
- Se existir `apps/web/.env`, confira se ele é consistente com `.env.local`, que tem precedência.
- Mantenha os arquivos `.env` fora do Git. Preserve a chave de criptografia enquanto houver dados dependentes dela.

### 4. Gerar o Prisma e aplicar as migrações

Execute na raiz:

```bash
pnpm db:generate
pnpm --filter @lepera/db migrate:deploy
```

Esse procedimento aplica as migrações já versionadas. Em uma base nova, o schema completo será criado, incluindo a obrigatoriedade do CPF.

### 5. Carregar os dados de demonstração

Em um **banco de desenvolvimento vazio**:

```bash
pnpm db:seed
```

O seed cria **12 usuários, 6 pacientes, 18 consultas e 12 prontuários fictícios criptografados**, além de disponibilidade dos profissionais e dados de apoio. Os CPFs são valores de teste com dígitos verificadores válidos.

A carga acontece em uma transação. A chave de criptografia e a senha são verificadas antes da alteração dos dados. O seed recusa execução com `NODE_ENV=production` e, por padrão, também recusa um banco que já contenha usuários.

<details>
<summary><strong>Recriar uma base de demonstração que já contém dados</strong></summary>

**Esta opção apaga os registros existentes do banco configurado e recria os mocks. Use apenas em uma base de desenvolvimento que possa ser substituída.**

No PowerShell:

```powershell
$env:RESET_DATABASE = "true"
pnpm.cmd db:seed
Remove-Item Env:RESET_DATABASE
```

No Linux/macOS:

```bash
RESET_DATABASE=true pnpm db:seed
```

É possível personalizar a senha dos mocks com `SEED_PASSWORD` (8 a 72 caracteres) no ambiente do processo. Nesse caso, as contas passam a utilizar essa senha em vez de `Senha@123`.

</details>

### 6. Iniciar frontend e backend

```bash
pnpm dev
```

O Turborepo prepara os pacotes compartilhados e inicia os dois aplicativos.

| Serviço local | Endereço |
| --- | --- |
| Interface | [http://localhost:3000](http://localhost:3000) |
| Login | [http://localhost:3000/auth/login](http://localhost:3000/auth/login) |
| API | [http://localhost:3333/api](http://localhost:3333/api) |
| Health check | [http://localhost:3333/api/health](http://localhost:3333/api/health) |

Com o banco acessível, o health check retorna:

```json
{ "status": "ok" }
```

Agora entre com uma das contas de demonstração e siga o roteiro de apresentação.

## 🧭 Páginas e navegação

| Página da entrega S10 | Rota | Acesso |
| --- | --- | --- |
| Home / landing page | `/` | Público |
| Sobre nós | `/about` | Público |
| Contato / Agende | `/contact` | Público |
| Login | `/auth/login` | Público |
| Lista de pacientes | `/reception/patients` | Recepção ou superadministrador |
| Detalhe do paciente | `/reception/patients/[id]` | Recepção ou superadministrador |

`[id]` é o identificador do paciente selecionado na lista, não um texto para digitar literalmente na URL.

**Fluxo público:** Home → Sobre nós → Contato / Agende → Cadastro ou Login.

**Fluxo da recepção:** Login → Painel → Pacientes → Busca → Ficha → Voltar para pacientes.

**Fluxo de atendimento:** paciente solicita → recepção analisa e aprova → consulta aparece na agenda. Uma solicitação pendente ainda não representa uma consulta confirmada.

As rotas estão em `apps/web/src/app`. Os grupos `(public)` e `(dashboard)` organizam os layouts e não aparecem na URL. A interface orienta a navegação por perfil, enquanto a API verifica as permissões em cada operação protegida.

## ⚙️ Comandos úteis

Execute os comandos a partir da raiz:

| Comando | Finalidade |
| --- | --- |
| `pnpm dev` | Iniciar frontend e backend |
| `pnpm dev:web` | Iniciar somente o frontend |
| `pnpm dev:api` | Iniciar somente o backend |
| `pnpm db:generate` | Gerar o cliente Prisma |
| `pnpm --filter @lepera/db migrate:deploy` | Aplicar migrações existentes |
| `pnpm db:migrate` | Criar/aplicar migrações durante desenvolvimento |
| `pnpm db:seed` | Carregar mocks em uma base de desenvolvimento vazia |
| `pnpm db:studio` | Inspecionar os dados no Prisma Studio |
| `pnpm lint` | Verificar padrões do código |
| `pnpm check-types` | Verificar os tipos TypeScript |
| `pnpm --filter api test --runInBand` | Executar testes da API |
| `pnpm build` | Compilar o monorepo |

Para executar a versão compilada, rode `pnpm build` e, em dois terminais na raiz:

```bash
# Terminal 1 — backend
pnpm --filter api start:prod
```

```bash
# Terminal 2 — frontend
pnpm --filter web start
```

A revisão da entrega S10 aprovou **182 testes da API**, além de lint, tipagem, compilação e navegação local por login → lista → detalhe. Isso registra a validação daquela revisão; novas alterações devem ser verificadas novamente.

<details>
<summary><strong>Criar um superadministrador fora do seed</strong></summary>

O comando `pnpm db:super-admin` exige `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` e `SUPER_ADMIN_CPF` no ambiente. A senha precisa ter pelo menos 12 caracteres e o CPF deve ser válido. `SUPER_ADMIN_NAME` é opcional.

Esse comando pode redefinir a senha de uma conta de superadministrador já existente. Utilize-o de forma controlada e não registre credenciais no repositório.

</details>

## 🔎 Problemas comuns ao iniciar

| Problema | O que conferir |
| --- | --- |
| Erro de conexão com PostgreSQL | Serviço iniciado, porta disponível, URL correta e mesma base nos dois arquivos de ambiente |
| CPF obrigatório impede migração de uma base antiga | Registros legados sem CPF precisam ser regularizados antes da migração; não atribua documentos inventados a pessoas reais |
| Seed informa que o banco já contém usuários | A carga não é incremental; use uma base vazia ou a opção explícita de recriação de mocks |
| Seed informa chave de criptografia inválida | Defina os mesmos 64 caracteres hexadecimais em `ENCRYPTION_KEY` da API e do banco |
| Frontend não alcança a API | API na porta `3333` e `NEXT_PUBLIC_API_URL` sem `/api` no final |
| Navegador bloqueia uma chamada entre front e API | `WEB_URL` deve ser a origem exata do frontend, inclusive a porta |
| Login dos mocks falha | Seed executado na mesma base da API e senha padrão ou `SEED_PASSWORD` correspondente |
| Porta `3000`, `3333` ou `5432` ocupada | Encerre a instância anterior ou ajuste as portas e as URLs relacionadas |

## 📦 Publicação

A Vercel utiliza dois projetos conectados ao repositório GitHub. O frontend depende de `NEXT_PUBLIC_API_URL`; o backend depende de `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY` e `WEB_URL`, além das demais configurações de ambiente.

Uma mudança em `NEXT_PUBLIC_API_URL` exige uma nova compilação do frontend. Mantenha a chave de criptografia estável e aplique as migrações de forma controlada antes de liberar uma versão que dependa delas. As variáveis de **produção** e **preview** precisam ser configuradas separadamente.

A disponibilidade dos links acima não substitui a validação dos fluxos da versão publicada. As credenciais conhecidas do seed são destinadas à demonstração acadêmica, não ao uso com pacientes reais.

## 🚧 Limites atuais e próximos passos

- Recuperação de senha por e-mail, lembretes externos e integrações com e-mail/WhatsApp.
- Conclusão dos módulos financeiro e estoque e de outras telas secundárias em construção.
- Login com Google e Face ID, atualmente indicados como indisponíveis.
- Ampliação da homologação em dispositivos móveis e dos testes dos demais fluxos.
- Medições de desempenho, rotinas de backup/restauração e revisão de segurança antes do uso com dados reais.

A página **Contato / Agende** encaminha ao portal de solicitações; ela não envia mensagens externas. Endereço, telefone e registros demonstrativos não representam uma operação clínica real. Os controles implementados não equivalem a certificação de conformidade integral com a LGPD.

## 🎓 Contexto acadêmico e materiais

Projeto desenvolvido na disciplina **Análise e Projeto de Sistemas**, do curso de **Análise e Desenvolvimento de Sistemas — Centro Universitário Módulo**.

**Docente:** Cristiano S. Negrão.

O planejamento está no [Trello](https://trello.com/b/gbfJq3qw/lepera-clinic), e o código e seu histórico estão no [GitHub](https://github.com/GuxtavoPereira/lepera-clinic).

Os diretórios `work/` e `outputs/` guardam materiais locais e estão ignorados pelo Git. Documentos acadêmicos, capturas e imagens de referência são entregues separadamente. As telas do sistema são implementadas em código.