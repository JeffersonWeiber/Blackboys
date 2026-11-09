import logoBlackboy from "@/assets/logo-blackboy-films.svg";
import logoBlackboyDark from "@/assets/logo-blackboy-films-dark.svg";
import type { CompanyProfile } from "@/hooks/useCompanyProfile";

export interface ContractContent {
  number: string;
  generated_at: string;
  proposal?: {
    protocol?: string;
    accepted_at?: string;
    document?: string;
  };
  client?: {
    name?: string;
    document?: string;
    email?: string;
    phone?: string;
  };
  service?: {
    package?: { name?: string; price?: number; items?: string[] };
    addons?: { name?: string; price?: number }[];
    package_total?: number;
    addons_total?: number;
    total?: number;
    accepted_at?: string;
  };
  total?: number;
  event?: {
    date?: string;
    place?: string;
    time?: string;
    address?: string;
  } | null;
}

interface ContractDocumentProps {
  number: string;
  status: string;
  createdAt: string;
  content: ContractContent;
  company: CompanyProfile;
}

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

export function ContractDocument({
  number,
  createdAt,
  content,
  company,
}: ContractDocumentProps) {
  const client = content.client ?? {};
  const service = content.service ?? {};
  const pkg = service.package ?? {};
  const addons = service.addons ?? [];
  const total = Number(content.total ?? service.total ?? 0);
  const packageTotal = Number(service.package_total ?? pkg.price ?? 0);
  const addonsTotal = Number(service.addons_total ?? 0);
  const protocol = content.proposal?.protocol ?? "—";
  const acceptedAt = content.proposal?.accepted_at ?? service.accepted_at ?? null;
  const event = content.event ?? null;
  const year = new Date().getFullYear();

  return (
    <article className="contract-doc">
      <header className="contract-head">
        <div className="contract-head-brand">
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
          <span className="contract-kicker">Contrato de Serviços</span>
        </div>
        <div className="contract-head-meta">
          Nº {number}
          <br />
          Emitido em {dateBR(createdAt)}
        </div>
      </header>

      <section className="contract-title-block">
        <span className="contract-eyebrow">Instrumento particular</span>
        <h1 className="contract-title">Contrato de Prestação de Serviços</h1>
        <p className="contract-lead">
          Pelo presente instrumento particular, de um lado{" "}
          <b>{client.name || "Contratante"}</b>, doravante CONTRATANTE, e de outro lado{" "}
          <b>{company.legal_name}</b>, inscrita no CNPJ {company.document}, doravante
          CONTRATADA, têm entre si justo e contratado o seguinte:
        </p>
      </section>

      <section className="contract-parties" aria-label="Partes">
        <div className="contract-party contract-party--client">
          <span className="contract-party-label">Contratante</span>
          <p className="contract-party-name">{client.name || "A preencher"}</p>
          <p>CPF {formatDocument(client.document)}</p>
          {client.email && <p>{client.email}</p>}
          {client.phone && <p>{client.phone}</p>}
        </div>

        <div className="contract-party">
          <span className="contract-party-label">Contratado</span>
          <p className="contract-party-name">{company.legal_name}</p>
          <p>CNPJ {company.document}</p>
          <p>
            {company.address} — {company.city}/{company.state}
          </p>
          <p>{company.email}</p>
        </div>
      </section>

      <section className="contract-clause">
        <h2 className="contract-h2">
          <span>1</span> Objeto do contrato
        </h2>
        <p>
          1.1. O presente contrato tem por objeto a prestação de serviços audiovisuais
          pela CONTRATADA em favor do CONTRATANTE, compreendendo o pacote{" "}
          <strong>{pkg.name || "contratado"}</strong> e os adicionais descritos na
          cláusula 4, conforme a proposta {protocol}, aceita em {dateBR(acceptedAt)}.
        </p>
        <p>
          1.2. Os serviços serão executados conforme os itens, prazos e condições
          previstos neste contrato.
        </p>
      </section>

      <section className="contract-clause">
        <h2 className="contract-h2">
          <span>2</span> Valor e forma de pagamento
        </h2>
        <p>
          2.1. O valor total dos serviços contratados é de <strong>{brl(total)}</strong>
          {addons.length > 0
            ? `, sendo ${brl(packageTotal)} referentes ao pacote ${pkg.name ?? ""} e ${brl(addonsTotal)} referentes aos adicionais.`
            : `, referente ao pacote ${pkg.name ?? ""}.`}
        </p>
        <p>
          2.2. O pagamento será realizado à vista, na assinatura deste contrato, mediante
          recibo.
        </p>
      </section>

      <section className="contract-clause">
        <h2 className="contract-h2">
          <span>3</span> Vigência e rescisão
        </h2>
        <p>
          3.1. O presente contrato inicia na data da assinatura e termina com a entrega de
          todo o material contratado.
        </p>
        <p>
          3.2. O prazo para entrega total dos materiais é de 45 (quarenta e cinco) dias.
        </p>
      </section>

      <section className="contract-clause">
        <h2 className="contract-h2">
          <span>4</span> Serviço contratado
        </h2>

        <div className="contract-service">
          <div className="contract-service-head">
            <h3>{pkg.name || "Pacote contratado"}</h3>
            <span>{brl(packageTotal)}</span>
          </div>
          <ul className="contract-list">
            {(pkg.items ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {addons.map((addon) => (
          <div className="contract-service" key={addon.name}>
            <div className="contract-service-head">
              <h3>{addon.name || "Adicional"}</h3>
              <span>{brl(Number(addon.price ?? 0))}</span>
            </div>
            <p className="contract-note">Serviço adicional contratado.</p>
          </div>
        ))}
      </section>

      <section className="contract-clause">
        <h2 className="contract-h2">
          <span>5</span> Obrigações das partes
        </h2>

        <div className="contract-obligations">
          <div className="contract-obligation">
            <h3>Contratante</h3>
            <p>Efetuar o pagamento no prazo e conforme combinado;</p>
            <p>
              Oferecer as informações necessárias para que a CONTRATADA possa executar os
              serviços previstos neste contrato.
            </p>
          </div>
          <div className="contract-obligation">
            <h3>Contratado</h3>
            <p>Executar os serviços previstos neste contrato;</p>
            <p>
              Manter a confidencialidade das informações fornecidas pelo CONTRATANTE.
            </p>
          </div>
        </div>

        <h3 className="contract-h3">5.1. Cláusula de penalidade</h3>
        <p>
          Em caso de descumprimento de qualquer obrigação prevista neste contrato por
          qualquer das partes, a parte inadimplente ficará sujeita ao pagamento de multa
          não compensatória equivalente a 20% (vinte por cento) do valor total do
          contrato, sem prejuízo da cobrança de eventuais perdas e danos e demais medidas
          cabíveis.
        </p>

        <h3 className="contract-h3">5.2. Cancelamento por parte do CONTRATANTE</h3>
        <p>
          Em caso de cancelamento do evento pelo CONTRATANTE após a assinatura deste
          contrato, será devida multa equivalente a 40% (quarenta por cento) do valor
          total contratado, a título de ressarcimento pelos bloqueios de agenda e despesas
          administrativas, independentemente de nova contratação.
        </p>
      </section>

      <section className="contract-clause">
        <h2 className="contract-h2">
          <span>6</span> Ausência de vínculo
        </h2>
        <p>
          6.1. Este contrato não gera qualquer vínculo empregatício, societário ou de
          representação entre as partes, sendo cada uma responsável por suas próprias
          obrigações legais, inclusive tributárias e previdenciárias.
        </p>
      </section>

      <section className="contract-clause">
        <h2 className="contract-h2">
          <span>7</span> Informações do evento
        </h2>
        <dl className="contract-event">
          <div className="contract-event-row">
            <dt>Data</dt>
            <dd>
              <strong>{event?.date ? dateBR(event.date) : "A definir"}</strong>
            </dd>
          </div>
          <div className="contract-event-row">
            <dt>Local</dt>
            <dd>
              <strong>{event?.place || "A definir"}</strong>
            </dd>
          </div>
          <div className="contract-event-row">
            <dt>Horário</dt>
            <dd>
              <strong>{event?.time || "A definir"}</strong>
            </dd>
          </div>
          <div className="contract-event-row">
            <dt>Endereço</dt>
            <dd>
              <strong>{event?.address || "A definir"}</strong>
            </dd>
          </div>
        </dl>
        <p className="contract-note">
          As informações do evento serão confirmadas pelas partes antes da execução dos
          serviços.
        </p>
      </section>

      <section className="contract-sign">
        <p className="contract-place">
          {company.city} - {company.state}, ____ de ____________ de {year}
        </p>
        <div className="contract-sign-row">
          <div>
            <div className="contract-sign-box" />
            <div className="contract-sign-label">
              Contratado — {company.legal_name}
            </div>
          </div>
          <div>
            <div className="contract-sign-box" />
            <div className="contract-sign-label">
              Contratante — {client.name || "nome e CPF"}
            </div>
          </div>
        </div>
      </section>

      <footer className="contract-footer">
        <div className="contract-footer-line">
          <strong>{company.legal_name}</strong>
          <span>CNPJ {company.document}</span>
          <span>
            {company.address} — {company.city}/{company.state}
          </span>
          <span>{company.email}</span>
          {company.phone && <span>{company.phone}</span>}
        </div>
        <p className="contract-generated">
          Contrato {number} · gerado em {dateBR(createdAt)} · proposta {protocol}
        </p>
      </footer>
    </article>
  );
}
