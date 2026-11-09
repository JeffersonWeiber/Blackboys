import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileSignature,
  FileText,
  History,
  Loader2,
  Percent,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react";

type DashboardContract = {
  id: string;
  number: string;
  token: string;
  status: string;
  created_at: string;
  content: {
    client?: { name?: string };
    total?: number;
    service?: { package?: { name?: string } };
  } | null;
};

type DashboardProposal = {
  id: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
};

type DashboardProject = {
  id: string;
  title: string;
  status: string;
  event_date: string | null;
  location: string | null;
  clients: { name: string } | null;
};

type DashboardActivity = {
  id: string;
  summary: string | null;
  action: string;
  created_at: string;
};

type DashboardClient = {
  id: string;
  name: string;
  created_at: string;
};

const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const dateShort = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

const dateLong = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const timeAgo = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `${days} dias atrás`;
  return dateLong(value);
};

const CONTRACT_STATUS: Record<string, { label: string; className: string }> = {
  generated: {
    label: "Aguardando assinatura",
    className: "bg-gold/15 text-gold border-gold/30",
  },
  signed: {
    label: "Assinado",
    className: "bg-green-500/10 text-green-400 border-green-500/30",
  },
  cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground border-border" },
};

type Period = "month" | "quarter" | "year" | "all";

const PERIODS: { id: Period; label: string; hint: string; title: string }[] = [
  { id: "month", label: "Mês", hint: "no mês", title: "Novos no mês" },
  { id: "quarter", label: "90 dias", hint: "em 90 dias", title: "Novos em 90 dias" },
  { id: "year", label: "Ano", hint: "no ano", title: "Novos no ano" },
  { id: "all", label: "Tudo", hint: "no total", title: "Novos no total" },
];

