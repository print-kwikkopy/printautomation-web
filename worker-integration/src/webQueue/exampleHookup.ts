import type { ProgressReporter } from "./workerLoop.js";
import { runWebQueueWorker } from "./workerLoop.js";

/**
 * Replace ONLY the body of executeExistingCommand with the project's
 * existing parser/router entry point.
 *
 * Do not duplicate workflows here. The raw string from the website should
 * be handled exactly like the same string typed into the terminal.
 */
async function executeExistingCommand(
  rawCommand: string,
  progress: ProgressReporter,
): Promise<void> {
  await progress(`Executing: ${rawCommand}`, 10);

  // Example shape:
  //
  // const parsed = parseCommand(rawCommand);
  // await routeCommand(browser, parsed);
  //
  // Use the existing current project entry point here.

  throw new Error(
    "Connect executeExistingCommand() to the existing PrintAutomation parser/router.",
  );
}

void runWebQueueWorker(executeExistingCommand);
