# Carga de leitura em PostgreSQL nativo

Na rodada de 13/11/2026, conferida em 14/11, a API respondeu HTTP 200 às **99.831 leituras medidas**, sem divergências de conteúdo e com o banco preservado. Foram executados 60 segundos por nível de 10, 50 e 200 usuários virtuais e dez segundos de recuperação. Com 200 usuários, o p95 foi de **493,2 ms**. O resultado descreve uma base sintética pequena em loopback; não mede a capacidade da Vercel.

## Carga sustentada local — 13/11/2026

O código da API testada corresponde ao commit `0da5b7c`. O executor reproduzível está em `scripts/qa/load-read.cjs` e não altera o comportamento da aplicação publicada.

| Fase | Duração medida | Requisições | req/s | p50 | p95 | p99 | HTTP 200 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 usuários | 60,018 s | 30.593 | 509,7 | 19,4 ms | 29,3 ms | 41,8 ms | 30.593 |
| 50 usuários | 60,044 s | 31.467 | 524,1 | 98,3 ms | 135,5 ms | 201,7 ms | 31.467 |
| 200 usuários | 60,200 s | 32.246 | 535,6 | 397,0 ms | 493,2 ms | 627,1 ms | 32.246 |
| Recuperação: 10 usuários | 10,006 s | 5.525 | 552,2 | 18,6 ms | 24,4 ms | 28,5 ms | 5.525 |

| Fase | Amostras | Pico RSS da API | Pico heap da API | CPU da API, % de um núcleo |
| --- | ---: | ---: | ---: | ---: |
| Repouso | 5 | 171,2 MiB | 55,6 MiB | 0,0 |
| 10 usuários | 60 | 331,1 MiB | 208,7 MiB | 104,5 |
| 50 usuários | 60 | 339,2 MiB | 218,1 MiB | 103,5 |
| 200 usuários | 60 | 360,0 MiB | 224,8 MiB | 108,6 |
| Recuperação | 10 | 290,8 MiB | 118,3 MiB | 102,4 |

O gerador de requisições chegou a 266 MiB de RSS. A CPU soma o tempo de todas as threads do processo e pode ultrapassar 100% de um núcleo. As amostras da API foram coletadas a cada segundo. Não foram medidos I/O, pico de conexões nem CPU/RAM do PostgreSQL nesta rodada.

### Método e limites

- Windows, Ryzen 5 4600G, 12 processadores lógicos, 15.739 MiB de RAM, Node.js 26.7.0 e PostgreSQL 17.11. API, gerador e banco no mesmo computador, com outros processos de desenvolvimento em execução.
- Banco `lepera_native_qa`, oito migrações, 12 usuários, seis pacientes, dois profissionais, 19 consultas e 12 prontuários fictícios. `max_connections=20` e `shared_buffers=32MB`.
- Seis contas autenticadas antes da medição: três pacientes, um profissional, uma recepcionista e um administrador. Distribuição de usuários virtuais: 50% pacientes, 20% profissional, 20% recepção e 10% administração. São sessões repetidas dessas contas, não 200 pessoas distintas.
- Leituras de calendário, consultas próprias, solicitações, disponibilidade, notificações, agenda geral, usuários e prévia de relatório de consultas, conforme o papel. Login, aquecimento e consultas de preparação ficaram fora das métricas.
- Cada usuário virtual aguarda a resposta completa antes da próxima leitura, sem pausa de navegação. O tempo inclui recebimento, leitura do JSON e verificação do conteúdo. Esse modelo fechado reduz a taxa oferecida quando a API demora; não representa uma chegada fixa de novos usuários nem uma medição sem *coordinated omission*.
- Uma falha HTTP, de rede ou de conteúdo interrompe novas requisições e impede aumentar a carga. Requisições já iniciadas terminam, com limite de dez segundos. A API local recusa gravações, e suas conexões PostgreSQL exigem transações somente de leitura e limite de oito segundos por comando.
- O processo de teste inicia sua própria API em uma porta aleatória de `127.0.0.1`. Não aceita uma URL de site remoto nem usa a API pública. A conta e o escopo de consultas são conferidos antes da carga; cada resposta é comparada com o conteúdo esperado daquela conta, ignorando apenas o instante de geração dos relatórios.

Os hashes agregados e as contagens das **21 tabelas** permaneceram iguais antes/depois. Nenhum conteúdo de prontuário, senha, token ou corpo de resposta é salvo no resultado. Após reduzir a carga, o p95 voltou a 24,4 ms e o health check com acesso ao banco respondeu 200. Não houve timeout, resposta diferente de 200 ou divergência de conteúdo.

A taxa cresceu pouco entre 10 e 200 usuários, enquanto a latência aumentou e a API consumiu aproximadamente um núcleo. Isso sugere um limite de processamento neste cenário, mas exige profiling para localizar a causa. Não há evidência aqui de capacidade para 200 usuários reais na hospedagem. Bases maiores, execução de horas, mistura de leituras/gravações, rede externa, exportações pesadas, autoscaling e ensaio em homologação continuam pendentes.

### Como reproduzir

