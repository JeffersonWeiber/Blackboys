import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import {
  ContractDocument,
  type ContractContent,
} from "@/components/contract/ContractDocument";
import logoBlackboy from "@/assets/logo-blackboy-films.svg";
import "@/styles/proposal.css";
import "@/styles/contract.css";

type ContractPayload = {
  contract: {
    id: string;
    number: string;
    status: string;
    created_at: string;
    content: ContractContent;
  };
  company?: Record<string, string> | null;
};

export default function ContractPublic() {
  const { token } = useParams<{ token: string }>();
  const profile = useCompanyProfile();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [payload, setPayload] = useState<ContractPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchContract() {
      if (!token) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("contract_get", { _token: token });

      if (cancelled) return;

      if (error || !data) {
        console.error("Error fetching contract:", error);
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPayload(data as unknown as ContractPayload);
      setLoading(false);
    }

    fetchContract();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!payload) return;
    const previous = document.title;
    const who = payload.contract.content?.client?.name;
    document.title = `Contrato${who ? ` - ${who}` : ""} - Blackboy Films`;
    return () => {
      document.title = previous;
    };
  }, [payload]);

  if (loading) {
    return (
      <div className="proposal-shell flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (notFound || !payload) {
    return (
      <div className="proposal-shell flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <img src={logoBlackboy} alt="Blackboy Films" className="mb-8 h-12 opacity-50" />
        <h1 className="font-display text-2xl font-bold text-white">
          Contrato não encontrado
        </h1>
        <p className="mt-2 max-w-md text-[var(--p-muted)]">
          O link que você tentou acessar não existe ou foi removido.
        </p>
      </div>
    );
  }

  const company = { ...profile, ...(payload.company ?? {}) };

  return (
    <div className="proposal-shell">
      <div className="proposal-toolbar contract-toolbar no-print">
        <span className="proposal-toolbar-id">Contrato Nº {payload.contract.number}</span>

        <div className="proposal-toolbar-actions">
          <span className="proposal-toolbar-hint">
            Abre a impressão — escolha “Salvar como PDF”
          </span>
          <button
            type="button"
            className="p-btn p-btn--ghost"
            onClick={() => window.print()}
          >
            <Download size={15} />
            Baixar PDF
          </button>
        </div>
      </div>

      <ContractDocument
        number={payload.contract.number}
        status={payload.contract.status}
        createdAt={payload.contract.created_at}
        content={payload.contract.content}
        company={company}
      />
    </div>
  );
}
