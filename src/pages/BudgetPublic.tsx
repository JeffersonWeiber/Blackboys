import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import {
  ProposalDocument,
  type ProposalContent,
} from "@/components/proposal/ProposalDocument";
import { AcceptPanel, type AcceptResult } from "@/components/proposal/AcceptPanel";
import logoBlackboy from "@/assets/logo-blackboy-films.svg";
import "@/styles/proposal.css";

type ProposalPayload = {
  mode: "link" | "generic";
  proposal: {
    id?: string;
    status?: string;
    client_name?: string | null;
    client_email?: string | null;
    client_phone?: string | null;
    created_at?: string | null;
    expires_at?: string | null;
    viewed_at?: string | null;
    version?: number;
    total_value?: number | null;
    accepted_at?: string | null;
    accepted_by_name?: string | null;
    content_snapshot?: ProposalContent | null;
    selection?: {
      package?: { id?: string; name?: string; price?: number };
      addons?: { name?: string; price?: number }[];
    } | null;
  };
  template: {
    name: string;
    title: string;
    subtitle?: string | null;
    hero_badge?: string | null;
    intro_text?: string | null;
    niche?: string;
    portfolio_url?: string | null;
    content?: ProposalContent | null;
  };
  contract?: { token?: string; number?: string } | null;
  niche: { name?: string; slug?: string; cover_image?: string | null } | null;
};

type PageError = "not_found" | "expired" | "unavailable" | null;

const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);

