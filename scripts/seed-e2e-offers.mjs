/**
 * @fileoverview scripts/seed-e2e-offers.mjs — semeia ofertas reais no Supabase local para validação E2E
 * @module scripts/seed-e2e-offers
 * @description Insere lojista, produtos, ofertas ativas e histórico de preços com amostras suficientes,
 *   insuficientes e anomalias para provar a leitura do Dashboard Operacional.
 * @dependencies @supabase/supabase-js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function seed() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Merchant
  const { data: merchant, error: errM } = await supabase
    .from('merchants')
    .upsert(
      {
        slug: 'loja-referencia',
        name: 'Loja Referência Teste',
        domain: 'loja-referencia.com.br',
        is_active: true,
      },
      { onConflict: 'slug' },
    )
    .select()
    .single();

  if (errM || !merchant) {
    console.error('Erro ao criar lojista:', errM);
    process.exit(1);
  }

  // 2. Produto 1: com histórico de 6 dias (mediana calculável)
  const { data: prod1, error: errP1 } = await supabase
    .from('products')
    .upsert(
      {
        slug: 'notebook-pro-teste',
        title: 'Notebook Profissional E2E',
        brand: 'TechBrand',
        category: 'Informatica',
      },
      { onConflict: 'slug' },
    )
    .select()
    .single();

  if (errP1 || !prod1) {
    console.error('Erro ao criar produto 1:', errP1);
    process.exit(1);
  }

  // 3. Oferta 1 (Preço R$ 4.500,00)
  const { data: offer1, error: errO1 } = await supabase
    .from('offers')
    .upsert(
      {
        product_id: prod1.id,
        merchant_id: merchant.id,
        title: 'Notebook Profissional E2E - 16GB RAM',
        url: 'https://loja-referencia.com.br/notebook-pro-teste',
        affiliate_url:
          'https://loja-referencia.com.br/notebook-pro-teste?tag=gradual',
        price_cents: 450000,
        original_price_cents: 500000,
        currency: 'BRL',
        payment_method: 'a_vista',
        badge_status: 'unverified',
        status: 'ativa',
      },
      { onConflict: 'id' },
    )
    .select()
    .single();

  if (errO1 || !offer1) {
    console.error('Erro ao criar oferta 1:', errO1);
    process.exit(1);
  }

  // Histórico de 6 dias para Oferta 1 (para mediana ser calculada)
  const now = Date.now();
  for (let i = 1; i <= 6; i++) {
    const pastDate = new Date(now - i * 86400 * 1000).toISOString();
    await supabase.from('price_history').insert({
      product_id: prod1.id,
      merchant_id: merchant.id,
      price_cents: 450000,
      payment_method: 'a_vista',
      captured_at: pastDate,
      is_anomalous: false,
      source_type: 'verified_audit',
    });
  }

  // Observação Anômala no Produto 1 (preço R$ 1.000,00 - queda > 50%)
  await supabase.from('price_history').insert({
    product_id: prod1.id,
    merchant_id: merchant.id,
    price_cents: 100000,
    payment_method: 'a_vista',
    captured_at: new Date().toISOString(),
    is_anomalous: true,
  });

  // 4. Produto 2: com histórico insuficiente (apenas 2 dias)
  const { data: prod2, error: errP2 } = await supabase
    .from('products')
    .upsert(
      {
        slug: 'mouse-sem-fio-teste',
        title: 'Mouse Sem Fio E2E',
        brand: 'PerifericosX',
        category: 'Acessorios',
      },
      { onConflict: 'slug' },
    )
    .select()
    .single();

  if (errP2 || !prod2) {
    console.error('Erro ao criar produto 2:', errP2);
    process.exit(1);
  }

  // Oferta 2 (Preço R$ 150,00)
  const { data: offer2, error: errO2 } = await supabase
    .from('offers')
    .upsert(
      {
        product_id: prod2.id,
        merchant_id: merchant.id,
        title: 'Mouse Sem Fio Ultra Leve E2E',
        url: 'https://loja-referencia.com.br/mouse-sem-fio-teste',
        affiliate_url:
          'https://loja-referencia.com.br/mouse-sem-fio-teste?tag=gradual',
        price_cents: 15000,
        currency: 'BRL',
        payment_method: 'a_vista',
        badge_status: 'unverified',
        status: 'ativa',
      },
      { onConflict: 'id' },
    )
    .select()
    .single();

  if (errO2 || !offer2) {
    console.error('Erro ao criar oferta 2:', errO2);
    process.exit(1);
  }

  // Apenas 2 dias de histórico para Oferta 2
  for (let i = 1; i <= 2; i++) {
    const pastDate = new Date(now - i * 86400 * 1000).toISOString();
    await supabase.from('price_history').insert({
      product_id: prod2.id,
      merchant_id: merchant.id,
      price_cents: 15000,
      payment_method: 'a_vista',
      captured_at: pastDate,
      is_anomalous: false,
    });
  }

  console.log('Seed de ofertas E2E concluído com sucesso!');
}

seed();
