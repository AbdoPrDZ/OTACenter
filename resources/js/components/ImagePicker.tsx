import { useEffect, useState } from "react";
import { ImagePlus, RefreshCw } from "lucide-react";

import { Spinner } from "@/components/ui/feedback";
import { pickImage } from "@/utils/bootstrap";
import { cn } from "@/lib/utils";

interface ImagePickerProps {
  value?: string;
  image?: File;
  onChange: (file?: File) => void;
  width?: number;
  height?: number;
  borderRadius?: number;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export default function ImagePicker({
  value,
  image,
  onChange,
  width = 160,
  height = 160,
  borderRadius = 12,
  error,
  disabled = false,
  className,
}: ImagePickerProps) {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(value);

  useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    setPreviewUrl(value);
  }, [image, value]);

  const pick = async () => {
    setLoading(true);
    const file = await pickImage();
    if (file) onChange(file);
    setLoading(false);
  };

  return (
    <div className={cn("flex w-fit flex-col gap-1.5", className)}>
      <button
        type="button"
        onClick={pick}
        disabled={disabled}
        aria-label="Choose image"
        className={cn(
          "group relative overflow-hidden border border-dashed border-border bg-muted/30 transition-colors",
          "hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50",
        )}
        style={{ width, height, borderRadius }}
      >
        {loading ? (
          <span className="flex size-full items-center justify-center">
            <Spinner className="size-5 text-muted-foreground" />
          </span>
        ) : previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Preview"
              className="size-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
              <RefreshCw className="size-5 text-white" />
            </span>
          </>
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <ImagePlus className="size-6" />
            <span className="text-xs font-medium">Choose image</span>
          </span>
        )}
      </button>

      {error ? <p className="text-[0.6875rem] text-destructive">{error}</p> : null}
    </div>
  );
}
