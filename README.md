# Leperapia Clinic — Sistema de Gestão Clínica

Projeto acadêmico de um sistema para uma clínica psicológica. Centraliza o cadastro de pacientes, solicitações de atendimento, agendamentos, lista de espera e registros de sessões, com acesso conforme o perfil do usuário.

O código atual é um **monorepo TypeScript**, gerenciado por **pnpm e Turborepo**. A implementação em uso substitui a arquitetura descrita nos documentos iniciais do projeto.

## Tecnologias e organização

| Camada | Tecnologias | Diretório |
| --- | --- | --- |
| Interface | Next.js 16, React 19, Tailwind CSS 4, componentes shadcn/ui com Base UI | `apps/web` |
| API e regras de negócio | NestJS 11, validação de dados, autenticação JWT e controle de acesso por perfil | `apps/api` |
| Banco de dados | PostgreSQL, Prisma ORM 7 e adaptador PostgreSQL | `packages/database` |
| Contratos compartilhados | Tipos e validações compartilhados, sem acesso direto ao banco | `packages/contracts` |
| Ferramentas | Node.js 24, pnpm 11.24.0 e Turborepo | Raiz do repositório |

```text
lepera-clinic/
├── apps/
│   ├── api/                 # API NestJS, regras de negócio e autorização
│   └── web/                 # Interface Next.js com App Router
├── packages/
│   ├── contracts/           # Pacote @lepera/contracts
│   └── database/            # Pacote @lepera/db
│       ├── prisma/          # Schema, migrações e seed de desenvolvimento
│       └── prisma.config.ts
├── docker-compose.yml       # PostgreSQL local opcional
├── pnpm-workspace.yaml
└── turbo.json
```

A interface consulta a API por HTTP. A API acessa o PostgreSQL por meio do pacote `@lepera/db`; o navegador não recebe credenciais nem conexão direta com o banco.

## Executar localmente

### 1. Pré-requisitos e instalação

Instale Node.js **24** e pnpm **11.24.0**. Utilize PostgreSQL próprio ou Docker com Compose para o banco local.

```bash
git clone https://github.com/GuxtavoPereira/lepera-clinic.git
cd lepera-clinic
pnpm install --frozen-lockfile
```

No PowerShell, caso a política do Windows bloqueie `pnpm.ps1`, utilize `pnpm.cmd` no lugar de `pnpm` nos comandos.

### 2. Banco PostgreSQL

Para usar o serviço já definido no repositório:

```bash
docker compose up -d postgres
```

O Compose cria o banco `lepera_db`, usuário `lepera`, senha local `lepera_dev` e porta `5432`, com volume persistente. Essas credenciais servem exclusivamente para desenvolvimento. Caso já tenha PostgreSQL, crie o banco e ajuste a conexão nos dois arquivos de ambiente abaixo; não é necessário usar Docker.

### 3. Variáveis de ambiente

Crie os arquivos locais a partir dos `.env.example` de cada pacote. Eles não devem ser enviados ao GitHub.

**`apps/api/.env`**

```env
NODE_ENV=development
PORT=3333
DATABASE_URL="postgresql://lepera:lepera_dev@localhost:5432/lepera_db?schema=public"
JWT_SECRET="SUBSTITUA_POR_UMA_CHAVE_ALEATORIA"
ENCRYPTION_KEY="SUBSTITUA_POR_64_CARACTERES_HEXADECIMAIS"
WEB_URL="http://localhost:3000"
TRUST_PROXY=0
```

Gere **duas chaves diferentes** executando o comando abaixo duas vezes. Cada execução produz 32 bytes aleatórios representados por 64 caracteres hexadecimais. Utilize um resultado em `JWT_SECRET` e o outro em `ENCRYPTION_KEY`.

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Os valores acima são marcadores para substituição. Não copie as chaves de exemplo para um ambiente publicado. A chave de criptografia deve ser guardada com segurança: dados clínicos já criptografados dependem da mesma chave para leitura.

**`apps/web/.env.local`**

