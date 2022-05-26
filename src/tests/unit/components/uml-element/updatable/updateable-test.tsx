import * as React from 'react';
import { UMLElementComponentProps } from '../../../../../main/components/uml-element/uml-element-component-props';
import { MockStoreEnhanced } from 'redux-mock-store';
import { ModelState } from '../../../../../main/components/store/model-state';
import { IUMLElement } from '../../../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { UMLClassAttribute } from '../../../../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../../../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';
import { getMockedStore } from '../../../test-utils/test-utils';
import { fireEvent, render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { updatable } from '../../../../../main/components/uml-element/updatable/updatable';
import { UpdatableActionTypes } from '../../../../../main/services/uml-element/updatable/updatable-types';

class MockComponent extends React.Component<UMLElementComponentProps> {
  render() {
    return <p>Mock Component</p>;
  }
}

describe('test updatable HOC', () => {
  let store: MockStoreEnhanced<ModelState, any>;
  const UpdatableMockComponent = updatable(MockComponent);
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
    // make sure element is updatable
    expect(UMLClass.features.updatable).toBeTruthy();
  });
  it('trigger open popup / update', () => {
    store = getMockedStore({}, elements);

    const { container } = render(
      <Provider store={store}>
        <UpdatableMockComponent id={elements[0].id} />
      </Provider>,
    );

    const sut = container.firstChild;
    expect(sut).not.toBeNull();

    // simulate dblClick
    fireEvent.doubleClick(sut as Element);

    // check values
    expect(store.getActions()).toHaveLength(1);
    expect(store.getActions()[0].type).toEqual(UpdatableActionTypes.START);
  });
});
