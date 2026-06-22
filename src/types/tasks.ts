// =============================================================================
//  Backlog task types (shared client + server)
// =============================================================================

export type TaskFile = { path: string; name: string; type?: string };

// Private Supabase Storage bucket for task attachments. Declared here (not in
// the server-only storage.ts) so client components can import it safely.
export const TASK_BUCKET = "task-files";

export type TaskStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "done"
  | "archived";

export type TaskPriority = "low" | "normal" | "high";

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  folder: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  building_id: string | null;
  unit_id: string | null;
  assigned_to: string | null;
  assigned_vendor_id: string | null;
  due_date: string | null;
  files: TaskFile[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

// Default "folders" — long-lived buckets jobs can sit in. Users can type their
// own too; these just seed the dropdown.
export const TASK_FOLDERS = [
  "Cabinets",
  "Painting",
  "Flooring",
  "Plumbing",
  "Electrical",
  "Appliances",
  "Common areas",
  "General",
] as const;

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In progress",
  done: "Done",
  archived: "Archived",
};

// Shown by default on the board (everything still "open").
export const ACTIVE_STATUSES: TaskStatus[] = [
  "pending",
  "assigned",
  "in_progress",
];
