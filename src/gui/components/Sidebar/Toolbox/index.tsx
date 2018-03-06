import * as React from "react";
import DragPreviews from "./DragPreviews";

export default class Toolbox extends React.Component {
    render() {
        return (
            <div>
                <h2>Entities</h2>
                <DragPreviews />
            </div>
        );
    }
}
