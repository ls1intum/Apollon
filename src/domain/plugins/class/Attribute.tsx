import React, { Component } from 'react';
import styled from 'styled-components';
import Element from './../../Element';
import Boundary from '../../geo/Boundary';

class Attribute extends Element {
  bounds: Boundary = { ...this.bounds, height: 30 };

  constructor(public name: string = ' + attribute : Type') {
    super(name);
  }
}

const Background = styled.rect``;

const Container = styled.svg`
  overflow: visible;

  ${Background} {
    fill: ${({ theme }) => theme.background || 'none'};
  }
`;

export class AttributeComponent extends Component<Props> {
  render() {
    const { element, children } = this.props;
    const { width, height } = element.bounds;
    return (
      <Container width={width} height={height}>
        <Background width="100%" height="100%" stroke="none" />
        <text x={20} y="50%" dominantBaseline="middle">
          {element.name}
        </text>
      </Container>
    );
  }
}

interface Props {
  element: Attribute;
}

export default Attribute;
