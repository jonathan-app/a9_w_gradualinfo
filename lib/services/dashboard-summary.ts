/**
 * @fileoverview lib/services/dashboard-summary.ts — agregador de métricas e auditoria para o dashboard
 * @module lib/services/dashboard-summary
 * @description Executa exclusivamente no servidor consultas consolidadas para alimentar os componentes
 *   visuais de alta fidelidade da Phase 3 (Spec 0033 Accepted): contadores agregados, timeline de
 *   eventos reais de admin_audit_log e série temporal de publicações editoriais.
 * @dependencies server-only, @/lib/admin/service-client, @/lib/services/editorial-dashboard, @/lib/services/commercial-dashboard
 */
import 'server-only';

import { checkAdminUser } from '@/lib/admin/auth';
import { env } from '@/lib/env';

import { getAdminServiceClient } from '@/lib/admin/service-client';
import { getEditorialDashboardData } from '@/lib/services/editorial-dashboard';
import { getCommercialDashboardData } from '@/lib/services/commercial-dashboard';

export interface DashboardMetricSummary {
  totalArticles: number | null;
  articlesGrowth: number | null;
  totalViews: number | null;
  viewsGrowth: number | null;
  activeOffers: number | null;
  offersGrowth: number | null;
  registeredUsers: number | null;
  usersGrowth: number | null;
}

export interface PublicationDataPoint {
  date: string;
  label: string;
  published: number;
  review: number;
  drafts: number;
}

export interface RecentActivityItem {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  type: 'article' | 'user' | 'offer' | 'security' | 'system';
}

/**
 * Retorna contagem de usuários com papel ativo em admin_user_roles.
 */
async function getAdminUsersCount(): Promise<number | null> {
  try {
    const client = getAdminServiceClient();
    if (!client) return null;

    const { count, error } = await client
      .from('admin_user_roles')
      .select('*', { count: 'exact', head: true })
      .neq('user_id', env.adminUserId.trim());

    if (error || typeof count !== 'number') return null;
    return count + 1; // Raiz permanente contada apenas uma vez.
  } catch {
    return null;
  }
}

/**
 * Retorna as métricas numéricas agregadas do topo do dashboard.
 */
export async function getDashboardMetricSummary(): Promise<DashboardMetricSummary> {
  const auth = await checkAdminUser();
  if (auth instanceof Response || !auth.ok) {
    throw new Error('Acesso administrativo indisponível.');
  }
  const [editorialData, commercialData, usersCount] = await Promise.all([
    getEditorialDashboardData({ page: 1, pageSize: 50 }),
    getCommercialDashboardData({ page: 1, pageSize: 50 }),
    auth.role === 'admin' ? getAdminUsersCount() : Promise.resolve(null),
  ]);

  // Zero confirmado é diferente de uma fonte indisponível.
  const totalArticles = ['configured', 'empty'].includes(editorialData.status)
    ? editorialData.totalPosts
    : null;
  const activeOffers = ['configured', 'empty'].includes(commercialData.status)
    ? commercialData.totalOffers
    : null;

  return {
    totalArticles,
    articlesGrowth: null,
    totalViews: null,
    viewsGrowth: null,
    activeOffers,
    offersGrowth: null,
    registeredUsers: usersCount,
    usersGrowth: null,
  };
}

/**
 * Converte data ISO em formato relativo amigável em português.
 */
function formatTimeAgo(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (!Number.isFinite(date.getTime())) return 'horário indisponível';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'há poucos minutos';
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays === 1) return 'ontem';
    return `há ${diffDays} dias`;
  } catch {
    return 'recentemente';
  }
}

/**
 * Mapeia ação de auditoria para tipo semântico e texto amigável.
 */
function mapAuditAction(
  action: string,
  resourceType: string,
  resourceId: string | null,
): { title: string; description: string; type: RecentActivityItem['type'] } {
  if (action === 'auth.login') {
    return {
      title: 'Acesso autenticado',
      description: 'Sessão administrativa iniciada com sucesso',
      type: 'security',
    };
  }

  if (action === 'auth.logout') {
    return {
      title: 'Encerramento de sessão',
      description: 'Sessão administrativa finalizada',
      type: 'security',
    };
  }

  if (action === 'user.role_assigned' || action === 'user.role_changed') {
    return {
      title: 'Permissão atualizada',
      description: `Papel atribuído ao usuário ${resourceId || ''}`,
      type: 'user',
    };
  }

  if (action === 'offer.badge_evaluated') {
    return {
      title: 'Oferta avaliada',
      description: `Selo de oferta verificado para o item ${resourceId || ''}`,
      type: 'offer',
    };
  }

  if (action === 'preview.issued') {
    return {
      title: 'Preview emitido',
      description: `Sessão temporária de rascunho criada`,
      type: 'article',
    };
  }

  if (resourceType === 'article') {
    return {
      title: 'Artigo atualizado',
      description: `Publicação editorial ${resourceId || ''}`,
      type: 'article',
    };
  }

  return {
    title: 'Ação operacional',
    description: `Operação ${action} executada com sucesso`,
    type: 'system',
  };
}

/**
 * Consulta a timeline de atividades recentes a partir de admin_audit_log.
 */
export async function getDashboardRecentActivity(): Promise<
  RecentActivityItem[]
> {
  try {
    const auth = await checkAdminUser();
    if (auth instanceof Response || !auth.ok) return [];
    const client = getAdminServiceClient();
    if (!client) {
      return [];
    }
    let query = client
      .from('admin_audit_log')
      .select('id, action, resource_type, resource_id, created_at')
      .eq('status', 'success');
    // O cliente de serviço ignora RLS, portanto a restrição do ator é explícita.
    if (auth.role !== 'admin') query = query.eq('actor_id', auth.user.id);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((item) => {
      const mapped = mapAuditAction(
        item.action,
        item.resource_type,
        item.resource_id,
      );
      return {
        id: item.id,
        title: mapped.title,
        description: mapped.description,
        timeAgo: formatTimeAgo(item.created_at),
        type: mapped.type,
      };
    });
  } catch {
    return [];
  }
}

/**
 * A fonte atual não oferece histórico de transições editoriais nem analytics.
 * Retorna ausência de série em vez de gerar eventos que não aconteceram.
 * @returns Série vazia até existir consulta temporal comprovada.
 */
export function getDashboardPublicationHistory(): PublicationDataPoint[] {
  return [];
}

export interface DashboardSummaryData {
  metrics: DashboardMetricSummary;
  chartData: PublicationDataPoint[];
  recentActivities: RecentActivityItem[];
}

/**
 * Função agregadora principal para carregamento paralelo dos dados da dashboard.
 */
export async function getDashboardSummary(): Promise<DashboardSummaryData> {
  const [metrics, recentActivities] = await Promise.all([
    getDashboardMetricSummary(),
    getDashboardRecentActivity(),
  ]);
  const chartData = getDashboardPublicationHistory();

  return {
    metrics,
    chartData,
    recentActivities,
  };
}
