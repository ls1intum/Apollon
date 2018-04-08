import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";
import { ReduxState } from "./redux";
import { Theme } from "./theme";
import { ApollonMode } from "./types";

export interface ApollonOptions {
    initialState?: ReduxState | null;
    readOnly?: boolean;
    theme?: Partial<Theme>;
}

export default class ApollonEditor {
    private container: HTMLElement;
    private app: App | null = null;

    constructor(container: HTMLElement, options: ApollonOptions = {}) {
        this.container = container;
        const { initialState = null, readOnly = false, theme = {} } = options;

        const apollonMode = readOnly ? ApollonMode.ReadOnly : ApollonMode.Editable;

        const app = React.createElement(App, {
            ref: ref => (this.app = ref),
            initialState,
            apollonMode,
            theme
        });

        ReactDOM.render(app, container);
    }

    getSelection() {
        return this.app ? this.app.state.selection : null;
    }

    getState() {
        return this.app ? this.app.store.getState() : null;
    }

    destroy() {
        ReactDOM.unmountComponentAtNode(this.container);
    }
}
