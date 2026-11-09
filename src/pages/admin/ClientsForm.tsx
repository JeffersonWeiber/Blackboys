import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Upload, X, ImageIcon } from "lucide-react";
import {
  useClient,
  useCreateClient,
  useUpdateClient,
  useUploadClientLogo,
  useDeleteClientLogo,
} from "@/hooks/useClients";
import { useAllNiches } from "@/hooks/useNiches";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(120, "Máximo 120 caracteres"),
  trade_name: z.string().max(120, "Máximo 120 caracteres").optional(),
  document: z.string().max(20, "Máximo 20 caracteres").optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().max(20, "Máximo 20 caracteres").optional(),
  city: z.string().max(80, "Máximo 80 caracteres").optional(),
  state: z.string().max(2, "Use a sigla (ex: PR)").optional(),
  address: z.string().max(200, "Máximo 200 caracteres").optional(),
  website_url: z.string().url("URL inválida").optional().or(z.literal("")),
  category: z.string().max(50, "Máximo 50 caracteres").optional(),
  niche_id: z.string().optional(),
  notes: z.string().max(2000, "Máximo 2000 caracteres").optional(),
  status: z.enum(["ativo", "inativo", "legado"]),
  show_on_site: z.boolean(),
  is_active: z.boolean(),
  display_order: z.coerce.number().min(0, "Valor mínimo é 0"),
});

type FormData = z.infer<typeof formSchema>;

export default function ClientsForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: client, isLoading: isLoadingClient } = useClient(id);
  const { data: niches } = useAllNiches();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const uploadLogo = useUploadClientLogo();
  const deleteLogo = useDeleteClientLogo();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      trade_name: "",
      document: "",
      email: "",
      phone: "",
      city: "",
      state: "",
      address: "",
      website_url: "",
      category: "",
      niche_id: "",
      notes: "",
      status: "ativo",
      show_on_site: false,
      is_active: true,
      display_order: 0,
    },
  });

  // Load existing client data
  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        trade_name: client.trade_name || "",
        document: client.document || "",
        email: client.email || "",
        phone: client.phone || "",
        city: client.city || "",
        state: client.state || "",
        address: client.address || "",
        website_url: client.website_url || "",
        category: client.category || "",
        niche_id: client.niche_id || "",
        notes: client.notes || "",
        status: client.status,
        show_on_site: client.show_on_site,
        is_active: client.is_active,
        display_order: client.display_order,
      });
      setExistingLogoUrl(client.logo_url);
    }
  }, [client, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/svg+xml", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      form.setError("name", {
        message: "Formato inválido. Use SVG, PNG ou WebP",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      form.setError("name", { message: "Arquivo muito grande. Máximo 2MB" });
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (!isEdit) {
      setExistingLogoUrl(null);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      let logoUrl = existingLogoUrl;

      if (logoFile) {
        if (existingLogoUrl) {
          await deleteLogo.mutateAsync(existingLogoUrl);
        }
        logoUrl = await uploadLogo.mutateAsync(logoFile);
      }

      // Logo só é obrigatória para quem aparece na parede do site
      if (data.show_on_site && !logoUrl) {
        form.setError("name", {
          message: "Para exibir no site é necessário cadastrar uma logo",
        });
        return;
      }

      const clientData = {
        name: data.name,
        trade_name: data.trade_name || null,
        document: data.document || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state ? data.state.toUpperCase() : null,
        website_url: data.website_url || null,
        category: data.category || null,
        niche_id: data.niche_id || null,
        notes: data.notes || null,
        status: data.status,
        show_on_site: data.show_on_site,
        // mantém is_featured em sincronia com a parede do site
        is_featured: data.show_on_site,
        is_active: data.is_active,
        display_order: data.display_order,
        logo_url: logoUrl,
      };

      if (isEdit && id) {
        await updateClient.mutateAsync({ id, ...clientData });
      } else {
        await createClient.mutateAsync(clientData);
      }

      navigate("/admin/clients");
    } catch (error) {
      console.error("Error saving client:", error);
    }
  };

  const isSubmitting =
    createClient.isPending || updateClient.isPending || uploadLogo.isPending;

  if (isEdit && isLoadingClient) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/clients")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold tracking-wide">
            {isEdit ? "Editar cliente" : "Novo cliente"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Dados de contato alimentam propostas e contratos automaticamente.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Identificação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Identificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo ou empresa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="trade_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome fantasia</FormLabel>
                        <FormControl>
                          <Input placeholder="Como é conhecido" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="document"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF / CNPJ</FormLabel>
                        <FormControl>
                          <Input placeholder="000.000.000-00" {...field} />
                        </FormControl>
                        <FormDescription>Usado no contrato</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Segmento</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Tecnologia, Saúde..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="cliente@email.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp</FormLabel>
                        <FormControl>
                          <Input placeholder="(45) 99999-9999" {...field} />
                        </FormControl>
                        <FormDescription>
                          Usado no botão "enviar proposta"
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="niche_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nicho principal</FormLabel>
                        <Select
                          value={field.value || "none"}
                          onValueChange={(v) =>
                            field.onChange(v === "none" ? "" : v)
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {niches?.map((niche) => (
                              <SelectItem key={niche.id} value={niche.id}>
                                {niche.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua, número, bairro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF</FormLabel>
                        <FormControl>
                          <Input placeholder="PR" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Cascavel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações internas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Preferências, histórico, detalhes de negociação..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Logo e exibição */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Logo e exibição no site</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <FormLabel>Logo</FormLabel>
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "w-32 h-20 rounded-lg border-2 border-dashed border-border",
                        "flex items-center justify-center bg-muted/20 relative overflow-hidden"
                      )}
                    >
                      {logoPreview || existingLogoUrl ? (
                        <>
                          <img
                            src={logoPreview || existingLogoUrl || ""}
                            alt="Preview"
                            className="max-h-16 max-w-28 object-contain"
                          />
                          <button
                            type="button"
                            onClick={removeLogo}
                            className="absolute top-1 right-1 p-1 bg-background/80 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1">
                      <label
                        htmlFor="logo-upload"
                        className={cn(
                          "flex items-center justify-center gap-2 px-4 py-3",
                          "border border-border rounded-lg cursor-pointer",
                          "hover:bg-muted/50 transition-colors",
                          "text-sm text-muted-foreground"
                        )}
                      >
                        <Upload className="h-4 w-4" />
                        Escolher arquivo
                      </label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept=".svg,.png,.webp,image/svg+xml,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Opcional. Obrigatória apenas para exibir na Home. SVG, PNG
                        ou WebP, máximo 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="show_on_site"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Exibir logo na Home
                        </FormLabel>
                        <FormDescription>
                          Aparece na seção "Alguns de nossos clientes"
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Situação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Situação do cadastro</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                            <SelectItem value="legado">
                              Legado (só logo, sem contato)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="display_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ordem de exibição</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormDescription>
                          Menor número aparece primeiro
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Ativo</FormLabel>
                        <FormDescription>
                          Pausar sem excluir
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/clients")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isEdit ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
}
