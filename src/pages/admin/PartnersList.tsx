import { useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Handshake,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import {
  useAllPartners,
  useDeletePartner,
  Partner,
  PartnershipType,
  PARTNERSHIP_LABELS,
} from "@/hooks/usePartners";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<PartnershipType, string> = {
  indicacao: "border-gold/40 text-gold",
  permuta: "border-purple-500/40 text-purple-400",
  fornecedor: "border-blue-500/40 text-blue-400",
  cerimonial: "border-pink-500/40 text-pink-400",
  outro: "border-border text-muted-foreground",
};

export default function PartnersList() {
  const { role } = useAuth();
  const { data: partners, isLoading } = useAllPartners();
  const deletePartner = useDeletePartner();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);

  const filteredPartners = partners?.filter((partner) => {
    if (typeFilter !== "todos" && partner.partnership_type !== typeFilter) {
      return false;
    }
    const term = search.toLowerCase();
    return (
      partner.name.toLowerCase().includes(term) ||
      (partner.trade_name || "").toLowerCase().includes(term) ||
      (partner.contact_name || "").toLowerCase().includes(term) ||
      (partner.email || "").toLowerCase().includes(term) ||
      (partner.category || "").toLowerCase().includes(term)
    );
  });

  const handleDelete = async () => {
    if (!partnerToDelete) return;
    await deletePartner.mutateAsync(partnerToDelete.id);
    setDeleteDialogOpen(false);
    setPartnerToDelete(null);
  };

  const confirmDelete = (partner: Partner) => {
    setPartnerToDelete(partner);
    setDeleteDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-wide">Parceiros</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Indicações, permutas, fornecedores e cerimonialistas. Não são clientes.
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/partners/new">
              <Plus className="h-4 w-4 mr-2" />
              Novo parceiro
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, contato ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Tipo de parceria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {(Object.keys(PARTNERSHIP_LABELS) as PartnershipType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {PARTNERSHIP_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : !filteredPartners?.length ? (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum parceiro encontrado</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search || typeFilter !== "todos"
                ? "Tente ajustar o filtro ou a busca"
                : "Cadastre cerimonialistas, fornecedores e parceiros de indicação"}
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Parceiro</TableHead>
                  <TableHead className="hidden md:table-cell w-[130px]">Parceria</TableHead>
                  <TableHead className="hidden lg:table-cell w-[140px]">Contato</TableHead>
                  <TableHead className="hidden lg:table-cell w-[100px]">Status</TableHead>
                  <TableHead className="text-center w-[70px]">Ordem</TableHead>
                  <TableHead className="text-right w-[110px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted/20 rounded flex items-center justify-center overflow-hidden shrink-0">
                          {partner.logo_url ? (
                            <img
                              src={partner.logo_url}
                              alt={partner.name}
                              className="max-h-8 max-w-9 object-contain"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-muted-foreground">
                              {partner.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{partner.name}</div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                            {partner.email && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {partner.email}
                              </span>
                            )}
                            {partner.phone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {partner.phone}
                              </span>
                            )}
                            {partner.website_url && (
                              <a
                                href={partner.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-gold flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Site
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className={cn(TYPE_STYLES[partner.partnership_type])}
                      >
                        {PARTNERSHIP_LABELS[partner.partnership_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {partner.contact_name || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge
                        variant="outline"
                        className={
                          partner.status === "ativo"
                            ? "bg-green-500/15 text-green-400 border-green-500/30"
                            : "bg-muted text-muted-foreground border-border"
                        }
                      >
                        {partner.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {partner.display_order}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" asChild>
                          <Link to={`/admin/partners/${partner.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        {role === "admin" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => confirmDelete(partner)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir parceiro?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{partnerToDelete?.name}"? Esta ação
                não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
