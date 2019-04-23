// import React, { Component } from 'react';
// import { Port } from '../../services/uml-element/port';
// import { Connection } from '../../services/uml-relationship/connection';
// import { ConnectContext, ConnectProvider } from './connect-context';
// import { RelationshipPreview } from './relationship-preview';

// export class ConnectLayer extends Component<Props, State> {
//   state: State = {
//     start: null,
//   };

//   render() {
//     const context: ConnectContext = {
//       isDragging: !!this.state.start,
//       onStartConnect: this.onStartConnect,
//       onEndConnect: this.onEndConnect,
//     };
//     return (
//       <ConnectProvider value={context}>
//         {this.props.children}
//         <RelationshipPreview port={this.state.start} />
//       </ConnectProvider>
//     );
//   }

//   private onStartConnect = (port: Port) => (): Promise<Connection> => {
//     document.addEventListener('pointerup', this.cancel, {
//       once: true,
//       passive: true,
//     });

//     return new Promise<Connection>((resolve, reject) => this.setState({ start: port, resolve, reject }));
//   };

//   private onEndConnect = (port: Port) => () => {
//     const { start } = this.state;

//     if (!start || (start.element === port.element && start.direction === port.direction)) return;

//     if (this.state.resolve) {
//       this.state.resolve({ source: start, target: port });
//     }
//   };

//   private cancel = () => {
//     if (this.state.reject) {
//       this.state.reject();
//     }
//     this.setState({ start: null, resolve: undefined, reject: undefined });
//   };
// }

// type Props = {};

// type State = {
//   start: Port | null;
//   resolve?: (value?: Connection) => void;
//   reject?: (reason?: any) => void;
// };
