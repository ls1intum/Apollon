import React, { createRef, RefObject } from 'react';
import Store, { State as ReduxState } from './../components/Store';
import Theme, { Styles } from './../components/Theme';
import { Layout } from './styles';

import Editor from './../gui/components/Editor';
import KeyboardEventListener from './../gui/events/KeyboardEventListener';
import { ApollonMode, DiagramType, ElementSelection } from './../gui/types';
import { toggle, UUID } from '../core/utils';

export default class App extends React.Component<Props, State> {
  store: RefObject<Store> = createRef();

  // theme: Theme;
  keyboardEventListener: KeyboardEventListener | null = null;

  subscriptionId = 0;
  selectionChangeSubscribers: Map<
    number,
    ((selection: ElementSelection) => void)
  >;

  state: State = {
    selection: {
      entityIds: [],
      relationshipIds: [],
    },
  };

  constructor(props: Props) {
    super(props);
    // this.theme = createTheme(props.theme);
    this.selectionChangeSubscribers = new Map();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const newSelection = this.state.selection;

    if (newSelection !== prevState.selection) {
      if (this.keyboardEventListener !== null) {
        this.keyboardEventListener.setSelection(newSelection);
      }

      // Call every subscriber with the new selection
      this.selectionChangeSubscribers.forEach(subscriber => {
        subscriber(newSelection);
      });
    }
  }

  selectEntity = (entityId: UUID) => {
    this.setState({
      selection: {
        entityIds: [entityId],
        relationshipIds: [],
      },
    });
  };

  selectEntities = (entityIds: UUID[]) => {
    this.setState({
      selection: {
        entityIds,
        relationshipIds: [],
      },
    });
  };

  selectRelationship = (relationshipId: UUID) => {
    this.setState({
      selection: {
        entityIds: [],
        relationshipIds: [relationshipId],
      },
    });
  };

  toggleEntitySelection = (entityId: UUID) => {
    this.setState(state => ({
      selection: {
        entityIds: toggle(entityId, state.selection.entityIds),
        relationshipIds: state.selection.relationshipIds,
      },
    }));
  };

  toggleRelationshipSelection = (relationshipId: UUID) => {
    this.setState(state => ({
      selection: {
        entityIds: state.selection.entityIds,
        relationshipIds: toggle(
          relationshipId,
          state.selection.relationshipIds
        ),
      },
    }));
  };

  selectElements = (entityIds: UUID[], relationshipIds: UUID[]) => {
    this.setState({
      selection: {
        entityIds,
        relationshipIds,
      },
    });
  };

  unselectAllElements = () => {
    this.setState({
      selection: {
        entityIds: [],
        relationshipIds: [],
      },
    });
  };

  componentDidMount() {
    this.keyboardEventListener =
      this.store.current && this.props.apollonMode !== ApollonMode.ReadOnly
        ? new KeyboardEventListener(
            this.store.current.store,
            this.selectElements
          )
        : null;

    if (this.store.current) {
      this.store.current.store.subscribe(() => {
        const storeState = this.store.current!.store.getState();
        const { selection } = this.state;

        if (
          selection.entityIds.some(
            id => !storeState.entities.allIds.includes(id)
          ) ||
          selection.relationshipIds.some(
            id => !storeState.relationships.allIds.includes(id)
          )
        ) {
          this.setState(state => ({
            selection: {
              entityIds: state.selection.entityIds.filter(id =>
                storeState.entities.allIds.includes(id)
              ),
              relationshipIds: state.selection.relationshipIds.filter(id =>
                storeState.relationships.allIds.includes(id)
              ),
            },
          }));
        }
      });
    }
    if (this.keyboardEventListener !== null) {
      this.keyboardEventListener.startListening();
    }
  }

  componentWillUnmount() {
    if (this.keyboardEventListener !== null) {
      this.keyboardEventListener.stopListening();
    }
  }

  render() {
    return (
      <Store
        ref={this.store}
        initialState={this.props.initialState}
        selectEntities={this.selectEntities}
      >
        <Theme theme={this.props.theme}>
          <Layout>
            <Editor
              diagramType={this.props.diagramType}
              apollonMode={this.props.apollonMode}
              debugModeEnabled={this.props.debugModeEnabled}
              selection={this.state.selection}
              selectEntity={this.selectEntity}
              toggleEntitySelection={this.toggleEntitySelection}
              selectRelationship={this.selectRelationship}
              toggleRelationshipSelection={this.toggleRelationshipSelection}
              unselectAllElements={this.unselectAllElements}
            />
          </Layout>
        </Theme>
      </Store>
    );
  }

  subscribeToSelectionChange(callback: (selection: ElementSelection) => void) {
    const subscriptionId = ++this.subscriptionId;
    this.selectionChangeSubscribers.set(subscriptionId, callback);

    return subscriptionId;
  }

  unsubscribeFromSelectionChange(subscriptionId: number) {
    this.selectionChangeSubscribers.delete(subscriptionId);
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
  selection: ElementSelection;
}
