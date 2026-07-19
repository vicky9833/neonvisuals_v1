"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BucketOption } from "@/lib/admin/products";

interface ProductCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buckets: BucketOption[];
  onCreated: (sku: string) => void;
}

export function ProductCreateDialog({
  open,
  onOpenChange,
  buckets,
  onCreated,
}: ProductCreateDialogProps) {
  const [name, setName] = useState("");
  const [bucketId, setBucketId] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setName("");
    setBucketId("");
    setTagline("");
    setDescription("");
  }

  async function submit() {
    if (!name.trim() || !bucketId) {
      toast.error("Name and collection are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ops/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bucketId,
          tagline: tagline.trim() || null,
          description: description.trim() || null,
        }),
      });
      if (res.status === 201) {
        const body = await res.json();
        const sku = body.data?.sku as string;
        toast.success(`Created ${sku} (draft). Add details, then publish to release it.`);
        reset();
        onOpenChange(false);
        onCreated(sku);
      } else if (res.status === 403) {
        toast.error("You do not have permission to create products.");
      } else {
        toast.error("Could not create the product. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
          <DialogDescription>
            Creates a draft product with the next SKU in the collection. It stays out of the public
            catalog until you set it Active and publish.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" />
          </div>
          <div className="space-y-1">
            <Label>Collection</Label>
            <Select value={bucketId} onValueChange={setBucketId}>
              <SelectTrigger>
                <SelectValue placeholder="Select collection" />
              </SelectTrigger>
              <SelectContent>
                {buckets.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.code} · {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tagline (optional)</Label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
