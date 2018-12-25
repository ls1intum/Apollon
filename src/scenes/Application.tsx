import React, { createRef, RefObject } from 'react';
import Store, { State as ReduxState } from './../components/Store';
import Theme, { Styles } from './../components/Theme';
import Canvas from './../components/Canvas';
import Sidebar from './../components/Sidebar';
import { Layout } from './styles';

import DragDrop from './../components/DragDrop';
import Editor from './../components/Container';
import KeyboardEventListener from './../components/KeyboardEventListener';
import DragLayer from './../components/DragDrop/DragLayer';
import PopupLayer from './../components/Popups/PopupLayer';
import RelationshipProvider from './../components/LayoutedRelationship/RelationshipLayer';

class App extends React.Component<Props> {
  store: RefObject<Store> = createRef();
  container: RefObject<HTMLDivElement> = createRef();

  render() {
    return (
      <Store ref={this.store} initialState={this.props.state}>
        <Theme styles={this.props.styles}>
          <DragDrop>
            <KeyboardEventListener>
              <Layout>
                <Editor ref={this.container}>
                  <PopupLayer container={this.container.current!}>
                    <RelationshipProvider>
                      <Canvas />
                    </RelationshipProvider>
                  </PopupLayer>
                </Editor>
                <Sidebar />
                <DragLayer canvas={this.container.current!} />
              </Layout>
            </KeyboardEventListener>
          </DragDrop>
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
