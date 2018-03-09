import * as React from "react";
import { connect } from "react-redux";
import Button from "./Button";
import { ReduxState } from "../../redux/state";

const STATE_KEY = "state.v7";

class LocalStateForm extends React.Component<Props> {
    persistState = () => {
        const serializedState = JSON.stringify(this.props.state);
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
