import 'pepjs';
import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { DeepPartial, Store } from 'redux';
import { ModelState, PartialModelState } from './components/store/model-state';
import { Styles } from './components/theme/styles';
import { UMLElementType } from './packages/uml-element-type';
import { UMLRelationshipType } from './packages/uml-relationship-type';
import { Application } from './scenes/application';
import { Svg } from './scenes/svg';
import { Actions } from './services/actions';
import { Patch, Patcher, PatcherRepository } from './services/patcher';
import { ApollonMode, ApollonView, Locale } from './services/editor/editor-types';
import { UMLDiagram } from './services/uml-diagram/uml-diagram';
import { UMLElementRepository } from './services/uml-element/uml-element-repository';
import * as Apollon from './typings';
import { UMLDiagramType, UMLModel } from './typings';
import { Dispatch } from './utils/actions/actions';
import { debounce } from './utils/debounce';
import { delay } from './utils/delay';
import { ErrorBoundary } from './components/controls/error-boundary/ErrorBoundary';
import { replaceColorVariables } from './utils/replace-color-variables';
import { UMLModelCompat } from './compat';

export class ApollonEditor {
  private ensureInitialized() {
    if (!this.store) {
      // tslint:disable-next-line:no-console
      console.error(
        'The application state of Apollon could not be retrieved. The editor may already be destroyed or you might need to `await apollonEditor.nextRender`.',
      );
      throw new Error(
        'The application state of Apollon could not be retrieved. The editor may already be destroyed or you might need to `await apollonEditor.nextRender`.',
      );
    }
  }

  /**
   * Returns the current model of the Apollon Editor
   */
  get model(): Apollon.UMLModel {
    this.ensureInitialized();
    return ModelState.toModel(this.store!.getState());
  }

  /**
   * Sets a model as the current model of the Apollon Editor
   * @param model valid Apollon Editor Model
   */
  set model(model: UMLModelCompat) {
    this.ensureInitialized();
    const state: PartialModelState = {
      ...ModelState.fromModel(model),
      editor: { ...this.store!.getState().editor },
    };
    this.recreateEditor(state);
  }

  /**
   * Sets the diagram type of the current Apollon Editor. This changes the selection of elements the user can chose from on the sidebar.
   * @param diagramType the new diagram type
   */
  set type(diagramType: UMLDiagramType) {
    this.ensureInitialized();
    const state: PartialModelState = {
      ...this.store!.getState(),
      diagram: new UMLDiagram({
        type: diagramType,
      }),
      elements: undefined,
    };
    this.recreateEditor(state);
  }

  /**
   * Sets the current locale of the Apollon Editor.
   * @param locale supported locale
   */
  set locale(locale: Locale) {
    this.ensureInitialized();
    const state = this.store!.getState();
    this.options.locale = locale;
    this.recreateEditor(state);
  }

  /**
   * renders a model as a svg and returns it. Therefore the svg is temporarily added to the dom and removed after it has been rendered.
   * @param model the apollon model to export as a svg
   * @param options options to change the export behavior (add margin, exclude element ...)
   * @param theme the theme which should be applied on the svg
   */
  static async exportModelAsSvg(
    model: Apollon.UMLModel,
    options?: Apollon.ExportOptions,
    theme?: DeepPartial<Styles>,
  ): Promise<Apollon.SVG> {
    const container = document.createElement('div');
    const root = createRoot(container);
    const element = createElement(Svg, { model, options, styles: theme });
    const svg = new Svg({ model, options, styles: theme });
    root.render(element);
    await delay(50);

    return {
      svg: replaceColorVariables(container.querySelector('svg')!.outerHTML),
      clip: svg.state.bounds,
    };
  }