function Panel({
  title,
  hint,
  action,
  children,
  className = "",
}: {
  title: string;
  hint?: React.ReactNode;
  action?: { label: string; to: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-card ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-sm uppercase tracking-[0.16em] text-white">
            {title}
          </h2>
          {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action && (
          <Button asChild variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
            <Link to={action.to}>
              {action.label}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("month");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [contracts, proposals, projects, activities, clients, leads] = await Promise.all([
        supabase
          .from("contracts")
          .select("id, number, token, status, created_at, content")
          .order("created_at", { ascending: false }),
        supabase.from("budget_links").select("id, status, created_at, sent_at, viewed_at, accepted_at"),
        supabase
          .from("projects")
          .select("id, title, status, event_date, location, clients(name)")
          .order("event_date", { ascending: true, nullsFirst: false }),
        supabase
          .from("activities")
          .select("id, summary, action, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase.from("clients").select("id, name, created_at").order("created_at", { ascending: false }),
        supabase.from("leads").select("id, status, created_at"),
      ]);

      const error =
        contracts.error ??
        proposals.error ??
        projects.error ??
        activities.error ??
        clients.error ??
        leads.error;
      if (error) throw error;

      return {
        contracts: (contracts.data ?? []) as unknown as DashboardContract[],
        proposals: (proposals.data ?? []) as DashboardProposal[],
        projects: (projects.data ?? []) as unknown as DashboardProject[],
        activities: (activities.data ?? []) as DashboardActivity[],
        clients: (clients.data ?? []) as DashboardClient[],
        leads: (leads.data ?? []) as { id: string; status: string; created_at: string }[],
      };
    },
  });

  const now = new Date();
  const periodMeta = PERIODS.find((item) => item.id === period) ?? PERIODS[0];

  const periodStart = (() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (period === "month") start.setDate(1);
    else if (period === "quarter") start.setDate(start.getDate() - 89);
    else if (period === "year") start.setMonth(0, 1);
    return start;
  })();

  const inPeriod = (value?: string | null) =>
    period === "all" ? !!value : !!value && new Date(value) >= periodStart;

  const contracts = data?.contracts ?? [];
  const proposals = data?.proposals ?? [];
  const projects = data?.projects ?? [];
  const activities = data?.activities ?? [];
  const clients = data?.clients ?? [];
  const leads = data?.leads ?? [];

  const contractsInPeriod = contracts.filter((contract) => inPeriod(contract.created_at));
  const contractedValue = contracts
    .filter((contract) => contract.status !== "cancelled" && inPeriod(contract.created_at))
    .reduce((sum, contract) => sum + Number(contract.content?.total ?? 0), 0);
  const pendingSignature = contracts.filter((contract) => contract.status === "generated");

  const sentProposals = proposals.filter(
    (proposal) =>
      (!!proposal.sent_at || ["sent", "viewed", "accepted", "rejected"].includes(proposal.status)) &&
      inPeriod(proposal.sent_at ?? proposal.created_at),
  );
  const viewedProposals = proposals.filter(
    (proposal) =>
      (!!proposal.viewed_at || ["viewed", "accepted"].includes(proposal.status)) &&
      inPeriod(proposal.viewed_at ?? proposal.sent_at ?? proposal.created_at),
  );
  const acceptedProposals = proposals.filter(
    (proposal) =>
      (!!proposal.accepted_at || proposal.status === "accepted") &&
      inPeriod(proposal.accepted_at ?? proposal.created_at),
  );
  const openProposals = proposals.filter((proposal) =>
    ["created", "sent", "viewed"].includes(proposal.status),
  );

  const acceptanceRate =
    sentProposals.length > 0
      ? Math.round((acceptedProposals.length / sentProposals.length) * 100)
      : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = projects
    .filter(
      (project) =>
        project.event_date &&
        new Date(`${project.event_date}T12:00:00`) >= today &&
        !["entregue", "cancelado"].includes(project.status),
    )
    .slice(0, 5);
  const projectsWithoutDate = projects.filter(
    (project) => !project.event_date && !["entregue", "cancelado"].includes(project.status),
  ).length;

  const newClients = clients.filter((client) => inPeriod(client.created_at));
  const newLeads = leads.filter((lead) => inPeriod(lead.created_at));

  const funnel = [
    { label: "Enviadas", value: sentProposals.length },
    { label: "Visualizadas", value: viewedProposals.length },
    { label: "Aceitas", value: acceptedProposals.length },
  ];
  const funnelMax = Math.max(1, ...funnel.map((step) => step.value));

  const kpis = [
    {
      label: `Contratado ${periodMeta.hint}`,
      value: brl(contractedValue),
      hint: `${contractsInPeriod.length} contrato${contractsInPeriod.length === 1 ? "" : "s"} gerado${contractsInPeriod.length === 1 ? "" : "s"}`,
      icon: Wallet,
      highlight: true,
    },
    {
      label: "Propostas em aberto",
      value: String(openProposals.length),
      hint: `${sentProposals.length} enviadas ${periodMeta.hint}`,
      icon: FileText,
    },
    {
      label: "Taxa de aceite",
      value: `${acceptanceRate}%`,
      hint: `${acceptedProposals.length} de ${sentProposals.length} propostas`,
      icon: Percent,
    },
    {
      label: "Aguardando assinatura",
      value: String(pendingSignature.length),
      hint: pendingSignature.length
        ? "Contratos gerados sem assinatura"
        : "Nenhum contrato pendente",
      icon: FileSignature,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-wide">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Visão geral do seu negócio —{" "}
              {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {PERIODS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPeriod(option.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === option.id
                    ? "bg-gold text-black"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-2 text-[11px] leading-tight uppercase tracking-[0.14em] text-muted-foreground">
                <kpi.icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{kpi.label}</span>
              </div>
              {isLoading ? (
                <Loader2 className="mt-3 h-6 w-6 animate-spin text-gold" />
              ) : (
                <p
                  className={`mt-2 font-display text-2xl tabular-nums ${
                    kpi.highlight ? "text-gold" : "text-white"
                  }`}
                >
                  {kpi.value}
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">{kpi.hint}</p>
            </div>
          ))}
        </div>

        {/* Colunas balanceadas: cada coluna empilha seus cards */}
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-4">
            <Panel title="Funil de propostas" hint={`Do envio ao aceite · ${periodMeta.hint}`}>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              ) : sentProposals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma proposta enviada {periodMeta.hint}. Crie uma proposta em Orçamentos.
                </p>
              ) : (
                <div className="space-y-4">
                  {funnel.map((step, index) => (
                    <div key={step.label}>
                      <div className="mb-1.5 flex items-baseline justify-between text-sm">
                        <span className="text-muted-foreground">{step.label}</span>
                        <span className="font-medium tabular-nums text-white">
                          {step.value}
                          {index > 0 && sentProposals.length > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {Math.round((step.value / sentProposals.length) * 100)}%
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${
                            index === 2 ? "bg-green-500" : "bg-gold"
                          }`}
                          style={{ width: `${Math.max(2, (step.value / funnelMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  <p className="flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                    {acceptedProposals.length} aceita
                    {acceptedProposals.length === 1 ? "" : "s"} · {openProposals.length} em aberto
                  </p>
                </div>
              )}
            </Panel>

            <Panel
              title="Contratos"
              hint={
                pendingSignature.length
                  ? `${pendingSignature.length} aguardando assinatura`
                  : "Todos os contratos assinados"
              }
              action={{ label: "Ver todos", to: "/admin/contratos" }}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              ) : contracts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum contrato ainda. Ele é gerado quando o cliente aceita a proposta.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {contracts.slice(0, 4).map((contract) => {
                    const status = CONTRACT_STATUS[contract.status] ?? CONTRACT_STATUS.generated;
                    return (
                      <li key={contract.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {contract.content?.client?.name ?? "Cliente"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              <span className="font-mono">{contract.number}</span> ·{" "}
                              {contract.content?.service?.package?.name ?? "Serviço"}
                            </p>
                          </div>
                          <Button asChild size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                            <a
                              href={`/contrato/${contract.token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir contrato"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <Badge variant="outline" className={status.className}>
                            {status.label}
                          </Badge>
                          <span className="text-sm tabular-nums text-white">
                            {brl(Number(contract.content?.total ?? 0))}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel
              title="Próximos eventos"
              hint={
                projectsWithoutDate > 0
                  ? `${projectsWithoutDate} projeto${projectsWithoutDate === 1 ? "" : "s"} sem data definida`
                  : "Todos os projetos têm data"
              }
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              ) : upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum evento agendado. As datas aparecem aqui quando o projeto é fechado.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {upcoming.map((project) => (
                    <li key={project.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-sm font-medium text-white">
                          {project.clients?.name ?? project.title}
                        </p>
                        <span className="shrink-0 text-xs tabular-nums text-gold">
                          {dateShort(project.event_date)}
                        </span>
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <span>{dateLong(project.event_date)}</span>
                        {project.location && <span>· {project.location}</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{project.title}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title={periodMeta.title} hint="Clientes e leads captados">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    <UserPlus className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Clientes</span>
                  </div>
                  <p className="mt-1 font-display text-xl tabular-nums text-white">
                    {isLoading ? "—" : newClients.length}
                  </p>
                  <div className="mt-0.5 space-y-0.5">
                    {newClients.slice(0, 2).map((client) => (
                      <p key={client.id} className="truncate text-[11px] text-muted-foreground">
                        {client.name}
                      </p>
                    ))}
                    {!isLoading && newClients.length === 0 && (
                      <p className="text-[11px] text-muted-foreground">Nenhum cliente novo.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Leads</span>
                  </div>
                  <p className="mt-1 font-display text-xl tabular-nums text-white">
                    {isLoading ? "—" : newLeads.length}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {leads.filter((lead) => lead.status === "novo").length} aguardando contato
                  </p>
                </div>
              </div>

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="-ml-2 mt-2 text-muted-foreground"
              >
                <Link to="/admin/clients">
                  Ver clientes
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </Panel>
          </div>

          <div className="space-y-4 lg:col-span-2 xl:col-span-1">
            <Panel title="Atividades recentes" hint="Últimos registros do sistema">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
              ) : (
                <ol className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-3 lg:space-y-0 xl:block xl:space-y-3">
                  {activities.map((activity) => (
                    <li key={activity.id} className="flex gap-2.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      <div className="min-w-0">
                        <p className="text-xs text-foreground">
                          {activity.summary ?? activity.action}
                        </p>
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <History className="h-3 w-3" />
                          {timeAgo(activity.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
