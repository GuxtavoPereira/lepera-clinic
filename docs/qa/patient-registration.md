# Cadastro de menor com responsável — 21/11/2026

O cadastro público continua criando uma conta de **paciente**, com nome e telefone do responsável legal. Não existe um papel separado de responsável nesta implementação.

## Verificação

No banco PostgreSQL isolado, o cadastro sem responsável retornou 400; com nome e telefone retornou 201. A leitura do perfil retornou 200, o cadastro duplicado retornou 409 e o login do paciente criado retornou 201. Os dados do responsável e do telefone foram conferidos no banco. As contas sintéticas foram removidas ao terminar.

O erro 500 relatado não foi reproduzido no fluxo normal. Os registros recentes disponíveis da Vercel não continham a tentativa original, portanto não permitem afirmar sua causa.

Foi reproduzida uma falha adicional no mesmo caminho: com o preparo da senha atrasado em 5,2 segundos, a transação padrão de 5 segundos expirava com `P2028`. O hash agora é preparado **antes** da transação; usuário, perfil e telefone continuam sendo gravados atomicamente. A mesma reprodução passou após a correção, sem aumentar o tempo limite nem reduzir o custo da senha.

O formulário também apresenta uma orientação em português em falhas do servidor, mantendo os campos preenchidos. Como uma resposta perdida não confirma se o cadastro foi gravado, a orientação é tentar entrar antes de reenviar. A rejeição por falta de responsável destaca os campos de nome e telefone; e-mail/CPF duplicados continuam destacados.

## Regressão automatizada com banco real

Compile a API e o pacote de banco. Configure `LEPERA_REGISTRATION_DATABASE_URL` em um ambiente privado para o PostgreSQL de QA `lepera_native_qa`, em `127.0.0.1:51235`. Então execute:

```powershell
node scripts/qa/check-patient-registration.cjs
```

O script rejeita bancos remotos ou com outro nome. Cria somente uma conta sintética própria, simula preparo da senha superior a 5 segundos, verifica dados do responsável, telefone, senha e rejeição de duplicata, remove a conta e compara as contagens iniciais. Execute sem outras gravações simultâneas nesse banco, pois as contagens também detectam alterações concorrentes.

Os testes unitários de pacientes verificam que a transação não começa enquanto a preparação da senha está pendente. Não foi criado cadastro fictício no banco publicado para esta investigação. Ainda é necessário confirmar uma nova tentativa do cadastro afetado no ambiente publicado após a implantação.
