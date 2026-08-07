"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TaskRow } from "./types";

export function CopyTaskPicker({
  tasks,
  onCopy,
}: {
  tasks: TaskRow[];
  onCopy: (task: TaskRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tasks;
    return tasks.filter((t) => t.title.toLowerCase().includes(query));
  }, [tasks, search]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Search className="h-3.5 w-3.5" />
        Copy from existing task
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b p-2">
          <Input
            autoFocus
            placeholder="Search tasks…"
            aria-label="Search tasks to copy from"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No tasks found.</p>
          )}
          {filtered.map((task) => (
            <button
              key={task.id}
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => {
                onCopy(task);
                setOpen(false);
                setSearch("");
              }}
            >
              <span className="truncate">{task.title}</span>
              {task.is_archived && (
                <Badge variant="outline" className="shrink-0">
                  Archived
                </Badge>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
