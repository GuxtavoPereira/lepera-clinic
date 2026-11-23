# ACC-09 — Conta do responsável e pacientes vinculados

Estado: **planejado, não implementado**. Levantamento do código em 22/11/2026. O APK 0.2 desta entrega continua exclusivo para contas de paciente.

**Atualização de escopo em 23/11:** PRI-12 mantém a conta e o CPF próprios do responsável. PRI-10 acrescenta devolutivas documentais liberadas pelo profissional aos responsáveis autorizados; PRI-13 acrescenta acesso do paciente ao próprio prontuário. As restrições abaixo descrevem o primeiro incremento de agenda e não cancelam esses novos requisitos. Implementar permissões específicas para devolutivas e prontuário próprio, sem conceder ao responsável acesso geral às anotações clínicas por possuir um vínculo. O aceite do APK no aparelho será feito pelo usuário, conforme solicitado; não continuar testes automatizados do APK sem nova solicitação.

## Resultado solicitado

O início do cadastro deve oferecer **Para mim** ou **Para outra pessoa**. Na segunda opção, o responsável entra com sua própria conta, seleciona a pessoa atendida e acompanha os agendamentos dela. O sistema distingue quem está autenticado de quem receberá atendimento.

A primeira entrega proposta cobre **um responsável com vários dependentes menores**, com seleção explícita do paciente, solicitação de horário, acompanhamento da decisão da recepção e cancelamento conforme as regras existentes. A tabela de vínculo pode suportar vários responsáveis por paciente, mas convite de responsáveis adicionais e atendimento de adultos representados ficam fora desse primeiro incremento. A opção “Para outra pessoa” deverá explicar esse alcance, sem aparentar suportar os casos ainda não implementados.

O vínculo de agenda não concede acesso ao prontuário, anotações, escalas clínicas, documentos clínicos, finanças ou relatórios. Também não comprova, por si só, representação legal. O processo de confirmação adotado pela clínica precisa ser definido separadamente.

## O que existe hoje

- `User` reúne identidade e credenciais: nome, CPF único, e-mail único obrigatório, senha obrigatória, papel e estado de acesso.
- `Patient.userId` é obrigatório e único. Toda ficha de paciente tem um `User` próprio; consultas e prontuários apontam para `Patient.id`.
- O cadastro público sempre cria `User(role=PATIENT)` e `Patient` e devolve uma sessão desse paciente.
- `emergencyContactName` e `emergencyContactPhone` são campos de contato. Não existe conta, identidade autenticada, autorização nem vínculo de responsável a partir desses campos.
- Os serviços de consultas próprias, pedidos, calendário e edição de paciente procuram `Patient.userId == JWT.sub`. O JWT identifica quem fez login.
- O aplicativo aceita somente `role=PATIENT` e exige `profile.patient`. A tela de perfil também pressupõe que o usuário autenticado é a pessoa atendida.
- Notificações de consultas/pedidos são entregues ao `patient.userId`; pedidos não têm um campo explícito para o usuário que os solicitou.

Referências: `packages/database/prisma/schema.prisma`, `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/patients/patients.service.ts`, `apps/api/src/modules/appointments/appointments.service.ts`, `apps/api/src/modules/appointments/appointment-calendar.service.ts`, `apps/api/src/modules/schedule-requests/schedule-requests.service.ts` e, no repositório mobile, `src/lib/auth-controller.ts` e `src/lib/contracts.ts`.

**Adicionar apenas um papel não resolve.** Usar o `User.patient` do responsável como se fosse a criança misturaria identidade, CPF, histórico e autoria. Também não se deve criar um e-mail fictício para o menor nem pedir que compartilhe a senha do responsável.

## Modelo mínimo proposto

É possível preservar a relação atual `User.patient` e todas as referências existentes a `Patient.id`, mediante uma migração explícita que permita identidade de paciente sem credenciais de login. Isso evita, neste incremento, transferir todos os dados pessoais para uma nova entidade `Person` e reescrever todas as leituras `patient.user.*`.

| Parte | Alteração proposta |
| --- | --- |
| `User` | Adicionar `loginEnabled` com padrão `true`; permitir `email` e `passwordHash` nulos para identidade sem login; adicionar telefone de contato opcional da conta. CPF continua obrigatório e único. |
| `Role` | Adicionar `GUARDIAN` para uma conta que acompanha dependentes e não possui ficha própria. |
| Identidade do dependente | `User(role=PATIENT, loginEnabled=false, email=null, passwordHash=null)` e `Patient` próprio. `isActive` continua representando estado da identidade; não substitui `loginEnabled`. |
| `GuardianPatient` | `id`, `guardianUserId`, `patientId`, estado `ACTIVE/REVOKED` (e `PENDING` caso haja aprovação), relação declarada, datas e autoria de criação/revogação; unicidade do par e índice por responsável/estado. |
| `ScheduleRequest` | Registrar `requestedByUserId`, separado de `patientId`, para identificar quem enviou o pedido. |

