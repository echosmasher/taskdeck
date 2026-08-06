"use client";

import { useState, useTransition } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteTeamAction, setTeamArchivedAction } from "./team-actions";
import { TeamFormDialog } from "./team-form-dialog";
import type { TeamWithCount } from "./types";

export function TeamsSection({ teams }: { teams: TeamWithCount[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamWithCount | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<TeamWithCount | null>(null);
  const [, startTransition] = useTransition();

  function toggleArchived(team: TeamWithCount) {
    startTransition(async () => {
      const result = await setTeamArchivedAction(team.id, !team.is_archived);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(team.is_archived ? "Team unarchived" : "Team archived");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Teams</h2>
        <Button onClick={() => setCreateOpen(true)}>New team</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No teams yet.
              </TableCell>
            </TableRow>
          )}
          {teams.map((team) => (
            <TableRow key={team.id}>
              <TableCell className="font-medium">{team.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {team.memberCount}
                  {team.memberCount === 0 && <Badge variant="outline">Empty team</Badge>}
                </div>
              </TableCell>
              <TableCell>
                {team.is_archived ? (
                  <Badge variant="outline">Archived</Badge>
                ) : (
                  <Badge variant="secondary">Active</Badge>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon" aria-label={`Actions for ${team.name}`} />}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingTeam(team)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleArchived(team)}>
                      {team.is_archived ? "Unarchive" : "Archive"}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDeletingTeam(team)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TeamFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editingTeam && (
        <TeamFormDialog
          open={!!editingTeam}
          onOpenChange={(open) => !open && setEditingTeam(null)}
          team={editingTeam}
        />
      )}

      {deletingTeam && (
        <ConfirmDeleteDialog
          open={!!deletingTeam}
          onOpenChange={(open) => !open && setDeletingTeam(null)}
          title={`Delete ${deletingTeam.name}?`}
          description="This permanently deletes the team. This cannot be undone."
          successMessage="Team deleted"
          onConfirm={() => deleteTeamAction(deletingTeam.id)}
        />
      )}
    </div>
  );
}
