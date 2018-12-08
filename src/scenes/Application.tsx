import React, { createRef, RefObject } from 'react';
import styled, { createGlobalStyle, ThemeProvider } from "styled-components";
import Editor from "./../gui/components/Editor";
import KeyboardEventListener from "./../gui/events/KeyboardEventListener";
import { createTheme, Theme } from "./../gui/theme";
import { ApollonMode, DiagramType, ElementSelection } from "./../gui/types";
import { toggle, UUID } from "../core/utils";

import Store, { Props as StoreProps } from './../components/Store';
import ReduxState from './../components/Store/state';

const ApollonEditor = styled.div`
    box-sizing: border-box;
    height: 100%;
    font-weight: 400;
`;

export default class App extends React.Component<Props, State> {
    store: RefObject<Store<StoreProps>> = createRef();

    theme: Theme;
    keyboardEventListener: KeyboardEventListener | null = null;

    subscriptionId = 0;
    selectionChangeSubscribers: Map<number, ((selection: ElementSelection) => void)>;

    state: State = {
        selection: {
            entityIds: [],
            relationshipIds: []
        }
    };

    constructor(props: Props) {
        super(props);
        this.theme = createTheme(props.theme);
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

    componentDidMount() {
        this.keyboardEventListener =
        this.store.current && this.props.apollonMode !== ApollonMode.ReadOnly
                ? new KeyboardEventListener(this.store.current.store, this.selectElements)
                : null;


        if (this.store.current) {
            this.store.current.store.subscribe(() => {
                const storeState = this.store.current!.store.getState();
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
        const GlobalStyle = createGlobalStyle`
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
                <Store ref={this.store} initialState={this.props.initialState} selectEntities={this.selectEntities}>
                    <ThemeProvider theme={this.theme}>
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
                    </ThemeProvider>
                </Store>
            </ApollonEditor>
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
    theme: Partial<Theme>;
}

interface State {
    selection: ElementSelection;
}
