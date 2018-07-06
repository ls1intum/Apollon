import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";
import { ReduxState } from "./redux";
import { Theme } from "./theme";
import { DiagramType, ApollonMode, ElementSelection } from "./types";

export interface ApollonOptions {
    initialState?: ReduxState | null;
    diagramType?: "CLASS" | "ACTIVITY";
    mode?: "READ_ONLY" | "MODELING_ONLY" | "FULL";
    debug?: boolean;
    theme?: Partial<Theme>;
}

export default class ApollonEditor {
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

// https://tc39.github.io/ecma262/#sec-array.prototype.includes
if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, "includes", {
        value: function(searchElement: any, fromIndex: number) {

        if (this == null) {
            throw new TypeError('"this" is null or not defined');
        }

        // 1. Let O be ? ToObject(this value).
        const o = Object(this);

        // 2. Let len be ? ToLength(? Get(O, "length")).
        const len = o.length >>> 0;

        // 3. If len is 0, return false.
        if (len === 0) {
            return false;
        }

        // 4. Let n be ? ToInteger(fromIndex).
        //    (If fromIndex is undefined, this step produces the value 0.)
        const n = fromIndex | 0;

        // 5. If n ≥ 0, then
        //  a. Let k be n.
        // 6. Else n < 0,
        //  a. Let k be len + n.
        //  b. If k < 0, let k be 0.
        let k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

        function sameValueZero(x: any, y: any) {
            return x === y || (typeof x === "number" && typeof y === "number" && isNaN(x) && isNaN(y));
        }

        // 7. Repeat, while k < len
        while (k < len) {
            // a. Let elementK be the result of ? Get(O, ! ToString(k)).
            // b. If SameValueZero(searchElement, elementK) is true, return true.
            if (sameValueZero(o[k], searchElement)) {
            return true;
            }
            // c. Increase k by 1.
            k++;
        }

        // 8. Return false
        return false;
        }
    });
}

  // https://tc39.github.io/ecma262/#sec-array.prototype.find
if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, "find", {
        value: function(predicate: any) {
        // 1. Let O be ? ToObject(this value).
        if (this == null) {
            throw new TypeError('"this" is null or not defined');
        }

        const o = Object(this);

        // 2. Let len be ? ToLength(? Get(O, "length")).
        const len = o.length >>> 0;

        // 3. If IsCallable(predicate) is false, throw a TypeError exception.
        if (typeof predicate !== "function") {
            throw new TypeError("predicate must be a function");
        }

        // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
        const thisArg = arguments[1];

        // 5. Let k be 0.
        let k = 0;

        // 6. Repeat, while k < len
        while (k < len) {
            // a. Let Pk be ! ToString(k).
            // b. Let kValue be ? Get(O, Pk).
            // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
            // d. If testResult is true, return kValue.
            const kValue = o[k];
            if (predicate.call(thisArg, kValue, k, o)) {
            return kValue;
            }
            // e. Increase k by 1.
            k++;
        }

        // 7. Return undefined.
        return undefined;
        },
        configurable: true,
        writable: true
    });
}

if (!Math.sign) {
    Math.sign = function(x: number) {
        return ((x > 0) ? 0 : 1) + ((x < 0) ? 0 : -1) || +x;
    };
}
