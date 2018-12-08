import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./gui/App";
import { ReduxState } from "./gui/redux";
import { Theme } from "./gui/theme";
import { ApollonMode, DiagramType, ElementSelection } from "./gui/types";

export interface ApollonOptions {
    initialState?: ReduxState | null;
    diagramType?: "CLASS" | "ACTIVITY";
    mode?: "READ_ONLY" | "MODELING_ONLY" | "FULL";
    debug?: boolean;
    theme?: Partial<Theme>;
}

class Editor {
    private container: HTMLElement;
    private app: App | null = null;

    constructor(container: HTMLElement, options: ApollonOptions = {}) {
        this.container = container;
        const { initialState = null, diagramType = null, mode = "FULL", debug = false, theme = {} } = options;

        const app = React.createElement(App, {
            ref: ref => (this.app = ref),
            initialState,
            diagramType: getDiagramType(mode, diagramType),
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

export default Editor;

function getDiagramType(mode: string, diagramType: string | null) {
    switch (diagramType) {
        case "CLASS":
            return DiagramType.ClassDiagram;

        case "ACTIVITY":
            return DiagramType.ActivityDiagram;

        default:
            throw Error(
                "Please specify one of the following diagram types: 'CLASS', or 'ACTIVITY'"
            );
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
