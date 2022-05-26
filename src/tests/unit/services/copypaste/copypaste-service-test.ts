import { UMLClass } from '../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { UMLClassAttribute } from '../../../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';
import { getRealStore } from '../../test-utils/test-utils';
import { UMLInterface } from '../../../../main/packages/uml-class-diagram/uml-interface/uml-interface';
import { CopyRepository } from '../../../../main/services/copypaste/copy-repository';
import { UMLElement } from '../../../../main/services/uml-element/uml-element';
import { UMLContainer } from '../../../../main/services/uml-container/uml-container';

describe('test copy paste functionality', () => {
  const elements: UMLElement[] = [];
  const elementsToCopy: UMLElement[] = [];

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
      owner: umlInterface.id,
    });
    const methodForInterface1 = new UMLClassMethod({
      name: 'classMethod1',
      owner: umlInterface.id,
    });
    const methodForInterface2 = new UMLClassMethod({
      name: 'classMethod2',
      owner: umlInterface.id,
    });
    umlInterface.ownedElements = [attributeForInterface.id, methodForInterface1.id, methodForInterface2.id];
    elementsToCopy.push(umlInterface);
    elements.push(umlInterface, attributeForInterface, methodForInterface1, methodForInterface2);
  });

  it('copy apollon internally', () => {
    // disable copy to clipboard
    const store = getRealStore(
      {
        editor: {
          enableCopyPasteToClipboard: false,
        },
      },
      elements.map((element) => ({ ...element })),
    );
    const copyAction = CopyRepository.copy(elementsToCopy.map((element) => element.id));
    store.dispatch(copyAction);
    // assume max elements with 1 hierarchy
    const expectdCopyState = elementsToCopy.reduce<string[]>((ids: string[], element: UMLElement) => {
      const ownedElements = UMLContainer.isUMLContainer(element) ? (element as UMLContainer).ownedElements : [];
      return [...ids, ...ownedElements, element.id];
    }, []);
    expect(store.getState().copy).toEqual(expectdCopyState);
  });
  it('paste apollon internally', () => {
    // assume max elements with 1 hierarchy
    const initialCopyState = elementsToCopy.reduce<string[]>((ids: string[], element: UMLElement) => {
      const ownedElements = UMLContainer.isUMLContainer(element) ? (element as UMLContainer).ownedElements : [];
      return [...ids, ...ownedElements, element.id];
    }, []);

    // disable copy to clipboard
    const store = getRealStore(
      {
        copy: initialCopyState,
        selected: initialCopyState,
        editor: {
          enableCopyPasteToClipboard: false,
        },
      },
      elements.map((element) => ({ ...element })),
    );
    store.dispatch(CopyRepository.paste());
    // weak test condition, but not really possible to test dispatched actions
    expect(Object.keys(store.getState().elements)).toHaveLength(2 * elements.length);
  });
});
