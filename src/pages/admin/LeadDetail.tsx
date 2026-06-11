import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Tag,
  MessageSquare,
  Link2,
  Save,
  Trash2,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BudgetLeadActions } from "@/components/admin/BudgetLeadActions";

interface Lead {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  phone_e164: string | null;
  email: string;
  niche: string;
  city: string | null;
  message: string;
  source: string | null;
  source_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  status: string;
  notes: string | null;
  consent: boolean;
}

const statusOptions = [
  { value: "novo", label: "Novo" },
  { value: "em_contato", label: "Em Contato" },
  { value: "proposta_enviada", label: "Proposta Enviada" },
  { value: "fechado", label: "Fechado" },
  { value: "perdido", label: "Perdido" },
];

const statusColors: Record<string, string> = {
  novo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  em_contato: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  proposta_enviada: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  fechado: "bg-green-500/20 text-green-400 border-green-500/30",
  perdido: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useAuth();
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (id) fetchLead();
  }, [id]);

  const fetchLead = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate("/admin/leads");
        return;
      }

      setLead(data);
      setStatus(data.status);
      setNotes(data.notes || "");
    } catch (error) {
      console.error("Error fetching lead:", error);
      toast({
        title: "Erro ao carregar lead",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("leads")
        .update({ status, notes })
        .eq("id", lead.id);

      if (error) throw error;

      toast({
        title: "Lead atualizado",
        description: "As alterações foram salvas.",
      });
      
      setLead({ ...lead, status, notes });
    } catch (error) {
      console.error("Error updating lead:", error);
      toast({
        title: "Erro ao salvar",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lead || role !== "admin") return;

    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", lead.id);

      if (error) throw error;

      toast({
        title: "Lead excluído",
      });
      navigate("/admin/leads");
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast({
        title: "Erro ao excluir",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!lead) return null;

  const whatsappUrl = `https://wa.me/55${lead.phone.replace(/\D/g, "")}`;
  const hasUtmData = lead.utm_source || lead.utm_medium || lead.utm_campaign;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/leads")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-2xl tracking-wide">{lead.name}</h1>
            <p className="text-sm text-muted-foreground">
              Recebido em {format(new Date(lead.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <Badge variant="outline" className={statusColors[lead.status] || ""}>
            {lead.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Info */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Informações de Contato</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Phone className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{lead.phone}</p>
                  </div>
                </a>
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Mail className="h-5 w-5 text-gold" />
                  <div>
                    <p className="text-sm text-muted-foreground">E-mail</p>
                    <p className="font-medium">{lead.email}</p>
                  </div>
                </a>
                {lead.city && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cidade</p>
                      <p className="font-medium">{lead.city}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Tag className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Nicho</p>
                    <p className="font-medium capitalize">{lead.niche}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Mensagem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {lead.message}
                </p>
              </CardContent>
            </Card>

            {/* Tracking Info */}
            {(hasUtmData || lead.source_page || lead.source) && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Origem e Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {lead.source && (
                      <div>
                        <p className="text-sm text-muted-foreground">Como conheceu</p>
                        <p className="font-medium capitalize">{lead.source}</p>
                      </div>
                    )}
                    {lead.source_page && (
                      <div>
                        <p className="text-sm text-muted-foreground">Página de origem</p>
                        <p className="font-medium">{lead.source_page}</p>
                      </div>
                    )}
                  </div>
                  {hasUtmData && (
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-sm text-muted-foreground mb-2">UTMs</p>
                      <div className="flex flex-wrap gap-2">
                        {lead.utm_source && (
                          <Badge variant="secondary">source: {lead.utm_source}</Badge>
                        )}
                        {lead.utm_medium && (
                          <Badge variant="secondary">medium: {lead.utm_medium}</Badge>
                        )}
                        {lead.utm_campaign && (
                          <Badge variant="secondary">campaign: {lead.utm_campaign}</Badge>
                        )}
                        {lead.utm_content && (
                          <Badge variant="secondary">content: {lead.utm_content}</Badge>
                        )}
                        {lead.utm_term && (
                          <Badge variant="secondary">term: {lead.utm_term}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Actions */}
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Gerenciar Lead</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="bg-background border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notas Internas</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicione observações sobre este lead..."
                    rows={4}
                    className="bg-background border-border/50 resize-none"
                  />
                </div>

                <Button 
                  onClick={handleSave} 
                  className="w-full bg-gold hover:bg-gold-light"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>

                {role === "admin" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Lead
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O lead será removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardContent>
            </Card>

            {/* Budget Actions */}
            <BudgetLeadActions lead={lead} onStatusUpdate={(newStatus) => {
              setStatus(newStatus);
              setLead(prev => prev ? { ...prev, status: newStatus } : null);
            }} />

            {/* Quick Actions */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <Phone className="h-4 w-4 mr-2 text-green-500" />
                    Abrir WhatsApp
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="h-4 w-4 mr-2 text-gold" />
                    Enviar E-mail
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
