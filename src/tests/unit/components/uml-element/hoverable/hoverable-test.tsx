import * as React from 'react';
import { UMLClass } from '../../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { ModelState } from '../../../../../main/components/store/model-state';
import { DeepPartial } from 'redux';
import { UMLClassAttribute } from '../../../../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../../../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';
import { fireEvent, render } from '@testing-library/react';
import { hoverable } from '../../../../../main/components/uml-element/hoverable/hoverable';
import { UMLElementComponentProps } from '../../../../../main/components/uml-element/uml-element-component-props';
import { MockStoreEnhanced } from 'redux-mock-store';
import { Provider } from 'react-redux';
import { UMLElementRepository } from '../../../../../main/services/uml-element/uml-element-repository';
import { getMockedStore } from '../../../test-utils/test-utils';

class MockComponent extends React.Component<UMLElementComponentProps> {
  render() {
    return <p>Mock Component</p>;
  }
}

describe('test hoverable HOC', () => {
  let store: MockStoreEnhanced<DeepPartial<ModelState>, any>;
  let umlClass: UMLClass;
  const HoverableMockComponent = hoverable(MockComponent);

  beforeEach(() => {
    umlClass = new UMLClass({ name: 'test-element' });
    const umlClassAttribute = new UMLClassAttribute({
      name: 'attribute',
      owner: umlClass.id,
    });
    const umlClassMethod = new UMLClassMethod({
      name: 'classMethod',
      owner: umlClass.id,
    });
    umlClass.ownedElements = [umlClassAttribute.id, umlClassMethod.id];
    // make sure element is hoverable
    expect(UMLClass.features.hoverable).toBeTruthy();
    store = getMockedStore(undefined, [umlClass, umlClassAttribute, umlClassMethod]);
  });
  it('hover component triggers HoverAction', () => {
    const expectedAction = UMLElementRepository.hover(umlClass.id);
    const { container } = render(
      <Provider store={store}>
        <HoverableMockComponent id={umlClass.id} />
      </Provider>,
    );

    const sut = container.firstChild;
    expect(sut).not.toBeNull();

    // simulate hover
    fireEvent.pointerEnter(sut as Element);

    expect(store.getActions()).toHaveLength(1);
    expect(store.getActions()[0]).toEqual(expectedAction);
  });

  it('unhover component triggers LeaveAction', () => {
    const expectedAction = UMLElementRepository.leave(umlClass.id);
    const { container } = render(
      <Provider store={store}>
        <HoverableMockComponent id={umlClass.id} />
      </Provider>,
    );

    const sut = container.firstChild;
    expect(sut).not.toBeNull();

    // simulate unhover
    fireEvent.pointerLeave(sut as Element);

    expect(store.getActions()).toHaveLength(1);
    expect(store.getActions()[0]).toEqual(expectedAction);
  });
});
