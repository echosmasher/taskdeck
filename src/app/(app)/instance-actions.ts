"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { completeInstanceAction, reopenInstanceAction } from "./actions";
import type { DashboardCompanyInstance } from "./dashboard-types";

/**
 * Complete / reopen for one company instance, shared by the workpaper grid
 * and the task-first list. Completing is a single action with an undo in
 * the toast, since a stamp is cheap to take back (it reopens, and both
 * events stay in the audit log).
 */
export function useInstanceActions(instance: DashboardCompanyInstance) {
  const [isPending, startTransition] = useTransition();

  function reopenQuietly() {
    void reopenInstanceAction(instance.instanceId).then((result) => {
      if (result.error) toast.error(result.error);
    });
  }

  function complete() {
    startTransition(async () => {
      const result = await completeInstanceAction(instance.instanceId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${instance.companyName} stamped`, {
        action: { label: "Undo", onClick: reopenQuietly },
      });
    });
  }

  function reopen() {
    startTransition(async () => {
      const result = await reopenInstanceAction(instance.instanceId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${instance.companyName} reopened`);
    });
  }

  return { isPending, complete, reopen };
}
