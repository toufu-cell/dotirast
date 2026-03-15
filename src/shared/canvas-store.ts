import fs from "node:fs/promises";
import path from "node:path";

import { ACTIVE_CANVAS_FILE, CANVASES_DIR, DOTIRAST_DIR } from "./constants";
import type { CanvasData, CanvasSize } from "./types";

const VALID_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const VALID_SIZES = new Set<CanvasSize>([16, 32]);

function getCanvasPath(name: string): string {
    return path.join(CANVASES_DIR, `${name}.json`);
}

function getDotKey(x: number, y: number): string {
    return `${x},${y}`;
}

function parseIntStrict(value: string, fieldName: string): number {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        throw new Error(`${fieldName} must be a number.`);
    }
    return parsed;
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

function assertCoordinates(size: number, x: number, y: number): void {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
        throw new Error("Coordinates must be integers.");
    }

    if (x < 0 || x >= size || y < 0 || y >= size) {
        throw new Error(`Coordinates out of range. Use values between 0 and ${size - 1}.`);
    }
}

export async function ensureDir(): Promise<void> {
    await fs.mkdir(DOTIRAST_DIR, { recursive: true });
    await fs.mkdir(CANVASES_DIR, { recursive: true });
}

export function validateName(name: string): void {
    if (!VALID_NAME_PATTERN.test(name)) {
        throw new Error("Canvas name must match /^[a-zA-Z0-9_-]+$/.");
    }
}

export function validateSize(size: number): asserts size is CanvasSize {
    if (!VALID_SIZES.has(size as CanvasSize)) {
        throw new Error("Canvas size must be 16 or 32.");
    }
}

export async function createCanvas(name: string, size: number): Promise<CanvasData> {
    validateName(name);
    validateSize(size);
    await ensureDir();

    const canvasPath = getCanvasPath(name);
    if (await fileExists(canvasPath)) {
        throw new Error(`Canvas "${name}" already exists.`);
    }

    const timestamp = new Date().toISOString();
    const canvas: CanvasData = {
        name,
        size,
        dots: {},
        createdAt: timestamp,
        updatedAt: timestamp
    };

    await saveCanvas(canvas);
    await setActiveCanvas(name);
    return canvas;
}

export async function loadCanvas(name: string): Promise<CanvasData> {
    validateName(name);
    const canvasPath = getCanvasPath(name);
    let contents: string;

    try {
        contents = await fs.readFile(canvasPath, "utf8");
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            throw new Error(`Canvas "${name}" not found.`);
        }
        throw error;
    }

    let parsed: CanvasData;
    try {
        parsed = JSON.parse(contents) as CanvasData;
    } catch {
        throw new Error(`Canvas "${name}" data is corrupted.`);
    }

    validateSize(parsed.size);
    return parsed;
}

export async function saveCanvas(canvas: CanvasData): Promise<void> {
    validateName(canvas.name);
    validateSize(canvas.size);
    await ensureDir();

    const canvasPath = getCanvasPath(canvas.name);
    const tempPath = `${canvasPath}.${process.pid}.${Date.now()}.tmp`;
    const serialized = JSON.stringify(canvas, null, 2);

    await fs.writeFile(tempPath, serialized, "utf8");
    await fs.rename(tempPath, canvasPath);
}

export async function listCanvases(): Promise<CanvasData[]> {
    await ensureDir();
    const entries = await fs.readdir(CANVASES_DIR, { withFileTypes: true });
    const canvases = await Promise.all(
        entries
            .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
            .map((entry) => loadCanvas(entry.name.replace(/\.json$/, "")))
    );

    return canvases.sort((left, right) => left.name.localeCompare(right.name));
}

export async function getActiveCanvas(): Promise<string | null> {
    await ensureDir();

    try {
        const raw = await fs.readFile(ACTIVE_CANVAS_FILE, "utf8");
        const name = raw.trim();
        if (!name) {
            return null;
        }
        return name;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return null;
        }
        throw error;
    }
}

export async function setActiveCanvas(name: string): Promise<void> {
    validateName(name);
    await loadCanvas(name);
    await ensureDir();
    await fs.writeFile(ACTIVE_CANVAS_FILE, `${name}\n`, "utf8");
}

export async function placeDot(name: string, x: number, y: number, color: string): Promise<CanvasData> {
    const canvas = await loadCanvas(name);
    assertCoordinates(canvas.size, x, y);

    canvas.dots[getDotKey(x, y)] = color;
    canvas.updatedAt = new Date().toISOString();
    await saveCanvas(canvas);
    return canvas;
}

export async function clearDot(name: string, x: number, y: number): Promise<CanvasData> {
    const canvas = await loadCanvas(name);
    assertCoordinates(canvas.size, x, y);

    delete canvas.dots[getDotKey(x, y)];
    canvas.updatedAt = new Date().toISOString();
    await saveCanvas(canvas);
    return canvas;
}

export async function resetCanvas(name: string): Promise<CanvasData> {
    const canvas = await loadCanvas(name);
    canvas.dots = {};
    canvas.updatedAt = new Date().toISOString();
    await saveCanvas(canvas);
    return canvas;
}

export function parseCoordinates(x: string, y: string): { x: number; y: number } {
    return {
        x: parseIntStrict(x, "x"),
        y: parseIntStrict(y, "y")
    };
}
