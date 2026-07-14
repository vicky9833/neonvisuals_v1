"use client";

import { Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  OrderRecipient,
  RecipientDeliveryStatus,
} from "@/lib/engines/order";
import { RECIPIENT_STATUS_META } from "./order-status";

interface RecipientTableProps {
  recipients: OrderRecipient[];
  /** Admin controls (status change + remove). Omit for read-only. */
  editable?: boolean;
  onStatusChange?: (
    recipientId: string,
    status: RecipientDeliveryStatus,
  ) => void;
  onRemove?: (recipientId: string) => void;
}

const STATUSES: RecipientDeliveryStatus[] = [
  "pending",
  "in_production",
  "packed",
  "shipped",
  "delivered",
  "returned",
];

export function RecipientTable({
  recipients,
  editable = false,
  onStatusChange,
  onRemove,
}: RecipientTableProps) {
  if (recipients.length === 0) {
    return (
      <p className="text-sm text-[#9CA3AF]">
        No recipients assigned yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Department</TableHead>
            <TableHead>Engraving</TableHead>
            <TableHead className="hidden lg:table-cell">Message</TableHead>
            <TableHead>Status</TableHead>
            {editable && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipients.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <p className="font-medium text-navy">{r.recipient_name}</p>
                {r.recipient_email && (
                  <p className="text-xs text-[#9CA3AF]">{r.recipient_email}</p>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-[#6B7280]">
                {r.recipient_department ?? "-"}
              </TableCell>
              <TableCell className="text-sm text-navy">
                {r.personalisation_name}
              </TableCell>
              <TableCell className="hidden lg:table-cell max-w-[220px] text-sm text-[#6B7280]">
                {r.personalisation_message ?? "-"}
              </TableCell>
              <TableCell>
                {editable && onStatusChange ? (
                  <Select
                    value={r.delivery_status}
                    onValueChange={(v) =>
                      onStatusChange(r.id, v as RecipientDeliveryStatus)
                    }
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {RECIPIENT_STATUS_META[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${RECIPIENT_STATUS_META[r.delivery_status].badge}`}
                  >
                    {RECIPIENT_STATUS_META[r.delivery_status].label}
                  </span>
                )}
              </TableCell>
              {editable && (
                <TableCell>
                  <button
                    type="button"
                    onClick={() => onRemove?.(r.id)}
                    className="text-[#9CA3AF] transition-colors hover:text-red-600"
                    aria-label={`Remove ${r.recipient_name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
