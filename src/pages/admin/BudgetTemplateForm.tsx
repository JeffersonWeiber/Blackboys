import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Types
const packageItemSchema = z.object({
  value: z.string().min(1, "Item obrigatório"),
});

const packageSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome é obrigatório"),
  tagline: z.string().optional(),
  price: z.coerce.number(),
  featured: z.boolean().default(false),
  items: z.array(packageItemSchema),
});

const formatSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
});

const addonSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  price: z.coerce.number(),
});

const sectionSchema = z.object({
  type: z.string().default("text"),
  title: z.string().min(1, "Título é obrigatório"),
  body: z.string().optional(),
});

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  slug: z.string().min(1, "Slug é obrigatório"),
  niche: z.string().min(1, "Nicho é obrigatório"),
  title: z.string().min(1, "Título é obrigatório"),
  subtitle: z.string().optional(),
  hero_badge: z.string().optional(),
  intro_text: z.string().optional(),
  portfolio_url: z.string().optional(),
  whatsapp_message: z.string().optional(),
  is_active: z.boolean().default(true),
  packages: z.array(packageSchema),
  formats: z.array(formatSchema),
  addons: z.array(addonSchema),
  sections: z.array(sectionSchema),
});

type FormValues = z.infer<typeof formSchema>;

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function BudgetTemplateForm() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      niche: "",
      title: "",
      subtitle: "",
      hero_badge: "",
      intro_text: "",
      portfolio_url: "",
      whatsapp_message: "",
      is_active: true,
      packages: [],
      formats: [],
      addons: [],
      sections: [],
    },
  });

  const { fields: packageFields, append: appendPackage, remove: removePackage } = useFieldArray({
    control: form.control,
    name: "packages",
  });

  const { fields: formatFields, append: appendFormat, remove: removeFormat } = useFieldArray({
    control: form.control,
    name: "formats",
  });

  const { fields: addonFields, append: appendAddon, remove: removeAddon } = useFieldArray({
    control: form.control,
    name: "addons",
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control: form.control,
    name: "sections",
  });

  const watchedName = form.watch("name");
  useEffect(() => {
    if (!isEditing && watchedName) {
      const slug = generateSlug(watchedName);
      form.setValue("slug", slug, { shouldValidate: true });
    }
  }, [watchedName, isEditing, form]);

  const { data: template, isLoading } = useQuery({
    queryKey: ["budget_template", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("budget_templates")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (template) {
      const content = template.content as any;
      
      form.reset({
        name: template.name,
        slug: template.slug,
        niche: template.niche,
        title: template.title,
        subtitle: template.subtitle || "",
        hero_badge: template.hero_badge || "",
        intro_text: template.intro_text || "",
        portfolio_url: template.portfolio_url || "",
        whatsapp_message: template.whatsapp_message || "",
        is_active: template.is_active,
        packages: content?.packages?.map((p: any) => ({
          ...p,
          items: p.items?.map((item: string) => ({ value: item })) || []
        })) || [],
        formats: content?.formats || [],
        addons: content?.addons || [],
        sections: content?.sections || [],
      });
    }
  }, [template, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Re-map items array of objects back to array of strings
      const content = {
        packages: values.packages.map(p => ({
          ...p,
          items: p.items.map(item => item.value)
        })),
        formats: values.formats,
        addons: values.addons,
        sections: values.sections,
      };

      const payload = {
        name: values.name,
        slug: values.slug,
        niche: values.niche,
        title: values.title,
        subtitle: values.subtitle,
        hero_badge: values.hero_badge,
        intro_text: values.intro_text,
        portfolio_url: values.portfolio_url,
        whatsapp_message: values.whatsapp_message,
        is_active: values.is_active,
        content: content,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("budget_templates")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("budget_templates").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_templates"] });
      toast({ title: isEditing ? "Modelo atualizado" : "Modelo criado" });
      navigate("/admin/orcamentos");
    },
    onError: (error: Error) => {
      console.error(error);
      if (error.message.includes("duplicate key")) {
        toast({ title: "Esse slug já existe", variant: "destructive" });
      } else {
        toast({ title: "Erro ao salvar", variant: "destructive" });
      }
    },
  });

  const onSubmit = (values: FormValues) => {
    saveMutation.mutate(values);
  };

  if (isEditing && isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/orcamentos")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">
              {isEditing ? "Editar Modelo de Orçamento" : "Novo Modelo de Orçamento"}
            </h1>
            <p className="text-muted-foreground">
              Configure os detalhes e pacotes deste modelo.
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* INFORMAÇÕES GERAIS */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome (Uso Interno) *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Casamento Premium" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug *</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: casamento-premium" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="niche"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nicho *</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: casamento" {...field} />
                        </FormControl>
                        <FormDescription>
                          Deve corresponder exatamente ao nicho dos leads
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hero_badge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Badge do Hero</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Blackboy Films | Casamentos" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* TEXTOS PÚBLICOS */}
            <Card>
              <CardHeader>
                <CardTitle>Textos Visíveis (Página do Orçamento)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título Principal *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Orçamento de Filmagem para Casamento" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subtitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtítulo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Que essa memória seja eterna" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="intro_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto de Introdução</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Texto explicativo inicial..." rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="portfolio_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Portfólio (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Se preenchido, exibirá um botão extra no orçamento
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* WHATSAPP */}
            <Card>
              <CardHeader>
                <CardTitle>Mensagem de WhatsApp</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="whatsapp_message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template da Mensagem</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Oi, {{client_name}}! Aqui está: {{budget_url}}" 
                          rows={3} 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Variáveis: {'{{client_name}}'}, {'{{budget_url}}'}, {'{{template_name}}'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* PACOTES */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pacotes / Preços</CardTitle>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => appendPackage({
                    id: `pacote-${Date.now()}`,
                    name: "",
                    tagline: "",
                    price: 0,
                    featured: false,
                    items: [{ value: "" }]
                  })}
                >
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Pacote
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {packageFields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg relative space-y-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 text-destructive"
                      onClick={() => removePackage(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <FormField
                        control={form.control}
                        name={`packages.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Pacote *</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Premium" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`packages.${index}.price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preço *</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`packages.${index}.tagline`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Frase de destaque (Tagline)</FormLabel>
                            <FormControl>
                              <Input placeholder="A experiência completa." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`packages.${index}.featured`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-4 md:col-span-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Destacar este pacote visualmente</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* ITEMS DO PACOTE */}
                    <div className="space-y-2 mt-4">
                      <FormLabel>Itens Inclusos</FormLabel>
                      <PackageItems form={form} packageIndex={index} />
                    </div>
                  </div>
                ))}
                {packageFields.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    Nenhum pacote adicionado.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ADICIONAIS E FORMATOS (SIMPLIFICADO) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ADICIONAIS */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Adicionais</CardTitle>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => appendAddon({ name: "", price: 0 })}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {addonFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <FormField
                        control={form.control}
                        name={`addons.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl><Input placeholder="Nome" {...field} /></FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`addons.${index}.price`}
                        render={({ field }) => (
                          <FormItem className="w-24">
                            <FormControl><Input type="number" placeholder="Preço" {...field} /></FormControl>
                          </FormItem>
                        )}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAddon(index)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* FORMATOS */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Formatos</CardTitle>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => appendFormat({ name: "", description: "" })}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formatFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <FormField
                          control={form.control}
                          name={`formats.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl><Input placeholder="Nome do formato" {...field} /></FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`formats.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl><Input placeholder="Descrição" {...field} /></FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeFormat(index)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* SEÇÕES TEXTUAIS */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Seções de Texto Extra</CardTitle>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => appendSection({ type: "text", title: "", body: "" })}
                >
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Seção
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {sectionFields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg relative space-y-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 text-destructive"
                      onClick={() => removeSection(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    
                    <FormField
                      control={form.control}
                      name={`sections.${index}.title`}
                      render={({ field }) => (
                        <FormItem className="mr-10">
                          <FormLabel>Título</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`sections.${index}.body`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conteúdo</FormLabel>
                          <FormControl>
                            <Textarea rows={3} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Status Ativo</FormLabel>
                    <FormDescription>Permite usar este modelo</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/orcamentos")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isEditing ? "Salvar Alterações" : "Criar Modelo"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
}

// Componente helper para array aninhado (itens do pacote)
function PackageItems({ form, packageIndex }: { form: any; packageIndex: number }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `packages.${packageIndex}.items`,
  });

  return (
    <div className="space-y-2">
      {fields.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          <FormField
            control={form.control}
            name={`packages.${packageIndex}.items.${index}.value`}
            render={({ field }) => (
              <FormItem className="flex-1 mb-0">
                <FormControl>
                  <Input placeholder="Ex: Drone incluso" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 text-sm"
        onClick={() => append({ value: "" })}
      >
        <Plus className="w-4 h-4 mr-1" /> Add item
      </Button>
    </div>
  );
}
