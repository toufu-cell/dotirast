import { Command } from "commander";

import { requireActiveCanvas } from "./helpers";
import { apiRequest, isServerUnavailable } from "./http";

export function registerClearCommand(program: Command): void {
    program
        .command("clear")
        .argument("<x>", "X coordinate")
        .argument("<y>", "Y coordinate")
        .description("Clear a dot from the active canvas")
        .option("-t, --token <token>", "Authentication token")
        .action(async (xArg: string, yArg: string, options: { token?: string }) => {
            const canvas = await requireActiveCanvas();
            const x = Number.parseInt(xArg, 10);
            const y = Number.parseInt(yArg, 10);

            if (Number.isNaN(x) || Number.isNaN(y)) {
                throw new Error("x and y must be numbers.");
            }

            try {
                await apiRequest("DELETE", `/api/canvases/${encodeURIComponent(canvas)}/dots/${x}/${y}`, undefined, undefined, options.token);
            } catch (error) {
                if (isServerUnavailable(error)) {
                    throw new Error("dotirast server is required for `clear`. Start it with `dotirast serve`.");
                }
                throw error;
            }

            console.log(`Cleared (${x}, ${y}) on "${canvas}".`);
        });
}
