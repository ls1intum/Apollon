import React, { useEffect, useRef, useState } from 'react';
import { CirclePicker } from 'react-color';
import { Color, ColorPickerContainer, Button } from './style-pane-styles';
import styled from 'styled-components';

type Props = { color?: string; onColorChange: (hex: string | undefined) => void; open: boolean };

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

const ColorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: white;
  width: 100%;
  margin-bottom: 10px;
`;

export function ColorSelector({ onColorChange, color, open }: Props) {
  // const [open, setOpen] = useState(false);
  // const ref = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   // const clickedOutside = (event: any) => {
  //   //   if (ref.current && !ref.current.contains(event.target)) {
  //   //     setOpen(false);
  //   //   }
  //   // };
  //   document.addEventListener('mousedown', clickedOutside);
  //   return () => {
  //     document.removeEventListener('mousedown', clickedOutside);
  //   };
  // }, [ref]);

  // const togglePopup = () => {
  //   setOpen(!open);
  // };

  const handleColorChange = (newColor: any) => {
    onColorChange(newColor.hex);
  };

  const reset = () => {
    onColorChange(undefined);
  };

  if (!open) return null;

  return (
    <>
      {open ? (
        <ColorContainer>
          <CirclePicker colors={colors} width="168px" onChangeComplete={handleColorChange} />
          <Button onClick={reset}>Reset</Button>
        </ColorContainer>
      ) : null}
    </>
  );
}