export default function BudgetPublic() {
  const { token } = useParams<{ token: string }>();
  const company = useCompanyProfile();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PageError>(null);
  const [payload, setPayload] = useState<ProposalPayload | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<number[]>([]);
  const [acceptedResult, setAcceptedResult] = useState<AcceptResult | null>(null);

  const generatedAt = useMemo(() => new Date().toLocaleString("pt-BR"), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchProposal() {
      if (!token) {
        setError("not_found");
        setLoading(false);
        return;
      }

      try {
        // Toda leitura pública passa por RPC: o anon não acessa tabelas.
        const { data, error: rpcError } = await supabase.rpc("proposal_get", {
          _token: token,
        });

        if (rpcError) throw rpcError;

        if (!data) {
          if (!cancelled) setError("not_found");
          return;
        }

        const result = data as unknown as ProposalPayload;
        const status = result.proposal?.status;
        const expiresAt = result.proposal?.expires_at;

        if (result.mode === "link") {
          // Proposta aceita continua acessível, mesmo depois da validade.
          if (status === "accepted") {
            // segue para renderizar
          } else if (status === "superseded" || status === "rejected") {
            if (!cancelled) setError("unavailable");
            return;
          } else if (
            status === "expired" ||
            (expiresAt && new Date(expiresAt) < new Date())
          ) {
            if (!cancelled) setError("expired");
            return;
          }
        }

        if (cancelled) return;

        const content =
          result.proposal?.content_snapshot ?? result.template?.content ?? {};
        const packages = content.packages ?? [];
        const addons = content.addons ?? [];

        if (status === "accepted" && result.proposal?.selection?.package?.id) {
          setSelectedPackageId(result.proposal.selection.package.id);
          const acceptedNames = new Set(
            (result.proposal.selection.addons ?? []).map((addon) => addon.name),
          );
          setSelectedAddons(
            addons
              .map((addon, index) => (acceptedNames.has(addon.name) ? index : -1))
              .filter((index) => index >= 0),
          );
        } else {
          const initial = packages.find((pkg) => pkg.featured) ?? packages[0];
          if (initial) setSelectedPackageId(initial.id);
        }

        setPayload(result);

        // Registra visualização (idempotente, só na primeira vez).
        // Falha aqui não pode derrubar a proposta.
        if (result.mode === "link") {
          supabase
            .rpc("proposal_track_view", { _token: token })
            .then(({ error: trackError }) => {
              if (trackError) {
                console.warn("proposal_track_view failed:", trackError);
              }
            });
        }
      } catch (err) {
        console.error("Error fetching proposal:", err);
        if (!cancelled) setError("not_found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProposal();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Nome do arquivo ao salvar em PDF
  useEffect(() => {
    if (!payload) return;
    const previous = document.title;
    const who = payload.proposal?.client_name
      ? ` - ${payload.proposal.client_name}`
      : "";
    document.title = `Proposta Comercial${who} - Blackboy Films`;
    return () => {
      document.title = previous;
    };
  }, [payload]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (error) {
    const copy: Record<Exclude<PageError, null>, { title: string; text: string }> = {
      not_found: {
        title: "Orçamento não encontrado",
        text: "O link que você tentou acessar não existe ou foi removido.",
      },
      expired: {
        title: "Este orçamento expirou",
        text: "Entre em contato com a gente para receber uma proposta atualizada.",
      },
      unavailable: {
        title: "Esta proposta foi encerrada",
        text: "Ela foi substituída por uma versão mais recente ou não está mais disponível.",
      },
    };

    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <img src={logoBlackboy} alt="Blackboy Films" className="h-12 mb-8 opacity-50" />
        <h1 className="text-2xl font-display font-bold">{copy[error].title}</h1>
        <p className="text-muted-foreground mt-2 max-w-md">{copy[error].text}</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  const proposal = payload.proposal ?? {};
  const template = payload.template;
  const content: ProposalContent =
    proposal.content_snapshot ?? template.content ?? {};
  const isLink = payload.mode === "link";
  const accepted = proposal.status === "accepted" || !!acceptedResult;
  const packages = content.packages ?? [];
  const addons = content.addons ?? [];

  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId) ?? null;
  const packagePrice = Number(selectedPackage?.price ?? 0);
  const addonsTotal = selectedAddons.reduce(
    (sum, index) => sum + Number(addons[index]?.price ?? 0),
    0,
  );
  const total = packagePrice + addonsTotal;

  const proposalId = proposal.id ?? "";
  const protocol =
    acceptedResult?.protocol ??
    (proposalId ? proposalId.replace(/-/g, "").slice(0, 8).toUpperCase() : "—");
  const version = proposal.version ?? 1;

  const acceptedAt = acceptedResult?.accepted_at ?? proposal.accepted_at ?? null;
  const acceptedByName =
    acceptedResult?.accepted_by_name ?? proposal.accepted_by_name ?? null;

  const contractToken =
    acceptedResult?.contract_token ?? payload.contract?.token ?? null;
  const contractHref = accepted && contractToken ? `/contrato/${contractToken}` : null;

  const handlePrint = () => {
    window.print();
  };

  const scrollToAccept = () => {
    document.getElementById("aceite")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="proposal-shell">
      <div className="proposal-toolbar no-print">
        <span className="proposal-toolbar-id">
          {isLink ? `Proposta Nº ${protocol}` : "Tabela de investimento"}
          {version > 1 ? ` · v${version}` : ""}
        </span>

        <div className="proposal-toolbar-actions">
          <span className="proposal-toolbar-hint">
            Abre a impressão — escolha “Salvar como PDF”
          </span>
          <button type="button" className="p-btn p-btn--ghost" onClick={handlePrint}>
            <Download size={15} />
            Baixar PDF
          </button>
        </div>
      </div>

      <ProposalDocument
        protocol={protocol}
        version={version}
        createdAt={proposal.created_at ?? null}
        expiresAt={proposal.expires_at ?? null}
        clientName={proposal.client_name ?? null}
        clientEmail={proposal.client_email ?? null}
        clientPhone={proposal.client_phone ?? null}
        template={template}
        content={content}
        company={company}
        accepted={accepted}
        acceptedAt={acceptedAt}
        acceptedByName={acceptedByName}
        selectedPackageId={selectedPackageId}
        selectedAddons={selectedAddons}
        onSelectPackage={setSelectedPackageId}
        onToggleAddon={(index) =>
          setSelectedAddons((current) =>
            current.includes(index)
              ? current.filter((item) => item !== index)
              : [...current, index],
          )
        }
        packagePrice={packagePrice}
        total={total}
        generatedAt={generatedAt}
        showAcceptance={isLink}
        contractHref={contractHref}
        acceptSlot={
          isLink && !accepted && token ? (
            <AcceptPanel
              token={token}
              clientName={proposal.client_name ?? null}
              clientEmail={proposal.client_email ?? null}
              clientPhone={proposal.client_phone ?? null}
              packageId={selectedPackageId ?? ""}
              packageName={selectedPackage?.name ?? "Pacote"}
              addonsCount={selectedAddons.length}
              addonIndexes={selectedAddons}
              total={total}
              onAccepted={setAcceptedResult}
            />
          ) : undefined
        }
      />

      {isLink && !accepted && (
        <div className="accept-bar no-print">
          <div className="accept-bar-info">
            <div className="accept-bar-label">Investimento total</div>
            <div className="accept-bar-total">{brl(total)}</div>
            <div className="accept-bar-name">
              {selectedPackage?.name ?? "Escolha um pacote"}
              {selectedAddons.length > 0
                ? ` + ${selectedAddons.length} ${
                    selectedAddons.length === 1 ? "adicional" : "adicionais"
                  }`
                : ""}
            </div>
          </div>

          <button type="button" className="p-btn p-btn--gold" onClick={scrollToAccept}>
            Aceitar proposta
          </button>
        </div>
      )}
    </div>
  );
}
