import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, ExternalLink, FileSignature, Loader2, Search, Undo2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSetContractStatus } from "@/hooks/useContracts";

type ContractRow = {
  id: string;
  number: string;
  token: string;
  status: string;
  created_at: string;
  signed_at: string | null;
  client_id: string | null;
  project_id: string | null;
  content: {
    client?: { name?: string };
    total?: number;
    service?: { package?: { name?: string } };
  } | null;
  clients: { name: string } | null;
};

const STATUS: Record<string, { label: string; className: string }> = {
  generated: {
    label: "Aguardando assinatura",
    className: "bg-gold/15 text-gold border-gold/30",
  },
  signed: {
    label: "Assinado",
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-muted text-muted-foreground border-border",
  },
};

const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);

const dateBR = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
};

export default function ContractsList() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const setStatus = useSetContractStatus();

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async (): Promise<ContractRow[]> => {
      const { data, error } = await supabase
        .from("contracts")
        .select(
          "id, number, token, status, created_at, signed_at, client_id, project_id, content, clients(name)",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as ContractRow[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contracts ?? [];

    return (contracts ?? []).filter((contract) => {
      const name = contract.content?.client?.name ?? contract.clients?.name ?? "";
      return (
        contract.number.toLowerCase().includes(term) ||
        name.toLowerCase().includes(term)
      );
    });
  }, [contracts, search]);

  const publicUrl = (token: string) => `${window.location.origin}/contrato/${token}`;

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(publicUrl(token));
      toast({ title: "Link copiado", description: "Cole no WhatsApp ou e-mail do cliente." });
    } catch {
      toast({
        title: "Não foi possível copiar",
        description: publicUrl(token),
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">Contratos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerados automaticamente quando o cliente aceita a proposta.
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou cliente"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-lg border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-gold" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
              <FileSignature className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? "Nenhum contrato encontrado para essa busca."
                  : "Nenhum contrato ainda. Ele aparece aqui quando uma proposta for aceita."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pacote</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gerado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((contract) => {
                  const status = STATUS[contract.status] ?? STATUS.generated;
                  const clientName =
                    contract.content?.client?.name ?? contract.clients?.name ?? "—";

                  return (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium tabular-nums">
                        {contract.number}
                      </TableCell>
                      <TableCell>{clientName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {contract.content?.service?.package?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {brl(Number(contract.content?.total ?? 0))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.className}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {dateBR(contract.created_at)}
                        {contract.signed_at && (
                          <span className="block text-[11px] text-green-400">
                            assinado {dateBR(contract.signed_at)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {contract.status === "signed" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Desfazer assinatura"
                              disabled={setStatus.isPending}
                              onClick={() =>
                                setStatus.mutate({
                                  contract: {
                                    id: contract.id,
                                    number: contract.number,
                                    clientId: contract.client_id,
                                    projectId: contract.project_id,
                                  },
                                  status: "generated",
                                })
                              }
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Marcar como assinado"
                              className="text-green-400 hover:text-green-300"
                              disabled={setStatus.isPending}
                              onClick={() =>
                                setStatus.mutate({
                                  contract: {
                                    id: contract.id,
                                    number: contract.number,
                                    clientId: contract.client_id,
                                    projectId: contract.project_id,
                                  },
                                  status: "signed",
                                })
                              }
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Copiar link"
                            onClick={() => copyLink(contract.token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Abrir contrato">
                            <a
                              href={publicUrl(contract.token)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
