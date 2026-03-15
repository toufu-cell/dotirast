import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";

import express from "express";
import rateLimit from "express-rate-limit";

import { DEFAULT_PORT } from "../shared/constants";
import { ensureDir } from "../shared/canvas-store";
import { createRoutes } from "./routes";
import { CanvasWebSocketHub } from "./websocket";

export interface ServerOptions {
    port?: number;
    host?: string;
    noAuth?: boolean;
}

export async function startServer(options: ServerOptions = {}): Promise<{ server: http.Server; token: string | null }> {
    const port = options.port ?? DEFAULT_PORT;
    const host = options.host ?? "127.0.0.1";
    const noAuth = options.noAuth ?? false;

    const token = noAuth ? null : (process.env.DOTIRAST_TOKEN || crypto.randomBytes(32).toString("hex"));

    await ensureDir();

    const app = express();
    const hub = new CanvasWebSocketHub();
    const publicDir = path.resolve(__dirname, "public");

    app.use(express.json({ limit: "1kb" }));
    app.use("/api", rateLimit({
        windowMs: 60000,
        max: 60,
        handler: (_request, response) => {
            console.warn("Rate limit exceeded.");
            response.status(429).json({ error: "Too many requests, please try again later." });
        }
    }));

    // Authentication middleware for /api routes
    if (token) {
        app.use("/api", (request, response, next) => {
            const authHeader = request.headers.authorization;
            const queryToken = request.query.token as string | undefined;

            let providedToken: string | undefined;
            if (authHeader?.startsWith("Bearer ")) {
                providedToken = authHeader.slice(7);
            } else if (queryToken) {
                providedToken = queryToken;
            }

            if (providedToken !== token) {
                console.warn({ event: "auth_failure", timestamp: new Date().toISOString() });
                response.status(401).json({ error: "Unauthorized." });
                return;
            }

            next();
        });
    }

    app.use("/api", createRoutes(hub));
    app.use(express.static(publicDir));

    // Global error handler for middleware errors (e.g., body parser failures)
    app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
        console.error("Middleware error:", error);
        const status = (error as { status?: number }).status ?? 500;

        // For body parser errors (400/413), return a generic message
        // to avoid leaking internal parser details
        let message: string;
        if (status === 413) {
            message = "Request body too large.";
        } else if (status === 400 && (error as { type?: string }).type === "entity.parse.failed") {
            message = "Invalid JSON in request body.";
        } else if (status >= 500) {
            message = "Internal server error.";
        } else {
            message = "Bad request.";
        }

        response.status(status).json({ error: message });
    });

    const server = http.createServer(app);

    server.on("upgrade", (request, socket, head) => {
        const wsUrl = new URL(request.url || "", "http://localhost");
        if (wsUrl.pathname !== "/ws") {
            socket.destroy();
            return;
        }

        // WebSocket authentication via query parameter
        if (token) {
            const wsToken = wsUrl.searchParams.get("token");
            if (wsToken !== token) {
                console.warn({ event: "auth_failure", timestamp: new Date().toISOString() });
                socket.destroy();
                return;
            }
        }

        hub.handleUpgrade(request, socket, head);
    });

    await new Promise<void>((resolve) => {
        server.listen(port, host, resolve);
    });

    return { server, token };
}
