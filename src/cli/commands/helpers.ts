import { getActiveCanvas } from "../../shared/canvas-store";

export function parseIntegerArgument(value: string, fieldName: string): number {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        throw new Error(`${fieldName} must be a number.`);
    }
    return parsed;
}

export async function requireActiveCanvas(): Promise<string> {
    const activeCanvas = await getActiveCanvas();
    if (!activeCanvas) {
        throw new Error("No active canvas. Create one with `dotirast new <name>` first.");
    }
    return activeCanvas;
}
