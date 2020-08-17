import { ModelState, PartialModelState } from '../../main/components/store/model-state';
import { UMLDiagram } from '../../main/services/uml-diagram/uml-diagram';
import { ApollonMode } from '../../main';
import { ApollonView, EditorState } from '../../main/services/editor/editor-types';
import { IUMLElement, UMLElement } from '../../main/services/uml-element/uml-element';
import { UMLElementState } from '../../main/services/uml-element/uml-element-types';
import thunk, { ThunkDispatch } from 'redux-thunk';
import { Actions } from '../../main/services/actions';
import createMockStore, { MockStoreEnhanced } from 'redux-mock-store';
import { Store } from 'redux';
import { createReduxStore } from '../../main/components/store/model-store';
import { ILayer } from '../../main/services/layouter/layer';
import { UMLClass } from '../../main/packages/uml-class-diagram/uml-class/uml-class';
import { UMLClassAttribute } from '../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';
import { UMLPackage } from '../../main/packages/common/uml-package/uml-package';
import { UMLClassPackage } from '../../main/packages/uml-class-diagram/uml-class-package/uml-class-package';

type DispatchExts = ThunkDispatch<ModelState, void, Actions>;

const middleware = [thunk];
const mockStore = createMockStore<ModelState, DispatchExts>(middleware);

const createModelStateFromPartialModelState = (
  partialModelState?: PartialModelState,
  elements?: IUMLElement[],
): ModelState => {
  const modelState: ModelState = {
    assessments: partialModelState?.assessments ? { ...partialModelState.assessments } : {},
    connecting: partialModelState?.connecting ? partialModelState.connecting : [],
    copy: partialModelState?.copy ? partialModelState.copy : [],
    diagram: partialModelState?.diagram ? partialModelState.diagram : new UMLDiagram({}),
    interactive: partialModelState?.interactive ? partialModelState.interactive : [],
    moving: partialModelState?.moving ? partialModelState.moving : [],
    reconnecting: partialModelState?.reconnecting ? partialModelState.reconnecting : {},
    resizing: partialModelState?.resizing ? partialModelState.resizing : [],
    selected: partialModelState?.selected ? partialModelState.selected : [],
    updating: partialModelState?.updating ? partialModelState.updating : [],
    hovered: partialModelState?.hovered ? partialModelState.hovered : [],
    editor: {
      mode: partialModelState?.editor?.mode ? partialModelState.editor.mode : ApollonMode.Modelling,
      readonly: partialModelState?.editor?.readonly ? partialModelState.editor?.readonly : false,
      enablePopups: partialModelState?.editor?.enablePopups ? partialModelState.editor?.enablePopups : true,
      enableCopyPasteToClipboard: partialModelState?.editor?.enableCopyPasteToClipboard
        ? partialModelState.editor?.enableCopyPasteToClipboard
        : false,
      view: partialModelState?.editor?.view ? partialModelState.editor?.view : ApollonView.Modelling,
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
    elements: elements
      ? elements.reduce<UMLElementState>(
          (elements, element) => ({
            ...elements,
            [element.id]: element,
          }),
          {},
        )
      : {},
  };
  return modelState;
};

export const getMockedStore = (
  modelState?: PartialModelState,
  elements?: IUMLElement[],
): MockStoreEnhanced<ModelState, DispatchExts> => {
  // initial state
  const storeState = createModelStateFromPartialModelState(modelState, elements);
  return mockStore(storeState);
};

export const getRealStore = (
  modelState?: PartialModelState,
  elements: IUMLElement[] = [],
  layer: ILayer | null = null,
): Store<ModelState, any> => {
  const storeState = createModelStateFromPartialModelState(modelState, elements);
  return createReduxStore(storeState, layer);
};

// ClassDiagram
export const createUMLClassWithAttributeAndMethod = (): UMLElement[] => {
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
  return [umlClass, umlClassAttribute, umlClassMethod];
};
