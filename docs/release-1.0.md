# Preparação da versão 1.0 — Leperapia Clinic

Data da consolidação: 02/11/2026. Destino: demonstração acadêmica em 25/11/2026.

## O que esta versão entrega

- Perfil pessoal acessível pelo menu da conta em todos os papéis. O menu foi corrigido com o agrupamento exigido pelo Base UI, eliminando a falha ao abrir.
- Especialidades reconhecidas pelo CFP no cadastro de profissionais, separadas de abordagens terapêuticas.
- Escolha de horário real pelo paciente; aprovação sem redigitação pela recepção; solicitação de encaixe com atribuição, justificativa e autorização explícita para atuar fora da disponibilidade publicada. Encaixe nunca permite sobreposição de profissional ou paciente.
- Revalidação de disponibilidade ao enviar e aprovar; controle transacional contra decisões concorrentes e consultas duplicadas; notificações ao paciente.
- Acesso Google de trinta minutos apenas para consultar horários livres. Nenhum CPF ou conta de paciente é criado nesse acesso.
- Recuperação com token aleatório, somente hash persistido, validade de trinta minutos, uso único e invalidação das sessões anteriores. Gmail por SMTP com senha de app privada.
- Relatórios operacionais de consultas, financeiro e estoque em PDF e CSV. Profissionais e pacientes recebem somente suas consultas; financeiro e estoque são exclusivos da administração. Não há notas clínicas no relatório.
- Público com foco na clínica, equipe assistencial e recepção; ambientes ilustrados em código, identificados como ilustrações; contato com o Gmail oficial.
- Carga repetível para todo novembro/dezembro de 2026, preservando os registros anteriores.

## Evidências locais

- 38 suítes / 404 testes de API aprovados; 6 testes de valores/CSV do frontend aprovados.
- Lint, tipagem e builds dos dois aplicativos aprovados.
- 49 verificações integradas de navegador/API com cadastro real de fixture, seleção e aprovação do horário pela interface, arquivos PDF/CSV, segurança do prontuário e redefinição de senha. Os registros temporários são removidos ao terminar.
- Sete verificações adicionais de concorrência/encaixe/escopo Google aprovadas: uma consulta por vaga concorrida, resposta HTTP 409 em conflitos do adaptador Prisma e nenhuma sobreposição com encaixe.
- PDF renderizado para conferir tabela, acentuação, cabeçalho e paginação.
- A implantação requer as métricas Helvetica e HelveticaBold do PDFKit. Os imports explícitos preservam esses arquivos no rastreamento da função serverless; o download é conferido novamente na URL pública.
- Banco: 48 registros anteriores preservados, 32 CPFs válidos e zero conflitos na agenda de novembro/dezembro. Carga adicional: 228 consultas (109/119 por mês), 16 pedidos com horário e 4 encaixes. Segunda execução: zero consultas acrescentadas.
- Evidências privadas e scripts de homologação ficam em `work/v1-evidence` e não são enviados ao GitHub. Nenhuma imagem de referência faz parte do código publicado.

O teste de recuperação exercita um token de fixture e o banco real de demonstração; não prova entrega na caixa postal. O ID token real do Google depende do primeiro acesso interativo no projeto Google Cloud. Essas dependências externas precisam ser distinguidas dos testes automatizados da aplicação.

## Configuração e publicação

O backend utiliza a migração aditiva `20261102180000_release_v1_scheduling_and_recovery`. Ela já foi aplicada à base de demonstração após a cópia dos registros anteriores. Em outra base, execute `pnpm --filter @lepera/db migrate:deploy` antes de publicar o novo backend.

O ID público `GOOGLE_CLIENT_ID` está configurado no projeto backend da Vercel. As origens autorizadas devem corresponder exatamente ao site e ao ambiente local. O segredo do cliente Google não é usado nesta integração.

As variáveis públicas de SMTP apontam para `smtp.gmail.com:465` e `leperapiaoficial@gmail.com`. A senha de app é inserida pelo proprietário como `SMTP_PASSWORD` Sensitive em Production. Reimplante após salvar e confira o recebimento em uma caixa controlada pelo grupo. Nunca publique a senha.

Antes da marcação final da versão, conferir CI, implantações READY de frontend/backend e smoke tests nas URLs públicas, incluindo a exportação PDF para validar os arquivos de fonte no ambiente serverless. Se login, agenda ou relatórios falharem na implantação, manter a versão anterior e corrigir antes de promover.

## Roteiro de apresentação

1. Abrir a home, conhecer os ambientes ilustrados e a equipe; mostrar o acesso ao calendário.
2. Entrar como paciente, escolher uma vaga em novembro/dezembro e enviar o pedido. Mostrar o estado pendente e a opção de encaixe.
3. Entrar como recepção, localizar o paciente, conferir profissional/dia/horário e aprovar com uma confirmação. Mostrar uma recusa ou atribuição de encaixe.
4. Entrar como profissional, conferir a própria agenda, abrir uma sessão demonstrativa, salvar evolução e assinar após revisar. A assinatura impede edição posterior.
5. Entrar como administrador, emitir relatórios PDF/CSV, apresentar financeiro e estoque e abrir o próprio perfil.

## Levantamento do que ainda falta

Para a apresentação: confirmar o primeiro acesso real Google e a entrega de recuperação pelo Gmail após salvar a senha privada; realizar um ensaio com os integrantes e as contas de demonstração. Aplicar a nova referência do site e fotos autorizadas quando forem fornecidas.

Depois da versão 1.0: login Google completo/vinculação de contas, lembretes externos, pagamentos parciais/parcelamento e integração bancária/fiscal, documentos psicológicos formais com requisitos próprios, app nativo Expo, anexos clínicos, rate limiting distribuído, rotina de backup/restauração testada, monitoramento de produção e revisão operacional de privacidade/segurança antes de qualquer uso com pacientes reais.

Os relatórios atuais são operacionais. Eles não substituem documentos psicológicos formais, atestados, laudos ou documentos fiscais.

## Retorno à versão anterior

Se necessário, reverter o commit e reimplantar frontend e backend em conjunto. A migração é aditiva: não apagar colunas nem remover pedidos existentes durante um retorno emergencial. Preservar a mesma chave de criptografia. Os dados de demonstração são aditivos; não executar o seed destrutivo como mecanismo de retorno.
