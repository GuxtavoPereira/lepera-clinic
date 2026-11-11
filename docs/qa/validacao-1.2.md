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

Os próximos aceites incluem a instalação no Android físico, carga sustentada em homologação, autorização Google real, sessão distribuída e revisão das dependências. A regra de 24 horas e o destino do card público do profissional dependem das decisões do checklist.

Os logs e as capturas com dados sintéticos ficam nas pastas locais ignoradas `work/v1.2-qa/` e `work/v1.2/public/`. Os ZIPs `Clinical Project.zip` e `Clinical Project (1).zip` contêm exportações de design. As quatro fotos WebP da home são referências licenciadas, com créditos no README.
