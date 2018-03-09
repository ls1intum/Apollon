import * as React from "react";
import { Provider, Store } from "react-redux";
import styled, { injectGlobal, ThemeProvider } from "styled-components";
import Editor from "./components/Editor";
import KeyboardEventListener from "./events/KeyboardEventListener";
import { createStore, ReduxState } from "./redux";
import { createTheme, Theme } from "./theme";
import { ElementSelection } from "../uml";
import { toggle } from "../utils/array";
import { UUID } from "../uuid";

const ApollonEditor = styled.div`
    box-sizing: border-box;
    height: 100%;
    font-weight: 400;
`;

export default class App extends React.Component<Props, State> {
    theme: Theme;
    store: Store<ReduxState>;
    keyboardEventListener: KeyboardEventListener;

    state: State = {
        selection: {
            entityIds: [],
            relationshipIds: []
        }
    };

    constructor(props: Props) {
        super(props);

        const store = createStore(props.initialState, this.selectEntities);
        this.store = store;
        this.theme = createTheme(props.theme);
        this.keyboardEventListener = new KeyboardEventListener(store, this.selectElements);

        store.subscribe(() => {
            const storeState = store.getState();
            const { selection } = this.state;

            if (
                selection.entityIds.some(id => !storeState.entities.allIds.includes(id)) ||
                selection.relationshipIds.some(id => !storeState.relationships.allIds.includes(id))
            ) {
                this.setState(state => ({
                    selection: {
                        entityIds: state.selection.entityIds.filter(id =>
                            storeState.entities.allIds.includes(id)
                        ),
                        relationshipIds: state.selection.relationshipIds.filter(id =>
                            storeState.relationships.allIds.includes(id)
                        )
                    }
                }));
            }
        });
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        if (this.state.selection !== prevState.selection) {
            this.keyboardEventListener.setSelection(this.state.selection);
        }
    }

    selectEntity = (entityId: UUID) => {
        this.setState({
            selection: {
                entityIds: [entityId],
                relationshipIds: []
            }
        });
    };

    selectEntities = (entityIds: UUID[]) => {
        this.setState({
            selection: {
                entityIds,
                relationshipIds: []
            }
        });
    };

    selectRelationship = (relationshipId: UUID) => {
        this.setState({
            selection: {
                entityIds: [],
                relationshipIds: [relationshipId]
            }
        });
    };

    toggleEntitySelection = (entityId: UUID) => {
        this.setState(state => ({
            selection: {
                entityIds: toggle(entityId, state.selection.entityIds),
                relationshipIds: state.selection.relationshipIds
            }
        }));
    };

    toggleRelationshipSelection = (relationshipId: UUID) => {
        this.setState(state => ({
            selection: {
                entityIds: state.selection.entityIds,
                relationshipIds: toggle(relationshipId, state.selection.relationshipIds)
            }
        }));
    };

    selectElements = (entityIds: UUID[], relationshipIds: UUID[]) => {
        this.setState({
            selection: {
                entityIds,
                relationshipIds
            }
        });
    };

    unselectAllElements = () => {
        this.setState({
            selection: {
                entityIds: [],
                relationshipIds: []
            }
        });
    };

    onSelectionChange = (newSelection: ElementSelection) => {
        this.keyboardEventListener.setSelection(newSelection);
    };

    componentDidMount() {
        this.keyboardEventListener.startListening();
    }

    componentWillUnmount() {
        this.keyboardEventListener.stopListening();
    }

    render() {
        injectGlobal`
            .apollon-editor * {
                box-sizing: border-box;
            }

            .apollon-editor h1, .apollon-editor h2 {
                font-family: ${this.theme.headingFontFamily};
                font-weight: ${this.theme.headingFontWeight};
                margin-top: 0;
            }
        `;

        return (
            <ApollonEditor className="apollon-editor">
                <Provider store={this.store}>
                    <ThemeProvider theme={this.theme}>
                        <Editor
                            selection={this.state.selection}
                            selectEntity={this.selectEntity}
                            toggleEntitySelection={this.toggleEntitySelection}
                            selectRelationship={this.selectRelationship}
                            toggleRelationshipSelection={this.toggleRelationshipSelection}
                            unselectAllElements={this.unselectAllElements}
                        />
                    </ThemeProvider>
                </Provider>
            </ApollonEditor>
        );
    }
}

interface Props {
    initialState: ReduxState | null;
    theme: Partial<Theme>;
}

interface State {
    selection: ElementSelection;
}
