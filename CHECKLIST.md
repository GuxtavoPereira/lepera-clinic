# Leperapia Clinic — checklist de conclusão 1.3

> **Revisão: 15/11/2026. Fonte canônica: este arquivo no repositório web/API.**
> Substitui o diagnóstico da `checklist1.2.md`; o histórico anterior é preservado. Abrange site público, portal, API, banco, operação e aplicativo de pacientes. Não autoriza novas expansões automaticamente.

## Como usar e o que significa concluir

Esta é a consolidação de **todas as pendências identificadas nesta revisão**, a partir do código local/remoto, documentação, Trello e histórico solicitado. Não é possível garantir que nenhum defeito ainda desconhecido exista. Não atribuímos um percentual de conclusão a itens de tamanhos e estados diferentes.

**Concluir o sistema** significa fechar o escopo com a clínica, implementar o aprovado, validar fluxos e restrições, publicar versões rastreáveis e comprovar que a equipe consegue operar e recuperar o ambiente. A demonstração acadêmica com dados sintéticos e a operação com pacientes reais têm critérios diferentes.

- `[x]`: entrega ou evidência localizada, com limites descritos. Não significa homologação universal.
- `[ ]` **Implementação**: falta código/integração identificado.
- `[ ]` **Validação**: existe implementação, mas falta o aceite especificado.
- `[ ]` **Decisão**: falta definição do responsável; não implementar uma regra presumida.
- `[ ]` **Operação**: infraestrutura, segurança, publicação ou processo sem evidência suficiente.
- **P0:** bloqueia operação com dados reais ou integridade/segurança do fluxo afetado.
- **P1:** necessário para fechar o escopo funcional web + app de pacientes, salvo exclusão formal registrada.
- **P2:** melhoria planejada ou preparação de entrega; inclusão na versão final a confirmar.
- **Futuro:** fora da conclusão atual; não bloqueia a entrega se continuar explicitamente excluído.

Cada item precisa de responsável nominal e evidência na execução. As áreas sugeridas são **Produto/Clínica, Web, API/Banco, Mobile, QA e Operação**; esta revisão não atribui tarefas a integrantes sem confirmação.

## Bases e evidências conferidas