  selection: Apollon.Selection = { elements: {}, relationships: {} };
  private root?: Root;
  private currentModelState?: ModelState;
  private assessments: Apollon.Assessment[] = [];
  private application: Application | null = null;
  private patcher = new Patcher<UMLModel>();
  private selectionSubscribers: { [key: number]: (selection: Apollon.Selection) => void } = {};
  private assessmentSubscribers: { [key: number]: (assessments: Apollon.Assessment[]) => void } = {};
  private modelSubscribers: { [key: number]: (model: Apollon.UMLModel) => void } = {};
  private discreteModelSubscribers: { [key: number]: (model: Apollon.UMLModel) => void } = {};
  private errorSubscribers: { [key: number]: (error: Error) => void } = {};
  private nextRenderPromise: Promise<void>;

  constructor(
    private container: HTMLElement,
    private options: Apollon.ApollonOptions,
  ) {
    let state: PartialModelState | undefined = options.model ? ModelState.fromModel(options.model) : {};

    state = {
      ...state,
      diagram: new UMLDiagram({
        ...state.diagram,
        type: options.type,
      }),
      editor: {
        ...state.editor,
        view: ApollonView.Modelling,
        mode: options.mode || ApollonMode.Exporting,
        colorEnabled: options.colorEnabled || false,
        zoomFactor: options.scale || 1.0,
        readonly: options.readonly || false,
        enablePopups: options.enablePopups === true || options.enablePopups === undefined,
        enableCopyPasteToClipboard: options.copyPasteToClipboard === true,
        features: {
          hoverable: true,
          selectable: true,
          movable: !options.readonly,
          resizable: !options.readonly,
          connectable: !options.readonly,
          updatable: !options.readonly,
          droppable: !options.readonly,
          alternativePortVisualization: false,
        },
      },
    };

    let nextRenderResolve: () => void;
    this.nextRenderPromise = new Promise((resolve) => {
      nextRenderResolve = resolve;
    });

    const element = createElement(Application, {
      ref: async (app) => {
        if (app == null) return;
        this.application = app;
        await app.initialized;
        this.store!.subscribe(this.onDispatch);
        nextRenderResolve();
      },
      state,
      patcher: this.patcher,
      styles: options.theme,
      locale: options.locale,
    });
    const errorBoundary = createElement(ErrorBoundary, { onError: this.onErrorOccurred.bind(this) }, element);
    this.root = createRoot(container);
    this.root.render(errorBoundary);
    try {
      this.currentModelState = this.store?.getState();
    } catch (error) {
      this.currentModelState = undefined;
    }
    this.componentDidMount();
  }

  /**
   * Destroys the Apollon Editor and unmounts it from its container
   */
  destroy() {
    this.root?.unmount();
  }

  /**
   * Selects the by their id identified UMLElements and UMLRelationships
   * @param selection contains ids of the elements and relationships which should be selected
   */
  select(selection: Apollon.Selection) {
    if (!this.store) return;
    const dispatch = this.store.dispatch as Dispatch;
    dispatch(UMLElementRepository.deselect());
    dispatch(
      UMLElementRepository.select([
        ...Object.entries(selection.elements)
          .filter(([, selected]) => selected)
          .map(([id]) => id),
        ...Object.entries(selection.relationships)
          .filter(([, selected]) => selected)
          .map(([id]) => id),
      ]),
    );
  }

  _getNewSubscriptionId(subscribers: { [key: number]: any }): number {
    // largest key + 1
    if (Object.keys(subscribers).length === 0) return 0;
    return Math.max(...Object.keys(subscribers).map((key) => parseInt(key))) + 1; // tslint:disable-line
  }

  /**
   * Register callback which is executed when the selection of elements and relationships changes
   * @param callback function which is called when selection changes
   * @return returns the subscription identifier which can be used to unsubscribe
   */
  subscribeToSelectionChange(callback: (selection: Apollon.Selection) => void): number {
    const id = this._getNewSubscriptionId(this.selectionSubscribers);
    this.selectionSubscribers[id] = callback;
    return id;
  }

  /**
   * Remove selection subscription, so that the corresponding callback is no longer executed when the selection of elements is changed.
   * @param subscriptionId subscription identifier
   */
  unsubscribeFromSelectionChange(subscriptionId: number) {
    delete this.selectionSubscribers[subscriptionId];
  }

