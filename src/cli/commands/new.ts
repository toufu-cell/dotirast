import { Command } from "commander";

import { createCanvas } from "../../shared/canvas-store";
import type { CanvasData, CanvasSize } from "../../shared/types";
import { apiRequest, isServerUnavailable } from "./http";

export function registerNewCommand(program: Command): void {
    program
        .command("new")
        .argument("<name>", "Canvas name")
        .description("Create a new canvas and set it active")
        .option("-s, --size <size>", "Canvas size (16 or 32)", "16")
        .option("-t, --token <token>", "Authentication token")
        .action(async (name: string, options: { size: string; token?: string }) => {
            const size = Number.parseInt(options.size, 10) as CanvasSize;

            try {
                const canvas = await apiRequest<CanvasData>("POST", "/api/canvases", { name, size }, undefined, options.token);
                console.log(`Created canvas "${canvas.name}" (${canvas.size}x${canvas.size}) via server.`);
            } catch (error) {
                if (!isServerUnavailable(error)) {
                    throw error;
                }

                const canvas = await createCanvas(name, size);
                console.log(`Created canvas "${canvas.name}" (${canvas.size}x${canvas.size}) locally.`);
            }
        });
}
