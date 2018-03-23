import * as React from "react";

export default class Translate extends React.Component<Props> {
    render() {
        const { dx, dy, children } = this.props;
        const translateTransform = `translate(${dx} ${dy})`;

        return <g transform={translateTransform}>{children}</g>;
    }
}

interface Props {
    dx: number;
    dy: number;
}
