import * as React from "react";
import { connect } from "react-redux";
import Button from "./Button";
import { State as ReduxState } from "./../Store";

const STATE_KEY = "state.v7";

class LocalStateForm extends React.Component<Props> {
    persistState = () => {
        const state = {
            entities: {
              allIds: Object.keys(this.props.state.elements).filter(id => this.props.state.elements[id].name !== 'Relationship'),
              byId: Object.keys(this.props.state.elements).filter(id => this.props.state.elements[id].name !== 'Relationship').reduce((o: any, id) => { o[id] = this.props.state.elements[id]; return o }, {}),
            },
            relationships: this.props.state.relationships,
            interactiveElements: this.props.state.interactiveElements,
            editor: this.props.state.editor,
            elements: this.props.state.elements,
          };
        const serializedState = JSON.stringify(state);
        localStorage.setItem(STATE_KEY, serializedState);
    };

    clearPersistedState = () => {
        localStorage.removeItem(STATE_KEY);
    };

    render() {
        return (
            <div>
                <h2>Local State</h2>
                <Button onClick={this.persistState}>Save</Button>
                &nbsp;
                <Button onClick={this.clearPersistedState}>Clear</Button>
            </div>
        );
    }
}

interface DispatchProps {
    state: ReduxState;
}

type Props = DispatchProps;

function mapDispatchToProps(state: ReduxState): DispatchProps {
    return {
        state
    };
}

export default connect(mapDispatchToProps)(LocalStateForm);
