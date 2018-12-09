import * as React from "react";
import { RectEdge } from "./../../../../core/geometry";

export default class RectEdgeSelect extends React.Component<Props> {
    onChange = (e: React.FormEvent<HTMLSelectElement>) => {
        this.props.onRectEdgeChange(e.currentTarget.value as RectEdge);
    };

    render() {
        return (
            <select value={this.props.edge} onChange={this.onChange}>
                <option value="TOP">Top</option>
                <option value="LEFT">Left</option>
                <option value="RIGHT">Right</option>
                <option value="BOTTOM">Bottom</option>
            </select>
        );
    }
}

interface Props {
    edge: RectEdge;
    onRectEdgeChange: (edge: RectEdge) => void;
}
