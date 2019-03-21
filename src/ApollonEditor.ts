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
  };

  destroy() {
    unmountComponentAtNode(this.container);
  }

  get model(): UMLModel {
    if (!this.store) throw new Error('Apollon was already destroyed.');
    return State.toModel(this.store.getState());
  }
}
