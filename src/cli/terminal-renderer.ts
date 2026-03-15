import type { CanvasData } from "../shared/types";

const EMPTY_COLOR = "#333333";

function hexToRgb(hex: string): [number, number, number] {
    const normalized = hex.replace("#", "");
    return [
        Number.parseInt(normalized.slice(0, 2), 16),
        Number.parseInt(normalized.slice(2, 4), 16),
        Number.parseInt(normalized.slice(4, 6), 16)
    ];
}

function toAnsiBlock(hex: string): string {
    const [red, green, blue] = hexToRgb(hex);
    return `\u001b[38;2;${red};${green};${blue}m██\u001b[0m`;
}

function padIndex(value: number): string {
    return value.toString().padStart(2, "0");
}

export function renderToTerminal(canvas: CanvasData): string {
    const header = ["   "];
    for (let x = 0; x < canvas.size; x += 1) {
        header.push(`${padIndex(x)} `);
    }

    const lines: string[] = [
        `${canvas.name} (${canvas.size}x${canvas.size})`,
        header.join("")
    ];

    for (let y = 0; y < canvas.size; y += 1) {
        const row = [`${padIndex(y)} `];

        for (let x = 0; x < canvas.size; x += 1) {
            const color = canvas.dots[`${x},${y}`] ?? EMPTY_COLOR;
            row.push(`${toAnsiBlock(color)} `);
        }

        lines.push(row.join(""));
    }

    return lines.join("\n");
}
