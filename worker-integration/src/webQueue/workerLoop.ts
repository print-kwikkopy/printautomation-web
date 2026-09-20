import {
  EventLevel,
  SupabaseQueueClient,
} from "./supabaseQueueClient.js";

export type ProgressReporter = (
  message: string,
  progress?: number,
  level?: EventLevel,
) => Promise<void>;

export type CommandExecutor = (
  rawCommand: string,
  progress: ProgressReporter,
) => Promise<void>;

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function runWebQueueWorker(
  executeCommand: CommandExecutor,
  pollIntervalMs = 2000,
): Promise<never> {
  const queue = new SupabaseQueueClient();

  console.log("🌐 Supabase command worker started");

  while (true) {
    try {
      const command = await queue.claimNext();

      if (!command) {
        await sleep(pollIntervalMs);
        continue;
      }

      console.log(
        `🌐 #${command.queue_number} ${command.raw_command}`,
      );

      const progress: ProgressReporter = async (
        message,
        value,
        level = "info",
      ) => {
        console.log(`   ${message}`);
        await queue.event(command.id, message, value, level);
      };

      try {
        await progress("Command received by Windows worker", 2);
        await executeCommand(command.raw_command, progress);
        await queue.complete(command.id);
        console.log(`✅ Web command #${command.queue_number} complete`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);

        console.error(
          `❌ Web command #${command.queue_number} failed: ${message}`,
        );

        try {
          await queue.fail(command.id, message);
        } catch (reportingError) {
          console.error(
            "Could not report command failure to Supabase:",
            reportingError,
          );
        }
      }
    } catch (error) {
      console.error(
        "⚠️ Web queue polling error:",
        error instanceof Error ? error.message : String(error),
      );
      await sleep(5000);
    }
  }
}