Uma pessoa já cadastrada como `PATIENT` poderá ser responsável por dependentes sem perder seu papel ou acesso à própria ficha: a capacidade de acompanhar dependentes vem dos vínculos ativos. `GUARDIAN` é necessário para quem não é paciente. Não criar uma ficha clínica vazia para o responsável apenas para satisfazer o aplicativo.

As credenciais nulas exigem revisar todos os caminhos de autenticação e recuperação. Login, emissão de sessão e recuperação de senha devem exigir `loginEnabled=true`, conta ativa e credenciais adequadas. O guard deve conferir isso novamente a cada requisição. Cadastros existentes recebem `loginEnabled=true` e mantêm IDs, senhas e sessões; nenhuma conta antiga é convertida automaticamente em dependente.

Uma restrição no banco deve impedir `loginEnabled=true` sem e-mail/senha no modelo de autenticação atual. Essa restrição precisa ser revista quando houver autenticação federada completa, sem confundir a prévia de agenda via Google com uma conta já cadastrada.

## Cadastro e dados

**Para mim:** mantém o fluxo atual e o contrato de `POST /auth/register`.

**Para outra pessoa:** separar os dados em duas etapas visíveis:

1. Conta de quem acompanhará: nome, CPF próprio, nascimento, e-mail, telefone, senha e confirmação.
2. Paciente: nome, CPF próprio obrigatório, nascimento, contato aplicável e convênio opcional. Mostrar claramente que o paciente não receberá credenciais nesse fluxo.

O servidor valida os dois CPFs e impede que sejam iguais. Valida a faixa etária suportada no primeiro incremento. Nome, CPF e nascimento do paciente nunca são substituídos pelos dados do responsável. A senha é preparada antes da transação; a criação da conta, identidade do paciente, ficha e vínculo deve ser atômica. A resposta autentica **o responsável**, nunca o dependente.

Se o responsável já tiver uma conta, pedir login e oferecer “Adicionar dependente” autenticado. Não redefinir senha, papel ou dados da conta existente pelo cadastro público. Se o CPF do paciente já existir, não anexar a ficha automaticamente: o conhecimento de CPF, nome ou nascimento não prova autorização. O primeiro incremento pode orientar a recepção a tratar o vínculo existente; a associação precisa de um procedimento próprio, explícito e auditável.

Campos antigos de contato de emergência permanecem como contato. Não migrar esses nomes/telefones para autorização de acesso. Uma identidade previamente existente de menor continua com sua conta atual até haver uma migração assistida definida; não transferir consultas ou sessões por correspondência de nome ou telefone.

## API e autorização

Criar um serviço central de resolução de acesso que receba o usuário autenticado e o paciente solicitado e confirme, no banco, **ficha própria ou vínculo ativo**. Ele devolve separadamente `actorUserId` e `patientId`. O paciente selecionado é contexto de navegação, não identidade de sessão; não emitir um JWT da criança nem alterar `sub` para trocar o paciente.

Rotas propostas, preservando as atuais para compatibilidade:

| Rota | Finalidade |
| --- | --- |
| `POST /auth/register-guardian` | Criar responsável e primeiro dependente, retornar sessão do responsável. |
| `GET /portal/patients` | Listar somente a ficha própria e os dependentes acessíveis, com dados mínimos. |
| `POST /portal/dependents` | Responsável/paciente autenticado adiciona um novo dependente no escopo permitido. |
| `GET /portal/patients/:patientId/appointments` | Consultas exclusivamente do paciente autorizado. |
| `GET /portal/patients/:patientId/available-slots` | Horários livres considerando também conflitos desse paciente. |
| `GET/POST /portal/patients/:patientId/schedule-requests` | Acompanhar/enviar pedidos para esse paciente, registrando o ator real. |
| `PATCH /portal/patients/:patientId/appointments/:appointmentId/cancel` | Validar vínculo e pertencimento da consulta; aplicar a mesma antecedência e estados permitidos. |

As novas rotas devem reutilizar a lógica de conflito, aprovação e cancelamento, após a resolução de acesso. Não chamar serviços existentes fingindo que o responsável é o paciente. Um `patientId` enviado no corpo ou na URL nunca é autorização por si só. A listagem deve aplicar o filtro no banco, e não carregar todas as consultas para filtrar no navegador.

As rotas atuais `/appointments/mine`, `/schedule-requests/mine` e `/patients/me` continuam próprias. `GET /profile/me` permanece descrevendo a conta autenticada; dependentes são obtidos pela rota específica. Isso mantém o APK atual funcional para pacientes e evita um payload que misture conta e várias fichas.

Não basta incluir `GUARDIAN` nas listas de papéis dos controllers: os serviços atuais ainda resolvem o paciente pelo usuário. O calendário já rejeita papéis não reconhecidos; essa proteção deve permanecer até existir a resolução de vínculo. Prontuários continuam exclusivamente nos controles atuais de profissional. Relatórios, lista de espera e avaliações ficam indisponíveis ao novo papel até serem tratados explicitamente.

