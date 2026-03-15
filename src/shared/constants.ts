import os from "node:os";
import path from "node:path";

export const DEFAULT_PORT = 3000;
export const DOTIRAST_DIR = path.join(os.homedir(), ".dotirast");
export const CANVASES_DIR = path.join(DOTIRAST_DIR, "canvases");
export const ACTIVE_CANVAS_FILE = path.join(DOTIRAST_DIR, "active-canvas");
