import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLDeploymentArtifact } from './uml-deployment-artifact';
import { ThemedPath, ThemedRect} from '../../../components/theme/themedComponents';

export const UMLDeploymentArtifactComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <g>
    <ThemedRect width="100%" height="100%" strokeColor={element.strokeColor} />
    <Text y={28 * scale} dominantBaseline="auto" fill={element.textColor}>
      {element.name}
    </Text>
    <g transform={`translate(${element.bounds.width - 26 * scale}, ${7 * scale}) scale(${scale})`}>
      <ThemedPath
        d="M 0 0 L 13 0 L 19.2 7.25 L 19.2 24 L 0 24 L 0 0 Z"
        fillColor={element.fillColor}
        strokeColor={element.strokeColor}
        strokeWidth="1.2"
        strokeMiterlimit="10"
      />
      <ThemedPath
        d="M 13 0 L 13 7.25 L 19.2 7.25"
        fillColor="none"
        strokeColor={element.strokeColor}
        strokeWidth="1.2"
        strokeMiterlimit="10"
      />
    </g>
  </g>
);

interface Props {
  element: UMLDeploymentArtifact;
  scale: number;
}
