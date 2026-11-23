# Lattes opcional e CPF protegido no sistema web

Implementação de 23/11/2026, relacionada a PRI-03 e PRI-11. Aceite de uso ainda depende dos cenários T17–T19 do [roteiro manual](roteiro-manual-web.md). O APK não foi alterado.

## Comportamento

- O profissional edita resumo e link do Lattes em **Meu perfil**. Ambos são opcionais; campos vazios são persistidos como `null`. O resumo aceita até 2.000 caracteres, como texto simples. A tela informa que esse conteúdo será público.
- O card público mostra resumo e/ou link apenas quando preenchidos. O link abre em nova aba com proteção contra acesso à janela de origem. O resumo é informado pelo profissional; não há importação, scraping nem comprovação automática de autoria.
- O formato aceito é o endereço público `https://lattes.cnpq.br/` seguido do ID de 16 dígitos. Links HTTP equivalentes são normalizados para HTTPS; outros domínios, credenciais na URL, parâmetros e protocolos são recusados. O [CNPq documenta o acesso direto pelo ID](https://www.gov.br/cnpq/pt-br/doc-pdf/informe-cnpq/informe-cnpq-8-2013-atualizacao-sobre-o-retorno-do-acesso-aos-sistemas).
- CPF em seleção/listagem/resumo de pacientes e campos de perfil bloqueados aparece como `***.***.***-XX`. Cadastro e correção autorizada continuam usando o valor integral para validação; o banco não é sobrescrito pela máscara.
- Os relatórios atuais não possuem coluna de CPF. A proteção adicional remove o número completo de textos, como descrições financeiras, antes da resposta de prévia e da geração de PDF/CSV. Uma sequência isolada de 11 dígitos também é protegida de forma conservadora, mesmo que seja outro identificador; números maiores, datas e valores usuais não são alterados.
- A máscara de tela não muda os contratos autenticados usados para edição nem equivale a anonimização. A minimização adicional dessas respostas segue a revisão de segurança. Documentos clínicos futuros devem aplicar sua própria política de exibição.

## Evidências técnicas

- Cinco suítes direcionadas: 48 testes aprovados, incluindo links inseguros, limpeza dos campos, alteração somente do próprio profissional, dados públicos explícitos, prévia, CSV e texto descompactado do PDF sem CPF integral.
- Tipos, lint e compilação web/API aprovados localmente.
- Migração aditiva ensaiada em PostgreSQL isolado com preservação de conteúdo, gravação e limpeza dos campos; transação de teste revertida.
- Migração `20261123120000_optional_doctor_lattes` adiciona somente duas colunas opcionais a `doctors`. Não executa seed/reset nem preenche currículos fictícios. Antes da publicação, conferir que esta é a única migração pendente e que API e banco correspondem ao mesmo ambiente.
- Aplicação no banco publicado concluída em 23/11: ambiente conferido pelo endpoint público da equipe, única migração pendente, cinco profissionais preservados integralmente e novos campos inicialmente nulos. Snapshot anterior mantido fora do Git; nenhum reset/seed executado.

## Publicação e retorno

Aplicar a migração antes do código que consulta as novas colunas. A versão anterior continua compatível com as colunas extras; em caso de retorno do código, preservá-las e preservar os currículos salvos. Não apagar colunas nem dados como parte de um rollback funcional. O aceite público, edição/reabertura, tema e teclado ficam registrados separadamente do resultado dos testes técnicos.
