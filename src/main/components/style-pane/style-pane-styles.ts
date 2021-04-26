import styled from 'styled-components';

type Props = {
  color?: string;
};

export const ColorContainer = styled.div`
  position: relative;
`;

export const Color = styled.button.attrs<Props>({})<Props>`
  height: 28px;
  width: 28px;
  background-color: ${({ color }: Props) => color || 'black'};
  border-radius: 14px;
  cursor: pointer;
  position: absolute;
  top: 0;
  right: 0;
  border: none;
`;

export const Row = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #353d47;
  &:last-of-type {
    border-bottom: none;
  }
`;

export const ColorPickerContainer = styled.div`
  position: absolute;
  top: 40px;
  right: -8px;
  background-color: white;
  z-index: 2;
  border: 2px solid #353d47;
  padding: 16px;
  border-radius: 5px;
  &::after {
    border-radius: 2px;
    content: '';
    position: absolute;
    height: 16px;
    width: 16px;
    top: -9.5px;
    right: 14px;
    border: 2px solid #353d47;
    border-left: none;
    border-bottom: none;
    transform: rotate(-45deg);
    background-color: white;
  }
`;
