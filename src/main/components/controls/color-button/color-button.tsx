import React from 'react';
import { css, styled } from '../../theme/styles';
import { RollerIcon } from '../icon/roller';
// const Button = styled.button`
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   padding: 0;
//   border: none;
//   width: 30px;
//   height: 30px;
//   cursor: pointer;
//   align-self: center;
//   margin-left: 5px;
//   background: none;
//   &:hover {
//     background: lightgray;
//   }
//   border-radius: 0.2em;
// `;
import { Button } from '../button/button';

const Wheel = styled.div`
  background: conic-gradient(red, orange, yellow, green, blue, green, yellow, orange, red);
  width: 80%;
  height: 80%;
  border-radius: 50%;
`;

type Props = { onClick: any };

export function ColorButton({ onClick }: Props) {
  return (
    <Button color="link" tabIndex={-1} onClick={onClick}>
      <RollerIcon />
    </Button>
  );
}
