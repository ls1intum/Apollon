import React, { FunctionComponent } from 'react';
import { ColorLegend } from './color-legend';
import { ThemedPath } from '../../../components/theme/themedComponents';
import { CodeBlock } from '../../../components/code-block/code-block';

export const ColorLegendComponent: FunctionComponent<Props> = ({ element, fillColor }) => (
  <g>
    <ThemedPath
      d={`M 0 0 L ${element.bounds.width} 0 L ${element.bounds.width} ${element.bounds.height} L 0 ${element.bounds.height} Z`}
      fillColor={fillColor || element.fillColor}
      strokeColor={element.strokeColor}
      strokeWidth="1.2"
    />
    <foreignObject
      x={8}
      y={8}
      width={element.bounds.width - 16}
      height={element.bounds.height - 16}
      style={{ overflow: 'hidden', pointerEvents: 'none' }}
    >
      <div style={{ width: '100%', height: '100%', position: 'relative', pointerEvents: 'none' }}>
        <CodeBlock
          code={element.text}
          language={element.language}
          theme="vs-dark"
          fontSize={12}
          readOnly={true}
        />
      </div>
    </foreignObject>
  </g>
);

export interface Props {
  element: ColorLegend;
  fillColor?: string;
}
