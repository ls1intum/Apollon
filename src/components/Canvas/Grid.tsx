import * as React from "react";

const darkGridColor = "#E5E5E5";
const lightGridColor = "#F5F5F5";

const subdivisions = 4;

export default class Grid extends React.PureComponent<Props> {
    render() {
        const largeSquareSize = this.props.gridSize * subdivisions;

        return (
            <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                <defs>
                    <pattern
                        id="tile"
                        x="0"
                        y="0"
                        width={largeSquareSize}
                        height={largeSquareSize}
                        patternUnits="userSpaceOnUse"
                    >
                        <rect
                            x="0"
                            y="0"
                            width={largeSquareSize}
                            height={largeSquareSize}
                            fill="white"
                        />
                        {this.renderGridLines()}
                    </pattern>
                </defs>

                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="url(#tile)"
                    patternUnits="userSpaceOnUse"
                />
            </svg>
        );
    }

    renderGridLines() {
        const lines: JSX.Element[] = [];

        const { gridSize } = this.props;
        const largeSquareSize = gridSize * subdivisions;

        // Light horizontal lines
        for (let i = 1; i < subdivisions; i++) {
            const y = i * gridSize - 0.5;

            lines.push(
                <line
                    key={`horizontal-light-line-${i}`}
                    x1={0}
                    y1={y}
                    x2={largeSquareSize}
                    y2={y}
                    stroke={lightGridColor}
                    strokeWidth="1"
                />
            );
        }

        // Light vertical lines
        for (let i = 1; i < subdivisions; i++) {
            const x = i * gridSize - 0.5;

            lines.push(
                <line
                    key={`vertical-light-line-${i}`}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={largeSquareSize}
                    stroke={lightGridColor}
                    strokeWidth="1"
                />
            );
        }

        // Dark horizontal line
        lines.push(
            <line
                key="horizontal-dark-line"
                x1={0}
                y1={largeSquareSize - 0.5}
                x2={largeSquareSize}
                y2={largeSquareSize - 0.5}
                stroke={darkGridColor}
                strokeWidth="1"
            />
        );

        // Dark vertical line
        lines.push(
            <line
                key="vertical-dark-line"
                x1={largeSquareSize - 0.5}
                y1={0}
                x2={largeSquareSize - 0.5}
                y2={largeSquareSize}
                stroke={darkGridColor}
                strokeWidth="1"
            />
        );

        return lines;
    }
}

interface Props {
    gridSize: number;
}
