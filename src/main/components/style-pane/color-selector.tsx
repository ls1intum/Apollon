import React, { useEffect, useRef, useState } from 'react';
import { CirclePicker } from 'react-color';
import { ColorContainer, Color, ColorPickerContainer } from './style-pane-styles';

type Props = { color?: string; onColorChange: (hex: string) => void };

export function ColorSelector({ onColorChange, color }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const togglePopup = () => {
    setOpen(!open);
  };

  const handleColorChange = (newColor: any) => {
    onColorChange(newColor.hex);
  };

  return (
    <ColorContainer>
      <Color onClick={togglePopup} color={color} />
      {open ? (
        <ColorPickerContainer ref={ref}>
          <CirclePicker width="168px" onChangeComplete={handleColorChange} />
        </ColorPickerContainer>
      ) : null}
    </ColorContainer>
  );
}
