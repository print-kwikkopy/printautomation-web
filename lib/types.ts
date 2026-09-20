export type CommandStatus =
  | "queued"
  | "running"
  | "done"
  | "failed"
  | "cancelled";

export type Command = {
  id: string;
  queue_number: number;
  raw_command: string;
  status: CommandStatus;
  progress: number;
  current_step: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  claimed_at: string | null;
  claimed_by: string | null;
  created_by: string | null;
};

export type CommandEvent = {
  id: number;
  command_id: string;
  message: string;
  progress: number | null;
  level: "info" | "success" | "warning" | "error";
  created_at: string;
};
