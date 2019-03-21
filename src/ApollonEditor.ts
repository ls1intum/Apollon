import { createElement, RefObject, createRef } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Store } from 'redux';
import { Application } from './scenes/Application';
import { State } from './components/Store';
import { DiagramType } from './domain/Diagram';
import { ElementKind } from './domain/Element';
import { RelationshipKind } from './domain/Relationship';

export interface UMLModel {
  type: DiagramType;
  elements: UMLElement[];
  relationships: UMLRelationship[];
}

export interface UMLElement {
  id: string;
  name: string;
  owner: string | null;
  type: ElementKind;
  bounds: { x: number; y: number; width: number; height: number };
  interactive: boolean;
}

export const enum Location {
  North,
  East,
  South,
  West,
}

export interface UMLRelationship {
  id: string;
  name: string;
  type: RelationshipKind;
  source: {
    element: string;
    location: Location;
  };
  target: {
    element: string;
    location: Location;
  };
}

export interface Selection {
  elements: string[];
  relationships: string[];
}

export const enum ApollonMode {
  Modelling,
  Exporting,
  Assessment,
  Readonly,
}

export interface ApollonOptions {
  mode?: ApollonMode;
  model?: UMLModel;
}

export class ApollonEditor {
  private application: RefObject<Application> = createRef();
  private store: Store<State> | null = null;
  private subscribers: Array<(selection: Selection) => void> = [];

  selection: Selection = { elements: [], relationships: [] };

  constructor(private container: HTMLElement, options: ApollonOptions) {
    const element = createElement(Application, {
      ref: this.application,
      state: options.model ? State.fromModel(options.model) : null,
      styles: {},
    });
    render(element, container, this.componentDidMount);
  }

  private componentDidMount = () => {
    this.store =
      this.application.current &&
      this.application.current.store.current &&
      this.application.current.store.current.store;
    this.store && this.store.subscribe(this.onDispatch);
  };

  private onDispatch = () => {
    if (!this.store) return;
    const { elements } = this.store.getState();
    const selection: Selection = {
      elements: Object.keys(elements).filter(
        id => elements[id].selected && elements[id].base !== 'Relationship'
      ),
      relationships: Object.keys(elements).filter(
        id => elements[id].selected && elements[id].base === 'Relationship'
      ),
    };

    if (JSON.stringify(this.selection) === JSON.stringify(selection)) return;

    this.subscribers.forEach(subscriber => subscriber(selection));
    this.selection = selection;
  };

  destroy() {
    unmountComponentAtNode(this.container);
  }

  get model(): UMLModel {
    if (!this.store) throw new Error('Apollon was already destroyed.');
    return State.toModel(this.store.getState());
  }

  subscribeToSelectionChange(
    callback: (selection: Selection) => void
  ): number {
    return this.subscribers.push(callback) - 1;
  }

  unsubscribeFromSelectionChange(subscriptionId: number) {
    this.subscribers.splice(subscriptionId);
  }
}
