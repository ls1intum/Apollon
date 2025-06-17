import React, { useMemo } from 'react';
import { ThemedRect } from '../../../../components/theme/themedComponents';
import { Text } from '../../../../components/controls/text/text';
import { SfcActionTableRow } from './sfc-action-table-row';

interface Props {
  element: SfcActionTableRow;
  fillColor?: string;
}

/**
 * Component for rendering a row in a sfc action table.
 * Displays the action identifier and description parsed from the element's name.
 */
export const SfcActionTableRowComponent = ({ element, fillColor }: Props) => {
  const parsedValues = useMemo(() => JSON.parse(element.name), [element.name]);

  const isLengthGreaterOne = (text: string | null | undefined) => (text?.length ?? 0) > 1;

  return (
    <g>
      <ThemedRect fillColor={fillColor || element.fillColor} strokeColor="none" width="100%" height="100%" />
      <Text
        x={isLengthGreaterOne(parsedValues[0]) ? 2 : 10}
        fill={element.textColor}
        fontWeight="normal"
        textAnchor="start"
      >
        {parsedValues[0]}
      </Text>
      <Text x={40} fill={element.textColor} fontWeight="normal" textAnchor="start">
        {parsedValues[1]}
      </Text>
    </g>
  );
};
