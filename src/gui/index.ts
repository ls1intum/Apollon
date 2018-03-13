import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";
import { ReduxState } from "./redux";
import { Theme } from "./theme";

export interface ApollonOptions {
    initialState?: ReduxState | null;
    theme?: Partial<Theme>;
}

export default class ApollonEditor {
    private container: HTMLElement;

    constructor(container: HTMLElement, options: ApollonOptions = {}) {
        this.container = container;
        const { initialState = null, theme = {} } = options;

        const app = React.createElement(App, { initialState, theme });
        ReactDOM.render(app, container);
    }

    destroy() {
        ReactDOM.unmountComponentAtNode(this.container);
    }
}
