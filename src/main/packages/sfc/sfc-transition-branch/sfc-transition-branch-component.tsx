import { ThemedCircleContrast } from '../../../components/theme/themedComponents';
import React from 'react';
import { Text } from '../../../components/controls/text/text';
import { SfcTransitionBranch } from './sfc-transition-branch';

/**
 * Component for rendering a transition branch in a sfc.
 * Displays a circular junction point where transitions can converge or diverge.
 */
export const SfcTransitionBranchComponent = ({ element }: { element: SfcTransitionBranch }) => {
  return (
    <g>
      <ThemedCircleContrast cx="10" cy="10" r="10" strokeColor="none" />
      {element.bounds.x === -1_000_000_000_000 && (
        <Text fontWeight="normal" y="30">
          {element.name}
        </Text>
      )}
    </g>
  );
};
