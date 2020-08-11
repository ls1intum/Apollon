import { MockStoreEnhanced } from 'redux-mock-store';
import { ModelState } from '../../../main/components/store/model-state';
import { UMLClass } from '../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { UMLClassAttribute } from '../../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';
import { getMockedStore } from '../../test-utils/test-utils';
import { UMLInterface } from '../../../main/packages/uml-class-diagram/uml-interface/uml-interface';
import { CopyRepository } from '../../../main/services/copypaste/copy-repository';
import { CopyReducer } from '../../../main/services/copypaste/copy-reducer';
import { UMLElement } from '../../../main/services/uml-element/uml-element';
import { UMLContainer } from '../../../main/services/uml-container/uml-container';
import { UMLElementReducer } from '../../../main/services/uml-element/uml-element-reducer';

describe('test copy paste functionality', () => {
  const elements: UMLElement[] = [];
  const elementsToCopy: UMLElement[] = [];
  let store: MockStoreEnhanced<ModelState, any>;

  beforeEach(() => {
    // initialize copy objects
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
    elementsToCopy.push(umlClass);
    elements.push(umlClass, umlClassAttribute, umlClassMethod);

    const umlInterface = new UMLInterface({ name: 'test-interface' });
    const attributeForInterface = new UMLClassAttribute({
      name: 'attribute',
      owner: umlClass.id,
    });
    const methodForInterface1 = new UMLClassMethod({
      name: 'classMethod1',
      owner: umlClass.id,
    });
    const methodForInterface2 = new UMLClassMethod({
      name: 'classMethod2',
      owner: umlClass.id,
    });
    umlInterface.ownedElements = [attributeForInterface.id, methodForInterface1.id, methodForInterface2.id];
    elementsToCopy.push(umlInterface);
    elements.push(umlInterface, attributeForInterface, methodForInterface1, methodForInterface2);
  });

  it('copy apollon internally', () => {
    // disable copy to clipboard
    store = getMockedStore(
      {
        editor: {
          enableCopyPasteToClipboard: false,
        },
      },
      elements.map((element) => ({ ...element })),
    );
    const expectedAction = CopyRepository.copy(elementsToCopy.map((element) => element.id))(
      store.dispatch,
      store.getState,
      undefined,
    );
    const copyAction = CopyRepository.copy(elementsToCopy.map((element) => element.id));
    store.dispatch(copyAction);
    expect(store.getActions()).toHaveLength(2);
    expect(store.getActions()[1]).toEqual(expectedAction);
    // assume max elements with 1 hierarchy
    const expectdCopyState = elementsToCopy.reduce<string[]>((ids: string[], element: UMLElement) => {
      const ownedElements = UMLContainer.isUMLContainer(element) ? (element as UMLContainer).ownedElements : [];
      return [...ids, ...ownedElements, element.id];
    }, []);
    expect(CopyReducer([], store.getActions()[1])).toEqual(expectdCopyState);
  });
  it('paste apollon internally', () => {
    // assume max elements with 1 hierarchy
    const expectdCopyState = elementsToCopy.reduce<string[]>((ids: string[], element: UMLElement) => {
      const ownedElements = UMLContainer.isUMLContainer(element) ? (element as UMLContainer).ownedElements : [];
      return [...ids, ...ownedElements, element.id];
    }, []);

    // disable copy to clipboard
    store = getMockedStore(
      {
        copy: expectdCopyState,
        editor: {
          enableCopyPasteToClipboard: false,
        },
      },
      elements.map((element) => ({ ...element })),
    );
    const expectedAction = CopyRepository.paste()(store.dispatch, store.getState, undefined);
    // TODO: check why the actions length is 2 and not 4
    expect(store.getActions()).toHaveLength(2);
    // we cannot know the ids of the new elements, we only know it have to be twice as much as before
    expect(Object.keys(UMLElementReducer(store.getState().elements, store.getActions()[1]))).toHaveLength(2 * elements.length);
  });
  // TODO: create this test
  // it('copy and paste to clipboard', () => {
  //   // enable copy to clipboard
  //   store = getMockedStore(
  //     {
  //       editor: {
  //         enableCopyPasteToClipboard: true,
  //       },
  //     },
  //     elements.map((element) => ({ ...element })),
  //   );
  // });
});
