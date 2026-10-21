/**
 * @fileoverview Testes unitários dos componentes visuais do dashboard administrativo (Spec 0033).
 * @module __tests__/unit/components/admin-dashboard-visual
 * @description Comprova o contrato de renderização, acessibilidade e interatividade dos componentes:
 *   - MetricCards: 4 cartões com sparklines SVG nativos e badges de variação (dash-ui/AC-03);
 *   - PublicationChart: gráfico de barras SVG nativo com alternador de período 7D/14D/30D (dash-ui/AC-04);
 *   - RecentArticles: mesa de artigos recentes com badges de status (dash-ui/AC-05);
 *   - QuickActions: 5 atalhos operacionais com ícones dedicados (dash-ui/AC-06);
 *   - RecentActivity: timeline de auditoria conectada a admin_audit_log (dash-ui/AC-07);
 *   - getDashboardSummary: serviço agregador resiliente (dash-ui/AC-08).
 * @dependencies @testing-library/react, @testing-library/user-event, vitest
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin/auth', () => ({
  checkAdminUser: vi.fn(async () => ({
    ok: true,
    user: { id: 'root' },
    role: 'admin',
    aal: 'aal2',
  })),
}));

import { MetricCards } from '@/components/admin/dashboard/metric-cards';
import { PublicationChart } from '@/components/admin/dashboard/publication-chart';
import { QuickActions } from '@/components/admin/dashboard/quick-actions';
import { RecentActivity } from '@/components/admin/dashboard/recent-activity';
import { RecentArticles } from '@/components/admin/dashboard/recent-articles';
import { getDashboardSummary } from '@/lib/services/dashboard-summary';

describe('Painel Administrativo Profissional - Componentes Visuais (Spec 0033)', () => {
  describe('1. MetricCards (dash-ui/AC-03)', () => {
    const mockMetrics = {
      totalArticles: 142,
      articlesGrowth: 12,
      totalViews: 84300,
      viewsGrowth: 18,
      activeOffers: 14,
      offersGrowth: 6,
      registeredUsers: 3,
      usersGrowth: 14,
    };

    it('renderiza os 4 cartões de métricas com valores formatados e rótulos', () => {
      render(<MetricCards metrics={mockMetrics} />);

      expect(screen.getByText('Total de artigos')).toBeInTheDocument();
      expect(screen.getByText('142')).toBeInTheDocument();

      expect(screen.getByText('Visualizações')).toBeInTheDocument();
      expect(screen.getByText('84.300')).toBeInTheDocument();

      expect(screen.getByText('Ofertas ativas')).toBeInTheDocument();
      expect(screen.getByText('14')).toBeInTheDocument();

      expect(screen.getByText('Operadores com acesso')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renderiza variação fornecida sem desenhar séries inventadas', () => {
      const { container } = render(<MetricCards metrics={mockMetrics} />);

      expect(screen.getByText('+12% vs. últimos 7 dias')).toBeInTheDocument();
      expect(screen.getByText('+18% vs. últimos 7 dias')).toBeInTheDocument();

      const svgs = container.querySelectorAll('svg');
      // Os quatro ícones continuam presentes; não há polylines fictícias.
      expect(svgs.length).toBe(4);
      expect(container.querySelector('polyline')).toBeNull();
    });
  });

  it('mostra indisponibilidade sem confundir falta de medição com zero', () => {
    render(
      <MetricCards
        metrics={{
          totalArticles: 0,
          activeOffers: 0,
          registeredUsers: null,
          totalViews: null,
          articlesGrowth: null,
          offersGrowth: null,
          usersGrowth: null,
          viewsGrowth: null,
        }}
      />,
    );
    expect(screen.getAllByText('0')).toHaveLength(2);
    expect(screen.getAllByText('Indisponível')).toHaveLength(2);
    expect(screen.getAllByText('Sem série histórica')).toHaveLength(4);
  });

  describe('2. PublicationChart (dash-ui/AC-04)', () => {
    const mockChartData = [
      { date: '12/10', label: '12 Out', published: 3, review: 1, drafts: 1 },
      { date: '13/10', label: '13 Out', published: 2, review: 2, drafts: 0 },
      { date: '14/10', label: '14 Out', published: 4, review: 0, drafts: 2 },
      { date: '15/10', label: '15 Out', published: 1, review: 3, drafts: 1 },
      { date: '16/10', label: '16 Out', published: 5, review: 1, drafts: 0 },
      { date: '17/10', label: '17 Out', published: 3, review: 2, drafts: 1 },
      { date: '18/10', label: '18 Out', published: 4, review: 1, drafts: 2 },
    ];

    it('renderiza o cabeçalho e a legenda do gráfico de publicações', () => {
      render(<PublicationChart data={mockChartData} />);

      expect(screen.getByText('Publicações por Período')).toBeInTheDocument();
      expect(screen.getByText('Publicados')).toBeInTheDocument();
      expect(screen.getByText('Em revisão')).toBeInTheDocument();
      expect(screen.getByText('Rascunhos')).toBeInTheDocument();
    });

    it('renderiza os botões de alternância de período e permite seleção interativa', async () => {
      render(<PublicationChart data={mockChartData} />);

      const btn7d = screen.getByRole('button', { name: '7 dias' });
      const btn14d = screen.getByRole('button', { name: '14 dias' });
      const btn30d = screen.getByRole('button', { name: '30 dias' });

      expect(btn7d).toBeInTheDocument();
      expect(btn14d).toBeInTheDocument();
      expect(btn30d).toBeInTheDocument();

      // Alterna período para 14 dias
      await userEvent.click(btn14d);
      expect(btn14d).toHaveClass('bg-blue-600');

      // Alterna período para 30 dias
      await userEvent.click(btn30d);
      expect(btn30d).toHaveClass('bg-blue-600');
    });

    it('renderiza elementos SVG do gráfico com barras interativas', () => {
      const { container } = render(<PublicationChart data={mockChartData} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();

      const rects = container.querySelectorAll('rect');
      expect(rects.length).toBeGreaterThan(0);
    });
  });

  describe('3. RecentArticles (dash-ui/AC-05)', () => {
    const mockArticles = [
      {
        id: 'art-1',
        title: 'Review Completo: iPhone 16 Pro com Apple Intelligence',
        slug: 'review-iphone-16-pro',
        editoria: 'Hardware',
        author: 'Jonathan',
        updatedAt: '2026-10-18T10:00:00Z',
        status: 'publicado' as const,
      },
      {
        id: 'art-2',
        title: 'Guia de Melhores Monitores OLED 4K em 2026',
        slug: 'guia-monitores-oled-4k',
        editoria: 'Guias',
        author: 'Equipe Editorial',
        updatedAt: '2026-10-17T15:30:00Z',
        status: 'rascunho' as const,
      },
      {
        id: 'art-3',
        title: 'Como Configurar Passkeys em Todos os Dispositivos',
        slug: 'como-configurar-passkeys',
        editoria: 'Segurança',
        author: 'Jonathan',
        updatedAt: '2026-10-16T08:00:00Z',
        status: 'arquivado' as const,
      },
    ];

    it('renderiza os artigos recentes com títulos, autores, categorias e status', () => {
      render(<RecentArticles articles={mockArticles} />);

      expect(screen.getByText('Artigos Recentes')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Review Completo: iPhone 16 Pro com Apple Intelligence',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Guia de Melhores Monitores OLED 4K em 2026'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Como Configurar Passkeys em Todos os Dispositivos'),
      ).toBeInTheDocument();

      expect(screen.getByText('Publicado')).toBeInTheDocument();
      expect(screen.getByText('Rascunho')).toBeInTheDocument();
      expect(screen.getByText('Arquivado')).toBeInTheDocument();
    });

    it('renderiza estado vazio quando a lista de artigos estiver vazia', () => {
      render(<RecentArticles articles={[]} />);

      expect(screen.getByText('Nenhum artigo encontrado')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Os artigos publicados ou em rascunho aparecerão aqui.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('4. QuickActions (dash-ui/AC-06)', () => {
    it('renderiza os 5 atalhos operacionais rápidos com seus rótulos', () => {
      render(<QuickActions />);

      expect(screen.getByText('Acessos rápidos')).toBeInTheDocument();
      expect(screen.getByText('Conteúdo')).toBeInTheDocument();
      expect(screen.getByText('Ofertas')).toBeInTheDocument();
      expect(screen.getByText('Usuários')).toBeInTheDocument();
      expect(screen.getByText('Segurança')).toBeInTheDocument();
      expect(screen.getByText('Configurações')).toBeInTheDocument();
    });

    it('contém links funcionais para cada atalho operacional', () => {
      render(<QuickActions />);

      const contentLink = screen.getByRole('link', { name: /conteúdo/i });
      expect(contentLink).toHaveAttribute('href');

      const settingsLink = screen.getByRole('link', { name: /configurações/i });
      expect(settingsLink).toHaveAttribute('href', '#secao-configuracoes');
    });
  });

  describe('5. RecentActivity (dash-ui/AC-07)', () => {
    const mockActivities = [
      {
        id: 'act-1',
        title: 'Login realizado',
        description: 'Sessão administrativa iniciada por admin@gradualinfo.dev',
        timeAgo: 'há 10 min',
        type: 'security' as const,
      },
      {
        id: 'act-2',
        title: 'Papel alterado',
        description: 'Papel do usuário atualizado para editor',
        timeAgo: 'há 2 horas',
        type: 'user' as const,
      },
    ];

    it('renderiza os registros da timeline de atividade recente', () => {
      render(<RecentActivity activities={mockActivities} />);

      expect(screen.getByText('Atividade Recente')).toBeInTheDocument();
      expect(screen.getByText('Login realizado')).toBeInTheDocument();
      expect(screen.getByText('Papel alterado')).toBeInTheDocument();
    });

    it('renderiza estado vazio quando não há atividades registradas', () => {
      render(<RecentActivity activities={[]} />);

      expect(screen.getByText('Nenhuma atividade recente')).toBeInTheDocument();
    });
  });

  describe('6. getDashboardSummary (dash-ui/AC-08)', () => {
    it('retorna estrutura completa de resumo mesmo sem conexão externa configurada', async () => {
      const summary = await getDashboardSummary();

      expect(summary).toHaveProperty('metrics');
      expect(
        summary.metrics.totalArticles === null ||
          summary.metrics.totalArticles >= 0,
      ).toBe(true);
      expect(
        summary.metrics.activeOffers === null ||
          summary.metrics.activeOffers >= 0,
      ).toBe(true);

      expect(summary).toHaveProperty('chartData');
      expect(Array.isArray(summary.chartData)).toBe(true);
      expect(summary.chartData).toEqual([]);

      expect(summary).toHaveProperty('recentActivities');
      expect(Array.isArray(summary.recentActivities)).toBe(true);
    });
  });
});
