// @ts-ignore
import * as React from 'react';
import { act, render as testLibraryRender } from '@testing-library/react';
import * as Apollon from '../../main/apollon-editor';
import * as ApollonTypes from '../../main/typings';
import testClassDiagram from './test-resources/class-diagram.json';
import testClassDiagramV2 from './test-resources/class-diagram-v2.json';
import testCommunicationDiagram from './test-resources/communication-diagram.json';
import testCommunicationDiagramV2 from './test-resources/communication-diagram-v2.json';
import { Selection } from '../../../docs/user/api/typings';
import { Assessment, UMLDiagramType, UMLModel } from '../../main';
import { getRealStore } from './test-utils/test-utils';
import { AssessmentRepository } from '../../main/services/assessment/assessment-repository';
import { IAssessment } from '../../main/services/assessment/assessment';
import { ModelState } from '../../main/components/store/model-state';
import { UMLElementCommonRepository } from '../../main/services/uml-element/uml-element-common-repository';
import { UMLClass } from '../../main/packages/uml-class-diagram/uml-class/uml-class';
import { arrayToInclusionMap } from '../../main/components/store/util';
import fn = jest.fn;

let editor = {} as Apollon.ApollonEditor;

afterEach(() => {
  act(() => {
    editor.destroy();
  });
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const testClassDiagramAsSVG = require('./test-resources/class-diagram-as-svg.json') as string;

const ignoreSVGClassNames = (svgString: string): string => {
  const classPattern = /class="[a-zA-Z0-9 -]+"/g;
  const classesToKeep = ['Class', 'Package'];
  const classes = svgString.match(classPattern)?.filter((element) => {
    let isIncluded = false;
    classesToKeep.forEach((classToKeep) => {
      if (element.includes(classToKeep)) {
        isIncluded = true;
      }
    });
    return !isIncluded;
  });

  if (!classes) {
    return svgString;
  }

  for (const elem of classes) {
    svgString = svgString.replace(elem, '');
  }

  return svgString;
};

describe('test apollon editor ', () => {
  // init editor before each test
  beforeEach(() => {
    const { container } = testLibraryRender(<div />);
    act(() => {
      editor = new Apollon.ApollonEditor(container.firstChild as HTMLElement, {});
    });
    act(() => {
      // second act is needed because the editor needs to be initialized already to set the model
      editor.model = testClassDiagram as any;
    });
  });

  it('get and set model', () => {
    expect(testClassDiagram).toEqual(editor.model);
  });

  it('get and set v2 model', () => {
    act(() => {
      editor.model = testClassDiagramV2 as any;
    });

    expect(testClassDiagram).toEqual(editor.model);
  });

  it('get and set communication diagram.', () => {
    act(() => {
      editor.model = testCommunicationDiagram as any;
    });

    expect(testCommunicationDiagram).toEqual(editor.model);
  });

  it('get and set communication diagram v2.', () => {
    act(() => {
      editor.model = testCommunicationDiagramV2 as any;
    });

    expect(testCommunicationDiagram).toEqual(editor.model);
  });

  it('exportModelAsSvg', async () => {
    const svg: ApollonTypes.SVG = await editor.exportAsSVG();
    expect(ignoreSVGClassNames(svg.svg)).toEqual(testClassDiagramAsSVG);
  });

  it('subscribeToSelection', async () => {
    const selection: Selection = {
      elements: arrayToInclusionMap(Object.keys(testClassDiagram.elements)),
      relationships: arrayToInclusionMap(Object.keys(testClassDiagram.relationships)),
    };
    const selectionCallback = (s: Selection) => {
      return expect(s).toEqual(selection);
    };
    editor.subscribeToSelectionChange(selectionCallback);
    act(() => {
      editor.select(selection);
    });
  });
  it('unsubscribeFromSelection', async () => {
    const selection: Selection = {
      elements: arrayToInclusionMap(Object.keys(testClassDiagram.elements)),
      relationships: arrayToInclusionMap(Object.keys(testClassDiagram.relationships)),
    };
    const selectionCallback = fn((selection: Selection) => {});

    // subscribe to selection and call select
    const selectionSubscription = editor.subscribeToSelectionChange(selectionCallback);
    act(() => {
      editor.select(selection);
    });
    setTimeout(() => {
      // unsubscribe and call select again
      editor.unsubscribeFromSelectionChange(selectionSubscription);
      act(() => {
        editor.select({ elements: {}, relationships: {} });
      });
      setTimeout(() => {
        expect(selectionCallback).toBeCalledTimes(1);
      }, 500);
    }, 500);
  });
  it('unsubscribeFromSelectionValidation', async () => {
    // same test as above, but don't unsubscribe
    // this validates that the timing is enough so that selection callback would be called twice
    // it is still possible that callback would be called twice in unsubscribeFromSelection and not in unsubscribeFromSelectionValidation, but less likely
    const selection: Selection = {
      elements: arrayToInclusionMap(Object.keys(testClassDiagram.elements)),
      relationships: arrayToInclusionMap(Object.keys(testClassDiagram.relationships)),
    };
    const selectionCallback = fn((s: Selection) => {});

    // subscribe to selection and call select
    act(() => {
      editor.subscribeToSelectionChange(selectionCallback);
      editor.select(selection);
    });

    setTimeout(() => {
      // just select again
      act(() => {
        editor.select({ elements: {}, relationships: {} });
      });
      setTimeout(() => {
        // should be called twice
        return expect(selectionCallback).toBeCalledTimes(2);
      }, 500);
    }, 500);
  });

  it('subscribeToAssessmentChange', async () => {
    // create store to inject into apollon editor, so that actions can be dispatched
    const state = ModelState.fromModel(testClassDiagram as any);
    const elements = Object.keys(state.elements!).map((id) => state.elements![id]);
    const store = getRealStore(state, elements);
    // inject store
    Object.defineProperty(editor, 'store', { value: store });

    // expected data
    const assessment: IAssessment = { score: 2, feedback: 'Great work!' };
    const elementToAssess = elements[0];

    // dispatch
    const assessmentChangedCallback = (a: Assessment[]) => {
      // only one element should be included in assessment
      const receivedAssessment = a[0];
      return expect(receivedAssessment).toEqual({
        elementType: elementToAssess.type,
        feedback: assessment.feedback,
        modelElementId: elementToAssess.id,
        score: assessment.score,
      });
    };
    // subscribe to assessment change
    editor.subscribeToAssessmentChange(assessmentChangedCallback);

    // create and assess element
    const assessAction = AssessmentRepository.assess(elementToAssess.id, assessment);
    store.dispatch(assessAction);
  });
  it('unsubscribeFromAssessment', () => {
    // create store to inject into apollon editor, so that actions can be dispatched
    const state = ModelState.fromModel(testClassDiagram as any);
    const elements = Object.keys(state.elements!).map((id) => state.elements![id]);
    const store = getRealStore(state, elements);
    // inject store
    Object.defineProperty(editor, 'store', { value: store });

    // expected data
    const assessment: IAssessment = { score: 2, feedback: 'Great work!' };
    const elementToAssess = elements[0];
    const elementToAssess1 = elements[1];

    // dispatch
    const assessmentChangedCallback = fn((a: Assessment[]) => {
      // only one element should be included in assessment
      const receivedAssessment = a[0];
      expect(receivedAssessment).toEqual({
        elementType: elementToAssess.type,
        feedback: assessment.feedback,
        modelElementId: elementToAssess.id,
        score: assessment.score,
      });
    });
    // subscribe to assessment change
    const assessmentSubscription = editor.subscribeToAssessmentChange(assessmentChangedCallback);

    // create and assess element
    const assessAction = AssessmentRepository.assess(elementToAssess.id, assessment);
    store.dispatch(assessAction);

    setTimeout(() => {
      // unsubscribe and call assess again
      editor.unsubscribeFromAssessmentChange(assessmentSubscription);
      const assessAction = AssessmentRepository.assess(elementToAssess1.id, assessment);
      store.dispatch(assessAction);
      setTimeout(() => {
        return expect(assessmentChangedCallback).toBeCalledTimes(1);
      }, 500);
    }, 500);
  });
  it('unsubscribeFromAssessmentValidation', () => {
    // create store to inject into apollon editor, so that actions can be dispatched
    const state = ModelState.fromModel(testClassDiagram as any);
    const elements = Object.keys(state.elements!).map((id) => state.elements![id]);
    const store = getRealStore(state, elements);
    // inject store
    Object.defineProperty(editor, 'store', { value: store });

    // expected data
    const assessment: IAssessment = { score: 2, feedback: 'Great work!' };
    const elementToAssess = elements[0];
    const elementToAssess1 = elements[1];

    // dispatch
    const assessmentChangedCallback = fn((a: Assessment[]) => {
      // only one element should be included in assessment
      const receivedAssessment = a[0];
      expect(receivedAssessment).toEqual({
        elementType: elementToAssess.type,
        feedback: assessment.feedback,
        modelElementId: elementToAssess.id,
        score: assessment.score,
      });
    });
    // subscribe to assessment change
    editor.subscribeToAssessmentChange(assessmentChangedCallback);
    // create and assess element
    const assessAction = AssessmentRepository.assess(elementToAssess.id, assessment);
    store.dispatch(assessAction);

    setTimeout(() => {
      // assess again
      const assessAction = AssessmentRepository.assess(elementToAssess1.id, assessment);
      store.dispatch(assessAction);
      setTimeout(() => {
        // should be called twice
        return expect(assessmentChangedCallback).toBeCalledTimes(2);
      }, 500);
    }, 500);
  });

  it('subscribeToModelChange', () => {
    // create store to inject into apollon editor, so that actions can be dispatched
    const state = ModelState.fromModel(testClassDiagram as any);
    const elements = Object.keys(state.elements!).map((id) => state.elements![id]);
    const store = getRealStore(state, elements);
    // inject store
    Object.defineProperty(editor, 'store', { value: store });

    // expected data
    const element: UMLClass = new UMLClass({ name: 'TestClass' });

    const modelChangedCallback = (model: UMLModel) => {
      // created element should be included in model
      return expect(model.elements[element.id]).toBeDefined();
    };
    // subscribe to model changes
    editor.subscribeToModelChange(modelChangedCallback);

    // create element -> triggers model change
    const createElementAction = UMLElementCommonRepository.create<UMLClass>(element);
    store.dispatch(createElementAction);
  });
  it('unsubscribeFromModelChanges', () => {
    // create store to inject into apollon editor, so that actions can be dispatched
    const state = ModelState.fromModel(testClassDiagram as any);
    const elements = Object.keys(state.elements!).map((id) => state.elements![id]);
    const store = getRealStore(state, elements);
    // inject store
    Object.defineProperty(editor, 'store', { value: store });

    // expected data
    const element: UMLClass = new UMLClass({ name: 'TestClass' });
    const anotherElement: UMLClass = new UMLClass({ name: 'TestClass' });

    const modelChangedCallback = fn((model: UMLModel) => {});
    // subscribe model changes
    const modelChangeSubscription = editor.subscribeToModelChange(modelChangedCallback);

    // create element
    const createElementAction = UMLElementCommonRepository.create<UMLClass>(element);
    store.dispatch(createElementAction);

    setTimeout(() => {
      // unsubscribe and create another element -> should not be called again
      editor.unsubscribeFromModelChange(modelChangeSubscription);
      const createElementAction = UMLElementCommonRepository.create<UMLClass>(anotherElement);
      store.dispatch(createElementAction);
      setTimeout(() => {
        return expect(modelChangedCallback).toBeCalledTimes(1);
      }, 500);
    }, 500);
  });
  it('unsubscribeFromModelChangesValidation', () => {
    // create store to inject into apollon editor, so that actions can be dispatched
    const state = ModelState.fromModel(testClassDiagram as any);
    const elements = Object.keys(state.elements!).map((id) => state.elements![id]);
    const store = getRealStore(state, elements);
    // inject store
    Object.defineProperty(editor, 'store', { value: store });

    // expected data
    const element: UMLClass = new UMLClass({ name: 'TestClass' });
    const anotherElement: UMLClass = new UMLClass({ name: 'TestClass' });

    const modelChangedCallback = fn((model: UMLModel) => {});
    // subscribe to model changes
    editor.subscribeToModelChange(modelChangedCallback);

    // create element
    const createElementAction = UMLElementCommonRepository.create<UMLClass>(element);
    store.dispatch(createElementAction);

    setTimeout(() => {
      const createElementAction = UMLElementCommonRepository.create<UMLClass>(anotherElement);
      store.dispatch(createElementAction);
      setTimeout(() => {
        return expect(modelChangedCallback).toBeCalledTimes(2);
      }, 500);
    }, 500);
  });

  it('subscribeToDiscreteModelChange', () => {
    // create store to inject into apollon editor, so that actions can be dispatched
    const state = ModelState.fromModel(testClassDiagram as any);
    const elements = Object.keys(state.elements!).map((id) => state.elements![id]);
    const store = getRealStore(state, elements);
    // inject store
    Object.defineProperty(editor, 'store', { value: store });

    // expected data
    const element: UMLClass = new UMLClass({ name: 'TestClass' });

    const modelChangedCallback = (model: UMLModel) => {
      // created element should be included in model
      return expect(model.elements[element.id]).toBeDefined();
    };
    // subscribe to model changes
    editor.subscribeToModelDiscreteChange(modelChangedCallback);

    setTimeout(() => {
      // after create element append action is dispatched automatically which triggers discrete model change
      const createElementAction = UMLElementCommonRepository.create<UMLClass>(element);
      store.dispatch(createElementAction);
    }, 500);
  });

  it('unsubscribeFromDiscreteModelChanges', () => {
    // create store to inject into apollon editor, so that actions can be dispatched
    const state = ModelState.fromModel(testClassDiagram as any);
    const elements = Object.keys(state.elements!).map((id) => state.elements![id]);
    const store = getRealStore(state, elements);
    // inject store
    Object.defineProperty(editor, 'store', { value: store });

    // expected data
    const element: UMLClass = new UMLClass({ name: 'TestClass' });
    const anotherElement: UMLClass = new UMLClass({ name: 'TestClass' });

    const modelChangedCallback = fn((model: UMLModel) => {});
    // subscribe model changes
    const modelChangeSubscription = editor.subscribeToModelDiscreteChange(modelChangedCallback);

    setTimeout(() => {
      // create element
      const createElementAction = UMLElementCommonRepository.create<UMLClass>(element);
      store.dispatch(createElementAction);

      // unsubscribe and create another element -> should not be called again
      editor.unsubscribeFromDiscreteModelChange(modelChangeSubscription);
      const createElementActionAnother = UMLElementCommonRepository.create<UMLClass>(anotherElement);
      store.dispatch(createElementActionAnother);

      setTimeout(() => {
        expect(modelChangedCallback).toBeCalledTimes(1);
        expect(store.getState().lastAction.endsWith('APPEND')).toBe(true);
      }, 500);
    }, 500);
  });

  it('unsubscribeFromDiscreteModelChangesValidation', () => {
    // create store to inject into apollon editor, so that actions can be dispatched
    const state = ModelState.fromModel(testClassDiagram as any);
    const elements = Object.keys(state.elements!).map((id) => state.elements![id]);
    const store = getRealStore(state, elements);
    // inject store
    Object.defineProperty(editor, 'store', { value: store });

    // expected data
    const element: UMLClass = new UMLClass({ name: 'TestClass' });
    const anotherElement: UMLClass = new UMLClass({ name: 'TestClass' });

    const modelChangedCallback = fn((model: UMLModel) => {});
    // subscribe to model changes
    editor.subscribeToModelDiscreteChange(modelChangedCallback);

    setTimeout(() => {
      // create element
      const createElementAction = UMLElementCommonRepository.create<UMLClass>(element);
      store.dispatch(createElementAction);
      const createElementActionAnother = UMLElementCommonRepository.create<UMLClass>(anotherElement);
      store.dispatch(createElementActionAnother);
      setTimeout(() => {
        expect(modelChangedCallback).toBeCalledTimes(2);
        expect(store.getState().lastAction.endsWith('APPEND')).toBe(true);
      }, 500);
    }, 500);
  });

  it('remoteSelection.', () => {
    const state = ModelState.fromModel(testClassDiagram as any);
    const elements = Object.keys(state.elements!).map((id) => state.elements![id]);
    const store = getRealStore(state, elements);
    // inject store
    Object.defineProperty(editor, 'store', { value: store });

    const elA = 'c10b995a-036c-4e9e-aa67-0570ada5cb6a';
    const elB = '4d3509e-0dce-458b-bf62-f3555497a5a4';
    const john = { name: 'john', color: 'red' };
    const jane = { name: 'jane', color: 'blue' };

    act(() => {
      editor.remoteSelect(john.name, john.color, [elA]);
    });

    expect(store.getState().remoteSelection[elA]).toEqual([john]);

    act(() => {
      editor.remoteSelect(jane.name, jane.color, [elA, elB]);
    });

    expect(store.getState().remoteSelection[elA]).toEqual([john, jane]);
    expect(store.getState().remoteSelection[elB]).toEqual([jane]);

    act(() => {
      editor.remoteSelect(john.name, john.color, [elB], [elA]);
    });

    expect(store.getState().remoteSelection[elA]).toEqual([jane]);
    expect(store.getState().remoteSelection[elB]).toEqual([jane, john]);

    act(() => {
      editor.pruneRemoteSelectors([john]);
    });

    expect(store.getState().remoteSelection[elA]).toEqual([]);
    expect(store.getState().remoteSelection[elB]).toEqual([john]);
  });

  it('set type to UseCaseDiagram', () => {
    act(() => {
      editor.type = UMLDiagramType.UseCaseDiagram;
    });
    expect(editor.model.type).toEqual(UMLDiagramType.UseCaseDiagram);
  });
  it('set type to CommunicationDiagram', () => {
    act(() => {
      editor.type = UMLDiagramType.CommunicationDiagram;
    });
    expect(editor.model.type).toEqual(UMLDiagramType.CommunicationDiagram);
  });
  it('set type to ComponentDiagram', () => {
    act(() => {
      editor.type = UMLDiagramType.ComponentDiagram;
    });
    expect(editor.model.type).toEqual(UMLDiagramType.ComponentDiagram);
  });
  it('set type to DeploymentDiagram', () => {
    act(() => {
      editor.type = UMLDiagramType.DeploymentDiagram;
    });
    expect(editor.model.type).toEqual(UMLDiagramType.DeploymentDiagram);
  });
  it('set type to PetriNet', () => {
    act(() => {
      editor.type = UMLDiagramType.PetriNet;
    });
    expect(editor.model.type).toEqual(UMLDiagramType.PetriNet);
  });
  it('set type to ActivityDiagram', () => {
    act(() => {
      editor.type = UMLDiagramType.ActivityDiagram;
    });
    expect(editor.model.type).toEqual(UMLDiagramType.ActivityDiagram);
  });
  it('set type to ObjectDiagram', () => {
    act(() => {
      editor.type = UMLDiagramType.ObjectDiagram;
    });
    expect(editor.model.type).toEqual(UMLDiagramType.ObjectDiagram);
  });
  it('set type to ClassDiagram', () => {
    act(() => {
      editor.type = UMLDiagramType.ClassDiagram;
    });
    expect(editor.model.type).toEqual(UMLDiagramType.ClassDiagram);
  });
  it('set type to SyntaxTree', () => {
    act(() => {
      editor.type = UMLDiagramType.SyntaxTree;
    });
    expect(editor.model.type).toEqual(UMLDiagramType.SyntaxTree);
  });
});
