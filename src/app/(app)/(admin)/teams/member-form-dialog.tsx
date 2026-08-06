"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMemberAction, updateMemberAction } from "./member-actions";
import type { MemberRow, Team } from "./types";

export function MemberFormDialog({
  open,
  onOpenChange,
  teams,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  /** Omit for create mode. */
  member?: MemberRow;
}) {
  const isEdit = !!member;
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = isEdit
        ? await updateMemberAction(member.id, {}, formData)
        : await createMemberAction({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(
        isEdit ? "Member updated" : "Invite sent — the member is created once they accept.",
      );
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(undefined);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit member" : "New member"}</DialogTitle>
          {!isEdit && (
            <DialogDescription>
              Sends a Supabase invite email. The member&apos;s profile is active as soon as they
              accept.
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Name</Label>
            <Input id="full_name" name="full_name" required defaultValue={member?.full_name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={member?.email ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input id="position" name="position" defaultValue={member?.position ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team_id">Team</Label>
            <Select name="team_id" defaultValue={member?.team_id ?? "none"}>
              <SelectTrigger id="team_id" className="w-full">
                <SelectValue placeholder="No team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No team</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
