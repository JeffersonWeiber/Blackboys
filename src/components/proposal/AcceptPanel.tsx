import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface AcceptResult {
  status: "accepted";
  already_accepted: boolean;
  proposal_id: string;
  protocol: string;
  project_id: string | null;
  client_id: string | null;
  accepted_at: string;
  accepted_by_name?: string | null;
  contract_token?: string | null;
  package: { id: string; name: string; price: number };
  addons: { name: string; price: number }[];
  total: number;
}

interface AcceptPanelProps {
  token: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  packageName: string;
  addonsCount: number;
  total: number;
  addonIndexes: number[];
  packageId: string;
  onAccepted: (result: AcceptResult) => void;
}

const maskDocument = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

const ERROR_MESSAGES: Record<string, string> = {
  consent_required: "É preciso marcar o aceite dos termos.",
  invalid_name: "Informe o nome completo do contratante.",
  invalid_document: "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.",
  invalid_email: "Informe um e-mail válido.",
  invalid_package: "Pacote inválido. Recarregue a página e tente novamente.",
  invalid_addon: "Adicional inválido. Recarregue a página e tente novamente.",
  proposal_not_found: "Proposta não encontrada.",
  proposal_unavailable: "Esta proposta não está mais disponível.",
  proposal_expired: "Esta proposta expirou. Fale com a gente para receber uma nova versão.",
};

export function AcceptPanel({
  token,
  clientName,
  clientEmail,
  clientPhone,
  packageName,
  addonsCount,
  total,
  addonIndexes,
  packageId,
  onAccepted,
}: AcceptPanelProps) {
  const [name, setName] = useState(clientName && clientName.includes(" ") ? clientName : "");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState(clientEmail ?? "");
  const [phone, setPhone] = useState(clientPhone ? maskPhone(clientPhone) : "");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalLabel = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(total);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (name.trim().length < 3) {
      setError(ERROR_MESSAGES.invalid_name);
      return;
    }

    const digits = document.replace(/\D/g, "");
    if (digits.length !== 11 && digits.length !== 14) {
      setError(ERROR_MESSAGES.invalid_document);
      return;
    }

    if (!consent) {
      setError(ERROR_MESSAGES.consent_required);
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: rpcError } = await supabase.rpc("proposal_accept", {
        _token: token,
        _package_id: packageId,
        _addon_indexes: addonIndexes,
        _name: name.trim(),
        _document: digits,
        _email: email.trim() || null,
        _phone: phone.trim() || null,
        _consent: consent,
      });

      if (rpcError) {
        const key = Object.keys(ERROR_MESSAGES).find((code) =>
          rpcError.message?.includes(code),
        );
        throw new Error(key ? ERROR_MESSAGES[key] : "Não foi possível registrar o aceite. Tente novamente.");
      }

      onAccepted(data as unknown as AcceptResult);
    } catch (err) {
      console.error("Error accepting proposal:", err);
      setError(err instanceof Error ? err.message : "Não foi possível registrar o aceite.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="doc-accept-panel no-print">
      <p className="doc-accept-lead">
        Confirme seus dados para registrar o aceite. Ele fica gravado com data, hora e
        protocolo — é o que permite emitir o contrato sem retrabalho.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="doc-accept-grid">
          <div className="doc-field doc-field--wide">
            <label htmlFor="accept-name">Nome completo</label>
            <input
              id="accept-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Como está no documento"
              autoComplete="name"
              required
            />
          </div>

          <div className="doc-field">
            <label htmlFor="accept-document">CPF ou CNPJ</label>
            <input
              id="accept-document"
              value={document}
              onChange={(event) => setDocument(maskDocument(event.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              required
            />
          </div>

          <div className="doc-field">
            <label htmlFor="accept-phone">WhatsApp</label>
            <input
              id="accept-phone"
              value={phone}
              onChange={(event) => setPhone(maskPhone(event.target.value))}
              placeholder="(45) 99999-9999"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          <div className="doc-field doc-field--wide">
            <label htmlFor="accept-email">E-mail</label>
            <input
              id="accept-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
            />
          </div>
        </div>

        <div className="doc-recap">
          <span>Você está aceitando</span>
          <strong>{packageName}</strong>
          {addonsCount > 0 && (
            <span>
              + {addonsCount} {addonsCount === 1 ? "adicional" : "adicionais"}
            </span>
          )}
          <span>·</span>
          <b>{totalLabel}</b>
        </div>

        <label className="doc-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          <span>
            Li e concordo com esta proposta e com a{" "}
            <Link to="/privacidade" target="_blank" rel="noopener noreferrer">
              Política de Privacidade
            </Link>
            . Autorizo o registro do meu nome, documento e data do aceite.
          </span>
        </label>

        {error && <p className="doc-error">{error}</p>}

        <div className="doc-actions">
          <button type="submit" className="p-btn p-btn--gold" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Lock size={15} />
                Confirmar aceite
              </>
            )}
          </button>
          <span style={{ fontSize: 12, color: "var(--p-muted)" }}>
            O aceite é imediato e não pode ser desfeito por aqui.
          </span>
        </div>
      </form>
    </div>
  );
}
