import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClient } from "@/hooks/useClients";
import { useAllNiches } from "@/hooks/useNiches";
import { useSetContractStatus } from "@/hooks/useContracts";
import { ProjectEditDialog } from "@/components/admin/ProjectEditDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileSignature,
  FileText,
  FolderKanban,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Undo2,
  Wallet,
} from "lucide-react";

type ContractContent = {
  service?: {
    package?: { name?: string; items?: string[] };
    addons?: { name?: string; price?: number }[];
    package_total?: number;
    addons_total?: number;
    total?: number;
  };
  total?: number;
  event?: { date?: string; place?: string; time?: string; address?: string } | null;
};

type ClientContract = {
  id: string;
  number: string;
  token: string;
  status: string;
  created_at: string;
  signed_at: string | null;
  project_id: string | null;
  content: ContractContent | null;
};

type ClientProposal = {
  id: string;
  token: string;
  status: string;
  version: number;
  total_value: number | null;
  created_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  selection: { package?: { name?: string } } | null;
};

type ClientProject = {
  id: string;
  title: string;
  status: string;
  event_date: string | null;
  location: string | null;
  closed_value: number | null;
  created_at: string;
};

type ClientActivity = {
  id: string;
  action: string;
  summary: string | null;
  actor_type: string;
  created_at: string;
};

const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);

const dateBR = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
};

const dateTimeBR = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const formatDocument = (value?: string | null) => {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return value?.trim() || "—";
};

const whatsappHref = (phone?: string | null) => {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
};