  /**
   * Register callback which is executed when the assessment of elements and relationships are changed
   * @param callback function which is called when assessment changes
   * @return returns the subscription identifier which can be used to unsubscribe
   */
  subscribeToAssessmentChange(callback: (assessments: Apollon.Assessment[]) => void): number {
    const id = this._getNewSubscriptionId(this.assessmentSubscribers);
    this.assessmentSubscribers[id] = callback;
    return id;
  }

  /**
   * Remove assessment subscription, so that the corresponding callback is no longer executed when the assessment of elements are changed.
   * @param subscriptionId subscription identifier
   */
  unsubscribeFromAssessmentChange(subscriptionId: number) {
    delete this.assessmentSubscribers[subscriptionId];
  }

  /**
   * Register callback which is executed when the model changes
   * @param callback function which is called when the model changes
   * @return returns the subscription identifier which can be used to unsubscribe
   */
  subscribeToModelChange(callback: (model: UMLModel) => void): number {
    const id = this._getNewSubscriptionId(this.modelSubscribers);
    this.modelSubscribers[id] = callback;
    return id;
  }

  /**
   * Remove assessment subscription, so that the corresponding callback is no longer executed when the assessment of elements are changed.
   * @param subscriptionId subscription identifier
   */
  unsubscribeFromModelChange(subscriptionId: number) {
    delete this.modelSubscribers[subscriptionId];
  }

  /**
   * Register callback which is executed at the end of each user action and ignores the changes during a user action
   * For example: moving of an element is ignored until user releases the element
   * @param callback function which is called when the model changes
   * @return returns the subscription identifier which can be used to unsubscribe
   */
  subscribeToModelDiscreteChange(callback: (model: UMLModel) => void): number {
    const id = this._getNewSubscriptionId(this.discreteModelSubscribers);
    this.discreteModelSubscribers[id] = callback;
    return id;
  }

  /**
   * Remove model change subscription, so that the corresponding callback is no longer executed when the model is changed.
   * @param subscriptionId subscription identifier
   */
  unsubscribeFromDiscreteModelChange(subscriptionId: number) {
    delete this.discreteModelSubscribers[subscriptionId];
  }

  /**
   * Register callback which is executed when the model changes, receiving the changes to the model
   * in [JSONPatch](http://jsonpatch.com/) format. This callback is only executed for discrete changes to the model.
   * Discrete changes are changes that should not be missed and are executed at the end of important user actions.
   * @param callback function which is called when the model changes
   * @returns the subscription identifier which can be used to unsubscribe
   */
  subscribeToModelChangePatches(callback: (patch: Patch) => void): number {
    return this.patcher.subscribeToDiscreteChanges(callback);
  }

  /**
   * Registers a callback which is executed when the model changes, receiving the changes to the model
   * in [JSONPatch](http://jsonpatch.com/) format. This callback is executed for every change to the model, including
   * discrete and continuous changes. Discrete changes are changes that should not be missed and are executed at
   * the end of important user actions. Continuous changes are changes that are executed during user actions, and is
   * ok to miss some of them. For example: moving of an element is a continuous change, while releasing the element
   * is a discrete change.
   * @param callback function which is called when the model changes
   * @returns the subscription identifier which can be used to unsubscribe using `unsubscribeFromModelChangePatches()`.
   */
  subscribeToAllModelChangePatches(callback: (patch: Patch) => void): number {
    return this.patcher.subscribe(callback);
  }

  /**
   * Registers a callback which is executed when the model changes, receiving only the continuous changes to the model.
   * Continuous changes are changes that are executed during user actions, and is ok to miss some of them. For example:
   * moving of an element is a continuous change, while releasing the element is a discrete change.
   *
   * **IMPORTANT**: If you want to keep proper track of the model, make sure that you subscribe to discrete changes
   * as well, either via `subscribeToModelChangePatches()` or `subscribeToAllModelChangePatches()`.
   *
   * @param callback function which is called when the model changes
   * @returns the subscription identifier which can be used to unsubscribe using `unsubscribeFromModelChangePatches()`.
   */
  subscribeToModelContinuousChangePatches(callback: (patch: Patch) => void): number {
    return this.patcher.subscribeToContinuousChanges(callback);
  }

