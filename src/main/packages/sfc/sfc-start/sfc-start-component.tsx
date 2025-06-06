import { ThemedRect } from '../../../components/theme/themedComponents';
import { Text } from '../../../components/controls/text/text';
import React from 'react';
import { SfcStart } from './sfc-start';

/**
 * Component for rendering a start element in a sfc.
 * Displays a double-bordered rectangle with the element name.
 */
export function SfcStartComponent({ element }: { element: SfcStart }) {
  const innerRectBounds = { x: 5, y: 5, width: element.bounds.width - 10, height: element.bounds.height - 10 };
  return (
    <g>
      <ThemedRect x="0" y="0" width="100%" height="100%" strokeColor="none" />
      <Text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
        {element.name}
      </Text>
      <ThemedRect x="0" y="0" fillColor="none" width="100%" height="100%" strokeColor={element.strokeColor} />
      <ThemedRect
        x={innerRectBounds.x}
        y={innerRectBounds.y}
        fillColor="none"
        width={innerRectBounds.width}
        height={innerRectBounds.height}
      />
    </g>
  );
}
