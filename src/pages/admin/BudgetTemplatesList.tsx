import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Eye, EyeOff, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const filterOptions = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

export default function BudgetTemplatesList() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["budget_templates", filter],
    queryFn: async () => {
      let query = supabase
        .from("budget_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "active") {
        query = query.eq("is_active", true);
      } else if (filter === "inactive") {
        query = query.eq("is_active", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("budget_templates")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_templates"] });
      toast({ title: "Status atualizado" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (template: any) => {
      const newTemplate = {
        name: `Cópia de ${template.name}`,
        slug: `${template.slug}-copia-${Date.now()}`,
        niche: template.niche,
        title: template.title,
        subtitle: template.subtitle,
        intro_text: template.intro_text,
        hero_badge: template.hero_badge,
        portfolio_url: template.portfolio_url,
        whatsapp_message: template.whatsapp_message,
        content: template.content,
        is_active: false,
      };

      const { data, error } = await supabase
        .from("budget_templates")
        .insert([newTemplate])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["budget_templates"] });
      toast({ title: "Modelo duplicado com sucesso!" });
      navigate(`/admin/orcamentos/${data.id}/edit`);
    },
    onError: (error) => {
      console.error(error);
      toast({ title: "Erro ao duplicar modelo", variant: "destructive" });
    },
  });

  const filteredTemplates = templates?.filter((tpl) =>
    tpl.name.toLowerCase().includes(search.toLowerCase()) ||
    tpl.slug.toLowerCase().includes(search.toLowerCase()) ||
    tpl.niche.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Modelos de Orçamento</h1>
            <p className="text-muted-foreground">Gerencie os templates de orçamentos por nicho</p>
          </div>
          <Button asChild>
            <Link to="/admin/orcamentos/new">
              <Plus className="w-4 h-4 mr-2" />
              Novo Modelo
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, slug ou nicho..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Nicho</TableHead>
                <TableHead className="hidden md:table-cell">Slug</TableHead>
                <TableHead className="hidden sm:table-cell">Pacotes</TableHead>
                <TableHead className="hidden lg:table-cell">Atualizado em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredTemplates?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum modelo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates?.map((tpl) => {
                  // Extract package count from content JSONB safely
                  const content = tpl.content as any;
                  const packagesCount = Array.isArray(content?.packages) ? content.packages.length : 0;
                  
                  return (
                    <TableRow key={tpl.id}>
                      <TableCell className="font-medium">
                        {tpl.name}
                      </TableCell>
                      <TableCell className="capitalize">
                        {tpl.niche}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {tpl.slug}
                        </code>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {packagesCount}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {new Date(tpl.updated_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tpl.is_active ? "default" : "secondary"}
                          className={cn(
                            tpl.is_active && "bg-green-600 hover:bg-green-700"
                          )}
                        >
                          {tpl.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => duplicateTemplate.mutate(tpl)}
                            title="Duplicar"
                          >
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              toggleActive.mutate({
                                id: tpl.id,
                                is_active: !tpl.is_active,
                              })
                            }
                            title={tpl.is_active ? "Desativar" : "Ativar"}
                          >
                            {tpl.is_active ? (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/admin/orcamentos/${tpl.id}/edit`}>
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
