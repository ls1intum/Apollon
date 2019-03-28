import styled from 'styled-components';
import { Point } from '../../utils/geometry/point';

export const Container = styled.div<{ x: number; y: number }>`
  position: absolute;
  left: ${({ x }) => x + 21}px;
  top: ${({ y }) => y}px;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.2));
`;

export const Content = styled.div`
  width: 275px;
  max-height: 650px;
  overflow-y: scroll;
  border: 1px solid #d0d0d0;
  border-radius: 5px;
  background: #efefef;
  padding: 10px;
`;

export const Arrow = styled.div`
  position: absolute;
  top: 9px;
  left: -21px;

  &:after,
  &:before {
    content: '';
    display: block;
    position: absolute;
    left: 0;
    width: 0;
    height: 0;
    border-style: solid;
  }

  &:after {
    top: 1px;
    left: 2px;
    border-color: transparent #efefef transparent transparent;
    border-width: 10px;
  }

  &:before {
    top: 0px;
    border-color: transparent #d0d0d0 transparent transparent;
    border-width: 11px;
  }
`;
