import { getRealStore } from '../../test-utils/test-utils';
import { wrappedRender } from '../../test-utils/render';
import * as React from 'react';
import { createRef, RefObject } from 'react';
import { UMLClass } from '../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { UpdatePane } from '../../../../main/components/update-pane/update-pane';
import { ILayer } from '../../../../main/services/layouter/layer';
import { ModelStore } from '../../../../main/components/store/model-store';
import { Canvas, CanvasComponent } from '../../../../main/components/canvas/canvas';
import { CanvasContext, CanvasProvider } from '../../../../main/components/canvas/canvas-context';
import { RootContext, RootProvider } from '../../../../main/components/root/root-context';
import { Layout } from '../../../../main/scenes/application-styles';
import { DraggableLayer } from '../../../../main/components/draggable/draggable-layer';
import { Editor } from '../../../../main/components/canvas/editor';
import { KeyboardEventListener } from '../../../../main/components/canvas/keyboard-eventlistener';
import { UMLElement } from '../../../../main/services/uml-element/uml-element';
import { UMLClassAttribute } from '../../../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';
import { UMLClassBidirectional } from '../../../../main/packages/uml-class-diagram/uml-class-bidirectional/uml-class-bidirectional';
import { Direction } from '../../../../main/services/uml-element/uml-element-port';
import { UMLElementRepository } from '../../../../main/services/uml-element/uml-element-repository';
import { act, fireEvent } from '@testing-library/react';
import 'jest-styled-components';

const initialState = Object.freeze({
  canvas: null as ILayer | null,
  root: null as HTMLDivElement | null,
});

type State = typeof initialState;

class UpdatePaneTestComponent extends React.Component<any, State> {
  state = initialState;

  store: RefObject<ModelStore> = createRef();

  setCanvas = (ref: CanvasComponent) => {
    if (ref && ref.layer.current) {
      this.setState({ canvas: { ...ref, layer: ref.layer.current } });
    }
  };

  setLayout = (ref: HTMLDivElement) => {
    if (ref) {
      this.setState({ root: ref });
    }
  };

  render() {
    const canvasContext: CanvasContext | null = this.state.canvas ? { canvas: this.state.canvas } : null;
    const rootContext: RootContext | null = this.state.root ? { root: this.state.root } : null;

    return (
      <CanvasProvider value={canvasContext}>
        <RootProvider value={rootContext}>
          <Layout className="apollon-editor" ref={this.setLayout}>
            {rootContext && (
              <DraggableLayer>
                <Editor>
                  <Canvas ref={this.setCanvas} />
                </Editor>
                {canvasContext && (
                  <>
                    <UpdatePane />
                    <KeyboardEventListener />
                  </>
                )}
              </DraggableLayer>
            )}
          </Layout>
        </RootProvider>
      </CanvasProvider>
    );
  }
}

describe('test update pane', () => {
  let umlClass: UMLClass;
  let source: UMLClass;
  let target: UMLClass;
  let association: UMLClassBidirectional;
  const elements: UMLElement[] = [];

  beforeEach(() => {
    // initialize  objects
    umlClass = new UMLClass({ id: 'test-class-id' });

    const umlClassAttribute = new UMLClassAttribute({ id: 'test-class-attribute-id', owner: umlClass.id });
    const umlClassMethod = new UMLClassMethod({ id: 'test-class-method-id', owner: umlClass.id });
    umlClass.ownedElements = [umlClassAttribute.id, umlClassMethod.id];

    source = new UMLClass({ id: 'test-class-source-id', bounds: { x: 0, y: 0, width: 200, height: 100 } });
    target = new UMLClass({ id: 'test-class-target-id', bounds: { x: 200, y: 200, width: 200, height: 100 } });
    association = new UMLClassBidirectional({
      id: 'test-class-association-id',
      source: {
        element: source.id,
        direction: Direction.Up,
      },
      target: {
        element: target.id,
        direction: Direction.Up,
      },
    });

    elements.push(umlClass, umlClassAttribute, umlClassMethod, source, target, association);
    // use fake timers
    jest.useFakeTimers();
  });
  afterEach(() => {
    // use normal timers again
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('dismiss', () => {
    // somehow the tests are interfering with each other
    // this test needs to run first, so that no console error is thrown
    const store = getRealStore({ updating: [] }, elements);

    const { container } = wrappedRender(<UpdatePaneTestComponent />, { store });

    const updateAction = UMLElementRepository.updateStart(umlClass.id);
    act(() => {
      store.dispatch(updateAction);
    });

    act(() => {
      jest.runAllTimers();
    });

    act(() => {
      fireEvent.pointerDown(container.querySelector('svg')!);
    });

    expect(store.getState().updating).toHaveLength(0);
  });

  it('render with element', () => {
    const store = getRealStore({ updating: [] }, elements);

    const { baseElement } = wrappedRender(<UpdatePaneTestComponent />, { store });

    const updateAction = UMLElementRepository.updateStart(umlClass.id);
    act(() => {
      store.dispatch(updateAction);
    });
    act(() => {
      jest.runAllTimers();
    });
    expect(baseElement).toMatchSnapshot();
  });

  it('render with relationship', () => {
    const store = getRealStore({ updating: [] }, elements);

    const { baseElement } = wrappedRender(<UpdatePaneTestComponent />, { store });

    const updateAction = UMLElementRepository.updateStart(association.id);
    act(() => {
      store.dispatch(updateAction);
    });
    act(() => {
      jest.runAllTimers();
    });
    expect(baseElement).toMatchSnapshot();
  });
});
