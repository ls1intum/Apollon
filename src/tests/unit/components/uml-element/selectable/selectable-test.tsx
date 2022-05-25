import * as React from 'react';
import { UMLElementComponentProps } from '../../../../../main/components/uml-element/uml-element-component-props';
import { MockStoreEnhanced } from 'redux-mock-store';
import { ModelState } from '../../../../../main/components/store/model-state';
import { IUMLElement } from '../../../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { UMLClassAttribute } from '../../../../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../../../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';
import { getMockedStore } from '../../../test-utils/test-utils';
import { UMLElementRepository } from '../../../../../main/services/uml-element/uml-element-repository';
import { fireEvent, render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { selectable } from '../../../../../main/components/uml-element/selectable/selectable';

class MockComponent extends React.Component<UMLElementComponentProps> {
  render() {
    return <p>Mock Component</p>;
  }
}

describe('test selectable HOC', () => {
  let store: MockStoreEnhanced<ModelState, any>;
  const SelectableMockComponent = selectable(MockComponent);
  const elements: IUMLElement[] = [];

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
    umlClass.ownedElements = [umlClassAttribute.id, umlClassMethod.id];
    elements.push(umlClass, umlClassAttribute, umlClassMethod);
    // make sure element is selectable
    expect(UMLClass.features.selectable).toBeTruthy();
  });
  it('select component triggers SelectAction', () => {
    const elementToSelect = elements[0];
    // element must be hovered to trigger select
    store = getMockedStore({ hovered: [elementToSelect.id] }, elements);
    const expectedAction = UMLElementRepository.select(elementToSelect.id)(store.dispatch, store.getState, undefined);

    const { container } = render(
      <Provider store={store}>
        <SelectableMockComponent id={elements[0].id} />
      </Provider>,
    );

    const sut = container.firstChild;
    expect(sut).not.toBeNull();

    // simulate hover
    fireEvent.pointerDown(sut as Element);

    // first action to crate the expected action, second action to do the actual select
    expect(store.getActions()).toHaveLength(2);
    expect(store.getActions()[0]).toEqual(expectedAction);
  });

  it('multi selection - deselect', () => {
    const elementToDeselect = elements[0];
    // element must be hovered to trigger deselect
    // element must be already selected to trigger deselect
    store = getMockedStore({ selected: [elementToDeselect.id], hovered: [elementToDeselect.id] }, elements);
    const expectedAction = UMLElementRepository.deselect(elementToDeselect.id)(
      store.dispatch,
      store.getState,
      undefined,
    );
    const { container } = render(
      <Provider store={store}>
        <SelectableMockComponent id={elementToDeselect.id} />
      </Provider>,
    );

    const sut = container.firstChild;
    expect(sut).not.toBeNull();

    // simulate deselect
    // shiftKey must be held
    fireEvent.pointerDown(sut as Element, { shiftKey: true });

    // first action to get the expectedAction, second to do the actual deselect
    expect(store.getActions()).toHaveLength(2);
    expect(store.getActions()[1]).toEqual(expectedAction);
  });

  it('select another component triggers DeselectAction + SelectAction', () => {
    const elementToSelect = elements[0];
    const alreadySelectedElement = elements[1];
    // element must be hovered to trigger deselect
    // element must be already selected to trigger deselect
    store = getMockedStore({ selected: [alreadySelectedElement.id], hovered: [elementToSelect.id] }, elements);
    const expectedAction1 = UMLElementRepository.deselect(alreadySelectedElement.id)(
      store.dispatch,
      store.getState,
      undefined,
    );
    const expectedAction2 = UMLElementRepository.select(elementToSelect.id)(store.dispatch, store.getState, undefined);
    const { container } = render(
      <Provider store={store}>
        <SelectableMockComponent id={elementToSelect.id} />
      </Provider>,
    );

    const sut = container.firstChild;
    expect(sut).not.toBeNull();

    // simulate deselect
    // shiftKey must be held
    fireEvent.pointerDown(sut as Element);

    // first action to get the expectedAction, second to do the actual deselect
    expect(store.getActions()).toHaveLength(4);
    expect(store.getActions()[2]).toEqual(expectedAction1);
    expect(store.getActions()[3]).toEqual(expectedAction2);
  });

  it('multi select', () => {
    const elementToSelect = elements[0];
    const alreadySelectedElement = elements[1];
    // element must be hovered to trigger deselect
    // element must be already selected to trigger deselect
    store = getMockedStore({ selected: [alreadySelectedElement.id], hovered: [elementToSelect.id] }, elements);
    const expectedAction = UMLElementRepository.select(elementToSelect.id)(store.dispatch, store.getState, undefined);
    const { container } = render(
      <Provider store={store}>
        <SelectableMockComponent id={elementToSelect.id} />
      </Provider>,
    );

    const sut = container.firstChild;
    expect(sut).not.toBeNull();

    // simulate deselect
    // shiftKey must be held
    fireEvent.pointerDown(sut as Element, { shiftKey: true });

    // first action to get the expectedAction, second to do the actual deselect
    expect(store.getActions()).toHaveLength(2);
    expect(store.getActions()[1]).toEqual(expectedAction);
  });
});
