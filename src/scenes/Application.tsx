import React, { createRef, RefObject } from 'react';
import Store, { State as ReduxState } from './../components/Store';
import Theme, { Styles } from './../components/Theme';
import { Layout } from './styles';
import Editor from './../components/Container';
import Canvas from './../components/Canvas';
import Sidebar from './../components/Sidebar';
import { DragLayer } from './../components/Draggable';

class App extends React.Component<Props> {
  store: RefObject<Store> = createRef();

  render() {
    return (
      <Store ref={this.store} initialState={this.props.state}>
        <Theme styles={this.props.styles}>
          <DragLayer>
            <Layout>
              <Editor>
                <Canvas />
              </Editor>
              <Sidebar />
            </Layout>
          </DragLayer>
        </Theme>
      </Store>
    );
  }
}

interface Props {
  state: Partial<ReduxState>;
  styles: Partial<Styles>;
}

export default App;
