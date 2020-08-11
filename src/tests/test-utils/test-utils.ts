import { ModelState } from '../../main/components/store/model-state';
import { UMLDiagram } from '../../main/services/uml-diagram/uml-diagram';
import { ApollonMode } from '../../main';
import { ApollonView, EditorState } from '../../main/services/editor/editor-types';
import { IUMLElement } from '../../main/services/uml-element/uml-element';
import { UMLElementState } from '../../main/services/uml-element/uml-element-types';
import thunk, { ThunkDispatch } from 'redux-thunk';
import { Actions } from '../../main/services/actions';
import createMockStore, { MockStoreEnhanced } from 'redux-mock-store';

type DispatchExts = ThunkDispatch<ModelState, void, Actions>;

const middleware = [thunk];
const mockStore = createMockStore<ModelState, DispatchExts>(middleware);

type PartialModelState = Partial<Omit<ModelState, 'editor'>> & {
  editor?: Partial<EditorState>;
};

export const getMockedStore = (
  modelState?: PartialModelState,
  elements?: IUMLElement[],
): MockStoreEnhanced<ModelState, DispatchExts> => {
  // initial state
  const storeState: ModelState = {
    assessments: modelState?.assessments ? { ...modelState.assessments } : {},
    connecting: modelState?.connecting ? modelState.connecting : [],
    copy: modelState?.copy ? modelState.copy : [],
    diagram: modelState?.diagram ? modelState.diagram : new UMLDiagram({}),
    interactive: modelState?.interactive ? modelState.interactive : [],
    moving: modelState?.moving ? modelState.moving : [],
    reconnecting: modelState?.reconnecting ? modelState.reconnecting : {},
    resizing: modelState?.resizing ? modelState.resizing : [],
    selected: modelState?.selected ? modelState.selected : [],
    updating: modelState?.updating ? modelState.updating : [],
    hovered: modelState?.hovered ? modelState.hovered : [],
    editor: {
      mode: modelState?.editor?.mode ? modelState.editor.mode : ApollonMode.Modelling,
      readonly: modelState?.editor?.readonly ? modelState.editor?.readonly : false,
      enablePopups: modelState?.editor?.enablePopups ? modelState.editor?.enablePopups : true,
      enableCopyPasteToClipboard: modelState?.editor?.enableCopyPasteToClipboard
        ? modelState.editor?.enableCopyPasteToClipboard
        : false,
      view: modelState?.editor?.view ? modelState.editor?.view : ApollonView.Modelling,
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

  return mockStore(storeState);
};
