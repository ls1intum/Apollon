import React, { Component } from 'react';
import { ConnectContext, ConnectProvider } from './connect-context';
import { Port } from '../../services/element/port';
import { Connection } from '../../services/relationship/connection';
import { RelationshipPreview } from './relationship-preview';

export class ConnectLayer extends Component<Props, State> {
  state: State = {
    start: null,
    resolve: () => {},
    reject: () => {},
  };

  private onStartConnect = (port: Port) => (): Promise<Connection> => {
    document.addEventListener('mouseup', this.cancel, {
      once: true,
      passive: true,
    });

    return new Promise<Connection>((resolve, reject) => this.setState({ start: port, resolve, reject }));
  };

  private onEndConnect = (port: Port) => () => {
    const { start } = this.state;

    if (!start || (start.element === port.element && start.direction === port.direction)) return;

    this.state.resolve({ source: start, target: port });
  };

  private cancel = () => {
    this.state.reject();
    this.setState({ start: null, resolve: () => {}, reject: () => {} });
  };

  render() {
    const context: ConnectContext = {
      isDragging: !!this.state.start,
      onStartConnect: this.onStartConnect,
      onEndConnect: this.onEndConnect,
    };
    return (
      <ConnectProvider value={context}>
        {this.props.children}
        <RelationshipPreview port={this.state.start} />
      </ConnectProvider>
    );
  }
}

interface Props {}

interface State {
  start: Port | null;
  resolve: (value?: Connection) => void;
  reject: (reason?: any) => void;
}
