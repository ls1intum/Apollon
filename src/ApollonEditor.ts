import { createElement, RefObject, createRef } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Store } from 'redux';
import { Application } from './scenes/Application';
import { State } from './components/Store';
import { DiagramType } from './domain/Diagram';
import { ElementKind } from './domain/Element';
import { RelationshipKind } from './domain/Relationship';
import { Styles } from './components/Theme';

export interface UMLModel {
  version: string;
  type: DiagramType;
  size: { width: number; height: number };
  interactive: Selection;
  assessments: { [id: string]: Assessment };
  elements: { [id: string]: UMLElement };
  relationships: { [id: string]: UMLRelationship };
}

export interface Assessment {
  score: number;
  feedback?: string;
}

export { DiagramType };
export { ElementKind as ElementType };
export { RelationshipKind as RelationshipType };
export { Styles };
export { UMLClassifier, UMLClassAssociation } from './domain/plugins/ClassDiagram';

interface UMLBase {
  id: string;
  name: string;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface UMLElement extends UMLBase {
  owner: string | null;
  type: ElementKind;
}

export enum Direction {
  Up,
  Right,
  Down,
  Left,
}

export interface UMLRelationship extends UMLBase {
  type: RelationshipKind;
  path: { x: number; y: number }[];
  source: {
    element: string;
    direction: Direction;
  };
  target: {
    element: string;
    direction: Direction;
  };
}

export interface Selection {
  elements: string[];
  relationships: string[];
}

export enum ApollonMode {
  Modelling = 'Modelling',
  Exporting = 'Exporting',
  Assessment = 'Assessment',
}

export type ApollonOptions = {
  type?: DiagramType;
  mode?: ApollonMode;
  readonly?: boolean;
  model?: UMLModel;
  theme?: Partial<Styles>;
};

export interface ExportOptions {
  filter: string[];
}

export interface SVG {
  svg: string;
  size: {
    width: number;
    height: number;
  };
}

export class ApollonEditor {
  private application: RefObject<Application> = createRef();
  private store: Store<State> | null = null;
  private subscribers: Array<(selection: Selection) => void> = [];

  selection: Selection = { elements: [], relationships: [] };

  constructor(private container: HTMLElement, options: ApollonOptions) {
    const model: UMLModel = {
      version: '2.0',
      size: { width: 0, height: 0 },
      interactive: { elements: [], relationships: [] },
      elements: {},
      relationships: {},
      assessments: {},
      ...options.model,
      type:
        options.type ||
        (options.model && options.model.type) ||
        DiagramType.ClassDiagram,
    };
    let state = State.fromModel(model);
    state = {
      ...state,
      editor: {
        ...state.editor,
        ...(options.mode && { mode: options.mode }),
        ...(options.readonly && { readonly: options.readonly }),
      },
    };

    const element = createElement(Application, {
      ref: this.application,
      state: state,
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

  subscribeToSelectionChange(callback: (selection: Selection) => void): number {
    return this.subscribers.push(callback) - 1;
  }

  unsubscribeFromSelectionChange(subscriptionId: number) {
    this.subscribers.splice(subscriptionId);
  }

  exportAsSVG(options?: ExportOptions): SVG {
    const element = createElement('svg');
    return {
      svg: this.render(element),
      size: { width: 0, height: 0 },
    };
  }

  private render(element: JSX.Element): string {
    const width = 100;
    const height = 100;
    const { innerHTML } = this.container.getElementsByClassName('svg')[0];
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" fill="white">${innerHTML}</svg>`;
  }
}
