# Validação local da versão 1.2

Em 09/11/2026, a branch web partiu de `2955605`. O app partiu de `0764557` com alterações locais de UI e agendamento exato, preservadas em um patch fora do Git antes da atualização do SDK.

## Web e API

| Verificação | Resultado |
| --- | --- |
| Instalação pelo lockfile, geração Prisma 7.10 e build | Passaram |
| Lint e tipagem | Passaram para web e API |
| API | 410 testes em 38 suítes |
| Financeiro web | 6 testes |
| Site público | Cards de equipe por teclado e toque, fallback de foto, foco do painel de detalhes e comparação de três paletas em desenvolvimento |
| KPIs | Playwright com dados sintéticos nos cinco papéis, incluindo filtros por URL, lista de hoje em leitura e bloqueio de navegação administrativa pelo paciente |

O banco de demonstração foi criado do zero em PGlite no disco F:. As sete migrations e o seed fictício rodaram com 12 usuários, 18 consultas e 12 prontuários cifrados. A amostra após o teste mostrou 38,48 MiB de dados, cerca de 247 MiB de memória residente para o banco e 118 MiB para a API.

- O teste HTTP autenticou oito contas fictícias nos cinco papéis. O profissional vinculado conseguiu abrir o prontuário. Outro profissional recebeu 404, perfis administrativos e pacientes receberam 403 e uma chamada anônima recebeu 401.
- Duas recepcionistas aprovaram em paralelo solicitações para a mesma vaga. As respostas foram 200 e 409. Uma única consulta foi criada com horário, profissional, duração e modalidade originais.
- O endpoint público de equipe e a listagem autenticada de horários livres retornaram somente os campos previstos. O paciente exportou o próprio relatório de consultas em CSV e recebeu 403 ao pedir auditoria.

Em 10/11/2026, o mesmo teste passou em PostgreSQL 17.11 nativo no Windows, em um cluster isolado no disco F:. Foram aplicadas as sete migrações em um banco novo e carregados os dados fictícios. As oito contas de teste cobriram os cinco papéis. As aprovações concorrentes retornaram 200 e 409 e deixaram uma única consulta para a vaga, com o horário e a modalidade solicitados.

Um backup sintético de 72.189 bytes foi restaurado em outro banco do mesmo cluster. A origem e a restauração tinham 12 usuários, 19 consultas, 12 prontuários cifrados, sete migrações concluídas e três solicitações. As verificações foram feitas em loopback. O [relatório de carga local](relatorio-carga.md) registra as rajadas de 10 e 50 usuários virtuais.

## Navegação por papel

| Papel | Área principal | Recursos principais |
| --- | --- | --- |
| Administração | `/admin` | Usuários por perfil e atividade, agenda de hoje em leitura, financeiro e estoque |
| Superadministração | `/admin` e `/reception` | Gestão administrativa e fluxos autorizados de recepção |
| Recepção | `/reception` | Solicitações, lista e calendário, cadastro e recebimentos |
| Profissional | `/doctor` | Agenda, pacientes vinculados, disponibilidade e prontuários próprios |
| Paciente | `/patient` | Agenda, consultas, solicitações, lista de espera e perfil |

## Ficha resumida e contas de demonstração

O botão **Ver ficha** abre a ficha do paciente na agenda e em **Meus pacientes**. A ficha mostra nome, idade, contato básico e até cinco consultas recentes do profissional autenticado. O prontuário abre pela sessão. A resposta da ficha inclui `Cache-Control: private, no-store` e a leitura autorizada gera a ação `patient.summary.read`.

O teste no PostgreSQL nativo retornou 200 para o profissional vinculado, 404 para o outro profissional e 403 para paciente, recepção, administração e superadmin. A chamada anônima recebeu 401. O navegador em 390 px abriu a ficha pelos dois atalhos e exibiu a negativa ao outro profissional. Os registros de leitura foram conferidos no banco. Os 412 testes da API e a compilação web passaram.

