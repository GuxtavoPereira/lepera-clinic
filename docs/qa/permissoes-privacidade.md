# Permissões e privacidade — 14/11/2026

A verificação HTTP local passou em **91 chamadas**, usando sete contas sintéticas e os cinco papéis do sistema. Foram mantidos os bloqueios por papel e por vínculo com o atendimento. A lista e o detalhe de prontuários passaram a responder com `Cache-Control: private, no-store`, orientação explícita para navegadores e intermediários não armazenarem essas respostas.

## Casos conferidos

| Recurso / tentativa | Resultado observado |
| --- | --- |
| Profissional lê o prontuário de sua consulta | 200, conteúdo disponível ao responsável e uma leitura registrada na auditoria |
| Outro profissional lê, altera ou assina esse prontuário | 404 nas três operações |
| Paciente, recepção, administrador ou superadmin lê, altera ou assina prontuário | 403; não há exceção automática para superadmin |
| Requisição anônima a prontuários | 401 |
| Lista de prontuários do profissional | Metadados; sem queixa, evolução ou hipótese diagnóstica |
| Profissional abre a ficha resumida de paciente com vínculo | 200, identificação e contato mínimo; sem CPF ou data completa de nascimento |
| Profissional sem vínculo abre a ficha resumida | 404 |
| Outros papéis tentam a ficha reservada ao profissional | 403, inclusive superadmin |
| Paciente/profissional tenta usar a rota administrativa de edição de paciente | 403 |
| Duas contas de paciente e dois profissionais listam consultas próprias | IDs iguais ao conjunto permitido no banco para cada conta |
| Mesmas contas emitem relatório de consultas | Todas as linhas pertencem ao paciente ou profissional autenticado |
| Paciente/profissional solicita relatório financeiro ou de auditoria | 403 |
| Conta tenta listar ou marcar notificação de outra pessoa | A listagem não contém a notificação alheia e a alteração retorna 404; vale também para admin/superadmin |
| Conta marca a própria notificação de teste | 200 |
| Token com papel administrativo, assinado para um paciente no teste | Não promove a conta; o papel atual do banco é aplicado e `/users` retorna 403 |
| Sessão expirada, assinatura errada, algoritmo diferente ou versão de senha inválida | 401 |
| Token de prévia Google usado para perfil/cadastro de pacientes | 401 |
| Token normal, prévia expirada ou com escopo incorreto usado na prévia Google | 401 |
| Prévia Google válida, criada com a chave exclusiva do teste | Somente profissionais e vagas livres; sem ocupantes, CPFs ou conteúdo clínico |
| Equipe pública | Apenas os campos públicos previstos de profissionais e recepção |

O teste também compara o conteúdo completo de consultas e prontuários, incluindo timestamps, antes/depois. Nenhum desses registros foi alterado. Duas notificações temporárias foram criadas e removidas; as leituras clínicas autorizadas permaneceram na auditoria do banco de QA. Resultados agregados ficam em `work/permission-check-results.json`, sem tokens, credenciais ou conteúdo dos prontuários.

## Administração e acesso clínico

Administração e superadministração possuem suas rotas de gestão cadastral e operacional. Esse poder não concede leitura, alteração ou assinatura de prontuário nem acesso à ficha reservada ao profissional. O profissional precisa estar vinculado ao atendimento para ler o prontuário e ao paciente para consultar a ficha resumida. O teste não cria um mecanismo de acesso clínico excepcional. MFA e eventual procedimento formal de exceção continuam pendentes.

## Reproduzir em banco sintético local

O executor `scripts/qa/check-permissions.cjs` aceita apenas PostgreSQL em `127.0.0.1`, com nome `lepera_*_qa`. Ele inicia sua própria API numa porta aleatória, usa segredo de sessão temporário e desativa o envio de e-mail. Não cria banco, não roda seed nem migrations e não acessa a Vercel. Use a chave que cifrou os dados do banco de demonstração; não use a chave de produção.

Após instalar dependências e preparar o banco sintético conforme o README:

```powershell
pnpm.cmd db:generate
pnpm.cmd build

$qaDatabase = Read-Host 'URL do PostgreSQL local de QA' -AsSecureString
$qaPassword = Read-Host 'Senha das contas do seed' -AsSecureString
$qaKey = Read-Host 'Chave de criptografia do banco de QA' -AsSecureString
$env:LEPERA_SECURITY_DATABASE_URL = [Net.NetworkCredential]::new('', $qaDatabase).Password
$env:LEPERA_SECURITY_PASSWORD = [Net.NetworkCredential]::new('', $qaPassword).Password
$env:LEPERA_SECURITY_ENCRYPTION_KEY = [Net.NetworkCredential]::new('', $qaKey).Password
try {
    pnpm.cmd qa:permissions
} finally {
    Remove-Item Env:LEPERA_SECURITY_DATABASE_URL, Env:LEPERA_SECURITY_PASSWORD, Env:LEPERA_SECURITY_ENCRYPTION_KEY -ErrorAction SilentlyContinue
}
```

Além da matriz HTTP, passaram a compilação, a tipagem, o lint, os **462 testes da API** e os **cinco testes dos utilitários de QA**. A CI continua executando a suíte da aplicação; o comando com PostgreSQL é uma execução local explícita.

## Limites desta revisão

Os tokens Google deste teste são sintéticos e exercitam as restrições do token interno de prévia. Isso **não confirma o login interativo com uma conta Google real**. A matriz também não substitui auditoria completa, teste de penetração, revisão de dependências, validação de recuperação de senha, CORS, rate limiting distribuído, rotação de chaves, MFA ou revisão de privacidade com a clínica. Esses itens continuam abertos na checklist.
