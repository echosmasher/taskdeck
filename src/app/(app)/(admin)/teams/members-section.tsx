"use client";

import { useMemo, useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteMemberAction,
  setMemberArchivedAction,
  setMemberRoleAction,
} from "./member-actions";
import { MemberFormDialog } from "./member-form-dialog";
import type { MemberRow, Team } from "./types";

export function MembersSection({
  members,
  teams,
  isMasterAdmin,
}: {
  members: MemberRow[];
  teams: Team[];
  isMasterAdmin: boolean;
}) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [deletingMember, setDeletingMember] = useState<MemberRow | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter(
      (m) =>
        (m.full_name ?? "").toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query),
    );
  }, [members, search]);

  function toggleArchived(member: MemberRow) {
    startTransition(async () => {
      const result = await setMemberArchivedAction(member.id, !member.is_archived);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(member.is_archived ? "Member unarchived" : "Member archived");
    });
  }

  function toggleRole(member: MemberRow) {
    const nextRole = member.role === "admin" ? "member" : "admin";
    startTransition(async () => {
      const result = await setMemberRoleAction(member.id, nextRole);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(nextRole === "admin" ? "Promoted to admin" : "Admin access removed");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Members</h2>
          <Input
            placeholder="Search members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-2 max-w-xs"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>New member</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No members found.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.full_name ?? "—"}</TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>{member.position ?? "—"}</TableCell>
              <TableCell>{member.teamName ?? "No team"}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {member.role.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                {member.is_archived ? (
                  <Badge variant="outline">Archived</Badge>
                ) : (
                  <Badge variant="secondary">Active</Badge>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${member.full_name ?? member.email}`}
                      />
                    }
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingMember(member)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleArchived(member)}>
                      {member.is_archived ? "Unarchive" : "Archive"}
                    </DropdownMenuItem>
                    {isMasterAdmin && member.role !== "master_admin" && (
                      <DropdownMenuItem onClick={() => toggleRole(member)}>
                        {member.role === "admin" ? "Remove admin" : "Make admin"}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeletingMember(member)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <MemberFormDialog open={createOpen} onOpenChange={setCreateOpen} teams={teams} />

      {editingMember && (
        <MemberFormDialog
          open={!!editingMember}
          onOpenChange={(open) => !open && setEditingMember(null)}
          teams={teams}
          member={editingMember}
        />
      )}

      {deletingMember && (
        <ConfirmDeleteDialog
          open={!!deletingMember}
          onOpenChange={(open) => !open && setDeletingMember(null)}
          title={`Delete ${deletingMember.full_name ?? deletingMember.email}?`}
          description="This permanently deletes the member's account. This cannot be undone."
          successMessage="Member deleted"
          onConfirm={() => deleteMemberAction(deletingMember.id)}
        />
      )}
    </div>
  );
}
