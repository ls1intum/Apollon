import * as React from "react";
import { snapToGrid } from "./../../core/geometry";

const resizeHandleStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    right: -10,
    bottom: 0,
    width: 20,
    cursor: "col-resize"
};

export default class ResizeHandle extends React.Component<Props, State> {
    state: State = {
        isResizing: false,
        dx: 0,
        x: 0
    };

    div: HTMLDivElement | null = null;

    onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (this.div === null) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const { left, width } = this.div.getBoundingClientRect();

        this.setState({
            isResizing: true,
            x: left + width / 2
        });

        this.props.onResizeBegin();

        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener(
            "mouseup",
            () => {
                this.props.onResizeEnd(this.state.dx);
                window.removeEventListener("mousemove", this.onMouseMove);
            },
            { once: true }
        );
    };

    onMouseMove = (e: MouseEvent) => {
        const dx = snapToGrid(e.clientX - this.state.x, this.props.gridSize);

        if (dx !== this.state.dx) {
            this.setState({ dx });
            this.props.onResizeMove(dx);
        }
    };

    render() {
        return (
            <div
                ref={ref => (this.div = ref)}
                style={resizeHandleStyle}
                onMouseDown={this.onMouseDown}
            />
        );
    }
}

interface Props {
    gridSize: number;
    initialWidth: number;
    onResizeBegin: () => void;
    onResizeMove: (dx: number) => void;
    onResizeEnd: (dx: number) => void;
}

interface State {
    isResizing: boolean;
    x: number;
    dx: number;
}
