import React from 'react';
import { styled } from '../../theme/styles';

const FloatingButtonContainer = styled.g.attrs((props) => ({
  ...props,
}))`
  transition: all 180ms ease-in-out;
  pointer-events: all;

  path {
    pointer-events: all;
    fill: var(--apollon-primary-contrast);
  }
  rect {
    pointer-events: all;
    fill: var(--apollon-background);
    stroke: var(--apollon-gray);
  }
  :hover {
    transform: translate(0px, -30px);
  }
  :active {
    transform: translate(0px, -30px);
  }
  :hover rect {
    fill: var(--apollon-gray);
    stroke: var(--apollon-gray-variant);
  }
  :active rect {
    fill: var(--apollon-gray);
    stroke: var(--apollon-gray-variant);
  }
`;

export interface FloatingButtonProps {
  style?: React.CSSProperties | undefined;
  children?: React.ReactNode;
  onClick?: () => void;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({ children, ...props }) => {
  return (
    <FloatingButtonContainer {...props}>
      <rect height={30} width={30} rx="0.25rem" ry="0.25rem" />
      {children}
    </FloatingButtonContainer>
  );
};
