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
  usePartner,
  useCreatePartner,
  useUpdatePartner,
  PartnershipType,
} from "@/hooks/usePartners";
import { useUploadClientLogo, useDeleteClientLogo } from "@/hooks/useClients";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(120, "Máximo 120 caracteres"),
  trade_name: z.string().max(120, "Máximo 120 caracteres").optional(),
  contact_name: z.string().max(120, "Máximo 120 caracteres").optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().max(20, "Máximo 20 caracteres").optional(),
  website_url: z.string().url("URL inválida").optional().or(z.literal("")),
  category: z.string().max(50, "Máximo 50 caracteres").optional(),
  partnership_type: z.enum([
    "indicacao",
    "permuta",
    "fornecedor",
    "cerimonial",
    "outro",
  ]),
  commission_notes: z.string().max(1000, "Máximo 1000 caracteres").optional(),
  notes: z.string().max(2000, "Máximo 2000 caracteres").optional(),
  status: z.enum(["ativo", "inativo"]),
  display_order: z.coerce.number().min(0, "Valor mínimo é 0"),
});

type FormData = z.infer<typeof formSchema>;

export default function PartnersForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: partner, isLoading: isLoadingPartner } = usePartner(id);
  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();
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
      contact_name: "",
      email: "",
      phone: "",
      website_url: "",
      category: "",
      partnership_type: "indicacao",
      commission_notes: "",
      notes: "",
      status: "ativo",
      display_order: 0,
    },
  });

  useEffect(() => {
    if (partner) {
      form.reset({
        name: partner.name,
        trade_name: partner.trade_name || "",
        contact_name: partner.contact_name || "",
        email: partner.email || "",
        phone: partner.phone || "",
        website_url: partner.website_url || "",
        category: partner.category || "",
        partnership_type: partner.partnership_type,
        commission_notes: partner.commission_notes || "",
        notes: partner.notes || "",
        status: partner.status,
        display_order: partner.display_order,
      });
      setExistingLogoUrl(partner.logo_url);
    }
  }, [partner, form]);

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
    if (!isEdit) setExistingLogoUrl(null);
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

      const partnerData = {
        name: data.name,
        trade_name: data.trade_name || null,
        contact_name: data.contact_name || null,
        email: data.email || null,
        phone: data.phone || null,
        website_url: data.website_url || null,
        category: data.category || null,
        partnership_type: data.partnership_type as PartnershipType,
        commission_notes: data.commission_notes || null,
        notes: data.notes || null,
        status: data.status,
        display_order: data.display_order,
        logo_url: logoUrl,
      };

      if (isEdit && id) {
        await updatePartner.mutateAsync({ id, ...partnerData });
      } else {
        await createPartner.mutateAsync(partnerData);
      }

      navigate("/admin/partners");
    } catch (error) {
      console.error("Error saving partner:", error);
    }
  };

  const isSubmitting =
    createPartner.isPending || updatePartner.isPending || uploadLogo.isPending;

  if (isEdit && isLoadingPartner) {
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
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/partners")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold tracking-wide">
            {isEdit ? "Editar parceiro" : "Novo parceiro"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Parceiro não é cliente: aqui ficam indicações, permutas, fornecedores e
            cerimonialistas.
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
                          <Input placeholder="Nome do parceiro" {...field} />
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
                    name="partnership_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de parceria</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="indicacao">Indicação</SelectItem>
                            <SelectItem value="permuta">Permuta</SelectItem>
                            <SelectItem value="fornecedor">Fornecedor</SelectItem>
                            <SelectItem value="cerimonial">Cerimonial</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
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
                          <Input placeholder="Ex: Cerimonial, Buffet..." {...field} />
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
                    name="contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pessoa de contato</FormLabel>
                        <FormControl>
                          <Input placeholder="Quem atende" {...field} />
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="parceiro@email.com"
                            {...field}
                          />
                        </FormControl>
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
                </div>
              </CardContent>
            </Card>

            {/* Acordo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Acordo comercial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <FormField
                  control={form.control}
                  name="commission_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comissão / condição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: 10% sobre o valor fechado, pago após 2ª parcela"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Como funciona a troca entre vocês
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Histórico, quem indicou, detalhes..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Logo</CardTitle>
              </CardHeader>
              <CardContent>
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
                      htmlFor="partner-logo-upload"
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
                      id="partner-logo-upload"
                      type="file"
                      accept=".svg,.png,.webp,image/svg+xml,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Opcional. SVG, PNG ou WebP, máximo 2MB.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Situação */}
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
                        <FormLabel>Situação</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
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
                        <FormLabel>Ordem</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormDescription>Menor número aparece primeiro</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/partners")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
}