Ao revogar um vínculo, a próxima chamada deve ser recusada mesmo com token ainda válido. Mutações devem revalidar o vínculo dentro da transação, com tratamento de concorrência adequado; uma verificação anterior seguida de uma gravação desprotegida permite corrida com revogação. Respostas para dependente ou consulta fora do escopo não revelam detalhes da existência do registro.

## Avisos, autoria e interface

Pedidos e alterações de agenda devem notificar a conta que pode acompanhá-los, não a identidade sem login do dependente. Definir explicitamente os destinatários ativos; não redirecionar todos os avisos históricos nem dados clínicos. A leitura de avisos continua por `Notification.userId == JWT.sub`; avisos persistidos de um vínculo revogado exigem política de ocultação/remoção do conteúdo e não podem reabrir o paciente.

Auditoria registra o ator real, paciente alvo e vínculo utilizado. A recepção vê “solicitado por [responsável] para [paciente]”, sem confundir os nomes.

No site e no app, manter a conta no cabeçalho e oferecer um seletor “Atendimento para”. Consulta, pedido e confirmação exibem o paciente selecionado. “Minha conta” edita o responsável; “Dados do paciente” é uma tela separada com permissões próprias. Não expor prontuário no menu de responsável.

No mobile, atualizar os contratos, validação de login/restauração e navegação para `PATIENT` ou `GUARDIAN`; separar perfil da conta e paciente selecionado. Trocar de paciente deve cancelar/ignorar respostas anteriores, limpar formulários e atualizar as consultas. Persistir somente preferências mínimas; revalidar o acesso na abertura e após revogação. O token continua pertencendo ao responsável.

O APK 0.2 rejeitará o novo papel por sua validação atual. O cadastro de responsáveis não deve ser anunciado como compatível com esse APK. O incremento exige uma nova versão mobile, além da implantação web/API.

## Migração e sequência revisável

1. Revisar este contrato e confirmar o escopo inicial de menores, processo de vínculo existente e campos obrigatórios. Preparar migração em banco isolado restaurado de estrutura equivalente, sem converter contatos em vínculos.
2. Expandir schema/contratos: papel, credenciais opcionais, `loginEnabled`, contato da conta e vínculo. Adaptar autenticação, recuperação e projeções de usuários para os novos nulos. Manter funcionalidades antigas; telas administrativas e exportações precisam lidar com paciente sem e-mail.
3. Entregar API de cadastro/vínculo e autorização por paciente, com testes de integração. Definir comportamento de revogação, notificações e auditoria antes de disponibilizar a criação pública.
4. Entregar o fluxo web completo, incluindo recepção, com “Para mim/Para outra pessoa” e seleção do paciente. Testar a conta de responsável separadamente da ficha clínica.
5. Atualizar mobile, gerar APK e testar no aparelho contra a API publicada com contas de demonstração autorizadas. Só então divulgar o acesso de responsáveis no aplicativo.

As migrações não devem apagar ou recriar pacientes, consultas ou usuários existentes. A reversão funcional pode desativar o cadastro/portal de responsáveis, preservando vínculos e identidades já criados. Não reverter colunas para `NOT NULL` ou remover o papel enquanto houver novos registros incompatíveis. Planejar backup e recuperação antes da migração publicada.

## Critérios de aceite e testes indispensáveis

- Responsável A entra com seu próprio e-mail/senha e acompanha dois dependentes; os IDs e dados pessoais dos três são distintos. Paciente adulto com dependente conserva o acesso próprio.
- Cadastro incompleto, CPFs iguais/inválidos, idade fora do escopo, e-mail/CPF existente e envio duplicado não criam contas órfãs nem vinculam ficha preexistente automaticamente.
- Conta sem login não autentica, não recebe recuperação e não ganha sessão por outra rota. Recuperação do responsável altera apenas sua credencial.
- A não lista, lê, agenda, cancela ou modifica paciente/consulta de B, inclusive alterando IDs manualmente. Sem token, papel incompatível, vínculo pendente/revogado e conta desativada são recusados.
- Revogação simultânea à solicitação/cancelamento não permite gravação depois da perda de autorização; tokens antigos e cache não restauram o vínculo.
- Horários e conflitos usam o paciente selecionado. Pedidos preservam a regra de aprovação da recepção e o cancelamento mantém a antecedência existente.
- Prontuários, escalas clínicas, relatórios, finanças, estoque e buscas administrativas continuam inacessíveis. Respostas de agenda e avisos não carregam conteúdo clínico por inclusão acidental.
- Avisos e auditoria identificam o destinatário/ator corretos; responsável sem login no dependente recebe somente avisos autorizados. Vínculo revogado deixa de expor dados novos e conteúdo protegido previamente listado.
- Troca rápida de dependente, retorno do app, nova sessão e resposta atrasada não exibem dados do paciente anterior nem enviam pedido para ele.
- Migração preserva logins, consultas, perfis e contratos dos pacientes atuais. Executar regressão do APK 0.2 antes de publicar a API expandida.

Esse incremento só estará completo com autorização no servidor, fluxo de recepção e nova versão mobile verificados. Alterar o formulário isoladamente não atende ao requisito.
