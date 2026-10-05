# Tarefa 0: preparação do stack local

Base fornecida: 3bb7714398ba862a18327dda33a32413d7edeaba, ZIP SHA-256 4fa38717277b7b0b6d9165bf86232ebbd73932f842659c45ce47caa6efada4b8. Os 50 hashes do snapshot foram conferidos sem divergência.

## Alterações

- Migration inicial renomeada para 20261003000000_profiles_foundation.sql, anterior a posts_exemplo. Bytes SQL preservados. Nenhuma reparação de histórico remoto executada; se houver ambiente que aplicou a versão antiga, revisar histórico antes de usar db push.
- Quatro fixtures no seed local: publicado passado, rascunho, arquivado e publicado futuro. Upsert por slug permite reaplicação local.
- pgTAP ajustado para um publicado e quatro totais. Acrescentadas asserções para presença das fixtures, perfis criados e trigger de signup. Plano com 15 asserções; as 12 anteriores foram preservadas com contagens corrigidas.
- Job database na CI: start, reset --local, supabase:test, log como artefato e stop em always. Pipefail preserva falha mesmo com tee. Nenhum acesso hospedado ou segredo novo.

## Evidência nesta sessão

PASS: ZIP e 50 hashes individuais; ordem cronológica dos arquivos; conteúdo inicial idêntico; contagem estática do plano pgTAP.
UNVERIFIABLE: reset local, execução pgTAP, aplicação das migrations, comportamento de RLS e job GitHub. Docker, psql e Supabase CLI não estão instalados no ambiente. Nenhum teste SQL foi apresentado como executado. A instalação de dependências e check:all não foram executados nesta tarefa.

## Limites e próximo passo

Tarefa 0 preparada, não concluída. AC-08 permanece sem aprovação. Executar em ambiente com Docker: pnpm install --frozen-lockfile; pnpm supabase:start; pnpm supabase:reset --local; pnpm supabase:test. Registrar saídas completas e confirmar public.profiles, public.posts e triggers. Revisar o diff antes de integrar. Não avançar ao schema editorial nem à interface enquanto o banco não estiver verificado.

Skills: /develop foi lida diretamente do pacote (3), sem instalar ou modificar skills. O clone recebido não contém o catálogo. docs/workflow/governance.md referido pela skill não está no snapshot; AGENTS, STATE e spec recebidos orientaram esta tarefa. Nenhum aceite de spec foi alterado.
