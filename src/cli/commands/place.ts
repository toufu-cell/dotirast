import { Command } from "commander";

import { requireActiveCanvas } from "./helpers";
import { apiRequest, isServerUnavailable } from "./http";

const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function registerPlaceCommand(program: Command): void {
    program
        .command("place")
        .argument("<x>", "X coordinate")
        .argument("<y>", "Y coordinate")
        .argument("<color>", "Hex color like #10b981")
        .description("Place a colored dot on the active canvas")
        .option("-t, --token <token>", "Authentication token")
        .action(async (xArg: string, yArg: string, color: string, options: { token?: string }) => {
            if (!COLOR_PATTERN.test(color)) {
                throw new Error("Color must match /^#[0-9a-fA-F]{6}$/.");
            }

            const canvas = await requireActiveCanvas();
            const x = Number.parseInt(xArg, 10);
            const y = Number.parseInt(yArg, 10);

            if (Number.isNaN(x) || Number.isNaN(y)) {
                throw new Error("x and y must be numbers.");
            }

            try {
                await apiRequest("POST", `/api/canvases/${encodeURIComponent(canvas)}/dots`, {
                    x,
                    y,
                    color
                }, undefined, options.token);
            } catch (error) {
                if (isServerUnavailable(error)) {
                    throw new Error("dotirast server is required for `place`. Start it with `dotirast serve`.");
                }
                throw error;
            }

            console.log(`Placed ${color} at (${x}, ${y}) on "${canvas}".`);
        });
}
