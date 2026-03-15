import { Command } from "commander";

import { getActiveCanvas, listCanvases } from "../../shared/canvas-store";

export function registerListCommand(program: Command): void {
    program
        .command("list")
        .description("List local canvases")
        .action(async () => {
            const [canvases, activeCanvas] = await Promise.all([listCanvases(), getActiveCanvas()]);

            if (canvases.length === 0) {
                console.log("No canvases found.");
                return;
            }

            for (const canvas of canvases) {
                const marker = canvas.name === activeCanvas ? "*" : " ";
                console.log(`${marker} ${canvas.name} (${canvas.size}x${canvas.size}) updated ${canvas.updatedAt}`);
            }
        });
}
