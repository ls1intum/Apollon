import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";
import { ReduxState } from "./redux";
import { Theme } from "./theme";
import { ApollonMode, ElementSelection } from "./types";

export interface ApollonOptions {
    initialState?: ReduxState | null;
    mode?: "READ_ONLY" | "MODELING_ONLY" | "FULL";
    debug?: boolean;
    theme?: Partial<Theme>;
}

export default class ApollonEditor {
    private container: HTMLElement;
    private app: App | null = null;

    constructor(container: HTMLElement, options: ApollonOptions = {}) {
        this.container = container;
        const { initialState = null, mode = "FULL", debug = false, theme = {} } = options;

        const app = React.createElement(App, {
            ref: ref => (this.app = ref),
            initialState,
            apollonMode: getApollonMode(mode),
            debugModeEnabled: debug,
            theme
        });

        ReactDOM.render(app, container);
    }

    getSelection() {
        return this.app ? this.app.state.selection : null;
    }

    subscribeToSelectionChange(callback: (selection: ElementSelection) => void): number | null {
        return this.app ? this.app.subscribeToSelectionChange(callback) : null;
    }

    unsubscribeFromSelectionChange(subscriptionId: number) {
        if (this.app !== null) {
            this.app.unsubscribeFromSelectionChange(subscriptionId);
        }
    }

    getState() {
        return this.app ? this.app.store.getState() : null;
    }

    destroy() {
        ReactDOM.unmountComponentAtNode(this.container);
    }
}

function getApollonMode(mode: string) {
    switch (mode) {
        case "FULL":
            return ApollonMode.Full;

        case "READ_ONLY":
            return ApollonMode.ReadOnly;

        case "MODELING_ONLY":
            return ApollonMode.ModelingOnly;

        default:
            throw Error(
                "Please specify one of the following modes: 'FULL', 'READ_ONLY', or 'MODELING_ONLY'"
            );
    }
}