  /**
   * Remove model change subscription, so that the corresponding callback is no longer executed when the model is changed.
   * @param subscriptionId subscription identifier
   */
  unsubscribeFromModelChangePatches(subscriptionId: number): void {
    return this.patcher.unsubscribe(subscriptionId);
  }

  /**
   * Imports a patch into the current model.
   * @param patch changes to be applied to the model, in [JSONPatch](http://jsonpatch.com/) format.
   */
  importPatch(patch: Patch): void {
    this.store?.dispatch(PatcherRepository.patch(patch));
  }

  /**
   * Register callback which is executed when an error occurs in the editor. Apollon will try to recreate the latest working state when an error occurs, so that it is less visible to user / less interrupting.
   * A registered callback would be called anyway, giving the full error, so that the application which uses Apollon can decide what to do next.
   * @param callback callback function which is called when an error occurs
   * @return returns the subscription identifier which can be used to unsubscribe
   */
  subscribeToApollonErrors(callback: (error: Error) => void): number {
    const id = this._getNewSubscriptionId(this.errorSubscribers);
    this.errorSubscribers[id] = callback;
    return id;
  }

  /**
   * Displays given elements and relationships as selected or deselected by
   * a given remote selector, identified by a name and a color.
   * @param selectorName name of the remote selector
   * @param selectorColor color of the remote selector
   * @param select ids of elements and relationships to be selected
   * @param deselect ids of elements and relationships to be deselected
   */
  remoteSelect(selectorName: string, selectorColor: string, select: string[], deselect?: string[]): void {
    this.store?.dispatch(
      UMLElementRepository.remoteSelectDeselect({ name: selectorName, color: selectorColor }, select, deselect || []),
    );
  }

  /**
   * Allows a given set of remote selectors for remotely selecting and deselecting
   * elements and relationships, removing all other selectors. This won't have an effect
   * on future remote selections.
   * @param allowedSelectors allowed remote selectors
   */
  pruneRemoteSelectors(allowedSelectors: { name: string; color: string }[]): void {
    this.store?.dispatch(UMLElementRepository.pruneRemoteSelectors(allowedSelectors));
  }

  /**
   * Removes error subscription, so that the corresponding callback is no longer executed when an error occurs.
   * @param subscriptionId subscription identifier
   */
  unsubscribeToApollonErrors(subscriptionId: number) {
    delete this.errorSubscribers[subscriptionId];
  }

  /**
   * exports current model as svg
   * @param options options to change the export behavior (add margin, exclude element ...)
   */
  exportAsSVG(options?: Apollon.ExportOptions): Promise<Apollon.SVG> {
    return ApollonEditor.exportModelAsSvg(this.model, options, this.options.theme);
  }

  /**
   * Returns current scale factor of the application
   */
  getScaleFactor(): number {
    return this.options.scale || 1;
  }

  private componentDidMount = () => {
    this.container.setAttribute('touch-action', 'none');
  };

  /**
   * Triggered whenever an action is dispatched which potentially lead to a change in the store / state tree
   * Used to notify all the selection and assessment subscribers of Apollon
   */
  private onDispatch = () => {
    if (!this.store) return;
    const { elements, selected, assessments } = this.store.getState();
    const selection: Apollon.Selection = {
      elements: selected
        .filter((id) => elements[id].type in UMLElementType)
        .reduce((acc, id) => ({ ...acc, [id]: true }), {}),
      relationships: selected
        .filter((id) => elements[id].type in UMLRelationshipType)
        .reduce((acc, id) => ({ ...acc, [id]: true }), {}),
    };

    // check if previous selection differs from current selection, if yes -> notify subscribers
    if (JSON.stringify(this.selection) !== JSON.stringify(selection)) {
      Object.values(this.selectionSubscribers).forEach((subscriber) => subscriber(selection));
      this.selection = selection;
    }

    const umlAssessments = Object.keys(assessments).map<Apollon.Assessment>((id) => ({
      modelElementId: id,
      elementType: elements[id].type as Apollon.UMLElementType | Apollon.UMLRelationshipType,
      score: assessments[id].score,
      feedback: assessments[id].feedback,
      dropInfo: assessments[id].dropInfo,
    }));

    // check if previous assessment differs from current selection, if yes -> notify subscribers
    if (JSON.stringify(this.assessments) !== JSON.stringify(umlAssessments)) {
      Object.values(this.assessmentSubscribers).forEach((subscriber) => subscriber(umlAssessments));
      this.assessments = umlAssessments;
    }

    // notfiy that action was done
    this.notifyModelSubscribers();
    this.notifyDiscreteModelSubscribers();
  };

