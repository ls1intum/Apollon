import React from 'react';
import { ThemedRect } from '../../../components/theme/themedComponents';
import { SfcActionTable } from './sfc-action-table';

interface Props {
  element: SfcActionTable;
  children?: React.ReactNode;
}

export function SfcActionTableComponent({ element, children }: Props) {
  return (
    <g>
      <ThemedRect width="100%" height="100%" />

      {children}

      <ThemedRect fillColor="none" width="100%" height="100%" strokeColor={element.strokeColor} />
    </g>
  );
}
