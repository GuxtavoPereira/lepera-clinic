# Leperapia Clinic - Sistema de Gestão

Este é um projeto Full Stack desenvolvido para modernizar e otimizar os processos administrativos e de agendamento da **Leperapia Clinic**. O sistema visa eliminar gargalos na recepção, organizar filas de espera e centralizar o histórico dos pacientes em uma interface moderna e intuitiva.

O projeto utiliza uma arquitetura de Monorepo, gerenciada pelo **pnpm**.

---

## Como Rodar o Projeto

Siga os passos abaixo para colocar o Front-end e o Back-end rodando simultaneamente na sua máquina.

### Pré-requisitos
Antes de começar, você vai precisar ter instalado em sua máquina:
*   [Node.js](https://nodejs.org/) (Recomendado versão LTS)
*   [pnpm](https://pnpm.io/) (Gerenciador de pacotes)

### Passo 1: Clonar o Repositório
```bash
git clone https://github.com/GuxtavoPereira/lepera-clinic.git
cd lepera-clinic
```

### Passo 2: Instalar as Dependências
Como utilizamos Workspaces, rodar este comando na raiz instalará as dependências de todo o projeto (Front, Back e ferramentas de gerenciamento).
```bash
pnpm install
```

### Passo 3: Configurar Variáveis de Ambiente (.env)
Você precisará criar arquivos locais de configuração na raiz de cada pacote. Utilize os arquivos `.example` como base.

**1. Back-end (Pasta `api/`)**
Crie o arquivo `api/.env`:
```env
PORT=3333
DATABASE_URL="mysql://root:sua_senha_aqui@localhost:3306/lepera_db"
JWT_SECRET="chave_secreta_para_gerar_tokens_de_login"
```

**2. Front-end (Pasta `apps/web/`)**
Crie o arquivo `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:3333"
```

**3. Banco de Dados (Pasta `packages/database/`)**
Crie o arquivo `packages/database/.env`:
```env
DATABASE_URL="mysql://root:sua_senha_aqui@localhost:3306/lepera_db"
```

### Passo 4: Subir o Banco de Dados (Prisma)
Com o seu servidor MySQL ligado e as variáveis configuradas, navegue até a pasta do banco de dados e rode a migração. O Prisma lerá o `schema.prisma` e criará as tabelas.

```bash
cd packages/database
pnpm exec prisma migrate dev --name init
```
**Nota:** Se o banco `lepera_db` não existir, o terminal perguntará se você deseja criá-lo. Pressione `y` (yes).

Para visualizar as tabelas recém-criadas e gerenciar os dados visualmente, você pode iniciar o painel do Prisma (abrirá em `http://localhost:5555`):
```bash
pnpm exec prisma studio
```

### Passo 5: Rodar o Projeto (Front + Back)
Utilizamos os scripts de automação do monorepo para subir os dois servidores com um único comando na raiz do projeto. (Certifique-se de voltar à raiz do projeto caso esteja na pasta do banco de dados).

```bash
cd ../../
pnpm dev
```
**O que acontece ao executar o comando:**
*   O Front-end (Next.js) abrirá em: `http://localhost:3000`
*   O Back-end (NestJS) abrirá na porta configurada (ex: `http://localhost:3333`)
*   Os logs de ambos aparecerão no mesmo terminal.

---

## Arquitetura e Divisão de Responsabilidades

O projeto é dividido em três camadas principais:

### 1. Front-end (Interface Visual)
*   **Onde fica:** `apps/web/`
*   **Tecnologias:** Next.js (React), Tailwind CSS v4, shadcn/ui.
*   **Função:** Roda no navegador do usuário. Responsável pela experiência visual (UI/UX), capturar interações e fazer requisições para a API.

### 2. Back-end (Motor e Regras de Negócio)
*   **Onde fica:** `api/`
*   **Tecnologias:** NestJS (Node.js).
*   **Função:** Roda no servidor. Processa a lógica do sistema (autenticação, validação de horários, regras de negócio) e é a única camada que se comunica diretamente com o Banco de Dados.

### 3. Banco de Dados (Armazenamento Permanente)
*   **Onde fica:** `packages/database/` (Pacote compartilhado)
*   **Tecnologias:** Prisma ORM, MySQL.
*   **Função:** Onde os dados ficam salvos de forma definitiva. Armazena tabelas de Pacientes, Agendamentos, Funcionários, etc. É acessado exclusivamente pelo Back-end.

---

## Estrutura de Pastas (Monorepo Avançado)

Utilizamos a funcionalidade de Workspaces do pnpm para isolar o código visual do código de servidor, mantendo o banco de dados como um pacote central e compartilhado (`@lepera/db`).

```plaintext
lepera-clinic/                       # RAIZ DO PROJETO
├── package.json                     # Scripts raiz ('pnpm dev')
├── pnpm-workspace.yaml              # Configuração do Monorepo
│
├── packages/                        # PACOTES GLOBAIS
│   └── database/                    # Pacote "@lepera/db" (Banco Global)
│       ├── prisma/                  
│       │   └── schema.prisma        # Estrutura unificada do Banco de Dados
│       └── index.ts                 # Instância única do Prisma e exportação de Tipagens
│
├── api/                             # BACK-END (NestJS)
│   ├── package.json                 # Importa "@lepera/db"
│   └── src/
│       └── controllers/             # Realiza consultas e inserções usando o pacote global
│
└── apps/
    └── web/                         # FRONT-END (Next.js)
        ├── package.json             # Importa "@lepera/db" APENAS para tipagem (TypeScript)
        └── src/
            └── app/                 # Menus, Telas e Componentes da Leperapia Clinic
```

---

## Padrões de Navegação e Roteamento (Front-end)

A interface visual utiliza o **App Router** do Next.js (`apps/web/src/app`), estruturando as rotas de forma isolada para facilitar o controle de acesso (RBAC) e o reaproveitamento de código visual.

### 1. Grupos de Rotas (Route Groups)
Pastas nomeadas com parênteses, como `(dashboard)` e `(public)`, são usadas para agrupar páginas que compartilham o mesmo escopo ou layout visual, mas não afetam a URL no navegador.

*   **`(public)`**: Contém a pasta `auth`. A URL gerada é limpa (`localhost:3000/auth/login`). Utiliza um `layout.tsx` próprio, renderizando telas sem os menus internos do sistema.
*   **`(dashboard)`**: Contém os módulos de negócio restritos (`admin`, `doctor`, `patient`, `reception`). A URL acessada será `localhost:3000/reception/dashboard`. O arquivo `layout.tsx` na raiz deste grupo é responsável por renderizar a barra lateral (Sidebar) e o cabeçalho superior (Header) para todos os usuários autenticados.

### 2. Rotas Dinâmicas
Pastas nomeadas com colchetes, como `[id]`, representam rotas dinâmicas que capturam parâmetros da URL para buscar registros específicos no banco de dados.

*   **Página de Listagem:** Uma pasta como `reception/patients/page.tsx` responde pela rota `localhost:3000/reception/patients`, renderizando a tabela geral com todos os pacientes.
*   **Página de Detalhes:** A pasta interna `reception/patients/[id]/page.tsx` responde por rotas como `localhost:3000/reception/patients/123`. O sistema captura o valor `123` (ID) da URL para injetar os dados exclusivos daquele paciente na tela de ficha cadastral.