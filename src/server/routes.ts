import { Router } from "express";

import {
    clearDot,
    createCanvas,
    getActiveCanvas,
    listCanvases,
    loadCanvas,
    parseCoordinates,
    placeDot,
    resetCanvas
} from "../shared/canvas-store";
import type { CanvasWebSocketHub } from "./websocket";

const KNOWN_CLIENT_ERROR_PATTERNS = [
    "already exists",
    "not found",
    "must match",
    "must be",
    "out of range"
];

function isKnownClientError(message: string): boolean {
    return KNOWN_CLIENT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

function respondWithError(error: unknown, response: import("express").Response): void {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("already exists")) {
        response.status(409).json({ error: message });
        return;
    }

    if (message.includes("not found")) {
        response.status(404).json({ error: message });
        return;
    }

    if (message.includes("data is corrupted")) {
        console.error("Canvas corruption detected:", error);
        response.status(500).json({ error: message });
        return;
    }

    if (isKnownClientError(message)) {
        response.status(400).json({ error: message });
        return;
    }

    // Unknown error: log details server-side, return generic message to client
    console.error("Unexpected error:", error);
    response.status(500).json({ error: "Internal server error." });
}

export function createRoutes(hub: CanvasWebSocketHub): Router {
    const router = Router();

    router.post("/canvases", async (request, response) => {
        try {
            const { name, size } = request.body as { name?: string; size?: number };
            const canvas = await createCanvas(name ?? "", size ?? NaN);
            response.status(201).json(canvas);
        } catch (error) {
            respondWithError(error, response);
        }
    });

    router.post("/canvases/:name/dots", async (request, response) => {
        try {
            const { name } = request.params;
            const { x, y, color } = request.body as { x?: number; y?: number; color?: string };

            if (!/^#[0-9a-fA-F]{6}$/.test(color ?? "")) {
                throw new Error("Color must match /^#[0-9a-fA-F]{6}$/.");
            }

            await placeDot(name, x ?? NaN, y ?? NaN, color!);
            hub.broadcast(name, {
                type: "dot",
                canvas: name,
                x: x!,
                y: y!,
                color: color!
            });

            response.status(200).json({ ok: true });
        } catch (error) {
            respondWithError(error, response);
        }
    });

    router.delete("/canvases/:name/dots/:x/:y", async (request, response) => {
        try {
            const { name, x, y } = request.params;
            const coordinates = parseCoordinates(x, y);
            await clearDot(name, coordinates.x, coordinates.y);

            hub.broadcast(name, {
                type: "clear",
                canvas: name,
                x: coordinates.x,
                y: coordinates.y
            });

            response.status(200).json({ ok: true });
        } catch (error) {
            respondWithError(error, response);
        }
    });

    router.post("/canvases/:name/reset", async (request, response) => {
        try {
            const { name } = request.params;
            await resetCanvas(name);

            hub.broadcast(name, {
                type: "reset",
                canvas: name
            });

            response.status(200).json({ ok: true });
        } catch (error) {
            respondWithError(error, response);
        }
    });

    router.get("/canvases/:name", async (request, response) => {
        try {
            const canvas = await loadCanvas(request.params.name);
            response.status(200).json(canvas);
        } catch (error) {
            respondWithError(error, response);
        }
    });

    router.get("/canvases", async (_request, response) => {
        try {
            const [canvases, activeCanvas] = await Promise.all([listCanvases(), getActiveCanvas()]);
            response.status(200).json({
                activeCanvas,
                canvases: canvases.map((canvas) => ({
                    ...canvas,
                    active: canvas.name === activeCanvas
                }))
            });
        } catch (error) {
            respondWithError(error, response);
        }
    });

    return router;
}
