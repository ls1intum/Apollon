import React, { Component } from 'react';
import styled from 'styled-components';
import Container from './../../Container';

class Package extends Container {
  constructor(public name: string = 'Package') {
    super(name);
  }
}

const Background = styled(({ component, ...props }) => React.cloneElement(component, props))``;

const StyledContainer = styled.svg`
  overflow: visible;

  ${Background} {
    fill: ${({ theme }) => theme.background || 'white'};
  }
`;

export class PackageComponent extends Component<Props> {
  render() {
    const { element, children } = this.props;
    const { width, height } = element.bounds;
    return (
      <StyledContainer width={width} height={height}>
        <Background component={<path />} d={`M 0 10 V 0 H 40 V 10`} fill="#ffffff" stroke="#000000" />
        <Background component={<rect />} y="10" width="100%" height={height - 10} stroke="#000000" />
        {children}
      </StyledContainer>
    );
  }
}

interface Props {
  element: Package;
}

export default Package;
