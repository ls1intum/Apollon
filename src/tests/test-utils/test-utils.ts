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

export const getMockedStore = (
  elements?: IUMLElement[],
  selected: string[] = [],
  updating: string[] = [],
  hovered: string[] = [],
): MockStoreEnhanced<ModelState, DispatchExts> => {
  // initial state
  const modelState: ModelState = {
    assessments: {},
    connecting: [],
    copy: [],
    diagram: new UMLDiagram({}),
    interactive: [],
    moving: [],
    reconnecting: {},
    resizing: [],
    selected: selected,
    updating: updating,
    hovered: hovered,
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

  return mockStore(modelState);
};