```env
NEXT_PUBLIC_API_URL="http://localhost:3333"
```

A URL da API deve conter apenas a origem, **sem `/api` no final e sem barra final**. O cliente HTTP acrescenta `/api` ao caminho de cada chamada. Por exemplo, o login utiliza `http://localhost:3333/api/auth/login`. Se houver `apps/web/.env`, mantenha os valores consistentes; `.env.local` tem precedência no desenvolvimento Next.js.

**`packages/database/.env`**

```env
DATABASE_URL="postgresql://lepera:lepera_dev@localhost:5432/lepera_db?schema=public"
```

`DATABASE_URL` da API e do pacote de banco devem apontar para **o mesmo banco e schema**. Em um banco remoto, utilize os parâmetros de conexão exigidos pelo provedor, inclusive TLS quando necessário.

### 4. Gerar o cliente e aplicar as migrações existentes

Execute a partir da raiz:

```bash
pnpm db:generate
pnpm --filter @lepera/db migrate:deploy
```

`migrate:deploy` aplica as migrações versionadas, sem criar uma nova migração. Para desenvolver alterações no schema, existe também `pnpm db:migrate`; esse comando não é necessário para apenas iniciar o projeto.

### 5. Dados de demonstração — somente desenvolvimento

Em um banco local de demonstração:

```bash
pnpm db:seed
```

O seed insere contas e registros fictícios. Ele utiliza senhas conhecidas e é bloqueado quando `NODE_ENV=production`. Não execute esse seed em um banco de produção ou com dados reais.

| Perfil de demonstração | E-mail | Senha de desenvolvimento |
| --- | --- | --- |
| Recepção | `recepcao@leperapia.com` | `Senha@123` |
| Paciente | `lucas.paciente@email.com` | `Senha@123` |
| Profissional | `roberto.silva@leperapia.com` | `Senha@123` |
| Administração | `admin@leperapia.com` | `Senha@123` |

O seed usa inserções condicionais: contas que já existem não têm a senha redefinida por esse comando. Para criar um superadministrador fora do seed, há `pnpm db:super-admin`, que exige `SUPER_ADMIN_EMAIL` e `SUPER_ADMIN_PASSWORD` no ambiente; a senha precisa ter pelo menos 12 caracteres. Não registre esses valores no repositório.

### 6. Iniciar os aplicativos

```bash
pnpm dev
```

