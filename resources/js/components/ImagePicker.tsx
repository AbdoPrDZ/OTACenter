import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { pickImage } from "@/utils/bootstrap";
import { cn } from "@/lib/utils";

import { ImagePlus } from "lucide-react";

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
      <Button
        type="button"
        variant="outline"
        onClick={pick}
        disabled={disabled}
        className="group relative overflow-hidden p-0"
        style={{ width, height, borderRadius }}
        aria-label="Choose image"
      >
        {loading ? (
          <Spinner className="size-5" />
        ) : previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Preview"
              className="size-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-[0.625rem] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              Change
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <ImagePlus className="size-6" />
            <span className="text-xs">Choose image</span>
          </span>
        )}
      </Button>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
