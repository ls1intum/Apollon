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

    constructor(container: HTMLElement, options: ApollonOptions = {}) {
        this.container = container;
        const { initialState = null, readOnly = false, theme = {} } = options;

        const apollonMode = readOnly ? ApollonMode.ReadOnly : ApollonMode.Editable;

        const app = React.createElement(App, { initialState, apollonMode, theme });
        ReactDOM.render(app, container);
    }

    destroy() {
        ReactDOM.unmountComponentAtNode(this.container);
    }
}
