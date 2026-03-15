import { Command } from "commander";

import { DEFAULT_PORT } from "../../shared/constants";
import { startServer } from "../../server";

export function registerServeCommand(program: Command): void {
    program
        .command("serve")
        .description("Start the dotirast server")
        .option("-p, --port <port>", "Port to listen on", `${DEFAULT_PORT}`)
        .option("-H, --host <host>", "Host to bind to", "127.0.0.1")
        .option("--no-auth", "Disable token authentication")
        .action(async (options: { port: string; host: string; auth: boolean }) => {
            const port = Number.parseInt(options.port, 10);
            if (Number.isNaN(port)) {
                throw new Error("Port must be a number.");
            }

            const host = options.host;

            if (host === "0.0.0.0") {
                console.warn("WARNING: Server is listening on all interfaces. Use with caution on untrusted networks.");
            }

            const { token } = await startServer({ port, host, noAuth: !options.auth });
            console.log(`dotirast server listening on http://${host}:${port}`);
            if (token) {
                console.log(`Authentication token: ${token}`);
                console.log(`Browser URL: http://${host}:${port}?token=${token}`);
                console.log(`For CLI commands, use: export DOTIRAST_TOKEN=${token}`);
            }
        });
}
