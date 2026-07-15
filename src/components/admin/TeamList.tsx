"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils/format";

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
}

export function TeamList({ members }: { members: TeamMember[] }) {
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  async function changeRole(id: string, role: string) {
    await fetch("/api/ops/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="mr-1.5 size-4" /> Invite Team Member
        </Button>
      </div>

      <div className="overflow-x-auto rounded-card border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden sm:table-cell">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                      {m.full_name?.slice(0, 1).toUpperCase() ?? "?"}
                    </span>
                    <span className="font-medium text-navy">{m.full_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-[#6B7280]">{m.email}</TableCell>
                <TableCell>
                  <Select value={m.role} onValueChange={(v) => changeRole(m.id, v)}>
                    <SelectTrigger className="h-8 w-[150px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">owner</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                      <SelectItem value="ops">ops</SelectItem>
                      <SelectItem value="finance">finance</SelectItem>
                      <SelectItem value="support">support</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-[#9CA3AF]">
                  {formatDate(m.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Automated invitations arrive in a later prompt. For now, add a
              registered user to platform_staff with a quick SQL command.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="their@email.com"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <div className="rounded-card border border-border bg-secondary/50 p-3">
              <p className="mb-1 text-xs text-[#6B7280]">
                After they register at /register, run this in Supabase SQL Editor:
              </p>
              <code className="block break-all font-mono text-xs text-navy">
                INSERT INTO platform_staff (user_id, role) SELECT id,
                &apos;admin&apos; FROM profiles WHERE email = &apos;
                {inviteEmail || "their@email.com"}&apos;;
              </code>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
