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
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Search,
  Pencil,
  Eye,
  Trash2,
  ExternalLink,
  Loader2,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import {
  useAllClients,
  useUpdateClient,
  useDeleteClient,
  useDeleteClientLogo,
  Client,
} from "@/hooks/useClients";
import { useAllNiches } from "@/hooks/useNiches";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  ativo: "bg-green-500/15 text-green-400 border-green-500/30",
  inativo: "bg-muted text-muted-foreground border-border",
  legado: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

export default function ClientsList() {
  const { role } = useAuth();
  const { data: clients, isLoading } = useAllClients();
  const { data: niches } = useAllNiches();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const deleteClientLogo = useDeleteClientLogo();

  const [search, setSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const nicheName = (id: string | null) =>
    niches?.find((n) => n.id === id)?.name;

  const filteredClients = clients?.filter((client) => {
    const term = search.toLowerCase();
    return (
      client.name.toLowerCase().includes(term) ||
      (client.trade_name || "").toLowerCase().includes(term) ||
      (client.email || "").toLowerCase().includes(term) ||
      (client.category || "").toLowerCase().includes(term)
    );
  });

  const handleToggleSite = async (client: Client) => {
    // show_on_site é a fonte da verdade; is_featured fica em sincronia
    await updateClient.mutateAsync({
      id: client.id,
      show_on_site: !client.show_on_site,
      is_featured: !client.show_on_site,
    });
  };

  const handleToggleActive = async (client: Client) => {
    await updateClient.mutateAsync({
      id: client.id,
      is_active: !client.is_active,
    });
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;

    if (clientToDelete.logo_url) {
      await deleteClientLogo.mutateAsync(clientToDelete.logo_url);
    }

    await deleteClient.mutateAsync(clientToDelete.id);
    setDeleteDialogOpen(false);
    setClientToDelete(null);
  };

  const confirmDelete = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-wide">Clientes</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Quem contrata seus serviços. Parceiros ficam em um menu separado.
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/clients/new">
              <Plus className="h-4 w-4 mr-2" />
              Novo cliente
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : !filteredClients?.length ? (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search
                ? "Tente ajustar a busca"
                : "Comece adicionando seu primeiro cliente"}
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden lg:table-cell w-[140px]">Nicho</TableHead>
                  <TableHead className="hidden lg:table-cell w-[110px]">Status</TableHead>
                  <TableHead className="text-center w-[90px]">No site</TableHead>
                  <TableHead className="text-center w-[80px]">Ativo</TableHead>
                  <TableHead className="text-center w-[70px]">Ordem</TableHead>
                  <TableHead className="text-right w-[110px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-muted/20 rounded flex items-center justify-center overflow-hidden shrink-0">
                          {client.logo_url ? (
                            <img
                              src={client.logo_url}
                              alt={client.name}
                              className="max-h-9 max-w-11 object-contain"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-muted-foreground">
                              {client.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            <Link
                              to={`/admin/clients/${client.id}`}
                              className="hover:text-gold transition-colors"
                            >
                              {client.name}
                            </Link>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                            {client.email && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {client.email}
                              </span>
                            )}
                            {client.phone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {client.phone}
                              </span>
                            )}
                            {client.website_url && (
                              <a
                                href={client.website_url}
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
                    <TableCell className="hidden lg:table-cell">
                      {nicheName(client.niche_id) ? (
                        <span className="text-sm text-muted-foreground">
                          {nicheName(client.niche_id)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge
                        variant="outline"
                        className={cn("capitalize", STATUS_STYLES[client.status])}
                      >
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={client.show_on_site}
                        onCheckedChange={() => handleToggleSite(client)}
                        disabled={updateClient.isPending || !client.logo_url}
                        title={
                          client.logo_url
                            ? "Exibir logo na Home"
                            : "Cadastre uma logo para exibir"
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={client.is_active}
                        onCheckedChange={() => handleToggleActive(client)}
                        disabled={updateClient.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {client.display_order}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" asChild title="Ver ficha do cliente">
                          <Link to={`/admin/clients/${client.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button size="icon" variant="ghost" asChild title="Editar">
                          <Link to={`/admin/clients/${client.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        {role === "admin" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => confirmDelete(client)}
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
              <AlertDialogTitle>Excluir cadastro?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{clientToDelete?.name}"? Projetos e
                propostas vinculados também serão afetados. Esta ação não pode ser
                desfeita.
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
