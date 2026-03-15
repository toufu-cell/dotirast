import { Command } from "commander";

import { requireActiveCanvas } from "./helpers";
import { apiRequest, isServerUnavailable } from "./http";

export function registerResetCommand(program: Command): void {
    program
        .command("reset")
        .description("Reset the active canvas")
        .option("-t, --token <token>", "Authentication token")
        .action(async (options: { token?: string }) => {
            const canvas = await requireActiveCanvas();
            try {
                await apiRequest("POST", `/api/canvases/${encodeURIComponent(canvas)}/reset`, undefined, undefined, options.token);
            } catch (error) {
                if (isServerUnavailable(error)) {
                    throw new Error("dotirast server is required for `reset`. Start it with `dotirast serve`.");
                }
                throw error;
            }

            console.log(`Reset "${canvas}".`);
        });
}
