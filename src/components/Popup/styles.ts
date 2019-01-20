import styled from 'styled-components';
import { Point } from '../../domain/geo';

export const Container = styled.div<Point>`
  position: absolute;
  left: ${({ x }) => x}px;
  top: ${({ y }) => y}px;
  width: 250px;
  padding: 5px;
  background: white;
  border: 1px solid black;
`;

export const Input = styled.input`
  display: block;
  width: 100%;
  font-size: 0.9rem;
  padding: 5px 8px;
  border: 1px solid #ccc;
  border-radius: 3px;
`;