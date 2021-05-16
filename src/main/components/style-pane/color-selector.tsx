import React, { useEffect, useRef, useState } from 'react';
import { CirclePicker } from 'react-color';
import { ColorContainer, Color, ColorPickerContainer, Button } from './style-pane-styles';

type Props = { color?: string; onColorChange: (hex: string | undefined) => void };

const colors = [
  '#fc5c65',
  '#fd9644',
  '#fed330',
  '#26de81',
  '#2bcbba',
  '#45aaf2',
  '#4b7bec',
  '#a55eea',
  '#d1d8e0',
  '#778ca3',
  '#f1f2f6',
  'black',
];

export function ColorSelector({ onColorChange, color }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickedOutside = (event: any) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', clickedOutside);
    return () => {
      document.removeEventListener('mousedown', clickedOutside);
    };
  }, [ref]);

  const togglePopup = () => {
    setOpen(!open);
  };

  const handleColorChange = (newColor: any) => {
    onColorChange(newColor.hex);
  };

  const reset = () => {
    onColorChange(undefined);
  };

  return (
    <ColorContainer>
      <Color onClick={togglePopup} color={color} />
      {open ? (
        <ColorPickerContainer ref={ref}>
          <CirclePicker colors={colors} width="168px" onChangeComplete={handleColorChange} />
          <Button onClick={reset}>Reset</Button>
        </ColorPickerContainer>
      ) : null}
    </ColorContainer>
  );
}
