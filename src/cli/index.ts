#!/usr/bin/env node

import { Command } from "commander";

import { registerClearCommand } from "./commands/clear";
import { registerListCommand } from "./commands/list";
import { registerNewCommand } from "./commands/new";
import { registerPlaceCommand } from "./commands/place";
import { registerResetCommand } from "./commands/reset";
import { registerServeCommand } from "./commands/serve";
import { registerShowCommand } from "./commands/show";

async function main(): Promise<void> {
    const program = new Command();

    program.name("dotirast").description("CLI-driven pixel art with real-time browser updates").version("0.1.0");

    registerServeCommand(program);
    registerNewCommand(program);
    registerPlaceCommand(program);
    registerClearCommand(program);
    registerResetCommand(program);
    registerShowCommand(program);
    registerListCommand(program);

    await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    console.error(`dotirast error: ${message}`);
    process.exitCode = 1;
});
