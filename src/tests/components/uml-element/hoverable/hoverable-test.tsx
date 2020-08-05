import * as React from 'react';
import { UMLClass } from '../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { ModelState } from '../../../../main/components/store/model-state';
import { DeepPartial } from 'redux';
import { IUMLElement } from '../../../../main/services/uml-element/uml-element';
import { UMLClassAttribute } from '../../../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';
import { render, fireEvent } from '@testing-library/react';
import { hoverable } from '../../../../main/components/uml-element/hoverable/hoverable';
import { UMLElementComponentProps } from '../../../../main/components/uml-element/uml-element-component-props';
import { MockStoreEnhanced } from 'redux-mock-store';
import { Provider } from 'react-redux';
import { ApollonMode } from '../../../../main';
import { ApollonView, EditorState } from '../../../../main/services/editor/editor-types';
import thunk, { ThunkDispatch } from 'redux-thunk';
import { Actions } from '../../../../main/services/actions';
import createMockStore from 'redux-mock-store';
import { UMLDiagram } from '../../../../main/services/uml-diagram/uml-diagram';
import { UMLElementRepository } from '../../../../main/services/uml-element/uml-element-repository';

class MockComponent extends React.Component<UMLElementComponentProps> {
  render() {
    return <p>Mock Component</p>;
  }
}

type DispatchExts = ThunkDispatch<ModelState, void, Actions>;

const middleware = [thunk];
const mockStore = createMockStore<ModelState, DispatchExts>(middleware);

describe(' hoverable higher order component', () => {
  let store: MockStoreEnhanced<DeepPartial<ModelState>, any>;
  let serializedClass: IUMLElement;
  const HoverableMockComponent = hoverable(MockComponent);

  beforeEach(() => {
    const umlClass = new UMLClass({ name: 'test-element' });
    const umlClassAttribute = new UMLClassAttribute({
      name: 'attribute',
      owner: umlClass.id,
    });
    const umlClassMethod = new UMLClassMethod({
      name: 'classMethod',
      owner: umlClass.id,
    });
    umlClass.ownedElements = [];
    serializedClass = umlClass.serialize([]);
    // make sure element is hoverable
    expect(UMLClass.features.hoverable).toBeTruthy();

    // initial store
    const modelState: ModelState = {
      assessments: {},
      connecting: [],
      copy: [],
      diagram: new UMLDiagram({}),
      interactive: [],
      moving: [],
      reconnecting: {},
      resizing: [],
      selected: [],
      updating: [],
      hovered: [],
      editor: {
        mode: ApollonMode.Modelling,
        readonly: false,
        enablePopups: true,
        enableCopyPasteToClipboard: false,
        view: ApollonView.Modelling,
        features: {
          hoverable: true,
          selectable: true,
          movable: true,
          resizable: true,
          connectable: true,
          updatable: true,
          droppable: true,
        },
      } as EditorState,
      elements: {
        [umlClass.id]: { ...umlClass },
        [umlClassAttribute.id]: { ...umlClassAttribute },
        [umlClassMethod.id]: { ...umlClassMethod },
      },
    };

    store = mockStore(modelState);
  });
  it('hover over hoverable component', () => {
    const expectedAction = UMLElementRepository.hover(serializedClass.id);
    const { container } = render(
      <Provider store={store}>
        <HoverableMockComponent id={serializedClass.id} />
      </Provider>,
    );

    const sut = container.firstChild;
    expect(sut).not.toBeNull();

    // simulate hover
    fireEvent.pointerEnter(sut as Element);

    expect(store.getActions()).toHaveLength(1);
    expect(store.getActions()[0]).toEqual(expectedAction);
  });

  it('unhover component', () => {
    const expectedAction = UMLElementRepository.leave(serializedClass.id);
    const { container } = render(
      <Provider store={store}>
        <HoverableMockComponent id={serializedClass.id} />
      </Provider>,
    );

    const sut = container.firstChild;
    expect(sut).not.toBeNull();

    // simulate hover
    fireEvent.pointerLeave(sut as Element);

    expect(store.getActions()).toHaveLength(1);
    expect(store.getActions()[0]).toEqual(expectedAction);
  });
});
