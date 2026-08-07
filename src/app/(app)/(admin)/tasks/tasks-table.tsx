"use client";

import { useMemo, useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { describeDeadlineRule, describeRecurrence } from "@/lib/tasks/recurrence-format";
import { setTaskArchivedAction } from "./actions";
import { TaskFormDialog } from "./task-form-dialog";
import type {
  AbsenceWarningContext,
  DimensionOption,
  MemberOption,
  TaskRow,
  TeamOption,
} from "./types";

export function TasksTable({
  tasks,
  dimensions,
  teams,
  members,
  countries,
  absenceWarningContext,
}: {
  tasks: TaskRow[];
  dimensions: DimensionOption[];
  teams: TeamOption[];
  members: MemberOption[];
  countries: string[];
  absenceWarningContext: AbsenceWarningContext;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter === "active" && t.is_archived) return false;
      if (statusFilter === "archived" && !t.is_archived) return false;
      if (query && !t.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [tasks, search, statusFilter]);

  function toggleArchived(task: TaskRow) {
    startTransition(async () => {
      const result = await setTaskArchivedAction(task.id, !task.is_archived);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(task.is_archived ? "Task unarchived" : "Task archived");
    });
  }

  function scopeLabel(task: TaskRow) {
    if (task.scope.length === 0) return "All companies";
    const labels = task.scope
      .map((id) => dimensions.flatMap((d) => d.values).find((v) => v.id === id)?.value)
      .filter(Boolean);
    return labels.join(", ");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search tasks…"
            aria-label="Search tasks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Button onClick={() => setCreateOpen(true)}>New task</Button>
      </div>

      <Card className="gap-0 py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Recurrence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No tasks found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((task) => {
              const deadlineLabel = describeDeadlineRule(task.deadline_rule);
              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <p className="font-medium">{task.title}</p>
                    {task.description && (
                      <p className="max-w-xs truncate text-xs text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{task.assigneeLabel}</TableCell>
                  <TableCell className="max-w-48 truncate">{scopeLabel(task)}</TableCell>
                  <TableCell>
                    <p>{describeRecurrence(task.recurrence)}</p>
                    {deadlineLabel && (
                      <p className="text-xs text-muted-foreground">{deadlineLabel}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.is_archived ? (
                      <Badge variant="outline">Archived</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon" aria-label={`Actions for ${task.title}`} />}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingTask(task)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleArchived(task)}>
                          {task.is_archived ? "Unarchive" : "Archive"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <TaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        dimensions={dimensions}
        teams={teams}
        members={members}
        countries={countries}
        allTasksForCopy={tasks}
        absenceWarningContext={absenceWarningContext}
      />

      {editingTask && (
        <TaskFormDialog
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          dimensions={dimensions}
          teams={teams}
          members={members}
          countries={countries}
          task={editingTask}
          absenceWarningContext={absenceWarningContext}
        />
      )}
    </div>
  );
}
