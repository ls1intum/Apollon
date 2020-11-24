// @ts-ignore
import * as React from 'react';
import { render as testLibraryRender } from '@testing-library/react';
import * as Apollon from '../main/apollon-editor';
import testClassDiagram from './test-resources/class-diagram.json';
import { Selection } from '../../docs/source/user/api/typings';
import fn = jest.fn;
import { Assessment, UMLDiagramType, UMLModel } from '../main';
import { getRealStore } from './test-utils/test-utils';
import { AssessmentRepository } from '../main/services/assessment/assessment-repository';
import { IAssessment } from '../main/services/assessment/assessment';
import { ModelState } from '../main/components/store/model-state';
import { UMLElementCommonRepository } from '../main/services/uml-element/uml-element-common-repository';
import { UMLClass } from '../main/packages/uml-class-diagram/uml-class/uml-class';

const testClassDiagramAsSVG = require('./test-resources/class-diagram-as-svg.json') as string;

describe('test apollon editor ', () => {
  it('get and set model', () => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});
    editor.model = testClassDiagram as any;
    expect(testClassDiagram).toEqual(editor.model);
  });
  it('exportModelAsSvg', () => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});
    editor.model = testClassDiagram as any;
    const svg = editor.exportAsSVG();
    expect(svg.svg).toEqual(testClassDiagramAsSVG);
  });

  it('subscribeToSelection', (done) => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});
    editor.model = testClassDiagram as any;

    const selection: Selection = {
      elements: testClassDiagram.elements.map((element) => element.id),
      relationships: testClassDiagram.relationships.map((relationship) => relationship.id),
    };
    const selectionCallback = (s: Selection) => {
      expect(s).toEqual(selection);
      done();
    };

    editor.subscribeToSelectionChange(selectionCallback);
    editor.select(selection);
  });
  it('unsubscribeFromSelection', (done) => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});
    editor.model = testClassDiagram as any;

    const selection: Selection = {
      elements: testClassDiagram.elements.map((element) => element.id),
      relationships: testClassDiagram.relationships.map((relationship) => relationship.id),
    };
    const selectionCallback = fn((s: Selection) => {});

    // subscribe to selection and call select
    const selectionSubscription = editor.subscribeToSelectionChange(selectionCallback);
    editor.select(selection);
    setTimeout(() => {
      // unsubscribe and call select again
      editor.unsubscribeFromSelectionChange(selectionSubscription);
      editor.select({ elements: [], relationships: [] });
      setTimeout(() => {
        expect(selectionCallback).toBeCalledTimes(1);
        done();
      }, 500);
    }, 500);
  });
  it('unsubscribeFromSelectionValidation', (done) => {
    // same test as above, but don't unsubscribe
    // this validates that the timing is enough so that selection callback would be called twice
    // it is still possible that callback would be called twice in unsubscribeFromSelection and not in unsubscribeFromSelectionValidation, but less likely
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});
    editor.model = testClassDiagram as any;

    const selection: Selection = {
      elements: testClassDiagram.elements.map((element) => element.id),
      relationships: testClassDiagram.relationships.map((relationship) => relationship.id),
    };
    const selectionCallback = fn((s: Selection) => {});

    // subscribe to selection and call select
    editor.subscribeToSelectionChange(selectionCallback);
    editor.select(selection);
    setTimeout(() => {
      // just select again
      editor.select({ elements: [], relationships: [] });
      setTimeout(() => {
        // should be called twice
        expect(selectionCallback).toBeCalledTimes(2);
        done();
      }, 500);
    }, 500);
  });

  it('subscribeToAssessmentChange', (done) => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});

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
      expect(receivedAssessment).toEqual({
        elementType: elementToAssess.type,
        feedback: assessment.feedback,
        modelElementId: elementToAssess.id,
        score: assessment.score,
      });
      done();
    };
    // subscribe to assessment change
    editor.subscribeToAssessmentChange(assessmentChangedCallback);

    // create and assess element
    const assessAction = AssessmentRepository.assess(elementToAssess.id, assessment);
    store.dispatch(assessAction);
  });
  it('unsubscribeFromAssessment', (done) => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});

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
        expect(assessmentChangedCallback).toBeCalledTimes(1);
        done();
      }, 500);
    }, 500);
  });
  it('unsubscribeFromAssessmentValidation', (done) => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});

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
        expect(assessmentChangedCallback).toBeCalledTimes(2);
        done();
      }, 500);
    }, 500);
  });

  it('subscribeToModelChange', (done) => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});

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
      expect(model.elements.filter((e) => e.id === element.id)).toHaveLength(1);
      done();
    };
    // subscribe to model changes
    editor.subscribeToModelChange(modelChangedCallback);

    // create element -> triggers model change
    const createElementAction = UMLElementCommonRepository.create<UMLClass>(element);
    store.dispatch(createElementAction);
  });
  it('unsubscribeFromModelChanges', (done) => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});

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
        expect(modelChangedCallback).toBeCalledTimes(1);
        done();
      }, 500);
    }, 500);
  });
  it('unsubscribeFromModelChangesValidation', (done) => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});

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
        expect(modelChangedCallback).toBeCalledTimes(2);
        done();
      }, 500);
    }, 500);
  });
  it('set type to UseCaseDiagram', () => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});

    editor.model = testClassDiagram as any;
    editor.type = UMLDiagramType.UseCaseDiagram;
    expect(editor.model.type).toEqual(UMLDiagramType.UseCaseDiagram);
  });
  it('set type to CommunicationDiagram', () => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});

    editor.model = testClassDiagram as any;
    editor.type = UMLDiagramType.CommunicationDiagram;
    expect(editor.model.type).toEqual(UMLDiagramType.CommunicationDiagram);
  });
  it('set type to ComponentDiagram', () => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});

    editor.model = testClassDiagram as any;
    editor.type = UMLDiagramType.ComponentDiagram;
    expect(editor.model.type).toEqual(UMLDiagramType.ComponentDiagram);
  });
  it('set type to DeploymentDiagram', () => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});

    editor.model = testClassDiagram as any;
    editor.type = UMLDiagramType.DeploymentDiagram;
    expect(editor.model.type).toEqual(UMLDiagramType.DeploymentDiagram);
  });
  it('set type to PetriNet', () => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});

    editor.model = testClassDiagram as any;
    editor.type = UMLDiagramType.PetriNet;
    expect(editor.model.type).toEqual(UMLDiagramType.PetriNet);
  });
  it('set type to ActivityDiagram', () => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});

    editor.model = testClassDiagram as any;
    editor.type = UMLDiagramType.ActivityDiagram;
    expect(editor.model.type).toEqual(UMLDiagramType.ActivityDiagram);
  });
  it('set type to ObjectDiagram', () => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});

    editor.model = testClassDiagram as any;
    editor.type = UMLDiagramType.ObjectDiagram;
    expect(editor.model.type).toEqual(UMLDiagramType.ObjectDiagram);
  });
  it('set type to ClassDiagram', () => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});

    editor.model = testClassDiagram as any;
    editor.type = UMLDiagramType.ClassDiagram;
    expect(editor.model.type).toEqual(UMLDiagramType.ClassDiagram);
  });
  it('set type to SyntaxTree', () => {
    const { container } = testLibraryRender(<div />);
    const editor = new Apollon.ApollonEditor(container as HTMLElement, {});

    editor.model = testClassDiagram as any;
    editor.type = UMLDiagramType.SyntaxTree;
    expect(editor.model.type).toEqual(UMLDiagramType.SyntaxTree);
  });
});
