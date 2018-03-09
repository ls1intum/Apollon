import { Size } from "../../../geometry";

export type EditorAction = ResizeCanvasAction;

interface ResizeCanvasAction {
    type: "RESIZE_CANVAS";
    newSize: Size;
}

export function resizeCanvas(newSize: Size): ResizeCanvasAction {
    return {
        type: "RESIZE_CANVAS",
        newSize
    };
}
