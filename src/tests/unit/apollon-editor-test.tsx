// @ts-ignore
import * as React from 'react';
import { act, render as testLibraryRender } from '@testing-library/react';
import * as Apollon from '../../main/apollon-editor';
import * as ApollonTypes from '../../main/typings';
import testClassDiagram from './test-resources/class-diagram.json';
import { Selection } from '../../../docs/source/user/api/typings';
import { Assessment, SVG, UMLDiagramType, UMLModel } from '../../main';
import { getRealStore } from './test-utils/test-utils';
import { AssessmentRepository } from '../../main/services/assessment/assessment-repository';
import { IAssessment } from '../../main/services/assessment/assessment';
import { ModelState } from '../../main/components/store/model-state';
import { UMLElementCommonRepository } from '../../main/services/uml-element/uml-element-common-repository';
import { UMLClass } from '../../main/packages/uml-class-diagram/uml-class/uml-class';
import fn = jest.fn;

let editor = {} as Apollon.ApollonEditor;

afterEach(() => {
  act(() => {
    editor.destroy();
  });
});

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

  it('exportModelAsSvg', async () => {
    const svg: ApollonTypes.SVG = await editor.exportAsSVG();
    expect(ignoreSVGClassNames(svg.svg)).toEqual(testClassDiagramAsSVG);
  });

  it('subscribeToSelection', async () => {
    const selection: Selection = {
      elements: testClassDiagram.elements.map((element) => element.id),
      relationships: testClassDiagram.relationships.map((relationship) => relationship.id),
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
      elements: testClassDiagram.elements.map((element) => element.id),
      relationships: testClassDiagram.relationships.map((relationship) => relationship.id),
    };
    const selectionCallback = fn((s: Selection) => {});

    // subscribe to selection and call select
    const selectionSubscription = editor.subscribeToSelectionChange(selectionCallback);
    act(() => {
      editor.select(selection);
    });
    setTimeout(() => {
      // unsubscribe and call select again
      editor.unsubscribeFromSelectionChange(selectionSubscription);
      act(() => {
        editor.select({ elements: [], relationships: [] });
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
      elements: testClassDiagram.elements.map((element) => element.id),
      relationships: testClassDiagram.relationships.map((relationship) => relationship.id),
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
        editor.select({ elements: [], relationships: [] });
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
      return expect(model.elements.filter((e) => e.id === element.id)).toHaveLength(1);
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
      return expect(model.elements.filter((e) => e.id === element.id)).toHaveLength(1);
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
