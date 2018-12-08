import React, { createRef, RefObject } from 'react';
import Store, { State as ReduxState } from './../components/Store';
import Theme, { Styles } from './../components/Theme';
import SelectionListener from './../components/SelectionListener/SelectionListener';
import { Layout } from './styles';

import Editor from './../gui/components/Editor';
import KeyboardEventListener from './../gui/events/KeyboardEventListener';
import { ApollonMode, DiagramType, ElementSelection } from './../gui/types';
import { toggle, UUID } from '../core/utils';

export default class App extends React.Component<Props, State> {
  store: RefObject<Store> = createRef();

  keyboardEventListener: KeyboardEventListener | null = null;

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
    console.log(selection);
    this.setState({ selection });
  };

  render() {
    return (
      <Store ref={this.store} initialState={this.props.initialState}>
        <Theme theme={this.props.theme}>
          <SelectionListener subscribers={this.state.subscribers}>
            <Layout>
              <Editor
                diagramType={this.props.diagramType}
                apollonMode={this.props.apollonMode}
                debugModeEnabled={this.props.debugModeEnabled}
                selection={this.state.selection}
                selectEntity={() => {}}
                toggleEntitySelection={() => {}}
                selectRelationship={() => {}}
                toggleRelationshipSelection={() => {}}
                unselectAllElements={() => {}}
              />
            </Layout>
          </SelectionListener>
        </Theme>
      </Store>
    );
  }
}

interface Props {
  initialState?: ReduxState;
  diagramType: DiagramType;
  apollonMode: ApollonMode;
  debugModeEnabled: boolean;
  theme: Partial<Styles>;
}

interface State {
  subscribers: Array<(selection: ElementSelection) => void>;
  selection: ElementSelection;
}
