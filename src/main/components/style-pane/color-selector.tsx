import React from 'react';
import { Button } from './style-pane-styles';
import styled from 'styled-components';

type Props = { color?: string; onColorChange: (hex: string | undefined) => void; open: boolean; key: string };

const colors = [
  '#fc5c65',
  '#fd9644',
  '#fed330',
  '#26de81',
  '#2bcbba',
  '#45aaf2',
  '#4b7bec',
  '#6a89cc',
  '#a55eea',
  '#d1d8e0',
  '#778ca3',
  'black',
];

const ColorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: ${(props) => props.theme.color.background};
  width: 100%;
  padding-bottom: 10px;
`;

const Flex = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
`;

type ColorProps = {
  color?: string;
  selected?: boolean;
};

const Color = styled.button.attrs<ColorProps>({})<ColorProps>`
  height: 28px;
  width: 28px;
  background-color: ${({ color }: ColorProps) => color || 'black'};
  border-radius: 14px;
  cursor: pointer;
  border: none;
  position: relative;
  margin: 10px;
  box-shadow: ${({ color, selected }: ColorProps) => (selected ? `0px 0px 10px ${color}` : 'none')};
`;

export function ColorSelector({ onColorChange, color, open, key }: Props) {
  const handleColorChange = (newColor: any) => {
    onColorChange(newColor);
  };

  const reset = () => {
    onColorChange(undefined);
  };

  if (!open) return null;

  return (
    <>
      {open ? (
        <ColorContainer>
          <Flex>
            {colors.map((colorOption) => (
              <Color
                key={key}
                color={colorOption}
                onClick={() => handleColorChange(colorOption)}
                selected={colorOption === color}
              />
            ))}
          </Flex>
          <Button onClick={reset}>Reset</Button>
        </ColorContainer>
      ) : null}
    </>
  );
}