const PROPOSAL_STATUS: Record<string, { label: string; className: string }> = {
  created: { label: "Criada", className: "bg-muted text-muted-foreground border-border" },
  sent: { label: "Enviada", className: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  viewed: { label: "Visualizada", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  accepted: { label: "Aceita", className: "bg-green-500/10 text-green-400 border-green-500/30" },
  rejected: { label: "Recusada", className: "bg-red-500/10 text-red-400 border-red-500/30" },
  expired: { label: "Expirada", className: "bg-muted text-muted-foreground border-border" },
};

const CONTRACT_STATUS: Record<string, { label: string; className: string }> = {
  generated: {
    label: "Aguardando assinatura",
    className: "bg-gold/15 text-gold border-gold/30",
  },
  signed: { label: "Assinado", className: "bg-green-500/10 text-green-400 border-green-500/30" },
  cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground border-border" },
};

const PROJECT_STATUS: Record<string, { label: string; className: string }> = {
  orcamento: { label: "Orçamento", className: "bg-muted text-muted-foreground border-border" },
  negociacao: { label: "Negociação", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  fechado: { label: "Fechado", className: "bg-gold/15 text-gold border-gold/30" },
  em_producao: { label: "Em produção", className: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  entregue: { label: "Entregue", className: "bg-green-500/10 text-green-400 border-green-500/30" },
  cancelado: { label: "Cancelado", className: "bg-red-500/10 text-red-400 border-red-500/30" },
};

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 className="font-display text-sm tracking-[0.18em] uppercase text-white">
          {title}
        </h2>
        {typeof count === "number" && (
          <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
        )}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: client, isLoading } = useClient(id);
  const { data: niches } = useAllNiches();
  const { toast } = useToast();
  const setContractStatus = useSetContractStatus();
  const [projectToEdit, setProjectToEdit] = useState<ClientProject | null>(null);

  const { data: related, isLoading: loadingRelated } = useQuery({
    queryKey: ["client-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const [projects, proposals, contracts, activities] = await Promise.all([
        supabase
          .from("projects")
          .select("id, title, status, event_date, location, closed_value, created_at")
          .eq("client_id", id!)
          .order("created_at", { ascending: false }),
        supabase
          .from("budget_links")
          .select(
            "id, token, status, version, total_value, created_at, sent_at, viewed_at, accepted_at, selection",
          )
          .eq("client_id", id!)
          .order("created_at", { ascending: false }),
        supabase
          .from("contracts")
          .select("id, number, token, status, created_at, signed_at, project_id, content")
          .eq("client_id", id!)
          .order("created_at", { ascending: false }),
        supabase
          .from("activities")
          .select("id, action, summary, actor_type, created_at")
          .eq("client_id", id!)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (projects.error) throw projects.error;
      if (proposals.error) throw proposals.error;
      if (contracts.error) throw contracts.error;
      if (activities.error) throw activities.error;

      return {
        projects: (projects.data ?? []) as ClientProject[],
        proposals: (proposals.data ?? []) as ClientProposal[],
        contracts: (contracts.data ?? []) as unknown as ClientContract[],
        activities: (activities.data ?? []) as ClientActivity[],
      };
    },
  });

  const nicheName = useMemo(() => {
    if (!client?.niche_id) return null;
    return niches?.find((niche) => niche.id === client.niche_id)?.name ?? null;
  }, [client?.niche_id, niches]);

  const totals = useMemo(() => {
    const contracts = related?.contracts ?? [];
    const proposals = related?.proposals ?? [];
    return {
      contracts: contracts.length,
      contracted: contracts
        .filter((contract) => contract.status !== "cancelled")
        .reduce((sum, contract) => sum + Number(contract.content?.total ?? 0), 0),
      proposals: proposals.length,
      openProposals: proposals.filter((proposal) =>
        ["created", "sent", "viewed"].includes(proposal.status),
      ).length,
      projects: related?.projects.length ?? 0,
      activeProjects: (related?.projects ?? []).filter(
        (project) => !["entregue", "cancelado"].includes(project.status),
      ).length,
    };
  }, [related]);

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado", description: "Cole no WhatsApp ou e-mail do cliente." });
    } catch {
      toast({ title: "Não foi possível copiar", description: url, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      </AdminLayout>
    );
  }

  if (!client) {
    return (
      <AdminLayout>
        <div className="py-24 text-center">
          <h1 className="text-xl font-semibold">Cliente não encontrado</h1>
          <Button asChild variant="ghost" className="mt-4">
            <Link to="/admin/clients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para clientes
            </Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const wa = whatsappHref(client.phone);
  const initials = client.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/admin/clients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Clientes
          </Link>
        </Button>

        {/* Cabeçalho do cliente */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gold/30 bg-gold/10">
                {client.logo_url ? (
                  <img
                    src={client.logo_url}
                    alt={client.name}
                    className="max-h-12 max-w-12 object-contain"
                  />
                ) : (
                  <span className="font-display text-xl text-gold">{initials}</span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
                  <Badge
                    variant="outline"
                    className={
                      client.status === "ativo"
                        ? "border-green-500/30 bg-green-500/10 text-green-400"
                        : "border-border bg-muted text-muted-foreground"
                    }
                  >
                    {client.status}
                  </Badge>
                  {nicheName && (
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      {nicheName}
                    </Badge>
                  )}
                </div>

                {client.trade_name && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{client.trade_name}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {client.email && (
                    <a
                      href={`mailto:${client.email}`}
                      className="flex items-center gap-1.5 hover:text-gold"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {client.email}
                    </a>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {client.phone}
                    </span>
                  )}
                  {(client.city || client.state) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {[client.city, client.state].filter(Boolean).join("/")}
                    </span>
                  )}
                  {client.website_url && (
                    <a
                      href={client.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-gold"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Site
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {wa && (
                <Button asChild variant="outline" size="sm">
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                  </a>
                </Button>
              )}
              <Button asChild size="sm">
                <Link to={`/admin/clients/${client.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              Valor contratado
            </div>
            <p className="mt-2 font-display text-2xl text-gold tabular-nums">
              {brl(totals.contracted)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <FileSignature className="h-3.5 w-3.5" />
              Contratos
            </div>
            <p className="mt-2 font-display text-2xl text-white tabular-nums">
              {totals.contracts}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Propostas em aberto
            </div>
            <p className="mt-2 font-display text-2xl text-white tabular-nums">
              {totals.openProposals}
              <span className="ml-1 text-sm text-muted-foreground">/ {totals.proposals}</span>
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <FolderKanban className="h-3.5 w-3.5" />
              Projetos ativos
            </div>
            <p className="mt-2 font-display text-2xl text-white tabular-nums">
              {totals.activeProjects}
              <span className="ml-1 text-sm text-muted-foreground">/ {totals.projects}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            {/* Serviços contratados */}
            <Section title="Serviços contratados" count={related?.contracts.length}>
              {loadingRelated ? (
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              ) : !related?.contracts.length ? (
                <Empty>
                  Nenhum contrato ainda. O contrato é gerado automaticamente quando o cliente
                  aceita uma proposta.
                </Empty>
              ) : (
                <div className="space-y-3">
                  {related.contracts.map((contract) => {
                    const status =
                      CONTRACT_STATUS[contract.status] ?? CONTRACT_STATUS.generated;
                    const service = contract.content?.service;
                    const pkg = service?.package;
                    const addons = service?.addons ?? [];
                    const url = `${window.location.origin}/contrato/${contract.token}`;

                    return (
                      <article
                        key={contract.id}
                        className="rounded-lg border border-border bg-background/40 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                {contract.number}
                              </span>
                              <Badge variant="outline" className={status.className}>
                                {status.label}
                              </Badge>
                            </div>
                            <h3 className="mt-1 text-base font-semibold text-white">
                              {pkg?.name ?? "Serviço contratado"}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Gerado em {dateBR(contract.created_at)}
                              {contract.signed_at && (
                                <span className="block text-green-400">
                                  Assinado em {dateBR(contract.signed_at)}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              Total
                            </p>
                            <p className="font-display text-xl text-gold tabular-nums">
                              {brl(Number(contract.content?.total ?? 0))}
                            </p>
                          </div>
                        </div>

                        {addons.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {addons.map((addon) => (
                              <span
                                key={addon.name}
                                className="rounded-full border border-gold/20 bg-gold/5 px-2.5 py-0.5 text-[11px] text-gold"
                              >
                                + {addon.name} · {brl(Number(addon.price ?? 0))}
                              </span>
                            ))}
                          </div>
                        )}

                        {(pkg?.items?.length ?? 0) > 0 && (
                          <details className="group mt-3">
                            <summary className="cursor-pointer list-none text-xs text-muted-foreground transition-colors hover:text-gold">
                              Ver itens inclusos ({pkg?.items?.length})
                            </summary>
                            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                              {(pkg?.items ?? []).map((item) => (
                                <li
                                  key={item}
                                  className="flex gap-2 text-xs text-muted-foreground"
                                >
                                  <span className="text-gold">•</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-3.5 w-3.5" />
                              Abrir contrato
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyLink(url)}
                            className="text-muted-foreground"
                          >
                            <Copy className="mr-2 h-3.5 w-3.5" />
                            Copiar link
                          </Button>
                          {contract.status === "signed" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground"
                              disabled={setContractStatus.isPending}
                              onClick={() =>
                                setContractStatus.mutate({
                                  contract: {
                                    id: contract.id,
                                    number: contract.number,
                                    clientId: client?.id ?? id,
                                    projectId: contract.project_id,
                                  },
                                  status: "generated",
                                })
                              }
                            >
                              <Undo2 className="mr-2 h-3.5 w-3.5" />
                              Desfazer assinatura
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300"
                              disabled={setContractStatus.isPending}
                              onClick={() =>
                                setContractStatus.mutate({
                                  contract: {
                                    id: contract.id,
                                    number: contract.number,
                                    clientId: client?.id ?? id,
                                    projectId: contract.project_id,
                                  },
                                  status: "signed",
                                })
                              }
                            >
                              <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                              Marcar como assinado
                            </Button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* Propostas */}
            <Section title="Propostas" count={related?.proposals.length}>
              {loadingRelated ? (
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              ) : !related?.proposals.length ? (
                <Empty>Nenhuma proposta enviada para este cliente.</Empty>
              ) : (
                <ul className="divide-y divide-border">
                  {related.proposals.map((proposal) => {
                    const status =
                      PROPOSAL_STATUS[proposal.status] ?? PROPOSAL_STATUS.created;
                    const protocol = proposal.id.slice(0, 8).toUpperCase();

                    return (
                      <li
                        key={proposal.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              {protocol}
                            </span>
                            <Badge variant="outline" className={status.className}>
                              {status.label}
                            </Badge>
                            {proposal.version > 1 && (
                              <span className="text-[11px] text-muted-foreground">
                                v{proposal.version}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-foreground">
                            {proposal.selection?.package?.name ?? "Proposta comercial"}
                            {proposal.total_value
                              ? ` · ${brl(Number(proposal.total_value))}`
                              : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Criada em {dateBR(proposal.created_at)}
                            {proposal.accepted_at
                              ? ` · aceita em ${dateBR(proposal.accepted_at)}`
                              : proposal.viewed_at
                                ? ` · vista em ${dateBR(proposal.viewed_at)}`
                                : ""}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="ghost">
                          <a
                            href={`/orcamento/${proposal.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Abrir
                            <ExternalLink className="ml-2 h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            {/* Projetos */}
            <Section title="Projetos" count={related?.projects.length}>
              {loadingRelated ? (
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              ) : !related?.projects.length ? (
                <Empty>Nenhum projeto criado. O projeto nasce no aceite da proposta.</Empty>
              ) : (
                <ul className="divide-y divide-border">
                  {related.projects.map((project) => {
                    const status = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.orcamento;
                    return (
                      <li
                        key={project.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-white">
                              {project.title}
                            </span>
                            <Badge variant="outline" className={status.className}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {project.event_date ? dateBR(project.event_date) : "Data a definir"}
                            </span>
                            {project.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {project.location}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {project.closed_value ? brl(Number(project.closed_value)) : "—"}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Editar projeto"
                            onClick={() => setProjectToEdit(project)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            {/* Histórico */}
            <Section title="Histórico" count={related?.activities.length}>
              {loadingRelated ? (
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              ) : !related?.activities.length ? (
                <Empty>Nenhuma atividade registrada.</Empty>
              ) : (
                <ol className="space-y-3">
                  {related.activities.map((activity) => (
                    <li key={activity.id} className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">
                          {activity.summary ?? activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dateTimeBR(activity.created_at)}
                          {activity.actor_type === "system" ? " · automático" : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>

          {/* Dados cadastrais */}
          <aside className="space-y-6">
            <Section title="Dados do cliente">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    Documento
                  </dt>
                  <dd className="mt-0.5 text-foreground">{formatDocument(client.document)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    E-mail
                  </dt>
                  <dd className="mt-0.5 break-all text-foreground">{client.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    Telefone
                  </dt>
                  <dd className="mt-0.5 text-foreground">{client.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    Endereço
                  </dt>
                  <dd className="mt-0.5 text-foreground">
                    {client.address ?? "—"}
                    {client.city || client.state ? (
                      <span className="block text-muted-foreground">
                        {[client.city, client.state].filter(Boolean).join("/")}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    No site
                  </dt>
                  <dd className="mt-0.5 text-foreground">
                    {client.show_on_site ? "Sim, aparece na Home" : "Não aparece"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    Cliente desde
                  </dt>
                  <dd className="mt-0.5 text-foreground">
                    {dateBR(client.converted_at ?? client.created_at)}
                  </dd>
                </div>
                {client.notes && (
                  <div>
                    <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      Observações
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-line text-muted-foreground">
                      {client.notes}
                    </dd>
                  </div>
                )}
              </dl>
            </Section>
          </aside>
        </div>
      </div>

      <ProjectEditDialog
        project={projectToEdit}
        clientId={client?.id ?? id}
        open={!!projectToEdit}
        onOpenChange={(open) => !open && setProjectToEdit(null)}
      />
    </AdminLayout>
  );
}
