import { MouseEvent, createContext } from 'react';
import Port from './../../domain/Port';

interface ConnectContext {
  isDragging: boolean;
  onStartConnect: (port: Port) => (event: MouseEvent) => void;
  onEndConnect: (port: Port) => (event: MouseEvent) => void;
}

export const { Consumer, Provider } = createContext<ConnectContext | null>(
  null
);

export default ConnectContext;
