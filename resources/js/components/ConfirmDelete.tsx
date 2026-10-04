import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface ConfirmDeleteProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  /** Optional custom trigger; defaults to a destructive ghost button. */
  trigger?: ReactNode;
  onConfirm: () => Promise<{ success: boolean; message?: string }>;
  onDeleted: () => void;
  className?: string;
}

export default function ConfirmDelete({
  title,
  description,
  confirmLabel = "Delete",
  trigger,
  onConfirm,
  onDeleted,
  className,
}: ConfirmDeleteProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const response = await onConfirm();
    setLoading(false);

    if (response.success) {
      setOpen(false);
      toast.success("Deleted", title);
      onDeleted();
    } else {
      toast.error("Could not delete", response.message);
    }
  };

  return (
    <>
      {trigger ? (
        <span className="contents" onClick={() => setOpen(true)}>
          {trigger}
        </span>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className={cn(
            "text-destructive hover:bg-destructive/10 hover:text-destructive",
            className,
          )}
        >
          <Trash2 /> Delete
        </Button>
      )}

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        variant="destructive"
        loading={loading}
        onConfirm={run}
      />
    </>
  );
}
