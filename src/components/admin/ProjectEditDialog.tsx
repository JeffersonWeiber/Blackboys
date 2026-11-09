import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROJECT_STATUS_LABEL,
  useUpdateProject,
  type ProjectInput,
  type ProjectStatus,
} from "@/hooks/useProjects";

export type EditableProject = {
  id: string;
  title: string;
  status: string;
  event_date: string | null;
  location: string | null;
  closed_value: number | null;
};

const STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABEL) as [ProjectStatus, string][];

const isProjectStatus = (value: string): value is ProjectStatus =>
  value in PROJECT_STATUS_LABEL;

export function ProjectEditDialog({
  project,
  clientId,
  open,
  onOpenChange,
}: {
  project: EditableProject | null;
  clientId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateProject = useUpdateProject();

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("orcamento");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!project) return;
    setTitle(project.title);
    setEventDate(project.event_date ?? "");
    setLocation(project.location ?? "");
    setStatus(isProjectStatus(project.status) ? project.status : "orcamento");
    setValue(project.closed_value != null ? String(project.closed_value) : "");
  }, [project]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!project) return;

    if (!title.trim()) {
      toast.error("Informe o nome do projeto.");
      return;
    }

    const normalized = value.includes(",")
      ? value.replace(/\./g, "").replace(",", ".")
      : value;
    const parsed = value.trim() ? Number(normalized) : null;
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      toast.error("Valor do projeto inválido.");
      return;
    }

    const payload: ProjectInput = {
      id: project.id,
      clientId,
      title,
      event_date: eventDate || null,
      location: location || null,
      status,
      closed_value: parsed,
    };

    try {
      await updateProject.mutateAsync(payload);
      onOpenChange(false);
    } catch {
      // O toast de erro já é exibido pelo hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide">Editar projeto</DialogTitle>
          <DialogDescription>
            Ajuste a data do evento, o local e o estágio do trabalho.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-title">Nome do projeto</Label>
            <Input
              id="project-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Casamento Marina & Rafael"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="project-date">Data do evento</Label>
              <Input
                id="project-date"
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Deixe em branco enquanto a data não estiver fechada.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-value">Valor fechado</Label>
              <Input
                id="project-value"
                inputMode="decimal"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="6000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-location">Local</Label>
            <Input
              id="project-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Cascavel - PR"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(next) => setStatus(next as ProjectStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(([id, label]) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={updateProject.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateProject.isPending}>
              {updateProject.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
