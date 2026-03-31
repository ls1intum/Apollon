import { ThemedCircleContrast } from '../../../components/theme/themedComponents';
import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { SfcTransitionBranch } from './sfc-transition-branch';

/**
 * Component for rendering a transition branch in a sfc.
 * Displays a circular junction point where transitions can converge or diverge.
 */
export const SfcTransitionBranchComponent: FunctionComponent<{ element: SfcTransitionBranch }> = ({ element }) => {
  const centerX = element.bounds.width / 2;
  const centerY = element.bounds.height / 2;

  return (
    <g>
      <ThemedCircleContrast cx={centerX} cy={centerY} r="10" strokeColor="none" />
      {element.bounds.x === -1_000_000_000_000 && (
        <Text fontWeight="normal" y={element.bounds.height + 10} fill="gray">
          {element.name}
        </Text>
      )}
    </g>
  );
};
