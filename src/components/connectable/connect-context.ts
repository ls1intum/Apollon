import { createContext, MouseEvent } from 'react';
import { Port } from '../../services/element/port';
import { Connection } from '../../services/relationship/connection';

export interface ConnectContext {
  isDragging: boolean;
  onStartConnect: (port: Port) => (event: MouseEvent) => Promise<Connection>;
  onEndConnect: (port: Port) => (event: MouseEvent) => void;
}

export const {
  Consumer: ConnectConsumer,
  Provider: ConnectProvider,
} = createContext<ConnectContext | null>(null);
