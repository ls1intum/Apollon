import { MouseEvent, createContext } from 'react';
import Port, { Connection } from './../../domain/Port';

interface ConnectContext {
  isDragging: boolean;
  onStartConnect: (port: Port) => (event: MouseEvent) => Promise<Connection>;
  onEndConnect: (port: Port) => (event: MouseEvent) => void;
}

export const {
  Consumer: ConnectConsumer,
  Provider: ConnectProvider,
} = createContext<ConnectContext | null>(null);

export default ConnectContext;
