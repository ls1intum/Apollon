import React from 'react';
import styled from 'styled-components';
import { ThemedPolyline } from '../../../components/theme/themedComponents';

const StyledSvg = styled.svg`
  width: 50px;
  height: 50px;
`;

export function SfcEndComponent() {
  const sideLength = 50;
  const halfSideLength = sideLength / 2;

  return (
    <StyledSvg viewBox={`0 0 ${sideLength} ${sideLength}`}>
      <ThemedPolyline points={`0,0 0,${sideLength} ${sideLength},${halfSideLength} 0,0`} strokeWidth="2" />
    </StyledSvg>
  );
}