- Interface: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3333/api](http://localhost:3333/api)

O Turborepo prepara as dependências compartilhadas e inicia os serviços de desenvolvimento. A URL base da API não é uma página de navegação: utilize as rotas da aplicação para demonstrar os fluxos.

Também estão disponíveis `pnpm dev:web`, `pnpm dev:api` e `pnpm db:studio` para iniciar apenas um aplicativo ou inspecionar o banco local.

## Páginas exigidas na entrega S10

| Página | Rota | Acesso e demonstração |
| --- | --- | --- |
| Home / landing page | `/` | Pública; botões para informações da clínica e agendamento |
| Sobre nós | `/about` | Pública; contexto, motivação e equipe |
| Contato / Agende | `/contact` | Pública; orienta cadastro/login e acesso à solicitação real |
| Login | `/auth/login` | Pública; autentica e direciona conforme o perfil |
| Lista principal | `/reception/patients` | Recepção ou superadministração; busca e listagem de pacientes |
| Página de detalhe | `/reception/patients/[id]` | Recepção ou superadministração; ficha do paciente escolhido na lista |

`[id]` representa o identificador de um paciente existente. Abra o detalhe pela ação da lista; não utilize a palavra `[id]` literalmente na barra de endereço.

### Navegação e fluxos para demonstração

**Visita pública:** Home → Sobre nós → Contato / Agende → Criar conta ou Login. O menu público está disponível também no celular.

**Lista e ficha:** entre com a conta de recepção → abra Pacientes → busque um paciente → abra sua ficha → consulte ou edite os dados permitidos → volte à lista. As páginas internas compartilham menu lateral e cabeçalho, com opções de acordo com o perfil.

**Solicitação de atendimento:** entre como paciente → abra `/patient/request-appointment` → informe profissional, data e turno de preferência, se desejar → envie a solicitação → acompanhe em Minhas solicitações. Depois, entre como recepção → abra `/reception/requests` → selecione uma solicitação → escolha profissional e horário válido → aprove. A aprovação cria uma consulta; o paciente pode conferir a confirmação e a consulta em `/patient/appointments`. Uma solicitação pendente ainda não é uma consulta confirmada.

**Cadastro público:** `/auth/register` coleta os dados do paciente e cria sua conta. Quando o cadastro é concluído, o paciente entra no portal e pode solicitar atendimento. A conta da recepção permanece necessária para analisar e aprovar os pedidos.

### Como o roteamento está organizado

O projeto usa o App Router em `apps/web/src/app`. Os grupos `(public)` e `(dashboard)` compartilham layouts, mas seus nomes não fazem parte da URL. Rotas com colchetes, como `[id]`, carregam o registro selecionado. Os controles da interface orientam a navegação; a API verifica a autenticação e as permissões de cada operação.

## Validação do projeto

Com dependências instaladas, ambiente configurado e cliente Prisma gerado:

```bash
pnpm lint
pnpm check-types
pnpm --filter api exec jest --runInBand
pnpm build
```

Os comandos verificam estilo, tipos, testes automatizados da API e compilação. A validação completa também requer executar os fluxos acima no navegador, verificando gravação e leitura no mesmo banco. Uma compilação aprovada, isoladamente, não comprova o funcionamento do ambiente publicado.

## Publicação na Vercel

A implantação está organizada em dois projetos: **`lepera-clinic-front`** para a interface e **`lepera-clinic-backend`** para a API. A configuração deve respeitar o monorepo e disponibilizar os pacotes compartilhados durante a construção.

No frontend, configure `NEXT_PUBLIC_API_URL` com a origem HTTPS do backend, sem `/api`. Como é uma variável pública incorporada ao aplicativo, uma alteração exige nova construção do frontend. No backend, configure `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY` e `WEB_URL` com a origem exata do frontend. Se houver um proxy à frente da API, configure `TRUST_PROXY` conforme a infraestrutura. Aplique as migrações ao banco de destino como uma etapa controlada de implantação, sem seed de demonstração.

A consulta aos detalhes dos projetos pela integração retornou **403** nesta revisão. A publicação das alterações e a validação completa dos dois serviços hospedados ainda precisam ser concluídas; não se deve apresentar o ambiente remoto como homologado com base apenas no código local.

## Limitações e próximas entregas

- Recuperação de senha, lembretes externos e envio de e-mails/WhatsApp ainda precisam de implementação e integração com provedores.
- Os módulos financeiro e de estoque ainda possuem telas em construção; a existência de modelos no banco não representa um fluxo completo disponível ao usuário.
- Login com Google e Face ID não está implementado; as opções aparecem desabilitadas.
- A página de contato encaminha ao portal para registrar solicitações. Ela não envia mensagens externas. Endereço e telefone exibidos são dados demonstrativos acadêmicos.
- Há outras telas internas em construção. A entrega parcial deve descrever como implementadas apenas as funcionalidades demonstradas e validadas.
- A autenticação usa JWT com sessão armazenada no navegador. Revisão de segurança, infraestrutura, backups, gestão de chaves e testes com dados sintéticos continuam necessários antes de utilizar dados reais.
- As medidas de controle de acesso, hash de senhas e criptografia não representam, por si só, certificação de conformidade com a LGPD. Metas de disponibilidade e tempo de resposta dependem de medição no ambiente de implantação.

## Materiais acadêmicos e repositório

`work/` e `outputs/` estão ignorados pelo Git e são destinados a materiais locais de trabalho e entrega. Imagens base, capturas de tela e arquivos raster usados na preparação acadêmica não devem ser adicionados ao GitHub. A interface é implementada em código; documentos e evidências de avaliação são entregues separadamente.