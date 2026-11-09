import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  Download, 
  Phone, 
  Mail,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadsKanban } from "@/components/admin/LeadsKanban";
import { LeadCreateDialog } from "@/components/admin/LeadCreateDialog";

interface Lead {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email: string;
  niche: string;
  status: string;
  city: string | null;
}

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "novo", label: "Novo" },
  { value: "em_contato", label: "Em Contato" },
  { value: "proposta_enviada", label: "Proposta Enviada" },
  { value: "fechado", label: "Fechado" },
  { value: "perdido", label: "Perdido" },
];

const nicheOptions = [
  { value: "all", label: "Todos" },
  { value: "casamento", label: "Casamento" },
  { value: "eventos", label: "Eventos" },
  { value: "clinicas", label: "Clínicas" },
  { value: "marcas", label: "Marcas & Ads" },
  { value: "food", label: "Food" },
  { value: "imobiliario", label: "Imobiliário" },
  { value: "outros", label: "Outros" },
];

const statusColors: Record<string, string> = {
  novo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  em_contato: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  proposta_enviada: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  fechado: "bg-green-500/20 text-green-400 border-green-500/30",
  perdido: "bg-red-500/20 text-red-400 border-red-500/30",
};

const PAGE_SIZE = 10;

export default function LeadsList() {
  const navigate = useNavigate();
  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["leads-list", statusFilter, nicheFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("id, created_at, name, phone, email, niche, status, city", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (nicheFilter !== "all") {
        query = query.eq("niche", nicheFilter);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      return { leads: data as Lead[], count: count || 0 };
    },
  });

  const leads = data?.leads || [];
  const totalCount = data?.count || 0;

  const filteredLeads = leads.filter((lead) => {
    const searchLower = search.toLowerCase();
    return (
      lead.name.toLowerCase().includes(searchLower) ||
      lead.email.toLowerCase().includes(searchLower) ||
      lead.phone.includes(search)
    );
  });

  const exportCSV = async () => {
    // Fetch all leads for export (not just paginated)
    let query = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    if (nicheFilter !== "all") {
      query = query.eq("niche", nicheFilter);
    }

    const { data: allLeads } = await query;

    if (!allLeads) return;

    const headers = ["Data", "Nome", "Telefone", "Email", "Nicho", "Cidade", "Status"];
    const rows = allLeads.map((lead) => [
      format(new Date(lead.created_at), "dd/MM/yyyy HH:mm"),
      lead.name,
      lead.phone,
      lead.email,
      lead.niche,
      lead.city || "",
      lead.status || "novo",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leads_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl tracking-wide">Leads</h1>
            <p className="text-muted-foreground mt-1">
              {totalCount} leads encontrados
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LeadCreateDialog onCreated={(id) => navigate(`/admin/leads/${id}`)} />
            {/* View Toggle */}
            <Tabs value={view} onValueChange={(v) => setView(v as "list" | "kanban")}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  Lista
                </TabsTrigger>
                <TabsTrigger value="kanban" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Kanban
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={exportCSV} variant="outline" className="w-fit">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {view === "kanban" ? (
          <LeadsKanban />
        ) : (
          <>
            {/* Filters */}
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, email ou telefone..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 bg-background border-border/50"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px] bg-background border-border/50">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={nicheFilter} onValueChange={setNicheFilter}>
                    <SelectTrigger className="w-full md:w-[180px] bg-background border-border/50">
                      <SelectValue placeholder="Nicho" />
                    </SelectTrigger>
                    <SelectContent>
                      {nicheOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-border/50">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Data</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden md:table-cell">Contato</TableHead>
                      <TableHead className="hidden lg:table-cell">Nicho</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="border-border/50">
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                          <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum lead encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map((lead) => (
                        <TableRow 
                          key={lead.id} 
                          className="border-border/50 cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/admin/leads/${lead.id}`)}
                        >
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(lead.created_at), "dd/MM/yy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{lead.name}</p>
                              {lead.city && (
                                <p className="text-xs text-muted-foreground">{lead.city}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-3">
                              <a
                                href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-green-500 transition-colors"
                              >
                                <Phone className="h-4 w-4" />
                              </a>
                              <a
                                href={`mailto:${lead.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-gold transition-colors"
                              >
                                <Mail className="h-4 w-4" />
                              </a>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell capitalize">
                            {lead.niche}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={statusColors[lead.status] || ""}
                            >
                              {lead.status?.replace("_", " ") || "novo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/leads/${lead.id}`);
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Página {page + 1} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
