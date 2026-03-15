import http from "node:http";

import WebSocket, { WebSocketServer } from "ws";

import { loadCanvas, validateName } from "../shared/canvas-store";
import type { WSMessage } from "../shared/types";

type Subscriber = {
    canvasName: string;
    socket: WebSocket;
    ip: string;
};

const MAX_SUBSCRIBERS = 100;
const MAX_CONNECTIONS_PER_IP = 10;

export class CanvasWebSocketHub {
    private readonly wss: WebSocketServer;

    private readonly subscribers = new Set<Subscriber>();

    private readonly ipConnections = new Map<string, number>();

    constructor() {
        this.wss = new WebSocketServer({ noServer: true });

        this.wss.on("connection", async (socket, request) => {
            if (this.subscribers.size >= MAX_SUBSCRIBERS) {
                socket.close(1013, "Server is at capacity.");
                return;
            }

            const ip = request.socket.remoteAddress || "unknown";
            const currentIpCount = this.ipConnections.get(ip) || 0;
            if (currentIpCount >= MAX_CONNECTIONS_PER_IP) {
                socket.close(1013, "Too many connections from this IP.");
                return;
            }
            this.ipConnections.set(ip, currentIpCount + 1);

            const canvasName = this.getCanvasName(request);
            if (!canvasName) {
                this.ipConnections.set(ip, (this.ipConnections.get(ip) || 1) - 1);
                socket.close(1008, "Invalid or missing canvas query parameter.");
                return;
            }

            const subscriber: Subscriber = { canvasName, socket, ip };
            this.subscribers.add(subscriber);

            socket.on("close", () => {
                this.subscribers.delete(subscriber);
                const count = (this.ipConnections.get(ip) || 1) - 1;
                if (count <= 0) {
                    this.ipConnections.delete(ip);
                } else {
                    this.ipConnections.set(ip, count);
                }
            });

            try {
                const canvas = await loadCanvas(canvasName);
                this.send(socket, {
                    type: "init",
                    canvas
                });
            } catch (error) {
                console.error("Canvas load error:", error);
                this.send(socket, {
                    type: "reset",
                    canvas: canvasName
                });
                socket.close(1011, "Canvas load failed.");
            }
        });
    }

    handleUpgrade(request: http.IncomingMessage, socket: import("node:net").Socket, head: Buffer): void {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit("connection", ws, request);
        });
    }

    broadcast(canvasName: string, message: WSMessage): void {
        const payload = JSON.stringify(message);

        for (const subscriber of this.subscribers) {
            if (subscriber.canvasName !== canvasName) {
                continue;
            }

            if (subscriber.socket.readyState === WebSocket.OPEN) {
                subscriber.socket.send(payload);
            }
        }
    }

    private getCanvasName(request: http.IncomingMessage): string | null {
        if (!request.url) {
            return null;
        }

        const url = new URL(request.url, "http://localhost");
        const canvasName = url.searchParams.get("canvas");
        if (!canvasName) {
            return null;
        }

        try {
            validateName(canvasName);
        } catch {
            return null;
        }

        return canvasName;
    }

    private send(socket: WebSocket, message: WSMessage): void {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    }
}
