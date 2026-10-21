-- Spec 0021: Pipeline de ofertas com permissão de serviço e persistência probatória
-- Migration: Retenção/limpeza de nonces expirados em offers_ingest_nonces
begin;

-- 1. Função de limpeza de nonces expirados
-- Remove nonces com consumed_at mais antigo que 7 dias para evitar crescimento
-- ilimitado da tabela. Pode ser executada periodicamente via job agendado ou
-- chamada manualmente durante janelas de manutenção.
create or replace function public.purge_expired_offers_ingest_nonces(
  p_retention_days integer default 7
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_count integer;
begin
  delete from public.offers_ingest_nonces
  where consumed_at < now() - (p_retention_days * interval '1 day');

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

-- 2. Concede execução apenas a service_role (mesmo privilégio das outras funções do módulo)
alter function public.purge_expired_offers_ingest_nonces(integer) owner to postgres;
revoke all on function public.purge_expired_offers_ingest_nonces(integer) from public, anon, authenticated;
grant execute on function public.purge_expired_offers_ingest_nonces(integer) to service_role;

commit;

-- Exemplo de uso:
-- select public.purge_expired_offers_ingest_nonces(7); -- remove nonces com mais de 7 dias
-- select public.purge_expired_offers_ingest_nonces(30); -- remove nonces com mais de 30 dias
