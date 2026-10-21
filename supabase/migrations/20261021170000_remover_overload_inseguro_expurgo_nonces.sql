-- Remove a sobrecarga redundante que permitia retenção negativa e preserva
-- a função interval já protegida pelo piso da janela anti replay.
begin;

drop function if exists public.purge_expired_offers_ingest_nonces(integer);

commit;
