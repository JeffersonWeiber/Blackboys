import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import logoBlackboy from "@/assets/logo-blackboy-films.svg";
import logoBlackboyDark from "@/assets/logo-blackboy-films-dark.svg";
import type { CompanyProfile } from "@/hooks/useCompanyProfile";

export interface ProposalContent {
  sections?: { title: string; body?: string }[];
  formats?: { name: string; description?: string }[];
  packages?: {
    id: string;
    name: string;
    tagline?: string;
    price: number;
    featured?: boolean;
    items?: string[];
  }[];
  addons?: { name: string; price: number }[];
}

interface ProposalDocumentProps {
  protocol: string;
  version: number;
  createdAt: string | null;
  expiresAt: string | null;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  template: {
    name: string;
    title: string;
    subtitle?: string | null;
    hero_badge?: string | null;
    intro_text?: string | null;
  };
  content: ProposalContent;
  company: CompanyProfile;
  accepted: boolean;
  acceptedAt?: string | null;
  acceptedByName?: string | null;
  selectedPackageId: string | null;
  selectedAddons: number[];
  onSelectPackage: (id: string) => void;
  onToggleAddon: (index: number) => void;
  packagePrice: number;
  total: number;
  generatedAt: string;
  showAcceptance: boolean;
  acceptSlot?: ReactNode;
  contractHref?: string | null;
}

const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);

const dateBR = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "—";

