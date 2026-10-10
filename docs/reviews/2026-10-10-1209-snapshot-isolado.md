# Snapshot isolado para a próxima verificação

## Identidade e estabilidade

Foi criado um clone local em `/tmp/gradualinfo-check-4c2bc60-clone`, fixado em `4c2bc60e389e4a616448a6b157cdc3c3dd0c6390` com checkout destacado. O clone está limpo, sem diff. Sua árvore Git é `d054fea72ecea80fa45b364a2ec2b28a60ab0081` e o SHA-256 do manifesto determinístico de 983 arquivos da árvore de trabalho é `c94354674dee0e6549c8ab8d3c309ad266969133b396195b6c19341dec9b8506`. O SHA-256 do diff vazio é `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

O clone contém `scripts/cloudflare-worker.ts`. Ele não contém `.env.local`, `.env.production.local`, `.open-next/` ou `node_modules/`; há apenas dois arquivos `.env.example` de referência. Nenhum segredo ou valor de ambiente foi copiado do workspace para o snapshot.

Uma primeira tentativa com `git archive` foi descartada para o gate: as regras `export-ignore` omitiram 14 arquivos rastreados, inclusive `scripts/cloudflare-worker.ts`. Esse arquivo exportado em `/tmp/gradualinfo-check-4c2bc60` não é um snapshot válido para build do Worker. O clone acima é o único snapshot preparado para a próxima execução.

## O que ainda falta

Nenhum `check:all`, build ou dry-run foi executado no clone. Ele não possui dependências instaladas, e a verificação de assinatura do pnpm no sandbox segue bloqueada pelo acesso ao registro npm. Não foi desativada nem contornada. Portanto, não há pacote novo para inspecionar neste snapshot e não se pode atribuir a ele os resultados da árvore anterior.

Quando o ambiente permitir a verificação do pnpm, instalar dependências pelo lockfile, registrar novamente SHA, status, diff e manifesto, executar `check:all`, build e dry-run em sequência, interrompendo na primeira falha, e comparar os hashes após cada etapa. Inspecionar o pacote sem imprimir valores sensíveis e manter qualquer bundle com segredo fora de Git, ZIP compartilhado e artefatos públicos.

Runtime, Access, MFA e Durable Objects da versão publicada continuam fora deste snapshot e exigem evidência correlacionada ao Version ID. Nenhum push, merge ou deploy foi realizado nesta rodada.
