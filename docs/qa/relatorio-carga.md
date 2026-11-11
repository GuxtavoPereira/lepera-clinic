# Carga de leitura em PostgreSQL nativo

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

As métricas de recursos usam cinco amostras em repouso e duas por fase. A memória do PostgreSQL soma o conjunto de trabalho dos processos e pode contar páginas compartilhadas mais de uma vez. As rajadas terminaram em menos de um segundo, portanto throughput e percentis descrevem apenas esta execução. A rodada de 200 usuários, carga sustentada, contas variadas, I/O e medições de homologação permanecem pendentes.

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
