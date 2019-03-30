import { HTMLAttributes, ReactNode } from 'react';
import styled from 'styled-components';

export type Props = { value: any; children: ReactNode } & HTMLAttributes<
  HTMLElement
>;

export const DropdownItem = styled.div<Props>`
  display: block;
  width: 100%;
  padding: 0.25rem 1.5rem;
  clear: both;
  font-weight: 400;
  color: #212529;
  text-align: inherit;
  white-space: nowrap;
  background-color: transparent;
  border: 0;
`;
