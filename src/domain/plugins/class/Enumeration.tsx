import React, { Component } from 'react';
import styled from 'styled-components';
import Container from './../../Container';
import Boundary from '../../geo/Boundary';
import Attribute from './Attribute';

class Enumeration extends Container {
  bounds: Boundary = { ...this.bounds, height: 140 };

  constructor(public name: string = 'Enumeration') {
    super(name);

    // const attribute1 = new Attribute('Case1');
    // attribute1.bounds.y = 50;
    // attribute1.owner = this.id;
    // const attribute2 = new Attribute('Case2');
    // attribute2.bounds.y = 80;
    // attribute2.owner = this.id;
    // const attribute3 = new Attribute('Case3');
    // attribute3.bounds.y = 110;
    // attribute3.owner = this.id;
    // this.ownedElements = [attribute1, attribute2, attribute3];
  }
}

const Background = styled.rect``;

const StyledContainer = styled.svg`
  overflow: visible;

  ${Background} {
    fill: ${({ theme }) => theme.background || 'white'};
  }
`;

export class EnumerationComponent extends Component<Props> {
  render() {
    const { element, children } = this.props;
    const { width, height } = element.bounds;
    return (
      <StyledContainer width={width} height={height}>
        <Background width={width} height={height} stroke="black" />
        <svg width={width} height={50} style={{ pointerEvents: 'none' }}>
          <g transform="translate(0, -1)">
            <rect y="100%" width="100%" height="1" fill="black" />
          </g>
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle">
            <tspan x="50%" dy={-8} textAnchor="middle" fontSize="85%">
              «enumeration»
            </tspan>
            <tspan x="50%" dy={18} textAnchor="middle">
              {element.name}
            </tspan>
          </text>
        </svg>

        {children}
      </StyledContainer>
    );
  }
}

interface Props {
  element: Enumeration;
}

export default Enumeration;
