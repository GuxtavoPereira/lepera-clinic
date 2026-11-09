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

O PGlite multiplexa conexões em um processo. A concorrência sob PostgreSQL nativo e a carga precisam ser repetidas em homologação. O limite de requisições atual é por instância.

## Navegação por papel

| Papel | Área principal | Recursos principais |
| --- | --- | --- |
| Administração | `/admin` | Usuários por perfil e atividade, agenda de hoje em leitura, financeiro e estoque |
| Superadministração | `/admin` e `/reception` | Gestão administrativa e fluxos autorizados de recepção |
| Recepção | `/reception` | Solicitações, lista e calendário, cadastro e recebimentos |
| Profissional | `/doctor` | Agenda, pacientes vinculados, disponibilidade e prontuários próprios |
| Paciente | `/patient` | Agenda, consultas, solicitações, lista de espera e perfil |

## App do paciente

Na base SDK 57, a instalação limpa, a tipagem, o lint e a exportação web passaram. O Expo Doctor apontou quatro pacotes com patches antigos. A branch móvel atualiza para Expo 58.0.23, React 19.3 e React Native 0.88.1 com Expo Router e Dev Client compatíveis.

O SDK 58 passou na tipagem, no lint, na verificação de versões, nos 20 checks do Expo Doctor e nas exportações web e Android/Hermes. A prévia Expo autenticou um paciente fictício na API isolada. Os cenários do app em 320 e 390 px verificaram o envio exato, a recuperação após conflito simulado e o histórico de pedidos novos e antigos. A auditoria npm encontrou 12 entradas moderadas, zero altas e zero críticas.

Os perfis EAS separam desenvolvimento, APK interno e AAB de produção. Os perfis de teste exigem uma URL explícita de API. A configuração de CI móvel está na branch do app e aguarda execução no GitHub.

## Relatórios e próximos aceites

O commit `e83f62e` acrescentou seis tipos de relatórios e gráficos à implementação anterior. Os 35 testes de relatórios passaram. `/reports` permanece em revisão com o aviso **Em produção**. Para a revisão, conferir a diferença entre **Agendado** e **Atendido** na fila e distinguir papéis nas categorias do gráfico de auditoria.

Os próximos aceites de lançamento incluem APK e execução em aparelho, carga e concorrência em PostgreSQL nativo, recuperação de backup, autorização Google real, sessão distribuída e revisão das dependências. A regra de 24 horas e o destino do card público do profissional dependem das decisões do checklist.

Os logs e as capturas com dados sintéticos ficam nas pastas locais ignoradas `work/v1.2-qa/` e `work/v1.2/public/`. Os ZIPs `Clinical Project.zip` e `Clinical Project (1).zip` contêm exportações de design. As quatro fotos WebP da home são referências licenciadas, com créditos no README.
