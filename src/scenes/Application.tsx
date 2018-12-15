import React, { createRef, RefObject } from 'react';
import Store, { State as ReduxState } from './../components/Store';
import Theme, { Styles } from './../components/Theme';
import SelectionListener from './../components/SelectionListener/SelectionListener';
import Canvas from './../components/Canvas';
import Sidebar from './../components/Sidebar';
import { Layout } from './styles';

import DragDrop from './../components/DragDrop';
import Editor from './../components/Container';
import KeyboardEventListener from './../components/KeyboardEventListener';
import { ApollonMode, ElementSelection } from '../domain/Options/types';
import DragLayer from "./../components/DragDrop/DragLayer";

class App extends React.Component<Props, State> {
  store: RefObject<Store> = createRef();
  container: RefObject<HTMLDivElement> = createRef();

  state: State = {
    subscribers: [],
    selection: {
      entityIds: [],
      relationshipIds: [],
    },
  };

  constructor(props: Props) {
    super(props);

    this.state.subscribers = [this.subscribe];
  }

  subscribe = (selection: ElementSelection) => {
    this.setState({ selection });
  };

  render() {
    return (
      <Store ref={this.store} initialState={this.props.state}>
        <Theme styles={this.props.styles}>
          <SelectionListener subscribers={this.state.subscribers}>
            <DragDrop>
              <KeyboardEventListener>
                <Layout>
                  <Editor ref={this.container}><Canvas /></Editor>
                  <Sidebar />
                  <DragLayer canvas={this.container.current!} />
                </Layout>
              </KeyboardEventListener>
            </DragDrop>
          </SelectionListener>
        </Theme>
      </Store>
    );
  }
}

interface Props {
  state: ReduxState;
  styles: Partial<Styles>;
}

interface State {
  subscribers: Array<(selection: ElementSelection) => void>;
  selection: ElementSelection;
}

export default App;
