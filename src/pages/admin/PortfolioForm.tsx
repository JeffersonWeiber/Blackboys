import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { VideoPreview } from "@/components/admin/VideoPreview";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useActiveNiches } from "@/hooks/useNiches";
import { 
  useUploadPortfolioThumbnail, 
  useDeletePortfolioThumbnail,
  isPortfolioThumbnailUrl 
} from "@/hooks/usePortfolio";
import { ArrowLeft, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { detectVideoType, isValidVideoUrl, generateThumbnailUrl } from "@/lib/videoUtils";

const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200),
  description: z.string().max(1000).optional(),
  niches: z.array(z.string()).min(1, "Selecione pelo menos um nicho"),
  video_url: z.string().min(1, "URL do vídeo é obrigatória").refine(
    (url) => isValidVideoUrl(url),
    "URL inválida. Use um link do YouTube ou Google Drive"
  ),
  is_published: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  display_order: z.coerce.number().int().min(0).default(0),
});

type FormValues = z.infer<typeof formSchema>;

const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function PortfolioForm() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Thumbnail state
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  
  // Hooks
  const { data: niches } = useActiveNiches();
  const uploadThumbnail = useUploadPortfolioThumbnail();
  const deleteThumbnail = useDeletePortfolioThumbnail();
  
  const nicheOptions = niches?.map((n) => ({ value: n.slug, label: n.name })) || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      niches: [],
      video_url: "",
      is_published: false,
      is_featured: false,
      display_order: 0,
    },
  });

  // Watch video URL for preview
  const watchedVideoUrl = form.watch("video_url");
  useEffect(() => {
    setVideoUrl(watchedVideoUrl);
  }, [watchedVideoUrl]);

  // Fetch existing item if editing
  const { data: item, isLoading: isLoadingItem } = useQuery({
    queryKey: ["portfolio-item", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  // Populate form when item loads
  useEffect(() => {
    if (item) {
      form.reset({
        title: item.title,
        description: item.description || "",
        niches: item.niches || (item.niche ? [item.niche] : []),
        video_url: item.video_url,
        is_published: item.is_published,
        is_featured: item.is_featured,
        display_order: item.display_order,
      });
      
      // Set existing thumbnail if it's from our bucket
      if (isPortfolioThumbnailUrl(item.thumbnail_url)) {
        setExistingThumbnailUrl(item.thumbnail_url);
        setThumbnailPreview(item.thumbnail_url);
      }
    }
  }, [item, form]);

  // Handle file selection
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Use JPG, PNG ou WebP",
        variant: "destructive",
      });
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: "Máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  // Remove thumbnail
  const handleRemoveThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      let thumbnailUrl: string | null = existingThumbnailUrl;

      // Upload new thumbnail if selected
      if (thumbnailFile) {
        // Delete old thumbnail if exists in our bucket
        if (existingThumbnailUrl && isPortfolioThumbnailUrl(existingThumbnailUrl)) {
          try {
            await deleteThumbnail.mutateAsync(existingThumbnailUrl);
          } catch (err) {
            console.warn("Failed to delete old thumbnail:", err);
          }
        }
        thumbnailUrl = await uploadThumbnail.mutateAsync(thumbnailFile);
      } else if (!thumbnailPreview && existingThumbnailUrl) {
        // User removed the thumbnail
        if (isPortfolioThumbnailUrl(existingThumbnailUrl)) {
          try {
            await deleteThumbnail.mutateAsync(existingThumbnailUrl);
          } catch (err) {
            console.warn("Failed to delete old thumbnail:", err);
          }
        }
        thumbnailUrl = null;
      }

      // If no custom thumbnail, use video thumbnail
      const finalThumbnail = thumbnailUrl || generateThumbnailUrl(values.video_url) || null;
      const videoType = detectVideoType(values.video_url);

      const payload = {
        title: values.title,
        description: values.description || null,
        niche: values.niches[0] || "", // Mantém para retrocompatibilidade
        niches: values.niches,
        video_url: values.video_url,
        video_type: videoType,
        thumbnail_url: finalThumbnail,
        is_published: values.is_published,
        is_featured: values.is_featured,
        display_order: values.display_order,
        created_by: user?.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("portfolio_items")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("portfolio_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-items"] });
      toast({ title: isEditing ? "Projeto atualizado" : "Projeto criado" });
      navigate("/admin/portfolio");
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const onSubmit = (values: FormValues) => {
    saveMutation.mutate(values);
  };

  const isUploading = uploadThumbnail.isPending || deleteThumbnail.isPending;

  if (isEditing && isLoadingItem) {
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
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/portfolio")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">
              {isEditing ? "Editar Projeto" : "Novo Projeto"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Atualize as informações do projeto" : "Adicione um novo projeto ao portfólio"}
            </p>
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Projeto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Wedding Film - Ana & Pedro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Uma breve descrição do projeto..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="niches"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nichos *</FormLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border rounded-lg bg-card/50">
                      {nicheOptions.map((opt) => (
                        <div key={opt.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`niche-${opt.value}`}
                            checked={field.value?.includes(opt.value)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              const updated = checked
                                ? [...current, opt.value]
                                : current.filter((val) => val !== opt.value);
                              field.onChange(updated);
                            }}
                          />
                          <Label 
                            htmlFor={`niche-${opt.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {opt.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <FormDescription>Selecione todos os nichos onde este vídeo deve aparecer</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end">
                    <FormLabel>Ordem de exibição</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormDescription>Menor número = aparece primeiro</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="video_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Vídeo *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://youtube.com/watch?v=... ou .../shorts/... ou drive.google.com/..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Cole um link do YouTube, YouTube Shorts ou Google Drive
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Video Preview */}
            <div>
              <label className="text-sm font-medium mb-2 block">Preview do Vídeo</label>
              <VideoPreview url={videoUrl} />
            </div>

            {/* Thumbnail Upload */}
            <div className="space-y-3">
              <label className="text-sm font-medium block">Thumbnail Customizada</label>
              
              <div className="flex gap-4 items-start">
                {/* Preview */}
                <div className="w-40 h-24 rounded-lg border border-border bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {thumbnailPreview ? (
                    <div className="relative w-full h-full group">
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveThumbnail}
                        className="absolute top-1 right-1 p-1 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>

                {/* Upload button */}
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleThumbnailChange}
                    className="hidden"
                    id="thumbnail-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full sm:w-auto"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Escolher arquivo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG ou WebP. Máximo 5MB.
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Deixe vazio para usar a thumbnail automática do vídeo
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <FormField
                control={form.control}
                name="is_published"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Publicado</FormLabel>
                      <FormDescription>Visível no site público</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_featured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Destaque</FormLabel>
                      <FormDescription>Exibir na home</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/portfolio")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || isUploading}>
                {(saveMutation.isPending || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? "Salvar Alterações" : "Criar Projeto"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
}