  /**
   * Triggered whenever an action is dispatched which potentially lead to a change in the store / state tree
   * Used to notify all the selection and assessment subscribers of Apollon if the action ends with END or DELETE
   */
  private notifyDiscreteModelSubscribers = () => {
    try {
      // if state not available -> do not emit changes
      if (!this.store) return;
      const model = this.model;
      if (
        // At the end of each update operation there is an action that ends with END except DELETE
        // Function is called with every redux action but only notifies subscribers if the action ends with given words
        this.store.getState().lastAction.endsWith('END') ||
        this.store.getState().lastAction.endsWith('DELETE')
      ) {
        const lastModel = ModelState.toModel(this.store.getState());
        Object.values(this.discreteModelSubscribers).forEach((subscriber) => subscriber(lastModel));
      }
    } catch (error) {
      // if error occured while getting current state for subscribers -> do not emit changes
      // -> no need to emit latest changes
    }
  };

  private notifyModelSubscribers = debounce(() => {
    try {
      // if state not available -> do not emit changes
      if (!this.store) return;
      const model = this.model;
      const lastModel = this.currentModelState ? ModelState.toModel(this.currentModelState) : null;
      if ((!lastModel && model) || (lastModel && JSON.stringify(model) !== JSON.stringify(lastModel))) {
        Object.values(this.modelSubscribers).forEach((subscriber) => subscriber(model));
        this.currentModelState = this.store.getState();
      } else {
        this.currentModelState = this.store.getState();
      }
    } catch (error) {
      // if error occured while getting current state for subscribers -> do not emit changes
      // -> no need to emit latest changes
    }
  }, 50);

  private recreateEditor(state: PartialModelState) {
    this.destroy();

    let nextRenderResolve: () => void;
    this.nextRenderPromise = new Promise((resolve) => {
      nextRenderResolve = resolve;
    });

    const element = createElement(Application, {
      ref: async (app: Application) => {
        if (app == null) return;
        this.application = app;
        await app.initialized;
        this.store!.subscribe(this.onDispatch);
        nextRenderResolve();
      },
      state,
      patcher: this.patcher,
      styles: this.options.theme,
      locale: this.options.locale,
    } as any);
    const errorBoundary = createElement(ErrorBoundary, { onError: this.onErrorOccurred.bind(this) }, element);
    this.root = createRoot(this.container);
    this.root.render(errorBoundary);
    this.componentDidMount();
  }

  private onErrorOccurred(error: Error) {
    Object.values(this.errorSubscribers).forEach((subscriber) => subscriber(error));
    this.restoreEditor();
  }

  private restoreEditor() {
    if (this.currentModelState) {
      const state = {
        ...this.currentModelState,
        hovered: [],
        selected: [],
        moving: [],
        resizing: [],
        connecting: [],
        reconnecting: {},
        updating: [],
      };
      this.recreateEditor(state);
    }
  }

  private get store(): Store<ModelState, Actions> | undefined {
    return this.application?.store?.state.store;
  }

  /**
   * Returns a Promise that resolves when the current React render cycle is finished.
   * => this.store is be available and there should be no errors when trying to access some methods like this.model
   */
  get nextRender(): Promise<void> {
    return this.nextRenderPromise;
  }
}
