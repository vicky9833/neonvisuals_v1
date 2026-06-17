"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  accept?: string;
  /** Called with the selected file (single-file uploader). */
  onFileSelected?: (file: File) => void;
  className?: string;
  label?: string;
}

/** Minimal drag-and-drop / click file uploader. */
export function FileUpload({
  accept = ".csv",
  onFileSelected,
  className,
  label = "Drop a file here or click to browse",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setFileName(file.name);
    onFileSelected?.(file);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-card/50 px-6 py-12 text-center transition-colors hover:border-gold",
        className,
      )}
    >
      <UploadCloud className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {fileName ?? label}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
