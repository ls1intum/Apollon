import React from 'react';
import styled from 'styled-components';

export enum Direction {
  NW = 'nw',
  N = 'n',
  NE = 'ne',
  W = 'w',
  E = 'e',
  SW = 'sw',
  S = 's',
  SE = 'se',
}

const ResizeHandler = ({ direction, ...rest }: Props) => {
  let x = '0%';
  let y = '0%';

  switch (direction) {
    case Direction.N:
    case Direction.S:
      x = '50%';
      break;
    case Direction.NE:
    case Direction.E:
    case Direction.SE:
      x = '100%';
      break;
  }
  switch (direction) {
    case Direction.W:
    case Direction.E:
      y = '50%';
      break;
    case Direction.SW:
    case Direction.S:
    case Direction.SE:
      y = '100%';
      break;
  }

  return (
    <image
      style={{ cursor: `${direction}-resize` }}
      x={x}
      y={y}
      width={18}
      height={18}
      href="data:image/svg+xml;base64,PCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj48c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIxOHB4IiBoZWlnaHQ9IjE4cHgiIHZlcnNpb249IjEuMSI+PGNpcmNsZSBjeD0iOSIgY3k9IjkiIHI9IjUiIHN0cm9rZT0iI2ZmZiIgZmlsbD0iIzI5YjZmMiIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+"
      preserveAspectRatio="none"
      {...rest}
    />
  );
};

interface OwnProps {
  direction: Direction;
}

type Props = React.SVGProps<SVGImageElement> & OwnProps;

export default ResizeHandler;
