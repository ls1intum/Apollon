import * as React from "react";

export default class Svg extends React.Component<Props> {
    render() {
        const { width, height, fontFamily, fontSize = "16px", children } = this.props;

        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={width}
                height={height}
                fontFamily={fontFamily}
                fontSize={fontSize}
                fill="white"
            >
                <defs>
                <style>{`text { fill: black }`}</style>
                </defs>
                {children}
            </svg>
        );
    }
}

interface Props {
    width: number;
    height: number;
    fontFamily: string;
    fontSize?: string;
}
