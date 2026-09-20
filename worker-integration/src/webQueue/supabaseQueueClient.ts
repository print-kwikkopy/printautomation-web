import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type RemoteCommand = {
  id: string;
  queue_number: number;
  raw_command: string;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  progress: number;
};

export type EventLevel = "info" | "success" | "warning" | "error";

export class SupabaseQueueClient {
  private readonly client: SupabaseClient;
  private readonly workerName: string;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.workerName =
      process.env.PRINT_AUTOMATION_WORKER_NAME ?? "KKN-NSY-WORKER-01";

    if (!url || !serviceRoleKey) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in worker environment.",
      );
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  async claimNext(): Promise<RemoteCommand | null> {
    const { data, error } = await this.client.rpc("claim_next_command", {
      worker_name: this.workerName,
    });

    if (error) {
      throw new Error(`Could not claim command: ${error.message}`);
    }

    const command = Array.isArray(data) ? data[0] : data;
    return (command as RemoteCommand | undefined) ?? null;
  }

  async event(
    commandId: string,
    message: string,
    progress?: number,
    level: EventLevel = "info",
  ): Promise<void> {
    const { error } = await this.client.rpc("add_command_event", {
      target_command_id: commandId,
      event_message: message,
      event_progress: progress ?? null,
      event_level: level,
    });

    if (error) {
      throw new Error(`Could not add command event: ${error.message}`);
    }
  }

  async complete(commandId: string): Promise<void> {
    const { error } = await this.client.rpc("complete_command", {
      target_command_id: commandId,
    });

    if (error) {
      throw new Error(`Could not complete command: ${error.message}`);
    }
  }

  async fail(commandId: string, message: string): Promise<void> {
    const { error } = await this.client.rpc("fail_command", {
      target_command_id: commandId,
      failure_message: message,
    });

    if (error) {
      throw new Error(`Could not fail command: ${error.message}`);
    }
  }
}