export function ProposalDocument({
  protocol,
  version,
  createdAt,
  expiresAt,
  clientName,
  clientEmail,
  clientPhone,
  template,
  content,
  company,
  accepted,
  acceptedAt,
  acceptedByName,
  selectedPackageId,
  selectedAddons,
  onSelectPackage,
  onToggleAddon,
  packagePrice,
  total,
  generatedAt,
  showAcceptance,
  acceptSlot,
  contractHref,
}: ProposalDocumentProps) {
  const packages = content.packages ?? [];
  const addons = content.addons ?? [];
  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId) ?? null;
  const chosenAddons = selectedAddons
    .map((index) => addons[index])
    .filter(Boolean);

  return (
    <article className="proposal-doc">
      <header className="doc-brandbar">
        <img
          src={logoBlackboy}
          alt="Blackboy Films"
          className="doc-logo doc-logo--screen"
        />
        <img
          src={logoBlackboyDark}
          alt=""
          aria-hidden
          className="doc-logo doc-logo--print"
        />
        <span className="doc-brand-kicker">Proposta Comercial</span>
        <div className="doc-brandbar-meta">
          {showAcceptance && (
            <>
              Nº {protocol}
              <br />
              {version > 1 ? `Versão ${version}` : "Versão única"}
            </>
          )}
        </div>
      </header>

      <section className="doc-cover">
        <span className="doc-watermark" aria-hidden>
          B
        </span>

        <span className="doc-eyebrow">{template.hero_badge || "Proposta Comercial"}</span>
        <h1 className="doc-title">{template.title}</h1>
        {template.subtitle && <p className="doc-subtitle">{template.subtitle}</p>}

        {clientName && (
          <p className="doc-for">
            Preparada para <strong>{clientName}</strong>
          </p>
        )}

        {showAcceptance && (
          <dl className="doc-meta">
            <div>
              <dt>Proposta</dt>
              <dd>Nº {protocol}</dd>
            </div>
            <div>
              <dt>Emitida em</dt>
              <dd>{dateBR(createdAt)}</dd>
            </div>
            {expiresAt && (
              <div>
                <dt>Válida até</dt>
                <dd>{dateBR(expiresAt)}</dd>
              </div>
            )}
            <div>
              <dt>Versão</dt>
              <dd>{version}</dd>
            </div>
          </dl>
        )}
      </section>

      {(showAcceptance || clientName) && (
        <section className="doc-parties" aria-label="Partes">
        <div className="doc-party">
          <span className="doc-party-label">Contratante</span>
          <p className="doc-party-name">{clientName || "A preencher"}</p>
          <div className="doc-party-row">
            {clientEmail && (
              <span>
                E-mail <b style={{ color: "inherit", fontWeight: 500 }}>{clientEmail}</b>
              </span>
            )}
            {clientPhone && (
              <span>
                Contato <b style={{ color: "inherit", fontWeight: 500 }}>{clientPhone}</b>
              </span>
            )}
          </div>
        </div>

        <div className="doc-party doc-party--muted">
          <span className="doc-party-label">Contratado</span>
          <p className="doc-party-name">{company.legal_name}</p>
          <div className="doc-party-row">
            <span>CNPJ {company.document}</span>
            <span>
              {company.address} — {company.city}/{company.state}
            </span>
          </div>
        </div>
      </section>
      )}

      {template.intro_text && (
        <section className="doc-section">
          <p className="doc-body doc-intro">{template.intro_text}</p>
        </section>
      )}

      {content.sections?.map((section, index) => (
        <section className="doc-section" key={`${section.title}-${index}`}>
          <h2 className="doc-h2">{section.title}</h2>
          {section.body && <p className="doc-body">{section.body}</p>}
        </section>
      ))}

      {!!content.formats?.length && (
        <section className="doc-section doc-formats-section">
          <h2 className="doc-h2">Formatos de entrega</h2>
          <div className="doc-formats">
            {content.formats.map((format, index) => (
              <div className="doc-format" key={`${format.name}-${index}`}>
                <h3>{format.name}</h3>
                {format.description && <p>{format.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {!!packages.length && (
        <section className="doc-section doc-packages-section">
          <h2 className="doc-h2">Opções de investimento</h2>
          <p className="doc-body" style={{ marginBottom: 20 }}>
            {accepted
              ? "Pacote escolhido no aceite desta proposta."
              : "Escolha o pacote que faz sentido para o seu momento. Você pode incluir adicionais abaixo."}
          </p>

          <div className="doc-packages">
            {packages.map((pkg) => {
              const selected = pkg.id === selectedPackageId;

              return (
                <button
                  type="button"
                  key={pkg.id}
                  className={`doc-package${selected ? " is-selected" : ""}`}
                  aria-pressed={selected}
                  disabled={accepted}
                  onClick={() => onSelectPackage(pkg.id)}
                >
                  {pkg.featured && <span className="doc-badge">Recomendado</span>}

                  <div className="doc-package-head">
                    <h3>{pkg.name}</h3>
                    <span className="doc-select-dot" aria-hidden />
                  </div>

                  {pkg.tagline && <p className="doc-tagline">{pkg.tagline}</p>}

                  <p className="doc-price">
                    {brl(pkg.price)}
                    <small>investimento</small>
                  </p>

                  {!!pkg.items?.length && (
                    <ul className="doc-list">
                      {pkg.items.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!!addons.length && (
        <section className="doc-section doc-addons-section">
          <h2 className="doc-h2">Adicionais</h2>
          <p className="doc-body" style={{ marginBottom: 18 }}>
            Opcionais que podem entrar no pacote. Marque os que quiser incluir.
          </p>

          <div className="doc-addons">
            {addons.map((addon, index) => {
              const checked = selectedAddons.includes(index);

              return (
                <button
                  type="button"
                  key={`${addon.name}-${index}`}
                  className={`doc-addon${checked ? " is-checked" : ""}`}
                  aria-pressed={checked}
                  disabled={accepted}
                  onClick={() => onToggleAddon(index)}
                >
                  <span className="doc-check" aria-hidden />
                  <span className="doc-addon-name">{addon.name}</span>
                  <span className="doc-addon-price">+ {brl(addon.price)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="doc-summary" aria-label="Investimento total">
        <div className="doc-summary-label">Investimento</div>

        <dl style={{ margin: 0 }}>
          <div className="doc-summary-row">
            <dt>{selectedPackage?.name || "Pacote"}</dt>
            <dd>{brl(packagePrice)}</dd>
          </div>

          {chosenAddons.map((addon, index) => (
            <div className="doc-summary-row" key={`${addon.name}-${index}`}>
              <dt>{addon.name}</dt>
              <dd>{brl(addon.price)}</dd>
            </div>
          ))}

          <div className="doc-summary-total">
            <dt>Total</dt>
            <dd>{brl(total)}</dd>
          </div>
        </dl>

        <p className="doc-note">
          Valores em reais. {expiresAt ? `Proposta válida até ${dateBR(expiresAt)}.` : ""} A
          verba de anúncios, quando houver, é definida separadamente.
        </p>
      </section>

      {showAcceptance && (
        <section className="doc-accept" id="aceite">
          <h2 className="doc-h2">Aceite</h2>

          {accepted ? (
            <div className="doc-accepted">
              <div className="doc-accepted-head">
                <CheckCircle2 size={20} aria-hidden />
                Proposta aceita
              </div>
              <p className="doc-accepted-sub">
                Aceite registrado digitalmente. Este documento é a prova da contratação.
              </p>

              <dl>
                <div>
                  <dt>Protocolo</dt>
                  <dd>{protocol}</dd>
                </div>
                <div>
                  <dt>Aceite em</dt>
                  <dd>{dateBR(acceptedAt)}</dd>
                </div>
                <div>
                  <dt>Por</dt>
                  <dd>{acceptedByName || clientName || "Contratante"}</dd>
                </div>
              </dl>

              {contractHref && (
                <a className="doc-accepted-contract no-print" href={contractHref}>
                  Ver contrato gerado →
                </a>
              )}
            </div>
          ) : (
            <>
              {acceptSlot}
              <div className="doc-sign">
                <p className="doc-body">
                  Ao assinar, o contratante declara que leu e concorda com os termos desta
                  proposta, incluindo o pacote e os adicionais assinalados acima.
                </p>
                <div className="doc-sign-row">
                  <div className="doc-sign-line">Contratante — nome e CPF/CNPJ</div>
                  <div className="doc-sign-line">Data</div>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      <footer className="doc-footer">
        <div className="doc-footer-line">
          <strong>{company.legal_name}</strong>
          <span>CNPJ {company.document}</span>
          <span>
            {company.address} — {company.city}/{company.state}
          </span>
          <span>{company.email}</span>
          {company.phone && <span>{company.phone}</span>}
        </div>
        <p className="doc-generated">
          Documento gerado em {generatedAt}
          {showAcceptance ? ` · Proposta ${protocol} · v${version}` : ""}
        </p>
      </footer>
    </article>
  );
}
