# Acesso Google para consultar disponibilidade

Data: 02/11/2026. Status: adotado.

O visitante precisa conhecer horários de atendimento antes de cadastrar CPF, telefone e senha. O calendário não pode revelar consultas, nomes de pacientes ou dados clínicos.

Usamos Google Identity Services com verificação de assinatura, emissor, audiência, expiração, e-mail verificado e nonce no backend. O cliente Google é público; sua chave secreta não é necessária ao fluxo de ID token no navegador. Um desafio assinado de cinco minutos e a origem exata da interface vinculam o callback ao início do acesso.

A credencial emitida vale trinta minutos, tem audiência exclusiva e escopo `calendar:read`. Ela é mantida em `sessionStorage`, separada da sessão de usuário, e só autoriza `/preview/doctors` e `/preview/slots`. O guard das contas completas recusa essas credenciais explicitamente. Não criamos usuário, CPF fictício, perfil RBAC nem vínculo automático por e-mail. Para solicitar atendimento, o visitante conclui o cadastro normal com CPF válido e senha, ou entra na conta existente.

Reutilizamos o cálculo de disponibilidade, selecionando apenas os identificadores e intervalos ocupados necessários para excluir conflitos. A resposta expõe somente os horários livres e os dados públicos dos profissionais. O horário é conferido novamente ao solicitar e ao aprovar; consultar não reserva uma vaga.

Essa escolha preserva o cadastro obrigatório e o controle de acesso já existentes. Login Google completo para pacientes cadastrados, vinculação de contas e revogação centralizada de sessões são evoluções separadas. O limite de tentativas atual é por instância; rate limiting distribuído permanece necessário antes de uso real em escala.