| Fonte | Referência | O que demonstra |
| --- | --- | --- |
| Código web/API | `main`, [`db5747d`](https://github.com/GuxtavoPereira/lepera-clinic/commit/db5747d6e2f7da585ceecebe53edf72fef7c7095) | Base de execução anterior a esta revisão documental |
| CI web/API | [Execução de 14/11](https://github.com/GuxtavoPereira/lepera-clinic/actions/runs/43641624683) | Lint, tipos, builds e 476 testes automatizados |
| Mobile `main` | [`dc5b411`](https://github.com/GuxtavoPereira/lepera-clinic-mobile/commit/dc5b411addcd8774fcaa2333883d30e38446134d), após [PR #1 integrado](https://github.com/GuxtavoPereira/lepera-clinic-mobile/pull/1) | SDK 58.0.25, visual/contrato atuais, cancelamento e perfil editável disponíveis ao clonar a `main` |
| CI mobile | [Execução de 15/11](https://github.com/GuxtavoPereira/lepera-clinic-mobile/actions/runs/43764062486), código `dc5b411` | Lint/tipos, 15 testes, compatibilidade/Doctor e exportações web/Android aprovados; não substitui aceite físico |
| APK | [Android preview no repositório principal](https://github.com/GuxtavoPereira/lepera-clinic/releases/tag/android-v0.1.0-preview.1) | Mesmo APK ARM64 da prévia mobile, com SHA-256 verificado; API sintética na LAN, sem homologação física |
| Testes integrados/UI | [Validação 1.2](docs/qa/validacao-1.2.md) | Agenda, concorrência, notificações, relatórios e telas verificadas |
| Segurança por recurso | [Permissões e privacidade](docs/qa/permissoes-privacidade.md) | 91 chamadas HTTP com sete contas/cinco papéis; não auditoria completa |
| Desempenho | [Carga local](docs/qa/relatorio-carga.md) | 99.831 leituras HTTP 200; 60 s por nível 10/50/200 usuários; não capacidade de produção |
| Planejamento | [Trello](https://trello.com/b/gbfJq3qw/lepera-clinic) e checklist 1.2 | Requisitos/decisões; cartões antigos não comprovam ausência de código |
| Integrações | Metadados Vercel de 14/11 | ID Google configurado; SMTP presente em Production, senha Sensitive; não comprova entrega/autenticação real |

O [registro da 1.0](docs/release-1.0.md) descreve 02/11 e permanece histórico. Não foi repetida toda a suíte nesta revisão documental. Web/API não possuem uma GitHub Release formal até esta data; o APK tem release própria.

## Ordem recomendada para continuar

1. **Fechar decisões do escopo:** DEC-01 a DEC-08, sobretudo 24h, nova sessão, escalas e assinatura.
2. **Validar integrações reais:** ACC-01 e ACC-02, com contas de teste controladas.
3. **Concluir lacunas visíveis:** CLI-01, CLI-02 e AGE-01; ligar avaliações ao relatório de satisfação.
4. **Finalizar o app:** concluir os itens abertos MOB-02 a MOB-08, instalação física e funções restantes do paciente; MOB-01/MOB-04/MOB-05 já entregues.
5. **Completar testes da operação:** AGE, FIN, EST e REP; corrigir falhas encontradas.
6. **Fechar segurança e recuperação:** SEC e OPS antes de pacientes reais.
7. **Homologar apresentação e release:** QA, DOC e REL; repetir testes dos fluxos alterados.

As etapas podem avançar em paralelo quando contratos e arquivos forem independentes. Não é necessário aguardar todos os P2 para corrigir um P0.

## Entregas já presentes — não refazer

- [x] **BASE-01 — Arquitetura:** monorepo Next.js/NestJS, PostgreSQL/Prisma, contratos, migrations e CI. [Pacotes](package.json), [schema](packages/database/prisma/schema.prisma), [CI](.github/workflows/ci.yml).
- [x] **BASE-02 — Acesso e perfis:** cinco papéis, CPF obrigatório, cadastro público/interno, login, perfis, busca e temas. Limites por recurso testados na matriz HTTP.
- [x] **BASE-03 — Site público:** landing adaptada ao Figma, identidade Leperapia, fotos ilustrativas e claro/escuro. Cards inteiros da equipe abrem detalhes; foto/fallback e chamada para horários existem.
- [x] **BASE-04 — Painéis:** KPIs com destinos/filtros, consultas do dia admin/superadmin, filtro de ativos, badges, bordas semânticas e três paletas somente em desenvolvimento. [Evidências](docs/qa/validacao-1.2.md).
- [x] **BASE-05 — Agenda:** dia/semana, cores por profissional, vagas livres, solicitação exata/flexível, aprovação/recusa, criação direta, cancelamento e lista de espera.
- [x] **BASE-06 — Concorrência:** aprovação simultânea da mesma vaga resultou em uma decisão aceita e outra 409, preservando o horário exato em PostgreSQL isolado.
- [x] **BASE-07 — Remarcação:** preserva origem/participantes/condições, exige motivo, verifica conflitos e dependências, registra autoria e notifica.
- [x] **BASE-08 — Ficha mínima:** profissional vinculado vê identificação/contato básico e consultas recentes; atalhos e bloqueio de acesso cruzado foram testados.
- [x] **BASE-09 — Prontuário:** vínculo, campos cifrados, assinatura interna, bloqueio após assinatura, auditoria e `private, no-store`. Assinar conclui o atendimento.
- [x] **BASE-10 — Notificações web:** sino, listagem, leitura individual, eventos de agenda e atalhos para consulta. Não equivale a push/lembrete programado.
- [x] **BASE-11 — Gestão:** financeiro manual e estoque com concorrência/auditoria; recebimentos da recepção separados das despesas.
- [x] **BASE-12 — Relatórios:** reativados; nove tipos, PDF/CSV e escopo por papel. Coleta de satisfação ainda incompleta.
- [x] **BASE-13 — Google/recuperação:** prévia Google de 30 min; reset com token de uso único de 30 min e invalidação de sessões antigas. Integrações reais seguem em ACC.
- [x] **BASE-14 — Demo:** seed de 16 usuários/18 consultas/12 prontuários cifrados e carga adicional de novembro/dezembro de 2026; banco isolado validado.
- [x] **BASE-15 — Mobile:** SDK 58, Paper MD3, login, início, consultas, calendário, pedido exato/modalidade, cancelamento próprio, perfil editável, temas e SecureStore nativo. Lint/tipos/exports/Doctor 20/20 e CI registrados; aceite nativo permanece separado.
- [x] **BASE-16 — Android:** APK da build mobile `a7fe849` publicado no repositório mobile e disponibilizado também nos Releases do principal, com hash, assinatura de teste e limites da LAN. Aceite físico pendente.
- [x] **BASE-17 — Carga e recuperação local:** carga curta, CPU/RAM e restauração sintética registradas. Homologação longa, gravações e recuperação operacional abertas.
- [x] **BASE-18 — Documentação:** README e checklist reconciliados com código, mobile, Vercel e Trello; checklist anterior preservada como histórico.

## Decisões de produto e regras

Responsáveis sugeridos: **Produto/Clínica + equipe técnica**. Não tratar decisões como bugs já comprovados.

- [ ] **DEC-01 · P1 · Decisão — Escopo final:** aprovar funções/plataformas para uma clínica e app de pacientes; registrar inclusões e adiamentos. Aceite: cada item condicionado tem decisão/responsável, sem prometer “100%” por número de checkboxes.
- [ ] **DEC-02 · P1 · Decisão — Regra adicional de 24 horas:** escolher antecedência para solicitar, prazo da recepção, liberação posterior ou combinação; definir exceções/fuso. O cancelamento do paciente com antecedência mínima de 24h **já existe** e é outra regra.
- [ ] **DEC-03 · P1 · Decisão — Nova sessão:** confirmar quatro etapas previstas no [Trello](https://trello.com/c/Zp9qti7n/6-backend-recepcionista) ou substituição formal pelo agendamento existente. Definir dados/etapas antes de AGE-01.
- [ ] **DEC-04 · P1 · Decisão — Escalas:** selecionar instrumentos, perguntas, pontuação, interpretação permitida e permissões com responsável clínico. Não criar diagnóstico automático por suposição.
- [ ] **DEC-05 · P0 · Decisão — Assinatura clínica:** aprovar assinatura interna, autoria, imutabilidade, correções e exigências operacionais. Se exigida assinatura certificada, especificar integração; o botão atual não a substitui.
- [ ] **DEC-06 · P1 · Decisão — Avaliações:** definir elegibilidade, nota/comentário, edição, visibilidade, agrupamento e eventual publicação. Não publicar opiniões de pacientes automaticamente no site.
- [ ] **DEC-07 · P1 · Decisão — Ciclo da consulta:** definir chegada/espera, início, falta, conclusão, atrasos e encerramento sem assinatura; aprovar transições/responsáveis. `WAITING` no schema não comprova check-in completo.
- [ ] **DEC-08 · P1 · Decisão — Agenda excepcional:** confirmar férias, feriados, bloqueios pontuais, duração/intervalos e reação a consultas já marcadas. Hoje a disponibilidade é recorrente por dia da semana.
- [ ] **DEC-09 · P2 · Decisão — Perfil público:** aceitar Sheet atual ou exigir rota compartilhável; aprovar dados, fotos, credenciais e especialidades publicáveis.
- [ ] **DEC-10 · P1 · Decisão — Cadastro e menores:** aprovar dados obrigatórios, responsável/contato de emergência, acesso de menores e confirmação de e-mail; limites de edição de CPF/nascimento e desativação.
- [ ] **DEC-11 · P1 · Decisão — Distribuição mobile:** definir Android inicial e se iOS entra nesta entrega; escolher teste interno/loja e responsável por contas/assinaturas.
- [ ] **DEC-12 · P2 · Decisão — Analytics:** aprovar finalidade, eventos agregados, acesso, retenção e transparência antes de coletar. Separar divulgação e dados clínicos.

## Acesso, cadastro e perfil

Responsáveis: **Web + API + QA**, com responsável pelas contas externas.

- [ ] **ACC-01 · P1 · Validação — Google real:** testar na origem publicada com conta controlada, cliente/origens/audiência, conclusão, recusa/popup fechado, rede e expiração de 30 min. Aceite: só equipe/vagas livres, sem ganhar permissões de paciente por esse acesso.
- [ ] **ACC-02 · P1 · Validação — Gmail real:** confirmar recebimento, remetente e URL; redefinir senha de conta controlada; conferir token expirado/reutilizado, concorrência, senha anterior e sessões antigas. Sem tokens/senhas nos logs. Variáveis presentes não provam entrega.
- [ ] **ACC-03 · P1 · Implementação — Comunicação do cadastro:** implementar mensagem de cadastro planejada; conforme DEC-10, confirmar endereço, reenviar com limite e corrigir e-mail errado. Hoje cadastro cria sessão e não envia boas-vindas/verificação.
- [ ] **ACC-04 · P0 · Validação — Abuso/enumeração:** conferir login, cadastro, reset, reenvio e Google com contas existentes/inexistentes, falhas SMTP e limites; respostas apropriadas sem exposição indevida. Depende de SEC-02.
- [ ] **ACC-05 · P1 · Validação — Paridade de formulários:** comparar criação/edição público, recepção e admin, grupos/campos, erros e foco; CPF/e-mail duplicados, nascimento inválido, opcionais e responsável.
- [ ] **ACC-06 · P1 · Validação/implementação — Perfil por papel:** salvar/recarregar campos, menu/avatar/busca e senha; provar que edição própria não muda papel/status/campos protegidos. No mobile, grupos de campos e negativas passaram em banco sintético (MOB-04). Falta controle atômico de versão na API para edições simultâneas do mesmo campo: a comparação de leituras no app reduz o risco, mas não elimina a janela entre leitura e gravação.
- [ ] **ACC-07 · P1 · Validação — Desativação:** usuário inativo perde acesso e histórico permanece; definir efeitos em consultas futuras/disponibilidade. Testar ativos/inativos, paginação e filtros com base maior.
- [ ] **ACC-08 · P2 · Decisão — Foto:** `photoUrl` existe; decidir URL administrada ou upload. Se aprovado, especificar tipos/tamanho, armazenamento, autorização e remoção; campo URL não equivale a upload pronto.

## Agenda, recepção e lista de espera

Responsáveis: **Web + API/Banco + QA**, conforme DEC-02/03/07/08.

- [ ] **AGE-01 · P1 · Implementação — Nova sessão:** concluir `/reception/new-session`, hoje “Em construção”, ou substituir/redirecionar com decisão registrada para `/reception/appointments/new`. Aceite: nenhuma entrada prometida leva a tela vazia e o fluxo aprovado persiste dados.
- [ ] **AGE-02 · P1 · Implementação condicionada — 24h:** após DEC-02, aplicar API e mensagens web/mobile; testar 23h59/exatamente 24h, exceções e concorrência. Se excluída, registrar decisão e preservar regra de cancelamento.
- [ ] **AGE-03 · P1 · Implementação condicionada — Exceções:** após DEC-08, adicionar bloqueios/feriados/férias necessários e tratar consultas afetadas. Vaga bloqueada não reaparece nos clientes nem atendimento é cancelado silenciosamente.
- [ ] **AGE-04 · P1 · Validação — Jornada e estados:** criação direta, pedido exato, recusa, encaixe, confirmação, cancelamento próprio/pedido profissional, remarcação e conclusão. Distinguir pedido pendente de consulta confirmada; cobrir datas antigas/outro fuso.
- [ ] **AGE-05 · P1 · Implementação/validação — Ciclo operacional:** executar DEC-07, incluindo estados só modelados se mantidos no escopo; provar histórico, autorização e atualização de contadores/relatórios/notificações.
- [ ] **AGE-06 · P1 · Validação — Lista de espera:** entrada própria, prioridade/ordem, saída/desistência, profissional, duplicidade e disputa por vaga; aviso/destino corretos sem dupla reserva.
- [ ] **AGE-07 · P1 · Validação — Concorrência em homologação:** repetir aprovações, mudanças de disponibilidade, remarcação versus cancelamento/prontuário/financeiro e envios repetidos; recuperação visual após 409. Testes locais existentes não substituem ambiente representativo.
- [ ] **AGE-08 · P2 · Validação — Leitura de horários:** conferir nomes/cores/legenda, contraste, muitos profissionais, horários curtos, teclado e 320/390 px; alternativa legível à grade estreita e informação além da cor.

## Atendimento clínico e avaliações

Responsáveis: **API/Banco + Web + responsável clínico + QA**.

- [ ] **CLI-01 · P1 · Implementação — Escalas:** completar API/contratos/persistência e `/doctor/session/[id]/scales` conforme DEC-04. Profissional vinculado registra/recupera; validar privacidade, histórico, auditoria e comportamento após assinatura.
- [ ] **CLI-02 · P1 · Implementação — Avaliações:** completar API e `/patient/reviews/[appointmentId]` conforme DEC-06. Só paciente do atendimento elegível avalia; negar duplicação/acesso cruzado; agregados e relatório de satisfação consistentes.
- [ ] **CLI-03 · P1 · Validação — Prontuário cotidiano:** profissional confere dados, evolução, hipótese/plano e campos previstos; rascunho, falha de rede, textos extensos, assinatura/edição posterior. Cifra e bloqueio existem; falta aceite completo clínico/UX.
- [ ] **CLI-04 · P0 · Decisão/implementação — Retificação/acesso excepcional:** definir correção após assinatura, troca de responsável e acesso excepcional se necessários, preservando original, justificativa/autoria, prazo e auditoria. Não liberar prontuário geral para admin/superadmin.
- [ ] **CLI-05 · P2 · Decisão — Anexos:** confirmar escopo; `attachmentsPath` não é módulo funcional. Se aprovado, implementar vínculo, limites/tipos, armazenamento, verificação de arquivo, download sem cache, retenção e testes negativos.
- [ ] **CLI-06 · P0 · Validação — Ficha mínima:** responsável aprova dados, vínculo e duração do acesso; retestar resumo/histórico após cancelamento, desativação e mudanças autorizadas, sem exposição a outros perfis.

## Financeiro, estoque e relatórios

Responsáveis: **Web + API/Banco + QA + responsável administrativo**. Os módulos existem; as tarefas fecham seu aceite/lacunas, não pedem reconstrução.

- [ ] **FIN-01 · P1 · Validação — Operação:** validar receita/despesa, cobrança de consulta, decimal, vencimento, edição pendente, quitação, cancelamento, estorno do registro e reabertura; limites da recepção e ausência de movimentação bancária automática.
- [ ] **FIN-02 · P1 · Validação — Números:** comparar filtros/totalizadores/CSV com banco, atrasados, período limítrofe/fuso, valor alto e vazio; saldo por vencimento documentado, sem divergência ou fórmula executável no CSV.
- [ ] **FIN-03 · P1 · Validação — Agenda e cobrança:** uma cobrança por consulta, remarcação bloqueada com cobrança ativa, cobrança cancelada e envio concorrente. Alteração financeira não cancela consulta nem perde histórico implicitamente.
- [ ] **EST-01 · P1 · Validação — Rotina:** cadastro/edição, entrada inicial, saída, justificativa, mínimo/reposição e histórico paginado; aprovar unidade/precisão e identificação dos materiais com a equipe.
- [ ] **EST-02 · P1 · Validação — Integridade:** saídas concorrentes, saldo negativo, envio repetido, filtros/autoria; conferir saldo versus movimentações e recuperação da interface após conflito.
- [ ] **REP-01 · P1 · Validação — Nove relatórios:** consultas, financeiro, estoque, profissionais, demanda, pacientes, movimentações, satisfação e auditoria com base conhecida. Aprovar definição/totais; relatório vazio não é satisfação real.
- [ ] **REP-02 · P1 · Validação — Exportação:** PDF multipágina, cabeçalhos, acentos, nomes longos, fuso, gráficos, CSV seguro e limites 366 dias/5.000 registros/prévia 100. Explicar limites/vazio sem sugerir que export contém só a prévia.
- [ ] **REP-03 · P0 · Validação — Acesso:** homologar download por papel/vínculo, URL compartilhada, sessão expirada, ausência de cache e auditoria prevista; sem conteúdo clínico indevido em exportação administrativa.
- [ ] **REP-04 · P1 · Integração — Satisfação:** após CLI-02, conferir médias, contagem, atualização e isolamento; diferenciar ausência de avaliações de nota zero.
- [ ] **REP-05 · P2 · Condicional — Outro desenvolvedor:** quando chegarem mudanças ao GitHub, revisar diff/contratos/permissões e comparar com versão ativa; preservar histórico e integrar com aceite. Não pausar o módulo atual nem depender indefinidamente de contribuição não recebida.

## Notificações e comunicação

Responsáveis: **API + Web + Mobile + Operação**.

- [ ] **NOT-01 · P1 · Validação — Matriz de eventos:** revisar matriz na [validação 1.2](docs/qa/validacao-1.2.md): evento, destinatário, canal, mensagem e destino. Acrescentar ciclo, indisponibilidade e avaliações conforme decisões aprovadas.
- [ ] **NOT-02 · P1 · Implementação — Avisos no app:** listagem do paciente, contagem, marcar lido e abrir atendimento autorizado; aviso antigo, consulta indisponível, sessão expirada e sincronização com portal.
- [ ] **NOT-03 · P2 · Implementação — Push seguro:** permissão explícita, token por dispositivo/revogação no logout, canal, retentativas, deduplicação e token inválido. Testar fisicamente; tela bloqueada sem diagnóstico ou conteúdo da sessão.
- [ ] **NOT-04 · P2 · Implementação condicionada — Lembretes:** após DEC-02, janela, execução idempotente, fuso, cancelamento/remarcação e falha/retentativa. Não enviar lembrete de consulta cancelada.
- [ ] **NOT-05 · P1 · Operação — Falhas de envio:** registro sem dados sensíveis, distinguir operação salva de mensagem enviada, monitorar/reprocessar. Falha do provedor não duplica consulta/cobrança.

## Site público e usabilidade

Responsáveis: **Web + QA + Produto/Clínica**.

- [ ] **UX-01 · P1 · Validação — Conteúdo/identidade:** aprovar marca, textos, especialidades, abordagens, equipe/recepção, endereço, canais/horários reais. Substituir fotos ilustrativas por autorizadas quando disponíveis; não atribuir identidade profissional a modelos.
- [ ] **UX-02 · P1 · Validação — Formulários:** teclado, foco no erro, mensagens locais/gerais, obrigatórios, máscaras, confirmação, duplo envio e dados mantidos após falha em cadastro, solicitação, prontuário, financeiro e estoque.
- [ ] **UX-03 · P1 · Validação — Navegação:** inventariar links por papel, perfil, voltar/breadcrumb, busca, KPIs/filtros, vazio/erro/carregando, URLs diretas e histórico do navegador; negar acesso não autorizado também fora do menu.
- [ ] **UX-04 · P1 · Validação — Responsividade:** todas as rotas úteis em 320/390/768/1024/1440 px; tabelas, calendário, modais, menus, zoom e teclado virtual sem ações ocultas/conteúdo essencial cortado.
- [ ] **UX-05 · P1 · Validação — Acessibilidade:** teclado, foco/retorno, rótulos, mensagens anunciadas, leitor de tela, contraste, alvos de toque e redução de movimento; registrar falhas/reteste, não declarar conformidade só por aparência.
- [ ] **UX-06 · P1 · Validação — Temas:** preferência inicial/persistência, formulários, datas, gráficos, desabilitados e impressão/exportação; comparação dev de paletas não aparece em produção.
- [ ] **UX-07 · P2 · Decisão/implementação — Perfil público:** executar DEC-09. Aceitar e validar Sheet/teclado/chamada ou implementar rota própria com dados mínimos e estados de indisponibilidade.
- [ ] **UX-08 · P2 · Validação — Contato:** conferir `mailto`, conteúdo/destino, ausência de aplicativo de e-mail e alternativa. Se exigido envio no próprio site, definir serviço/proteção contra abuso/confirmação antes de implementar.
- [ ] **UX-09 · P2 · Validação — Desempenho/descoberta:** medir LCP/INP/CLS em cenário móvel, imagens/fontes/equipe; revisar títulos, descrição, favicon, compartilhamento e sitemap/robots conforme escopo, indexando somente páginas públicas.
- [ ] **UX-10 · P2 · Validação — Imagens/movimento:** licenças, fallback, alt e imagem responsiva. Parallax/microinterações da checklist anterior são opcionais e dependem de aprovação, movimento reduzido e desempenho.

## Aplicativo de pacientes

Responsáveis: **Mobile + QA + API para contratos**. Repositório: [lepera-clinic-mobile](https://github.com/GuxtavoPereira/lepera-clinic-mobile). Manter SDK 58; não criar módulos da equipe sem ampliar escopo.

- [x] **MOB-01 · P1 · Integração — Branch atual:** [PR #1 integrado](https://github.com/GuxtavoPereira/lepera-clinic-mobile/pull/1) em 15/11, merge `3f1ad5f`, após [CI aprovada](https://github.com/GuxtavoPereira/lepera-clinic-mobile/actions/runs/43720353538) no código `607de78`. `main` local/remota sincronizadas; clone padrão entrega SDK 58.0.25, horários exatos, telas atuais e cancelamento. README atualizado.
- [ ] **MOB-02 · P1 · Validação — Android físico:** instalar APK/cliente de desenvolvimento e registrar aparelho, Android, commit/API; abertura fria, login paciente/recusa de outros papéis, calendário e pedido aprovado pela recepção.
- [ ] **MOB-03 · P1 · Validação — Expo Go:** QR SDK 58, rede/API com `/api`, firewall e instruções PowerShell `.cmd`; alternativa development build quando Expo Go instalado não for compatível.
- [x] **MOB-04 · P1 · Implementação — Editar perfil:** formulário agrupado, erros/foco, CPF existente bloqueado e definição obrigatória quando ausente; somente campos alterados no PATCH, confirmação por releitura e atualização do nome na sessão. Nove testes unitários, sete cenários de interface e cinco grupos de integração/preservação em PostgreSQL sintético passaram; cinco cenários de cancelamento repetidos. [Código `dc5b411`](https://github.com/GuxtavoPereira/lepera-clinic-mobile/commit/dc5b411addcd8774fcaa2333883d30e38446134d) e [evidências/limites](https://github.com/GuxtavoPereira/lepera-clinic-mobile/blob/main/docs/qa/profile.md). Aceite físico permanece em MOB-02/MOB-11; concorrência atômica na API em ACC-06. APK anterior não inclui a função.
- [x] **MOB-05 · P1 · Implementação — Cancelamento:** entregue em **Minhas consultas**, confirmação/motivo opcional, antecedência de 24h, bloqueio de duplo envio e atualização antes de repetir após erro. Seis testes de regras, cinco cenários de interface e oito grupos de integração API/PostgreSQL sintético conferiram persistência, autorização, vaga, auditoria e avisos. [Evidências](https://github.com/GuxtavoPereira/lepera-clinic-mobile/blob/main/docs/qa/cancellation.md). Aceite físico permanece em MOB-02/MOB-11; o APK `v0.1.0-preview.1` ainda não inclui a função.
- [ ] **MOB-06 · P1 · Implementação — Recuperação nativa:** formulário, link/deep link seguro, uso único/expiração e retorno ao login; token fora da telemetria. Hoje encaminha ao site.
- [ ] **MOB-07 · P1 · Decisão/validação — Cadastro:** aceitar formalmente cadastro web externo com retorno claro ou incluir cadastro nativo; preservar CPF/dados obrigatórios e não anunciar o fluxo nativo antes de existir.
- [ ] **MOB-08 · P1 · Integração — Avisos:** concluir NOT-02; push nesta release, se aprovado, também depende de NOT-03 e entrega real.
- [ ] **MOB-09 · P0 · Validação — Sessão/privacidade:** reiniciar/retomar, token inválido/expirado, conta inativa, troca de senha, logout, falha de SecureStore e troca de usuário. Apagar dados da conta anterior; preservar token para reconexão não libera dados indevidos.
- [ ] **MOB-10 · P1 · Validação — Rede/calendário:** offline/retorno, lentidão, timeout, troca de aba, duplo envio, vaga ocupada, refresh, fuso/vazio. Prévia web não substitui comportamento nativo.
- [ ] **MOB-11 · P1 · Validação — UX nativa:** TalkBack, fonte ampliada, contraste, áreas seguras, teclado, voltar Android, rotação suportada e telas pequenas; corrigir cortes/gestos sem alternativa.
- [ ] **MOB-12 · P2 · Validação — Consumo:** medir abertura, RAM/CPU/rede/bateria e tamanho em aparelho representativo, com cenário/duração; não apresentar estimativa como medição.
- [ ] **MOB-13 · P1 · Operação — Distribuição:** concluir projeto EAS, ambientes, API HTTPS estável, credenciais protegidas, IDs, ícone/splash e versões; APK de aceite/AAB de produção quando aprovado, backup de assinatura e rastreio por commit/hash.
- [ ] **MOB-14 · P1 · Operação — Atualização/publicação:** instalar/atualizar preservando dados apropriados; canal, notas, suporte/privacidade e requisitos de loja se aplicáveis. APK LAN assinado para teste não atende esse aceite.
- [ ] **MOB-15 · P2 · Condicional — iOS:** após DEC-11, ambiente/conta, build/distribuição, links/permissões e iPhone real. Se adiado, declarar Android como entrega e retirar iOS do aceite atual.
- [ ] **MOB-16 · P1 · Validação — Compatibilidade API:** documentar contratos/erros/status do paciente e testar atualização app/API; não quebrar APK instalado. Contratos do app não são automaticamente os do pacote compartilhado web/API.

## Banco, segurança e privacidade

Responsáveis: **API/Banco + Operação + QA**, com decisões de tratamento de dados pelo responsável da clínica.

- [ ] **DAT-01 · P1 · Implementação/decisão — Domínios legados:** revisar `Patient.status`, `Waitlist.status` e `ScheduleRequest.type`, ainda strings, versus enums previstos no Trello; aprovar valores/mapear legado, migrar contratos/dados/testes se mantido requisito. Relações `preferredDoctor` já existem.
- [ ] **DAT-02 · P1 · Validação — Schema/migrations:** índices, relações e exclusão/desativação com volume realista; sequência em base vazia e cópia sintética antiga, contagens/integridade preservadas. Reset não é estratégia de atualização.
- [ ] **DAT-03 · P1 · Documentação — Ambientes de exemplo:** trocar chaves ilustrativas fixas por marcadores inequívocos, completar variáveis API/banco/seed e testar configuração sem arquivos ignorados deste PC. README já instrui gerar chaves próprias.
- [ ] **SEC-01 · P0 · Decisão/validação — Sessão web:** avaliar `localStorage`, duração de 8h, XSS, expiração e revogação/logout no servidor; documentar decisão/implementar controles aprovados. Logout atual é local; reset invalida por versão da sessão.
- [ ] **SEC-02 · P0 · Implementação — Limites distribuídos:** substituir/complementar limites em memória por mecanismo entre instâncias, IP/proxy correto, quotas por conta/rota e testes de reinício/escala. Uma instância não protege o conjunto da hospedagem distribuída.
- [ ] **SEC-03 · P0 · Validação — HTTP:** CORS/origens, proxy, TLS, cabeçalhos/CSP, cache de respostas pessoais, redirecionamentos/downloads; XSS e superfícies CSRF conforme sessão real. Esconder botões não é controle de autorização.
- [ ] **SEC-04 · P0 · Validação — Autorização ampliada:** estender 91 chamadas a recursos novos/ciclo completo, IDs enumerados, papel adulterado, vínculo removido, usuário inativo e acesso horizontal/vertical. Preview Google sem acesso a perfil/pacientes/prontuários.
- [ ] **SEC-05 · P0 · Operação — Segredos/cifra:** inventário de acessos, segregação e backup seguro da chave clínica; ensaiar rotação/recriptografia e recuperação sintética. Não trocar chave existente sem migrar os dados.
- [ ] **SEC-06 · P0 · Validação — Logs/auditoria:** API, Vercel, navegador, app, exports e ferramentas de erro sem senha/token/CPF/conteúdo clínico desnecessários; autoria/contexto, acesso, retenção e proteção contra alteração indevida.
- [ ] **SEC-07 · P0 · Validação/operação — Segurança completa:** dependências/histórico por segredos, validação de entradas/saídas, rotas e testes dinâmicos só em homologação própria com limites. Classificar, corrigir e retestar; sem achados críticos/altos não mitigados. Matriz de permissões não equivale a pentest completo. Em 15/11, a árvore mobile Expo 58.0.25 apresentou dez alertas moderados transitivos (`minimatch` via Expo/ESLint), sem alto/crítico; avaliar/corrigir preservando compatibilidade, sem aplicar downgrade forçado.
- [ ] **SEC-08 · P0 · Decisão/implementação — Privilégios:** aprovar admin/superadmin, criação, recuperação e emergência; avaliar/exigir MFA segundo política adotada e comprovar procedimento. Superadmin não passa a acessar prontuários automaticamente.
- [ ] **SEC-09 · P0 · Decisão/operação — Privacidade:** responsável habilitado valida finalidades/base de tratamento, transparência, consentimentos quando aplicáveis, retenção, solicitações e descarte; implementar páginas/fluxos aprovados. Sem declaração de conformidade integral por suposição.
- [ ] **SEC-10 · P0 · Operação — Demo separada:** base sintética/contas públicas do README não convivem com pacientes reais; provisionar contas privadas, revisar dados/credenciais e impedir mensagens a destinatários fictícios/não controlados.

## Operação, qualidade e desempenho

Responsáveis: **Operação + QA + API/Web/Mobile**.

- [ ] **OPS-01 · P0 · Validação — Isolamento:** conferir destinos efetivos de Development/Preview/Production, bancos/acessos/origens/integrações. Nomes de ambiente não provam separação; preview/CI não pode alterar dados reais.
- [ ] **OPS-02 · P0 · Operação — Backup/restauração:** frequência, retenção, proteção, local separado, responsáveis e objetivos de recuperação; restaurar homologação com chave, conferir dados/leitura/tempo. Restauração local já feita não comprova rotina operacional.
- [ ] **OPS-03 · P0 · Operação — Monitoramento:** API/banco, envio, erros, latência, limites/espaço/conexões e alertas com responsável; sem dados clínicos nos logs.
- [ ] **OPS-04 · P0 · Operação — Deploy/retorno:** migration, compatibilidade, backup, smoke por papel e retorno à versão anterior; ensaiar falha em homologação. Rollback de código não restaura dados automaticamente.
- [ ] **OPS-05 · P1 · Validação — Capacidade:** base maior, leituras/gravações e execução longa em homologação comparável; CPU/RAM/I/O/conexões, erros, recuperação/custos e limites acordados. Não extrapolar 200 usuários locais para Vercel.
- [ ] **OPS-06 · P1 · Operação — CI adicional:** migrations e HTTP/E2E críticos em base descartável, contratos, dependências/segredos e build nativo quando aplicável. CI atual não executa matriz PostgreSQL/carga completa automaticamente.
- [ ] **OPS-07 · P1 · Validação — Proteção GitHub:** consultar regras de `main`, checks, revisão e permissões de publicação; documentar exceções, sem presumir que proteções estejam ausentes.
- [ ] **QA-01 · P1 · Validação — Instalação independente:** outra pessoa segue README em máquina limpa, banco demo novo, sem arquivos/banco/scripts locais ignorados; registrar versões/erros e corrigir guia. CI de instalação não substitui esse aceite de uso.
- [ ] **QA-02 · P1 · Validação — Regressão por papel:** paciente → pedido → recepção → consulta → profissional → assinatura → financeiro/relatório, mais negativas; evidências sintéticas por commit/ambiente e reteste de correções.
- [ ] **QA-03 · P1 · Validação — Compatibilidade:** navegadores suportados, desktop/mobile web, temas, zoom e redes; Android físico/iOS conforme escopo; cobertura/exceções explícitas, sem chamar prévia web de teste nativo.
- [ ] **QA-04 · P1 · Validação — Falhas:** API indisponível, banco lento, 401/403/404/409/429/500, expiração durante preenchimento, respostas fora de ordem e reenvio. Feedback correto e nenhuma operação duplicada.
- [ ] **QA-05 · P1 · Aceite — Operadores do piloto:** paciente de teste, recepção, profissional e admin fazem tarefas sem ajuda; registrar dificuldade/tempo/aceite e corrigir bloqueios.

## Documentação, apresentação e release

Responsáveis: **Coordenação + QA + responsáveis dos módulos**.

- [ ] **DOC-01 · P1 · Planejamento — Trello:** atualizar cartões com evidências/pendências, preservando histórico; ST01–ST14 e módulos antigos não são totalmente ausentes por estarem no backlog. Esta revisão não modificou cartões.
- [ ] **DOC-02 · P1 · Documentação — Rastreabilidade:** requisito/história → rota/API → regra/permissão → teste → commit/PR/release; fluxos Figma mantidos, substituídos e adiados com aceite.
- [ ] **DOC-03 · P1 · Documentação — Guia por papel/API:** operações diárias, contratos/status/erros/limites, diferenças web/mobile, cancelamento/remarcação e relatórios; treinamento de quem operará.
- [ ] **DOC-04 · P1 · Demonstração — Apresentação do dia 25:** confirmar data completa/tempo/requisitos com o grupo; documentos acadêmicos no modelo original, nomes/RGM conferidos e capturas sintéticas atuais. Não criar slides automaticamente nesta tarefa.
- [ ] **DOC-05 · P2 · Condicional — Canva/ensaio:** após autorização/assets, apresentação editável/roteiro fiel com telas reais e estados entregue/pendente/futuro; ensaiar e preparar contingência de internet/e-mail/Google.
- [ ] **DOC-06 · P1 · Demonstração — Reprodutibilidade:** banco sintético, contas/agenda válidas na data e evidências alternativas sem dados reais. Carga atual é fixa em novembro/dezembro de 2026.
- [ ] **REL-01 · P1 · Release — Web/API:** após aceite, tag/release formal, versão coerente, changelog, migrations, testes/limites e retorno. `1.0.0` no package não equivale à release publicada.
- [ ] **REL-02 · P1 · Release — Mobile:** artefato do commit aceito, hash, assinatura/canal, API, instruções/limites. Não substituir silenciosamente APK LAN por outro conteúdo sob a mesma versão.
- [ ] **REL-03 · P1 · Encerramento — Aceite final:** CI do commit publicado, versões front/API/app, smoke, responsáveis, adiamentos e suporte; atualizar README/checklist e registrar aceite da clínica antes de anunciar conclusão.

## Expansões fora do aceite atual

Preservadas para não perder solicitações/ideias. **Não implementar automaticamente nem contar como bloqueio sem aprovação de escopo.**

- [ ] **FUT-01 — SaaS multiclínica:** apenas estudo autorizado: Clinic/membership, isolamento de dados/arquivos/jobs/logs/backup, profissional em múltiplas clínicas, papéis, custos/preços/suporte e ADR. Sem migration multi-tenant, cobrança SaaS ou compartilhamento de prontuários agora.
- [ ] **FUT-02 — Electron:** cartão no Trello, sem escopo/aceite aprovado nesta fase; esclarecer objetivo antes de criar projeto desktop.
- [ ] **FUT-03 — Google completo/biometria:** vínculo seguro, duplicidade, CPF e recuperação antes de substituir prévia atual; Face ID/biometria não entregues.
- [ ] **FUT-04 — Pagamentos avançados:** gateway/banco, parcelamento, parcial, reembolso real, conciliação automática e emissão fiscal dependem de requisitos/provedor.
- [ ] **FUT-05 — Estoque ampliado:** fornecedores, compras, lotes/validade, múltiplos locais/unidades fracionárias apenas se exigidos; atual é materiais/movimentações.
- [ ] **FUT-06 — Teleatendimento/documentos:** modalidade online/link não significa videoconferência integrada; documentos psicológicos formais, laudos e certificados exigem escopo próprio.
- [ ] **FUT-07 — App da equipe:** recepção, profissionais/admin ficam fora da primeira fase exclusiva para pacientes.
- [ ] **FUT-08 — Analytics:** após DEC-12, eventos de horários/Google/cadastro/solicitação/confirmação; métricas mensais agregadas/minimizadas, sem prontuários ou nomes/e-mails de visitantes por padrão.
- [ ] **FUT-09 — Outros canais:** WhatsApp/chat dependem de aprovação, provedor, custo e política de privacidade.

## Critérios de encerramento

### Entrega acadêmica / demonstração

- [ ] **ACE-01:** fluxos prometidos em base sintética, sem “Em construção” no roteiro e adiamentos claros.
- [ ] **ACE-02:** README seguido por outra pessoa, contas/links válidos, documentos acadêmicos conferidos e apresentação ensaiada.
- [ ] **ACE-03:** código/artefatos rastreáveis, CI aprovado e limites de Google/Gmail/APK informados; sem prometer teste físico/real sem evidência.

### Sistema pronto para o escopo operacional aprovado

- [ ] **ACE-04:** decisões fechadas, P1 incluídos implementados, fluxos homologados e exclusões registradas, não esquecidas.
- [ ] **ACE-05:** P0 de segurança/dados/recuperação/operação resolvidos; achados graves corrigidos/retestados; responsáveis de privacidade/suporte definidos.
- [ ] **ACE-06:** versões aceitas publicadas e verificadas no destino, monitoramento, atualização/retorno e aceite da clínica.

## Registro de conclusão por item

Não marcar apenas porque compilou. Registrar:

| Campo | Preencher |
| --- | --- |
| Item/escopo | ID, inclusão/exclusão e motivo |
| Responsáveis | Implementação, revisão e aceite |
| Código | Repositório, branch, commit/PR e versão |
| Evidência | Teste, resultado, ambiente, data e aparelho quando aplicável |
| Dados/privacidade | Base sintética, permissões e efeitos das operações |
| Limites | Casos não cobertos, dependências e riscos aceitos |
| Resultado | Implementado / testado / aceito / adiado com decisão |

### Histórico desta consolidação

- **14/11/2026 — v1.3:** comparados código local/remoto e checklist anterior; consultados Trello, PR/release mobile e metadados Vercel. Corrigidas pendências já entregues (SDK 58, horários exatos, KPIs, relatórios, remarcação, carga/permissões). Registradas três telas incompletas, limites do APK, SMTP sem aceite de entrega e ausência de release web formal. README reescrito e checklist 1.2 preservada.
- **14/11/2026 — distribuição no repositório principal:** mesmo APK mobile disponibilizado em `android-v0.1.0-preview.1`, com checksum e link destacado no README. Não é uma nova build nem a release final web/API; limites de LAN e aceite físico permanecem.
- **15/11/2026 — MOB-01/MOB-05:** implementado cancelamento no aplicativo, conferidos seis testes de regras, cinco cenários de interface e oito grupos de integração API/PostgreSQL sintético, com preservação dos dados anteriores. Expo alinhado a 58.0.25; CI aprovada e PR #1 integrado à `main` mobile em `3f1ad5f`. APK anterior não foi recompilado; teste físico/distribuição e alertas moderados de dependências permanecem abertos. [Evidências](https://github.com/GuxtavoPereira/lepera-clinic-mobile/blob/main/docs/qa/cancellation.md).
- **15/11/2026 — MOB-04:** perfil editável entregue em `dc5b411`, com nove testes de regras, sete cenários de interface e cinco grupos de integração/preservação em banco sintético. Tipos/lint e bundles web/Android passaram; cancelamento conferido novamente após a atualização da sessão. Conta temporária removida e dados anteriores preservados. Concorrência atômica de perfil registrada em ACC-06; APK novo e aceite físico permanecem abertos. [Evidências](https://github.com/GuxtavoPereira/lepera-clinic-mobile/blob/main/docs/qa/profile.md).
