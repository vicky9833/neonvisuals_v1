"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  downloadCSVTemplate,
  downloadErrorReport,
  parseFile,
  rowToFormData,
  validateCSVRows,
} from "@/lib/employees/csv";
import type { CSVValidationResult } from "@/types/employee";
import { CSVPreview } from "@/components/employees/CSVPreview";

const MAX_BYTES = 5 * 1024 * 1024;

type Step = "upload" | "preview" | "done";

interface ImportResult {
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export function CSVUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<CSVValidationResult[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("File is larger than 5MB.");
      return;
    }
    setParsing(true);
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        setError("No rows found in the file.");
        return;
      }
      if (rows.length > 1000) {
        setError("Maximum 1,000 employees per upload.");
        return;
      }
      setResults(validateCSVRows(rows));
      setStep("preview");
    } catch {
      setError("Could not read the file. Please check the format.");
    } finally {
      setParsing(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function removeInvalid() {
    setResults((prev) => prev.filter((r) => r.isValid));
  }

  async function importValid() {
    const validRows = results.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import.");
      return;
    }
    setImporting(true);
    const res = await fetch("/api/employees/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employees: validRows.map((r) => rowToFormData(r.data)),
      }),
    });
    setImporting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.message ?? "Import failed.");
      return;
    }
    const body = await res.json();
    setImportResult(body.data as ImportResult);
    setStep("done");
  }

  function reset() {
    setResults([]);
    setImportResult(null);
    setError(null);
    setStep("upload");
  }

  const validCount = results.filter((r) => r.isValid).length;

  return (
    <div className="space-y-6">
      {step === "upload" ? (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors",
              dragging
                ? "border-gold bg-gold/5"
                : "border-[#EDE9E3] bg-white",
            )}
          >
            <FileUp className="size-10 text-[#9CA3AF]" />
            <p className="mt-4 text-sm font-medium text-navy">
              Drop your CSV or Excel file here
            </p>
            <p className="text-xs text-[#9CA3AF]">or</p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => inputRef.current?.click()}
              disabled={parsing}
            >
              {parsing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Browse Files
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
            <p className="mt-4 text-xs text-[#9CA3AF]">
              Accepted: CSV, Excel (XLSX, XLS). Max 1,000 employees, 5MB.
            </p>
          </div>

          <button
            type="button"
            onClick={downloadCSVTemplate}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gold hover:underline"
          >
            <Download className="size-4" /> Download Template
          </button>

          {error ? (
            <p className="text-sm font-medium text-destructive">{error}</p>
          ) : null}
        </div>
      ) : null}

      {step === "preview" ? (
        <div className="space-y-4">
          <CSVPreview results={results} />
          <p className="text-xs text-[#6B7280]">
            Correct highlighted errors in your file and re-upload, or remove
            invalid rows to continue.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-navy text-white hover:bg-navy/90"
              disabled={validCount === 0 || importing}
              onClick={importValid}
            >
              {importing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                `Import ${validCount} Valid ${validCount === 1 ? "Row" : "Rows"}`
              )}
            </Button>
            <Button variant="outline" onClick={removeInvalid}>
              Remove Invalid Rows
            </Button>
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {step === "done" && importResult ? (
        <div className="space-y-4 rounded-2xl border border-[#EDE9E3] bg-white p-8 text-center">
          <CheckCircle2 className="mx-auto size-12 text-[#2D6A4F]" />
          <div>
            <p className="font-heading text-lg font-semibold text-navy">
              {importResult.created} employees added successfully
            </p>
            <p className="mt-1 text-sm text-[#6B7280]">
              {importResult.skipped} skipped (duplicate emails)
              {importResult.errors.length > 0
                ? ` · ${importResult.errors.length} failed`
                : ""}
            </p>
          </div>
          {importResult.errors.length > 0 ? (
            <button
              type="button"
              onClick={() => downloadErrorReport(importResult.errors)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gold hover:underline"
            >
              <Download className="size-4" /> Download error report
            </button>
          ) : null}
          <div className="flex justify-center gap-2">
            <Button
              className="bg-navy text-white hover:bg-navy/90"
              onClick={() => {
                router.push("/dashboard/employees");
                router.refresh();
              }}
            >
              View Team
            </Button>
            <Button variant="outline" onClick={reset}>
              Upload More
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
