export type CanvasSize = 16 | 32;

export type DotMap = Record<string, string>;

export interface CanvasData {
    name: string;
    size: CanvasSize;
    dots: DotMap;
    createdAt: string;
    updatedAt: string;
}

export interface DotMessage {
    type: "dot";
    canvas: string;
    x: number;
    y: number;
    color: string;
}

export interface ClearMessage {
    type: "clear";
    canvas: string;
    x: number;
    y: number;
}

export interface ResetMessage {
    type: "reset";
    canvas: string;
}

export interface InitMessage {
    type: "init";
    canvas: CanvasData;
}

export type WSMessage = DotMessage | ClearMessage | ResetMessage | InitMessage;
