import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { Arrow, PopoverBody, PopoverContainer } from './popover-styles';

export type Props = {
  children?: ReactNode;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  alignment?: 'start' | 'center' | 'end';
  position: { x: number; y: number };
  maxHeight?: number;
} & HTMLAttributes<HTMLDivElement>;

export const Popover = forwardRef<HTMLDivElement, Props>(
  ({ children, placement = 'right', alignment = 'center', maxHeight, ...props }, ref) => (
    <PopoverContainer ref={ref} placement={placement} alignment={alignment} {...props}>
      <Arrow placement={placement} alignment={alignment} />
      <PopoverBody maxHeight={maxHeight}>{children}</PopoverBody>
    </PopoverContainer>
  ),
);
