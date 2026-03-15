import { Command } from "commander";

import { loadCanvas } from "../../shared/canvas-store";
import { renderToTerminal } from "../terminal-renderer";
import { requireActiveCanvas } from "./helpers";

export function registerShowCommand(program: Command): void {
    program
        .command("show")
        .description("Render the active canvas in the terminal")
        .action(async () => {
            const canvasName = await requireActiveCanvas();
            const canvas = await loadCanvas(canvasName);
            console.log(renderToTerminal(canvas));
        });
}
