import React, { FunctionComponent } from 'react';
import { ThemedLine, ThemedRect } from '../../../components/theme/themedComponents';
import { SfcActionTable } from './sfc-action-table';

interface Props {
  element: SfcActionTable;
  children?: React.ReactNode;
}

/**
 * Component for rendering a sfc action table.
 * Displays a grid with horizontal and vertical lines for organizing action rows.
 */
export const SfcActionTableComponent: FunctionComponent<Props> = ({ element, children }) => {
  const numberOfLines = Math.floor(element.bounds.height / 30) - 1;
  const horizontalLines = Array.from({ length: numberOfLines }, (_, index) => (index + 1) * 30);

  return (
    <g>
      <ThemedRect width="100%" height="100%" strokeColor="none" />
      {children}

      {horizontalLines.map((y) => (
        <ThemedLine key={y} x1={0} y1={y} x2={element.bounds.width} y2={y} stroke={element.strokeColor} />
      ))}

      <ThemedLine x1={30} y1={0} x2={30} y2={element.bounds.height} stroke={element.strokeColor} />

      <ThemedRect fillColor="none" width="100%" height="100%" strokeColor={element.strokeColor} />
    </g>
  );
};
