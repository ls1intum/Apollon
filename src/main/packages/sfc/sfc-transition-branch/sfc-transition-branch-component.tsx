import { ThemedCircleContrast } from '../../../components/theme/themedComponents';
import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { SfcTransitionBranch } from './sfc-transition-branch';

/**
 * Component for rendering a transition branch in a sfc.
 * Displays a circular junction point where transitions can converge or diverge.
 */
export const SfcTransitionBranchComponent: FunctionComponent<{ element: SfcTransitionBranch }> = ({ element }) => {
  return (
    <g>
      <ThemedCircleContrast cx="10" cy="10" r="10" strokeColor="none" />
      {element.bounds.x === -1_000_000_000_000 && (
        <Text fontWeight="normal" y="30" fill="gray">
          {element.name}
        </Text>
      )}
    </g>
  );
};
