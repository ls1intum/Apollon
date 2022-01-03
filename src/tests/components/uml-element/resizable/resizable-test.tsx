import * as React from 'react';
import { UMLElementComponentProps } from '../../../../main/components/uml-element/uml-element-component-props';
import { MockStoreEnhanced } from 'redux-mock-store';
import { ModelState } from '../../../../main/components/store/model-state';
import { IUMLElement } from '../../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { UMLClassAttribute } from '../../../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';
import { getMockedStore } from '../../../test-utils/test-utils';
import { UMLElementRepository } from '../../../../main/services/uml-element/uml-element-repository';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { resizable } from '../../../../main/components/uml-element/resizable/resizable';

class MockComponent extends React.Component<UMLElementComponentProps> {
  render() {
    return <p>Mock Component</p>;
  }
}

describe('test resizable', () => {
  let store: MockStoreEnhanced<ModelState, any>;
  const ResizableMockComponent = resizable()(MockComponent);

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
    // make sure element is resizable
    expect(UMLClass.features.resizable).toBeTruthy();
  });

  it('resizing component triggers store actions', () => {
    const elementToSelect = elements[0];
    store = getMockedStore({ resizing: [elementToSelect.id] }, elements);
    const triggerResizing = UMLElementRepository.resize({ width: 10, height: 10 })(
      store.dispatch,
      store.getState,
      undefined,
    );
    const expectedValue = [
      { payload: { delta: { height: 10, width: 10 } }, type: '@@element/resizable/RESIZE', undoable: false },
    ];

    const { container } = render(
      <Provider store={store}>
        <ResizableMockComponent id={elements[0].id} />
      </Provider>,
    );

    const rut = container.firstChild;
    expect(rut).not.toBeNull();
    expect(store.getActions()).toHaveLength(1);
    expect(store.getActions()).toHaveLength(expectedValue.length);
  });
});