Use um banco local **já migrado e preenchido com o seed sintético**, com nome `lepera_*_qa`, acessível por `127.0.0.1`. O executor não cria banco, não aplica migrations e não faz reset ou seed. Execute a partir da raiz do repositório, após instalar as dependências:

```powershell
pnpm.cmd db:generate
pnpm.cmd build
pnpm.cmd test:qa

$qaDatabase = Read-Host 'URL do PostgreSQL local de QA' -AsSecureString
$qaPassword = Read-Host 'Senha das contas do seed' -AsSecureString
$env:LEPERA_LOAD_DATABASE_URL = [Net.NetworkCredential]::new('', $qaDatabase).Password
$env:LEPERA_LOAD_PASSWORD = [Net.NetworkCredential]::new('', $qaPassword).Password
try {
    pnpm.cmd qa:load
} finally {
    Remove-Item Env:LEPERA_LOAD_DATABASE_URL, Env:LEPERA_LOAD_PASSWORD -ErrorAction SilentlyContinue
}
```

O tempo padrão é um minuto por nível, mais aquecimento e recuperação. `LEPERA_LOAD_SECONDS` permite de 15 a 120 segundos por nível. O JSON agregado fica em `work/load-read-results.json`, ignorado pelo Git, e deve ser copiado antes de repetir o comando se quiser preservar rodadas anteriores. Os quatro testes de proteção e cálculo também rodam na CI; a carga real não é executada automaticamente na CI.

## Histórico: rajadas de 10/11/2026

Em 10/11/2026, a API respondeu HTTP 200 às 180 requisições medidas em duas rajadas locais. A maior fase teve 50 usuários virtuais e p95 de 208,5 ms.

## Ambiente e método

- Windows 10 Pro, AMD Ryzen 5 4600G com 6 núcleos e 12 threads e 15,4 GiB de RAM visível.
- Node.js 26.7.0 e PostgreSQL 17.11 em loopback. A API e o banco usaram o mesmo computador. O cluster de teste ficou no F: com `max_connections=20` e `shared_buffers=32MB`. [Distribuição Windows do PostgreSQL](https://www.postgresql.org/download/windows/)
- Banco novo com sete migrações e seed fictício. Cada usuário virtual realizou três leituras com a mesma conta de paciente. O conjunto cobriu painel, consultas, solicitações, horários e prévia do relatório de consultas.
- Um aquecimento de seis leituras ficou fora das medições. Cada fase iniciou os usuários juntos e contabilizou o tempo até a última resposta. As duas fases ocorreram depois do teste de aprovação concorrente.

## Resultados

| Usuários virtuais | Requisições | Duração | req/s | p50 | p95 | p99 | HTTP 200 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 30 | 232 ms | 129,4 | 37,1 ms | 197,5 ms | 202,0 ms | 30 |
| 50 | 150 | 576 ms | 260,5 | 173,5 ms | 208,5 ms | 212,7 ms | 150 |

| Fase | Memória residente API / PostgreSQL | CPU API / PostgreSQL, em % de um núcleo | Processos PostgreSQL |
| --- | ---: | ---: | ---: |
| Repouso | 175 / 99 MiB | 7 / 0 | 8 |
| 10 usuários | 139 / 226 MiB | 31 / 80 | 16 |
| 50 usuários | 140 / 228 MiB | 58 / 12 | 16 |

As métricas de recursos usam cinco amostras em repouso e duas por fase. A memória do PostgreSQL soma o conjunto de trabalho dos processos e pode contar páginas compartilhadas mais de uma vez. As rajadas terminaram em menos de um segundo, portanto throughput e percentis descrevem apenas esta execução. A rodada posterior acima acrescenta 200 usuários, carga sustentada e contas variadas. I/O e medições de homologação permanecem pendentes.

## Integridade após a carga

O banco manteve 19 consultas, incluindo a única confirmação criada pelo teste de vaga concorrente. A restauração do backup em outro banco preservou as contagens verificadas. O teste funcional posterior também confirmou a prévia e os arquivos PDF/CSV dos nove tipos de relatório com o perfil administrativo. [Registro da validação](validacao-1.2.md)

## Espaço dos artefatos no disco

| Item no ambiente de teste | Tamanho lógico |
| --- | ---: |
| Arquivos rastreados no repositório web/API | 1,76 MiB |
| Dependências na pasta `node_modules` da raiz do monorepo | 939,60 MiB |
| `apps/web/.next`, incluindo saídas e cache locais | 1.414,68 MiB |
| `apps/api/dist` | 0,93 MiB |
| Imagens públicas rastreadas | 0,16 MiB |
| Banco isolado `lepera_native_qa` | 9,01 MiB |
| APK de prévia Android ARM64 | 29,58 MiB |

Para reproduzir, some o tamanho em bytes dos arquivos regulares em cada pasta, sem seguir links simbólicos ou junções. Para os arquivos rastreados, parta de `git ls-files -z`. Para o banco, use `SELECT pg_database_size(current_database());` conectado ao banco de demonstração. Divida os resultados por 1.048.576 para obter MiB. A soma representa tamanho lógico. Arquivos que compartilham blocos, como dependências do pnpm, podem ocupar menos espaço físico.