Em um segundo banco vazio, as sete migrações e o seed atualizado criaram 16 contas com CPFs de teste distintos, incluindo três profissionais, três recepcionistas, três administradores, seis pacientes e um superadmin. Foram mantidas 18 consultas e 12 prontuários fictícios. Também foi conferida a recusa do seed em produção e em banco preenchido com `RESET_DATABASE=false`.

## App do paciente

Na base SDK 57, a instalação limpa, a tipagem, o lint e a exportação web passaram. O Expo Doctor apontou quatro pacotes com patches antigos. A branch móvel atualiza para Expo 58.0.23, React 19.3 e React Native 0.88.1 com Expo Router e Dev Client compatíveis.

O SDK 58 passou na tipagem, no lint, na verificação de versões, nos 20 checks do Expo Doctor e nas exportações web e Android/Hermes. A prévia Expo autenticou um paciente fictício na API isolada. Os cenários do app em 320 e 390 px verificaram o envio exato, a recuperação após conflito simulado e o histórico de pedidos novos e antigos. A auditoria npm encontrou 12 entradas moderadas, zero altas e zero críticas.

Os perfis EAS separam desenvolvimento, APK interno e AAB de produção. Os perfis de teste exigem uma URL explícita de API. A CI móvel passou no commit `a7fe849`, que gerou o APK ARM64 de prévia. A API de demonstração desse APK voltou a responder pela LAN e a consulta encontrou 18 horários livres em sete dias. [Prévia Android](https://github.com/GuxtavoPereira/lepera-clinic-mobile/releases/tag/v0.1.0-preview.1) · [CI móvel](https://github.com/GuxtavoPereira/lepera-clinic-mobile/actions/runs/42831316430)

## Relatórios e próximos aceites

O commit `e83f62e` acrescentou seis tipos de relatórios e gráficos à implementação anterior. A tela `/reports` voltou a usar essa implementação. A fila identifica como **Agendado** o status de agendamento. O gráfico de auditoria distingue recurso, ação e papel.

Os 35 testes do módulo e a suíte completa da API (410 testes) passaram. A compilação web do Next.js também passou. No navegador, uma conta administrativa abriu a prévia e baixou PDF e CSV. Em uma tela de 390 px, uma conta de paciente viu somente as próprias consultas. No PostgreSQL nativo, os nove tipos passaram em consulta e nos dois formatos de exportação com uma conta administrativa. O financeiro retornou 403 para a conta de paciente e o intervalo de datas invertido retornou 400.

Os próximos aceites incluem a instalação no Android físico, carga sustentada em homologação, sessão distribuída e revisão das dependências. A rodada sustentada local foi concluída em 13/11 e está descrita no [relatório de carga](relatorio-carga.md). A regra de 24 horas e o destino do card público do profissional dependem das decisões do checklist.

## Consulta de horários com Google

A [matriz de permissões de 14/11](permissoes-privacidade.md) acrescenta 91 verificações HTTP com PostgreSQL local: isolamento de consultas e notificações, acesso clínico por vínculo, papéis administrativos e restrições de tokens. A revisão também corrigiu os cabeçalhos de cache da lista e do detalhe de prontuários. Os tokens Google dessa matriz são sintéticos; o aceite com conta real permanece separado.

O aviso no login local vinha da configuração da API de demonstração, que sobrescrevia `GOOGLE_CLIENT_ID` com um valor vazio. A API publicada retornou `enabled: true`. A demonstração passou a ler o ID público já salvo na configuração local.

Os seis testes do módulo passaram. Em `http://localhost:3000`, o navegador em 390 px carregou o botão oficial do Google e a API gerou o desafio de cinco minutos para essa origem. O cenário desabilitado mostrou a mensagem de indisponibilidade. A autenticação completa com uma conta real segue pendente.

## Notificações de agendamento

| Evento | Destinatário | Canal | Ação na central |
| --- | --- | --- | --- |
| Solicitação registrada | A recepção acompanha pela fila | Fila de solicitações | Abrir solicitações |
| Solicitação aprovada | Paciente | Notificação interna | Ver consulta |
| Solicitação recusada | Paciente | Notificação interna | Ver horários livres |
| Cancelamento direto | Paciente e profissional envolvidos, exceto o autor | Notificação interna | Ver consulta |
| Pedido de cancelamento aprovado | Paciente e profissional solicitante | Notificação interna | Ver consulta |
| Pedido de cancelamento recusado | Profissional solicitante | Notificação interna | Ver consulta |
| Horário liberado por cancelamento | Até três pacientes da fila com preferências compatíveis | Notificação interna | Ver horários livres |
| Remarcação pela equipe | Paciente e profissional envolvidos | Notificação interna | Ver nova consulta |
| Lembrete e indisponibilidade sem cancelamento | Pendente | Pendente | Pendente |

Em PostgreSQL nativo, dois cancelamentos simultâneos geraram um só aviso para a mesma entrada da fila. Aprovação e recusa concorrentes sobre o mesmo pedido retornaram 200 e 409 e deixaram a consulta coerente com a decisão aceita. Os avisos de cancelamento mantiveram o motivo e a nota de revisão fora da mensagem. No navegador a 390 px, paciente e profissional abriram suas telas a partir de avisos gerados no banco de teste. Os 415 testes da API e a compilação web passaram.

A migração `20261110150000_notification_appointment_link` acrescenta uma referência opcional à consulta. Os dez avisos antigos do banco de teste conservaram seus dados e continuam com o atalho geral. Um teste de exclusão com reversão confirmou que a referência é limpa e o aviso permanece.

Os testes com PostgreSQL e navegador em 390 px confirmaram a consulta correta para confirmações e cancelamentos. **Ver consulta** abre o registro permitido mesmo com filtro ativo. Se o registro estiver indisponível para a conta, a interface mostra um aviso genérico e mantém a navegação da tela. Em 12/11/2026, a compilação web e os 416 testes da API passaram.

## Auditoria da agenda

O painel administrativo identifica a criação e o cancelamento direto de consultas, além da aprovação e da recusa de solicitações de agendamento. A trilha registra quem realizou a operação, qual registro foi afetado e o contexto da requisição. A aprovação também referencia a consulta criada. As justificativas e notas permanecem nos registros de origem.

Em PostgreSQL isolado, validei as quatro operações, o acesso administrativo à trilha e a recusa para a recepção. Dois cancelamentos simultâneos retornaram 200 e 409 e produziram um único evento, com o autor e o motivo da operação aceita preservados nos respectivos registros. Os quatro rótulos apareceram no painel a 390 px. Os 416 testes da API e as compilações da API e da web passaram.

## Agenda da recepção e encaixes

A lista aplica filtros de profissional, dia, período e status antes de paginar. O dia segue o horário de Brasília e inclui consultas que atravessam a meia-noite. Escolher um dia ativa a visualização de todo o dia. **Limpar filtros** restaura as próximas consultas.

O encaixe manual fora da disponibilidade exige justificativa de pelo menos cinco caracteres. A justificativa fica na consulta e a auditoria indica o uso da exceção. A verificação de conflito continua valendo. Em PostgreSQL isolado, confirmei os dois dias de uma consulta que atravessava a meia-noite, a recusa de data inválida e de horário em conflito e a aprovação de um pedido flexível com justificativa. No navegador a 390 px, a lista e a grade diária filtraram pelo profissional e o formulário levou o foco à justificativa antes de permitir o encaixe. Os 418 testes da API e as compilações passaram.

Os logs e as capturas com dados sintéticos ficam nas pastas locais ignoradas `work/v1.2-qa/` e `work/v1.2/public/`. Os ZIPs `Clinical Project.zip` e `Clinical Project (1).zip` contêm exportações de design. As quatro fotos WebP da home são referências licenciadas, com créditos no README.

## Preparação da publicação na main — 12/11/2026

O conjunto de 12 commits entre `2955605` e `3f728c1` passou novamente pelo lint completo, pela verificação de tipos, pelas compilações da API e da web, pelos 418 testes da API e pelos seis testes financeiros do frontend. A revisão independente não encontrou bloqueios. A atualização do GitHub confirmou que a `main` era ancestral desse conjunto, permitindo integração sem sobrescrever trabalho remoto.

Antes da publicação, a conta de demonstração da API pública confirmou a correspondência com o banco configurado. A única migração pendente era `20261110150000_notification_appointment_link`. Ela foi aplicada à base publicada após uma cópia local dos registros de notificações e do histórico de migrações. A notificação anterior manteve todos os campos e recebeu a referência opcional nula. A restrição de exclusão `SET NULL` foi conferida. Não houve reset nem execução do seed.

As cópias e evidências privadas permanecem em `work/v1.2-qa/`, fora do Git. A ampliação das contas no seed é código para futuras cargas de demonstração e não acrescenta contas automaticamente ao banco publicado. O aceite da publicação exige verificar os dois projetos da Vercel no commit enviado e executar verificações nas URLs públicas. Em caso de regressão, republicar frontend e backend no commit anterior e preservar a coluna aditiva e a chave de criptografia.

## Remarcação de consultas — 13/11/2026

A recepção pode selecionar uma vaga ou informar um encaixe em Brasília. O novo agendamento mantém participantes, duração, modalidade, tipo e local. A consulta original fica como `RESCHEDULED`, vinculada à nova, com suas notas e eventuais cobranças canceladas preservadas. Prontuário, avaliação, cobrança ativa e pedido de cancelamento pendente impedem a operação. Administração e superadministração têm autorização na API; paciente e profissional continuam solicitando alterações à equipe. A política de antecedência de 24 horas permanece como estava.

O registro de auditoria identifica a autoria e a consulta criada. Os avisos apontam para o novo agendamento e não incluem o motivo informado. A lista de espera só é avisada quando o novo horário deixa o anterior totalmente livre. O controle de versão exige atualizar a consulta após uma decisão concorrente. A gravação de prontuário e a abertura de pedido de cancelamento obtêm a mesma consulta antes de gravar, impedindo que sejam concluídas sobre uma origem remarcada durante a operação.

Os 462 testes da API (39 suítes), seis testes financeiros e três testes de fuso do frontend passaram, assim como lint, tipos e builds. Em PostgreSQL 17.11 isolado, 13 grupos de verificações cobriram permissões, datas, conflitos, reversão integral, histórico, cobranças e notificações. Foram realizadas três disputas por cenário entre remarcação e gravação clínica, pedido de cancelamento, cancelamento direto, criação e reabertura de cobrança. Duplo clique e duas origens tentando ocupar o mesmo destino também retornaram uma decisão aceita e uma resposta 409.

No navegador em 390 px, seis grupos de verificações cobriram erro junto ao motivo, foco, atualização após versão desatualizada, seleção de vaga, encaixe, links do histórico e das notificações e atividade administrativa. Os temas claro e escuro foram inspecionados; a tela de detalhes também foi conferida em 1440 px. Um aparelho configurado para Tóquio salvou e mostrou 06:15 em Brasília como `09:15Z`. A formatação compartilhada foi corrigida para manter o fuso da clínica; os novos testes incluem a passagem da meia-noite em três fusos de aparelho e fazem parte da CI.

Os testes de escrita usaram somente `lepera_notifications_qa` em `127.0.0.1:51235`. Capturas e resultados permanecem ignorados em `work/v1.2-qa/`. Não foi executado reset, seed ou alteração de consulta no banco publicado. A remarcação usa os campos já existentes e não exige migração. Troca de profissional e transferência de pagamentos ficam fora desta etapa.
