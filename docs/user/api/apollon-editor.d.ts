import 'pepjs';
import { DeepPartial } from 'redux';
import { Styles } from './components/theme/styles';
import { Patch } from './services/patcher';
import { Locale } from './services/editor/editor-types';
import * as Apollon from './typings';
import { UMLDiagramType, UMLModel } from './typings';
import { UMLModelCompat } from './compat';
export declare class ApollonEditor {
    private container;
    private options;
    private ensureInitialized;
    /**
     * Returns the current model of the Apollon Editor
     */
    get model(): Apollon.UMLModel;
    /**
     * Sets a model as the current model of the Apollon Editor
     * @param model valid Apollon Editor Model
     */
    set model(model: UMLModelCompat);
    /**
     * Sets the diagram type of the current Apollon Editor. This changes the selection of elements the user can chose from on the sidebar.
     * @param diagramType the new diagram type
     */
    set type(diagramType: UMLDiagramType);
    /**
     * Sets the current locale of the Apollon Editor.
     * @param locale supported locale
     */
    set locale(locale: Locale);
    /**
     * renders a model as a svg and returns it. Therefore the svg is temporarily added to the dom and removed after it has been rendered.
     * @param model the apollon model to export as a svg
     * @param options options to change the export behavior (add margin, exclude element ...)
     * @param theme the theme which should be applied on the svg
     */
    static exportModelAsSvg(model: Apollon.UMLModel, options?: Apollon.ExportOptions, theme?: DeepPartial<Styles>): Promise<Apollon.SVG>;
    selection: Apollon.Selection;
    private root?;
    private currentModelState?;
    private assessments;
    private application;
    private patcher;
    private selectionSubscribers;
    private assessmentSubscribers;
    private modelSubscribers;
    private discreteModelSubscribers;
    private errorSubscribers;
    private nextRenderPromise;
    constructor(container: HTMLElement, options: Apollon.ApollonOptions);
    /**
     * Destroys the Apollon Editor and unmounts it from its container
     */
    destroy(): void;
    /**
     * Selects the by their id identified UMLElements and UMLRelationships
     * @param selection contains ids of the elements and relationships which should be selected
     */
    select(selection: Apollon.Selection): void;
    _getNewSubscriptionId(subscribers: {
        [key: number]: any;
    }): number;
    /**
     * Register callback which is executed when the selection of elements and relationships changes
     * @param callback function which is called when selection changes
     * @return returns the subscription identifier which can be used to unsubscribe
     */
    subscribeToSelectionChange(callback: (selection: Apollon.Selection) => void): number;
    /**
     * Remove selection subscription, so that the corresponding callback is no longer executed when the selection of elements is changed.
     * @param subscriptionId subscription identifier
     */
    unsubscribeFromSelectionChange(subscriptionId: number): void;
    /**
     * Register callback which is executed when the assessment of elements and relationships are changed
     * @param callback function which is called when assessment changes
     * @return returns the subscription identifier which can be used to unsubscribe
     */
    subscribeToAssessmentChange(callback: (assessments: Apollon.Assessment[]) => void): number;
    /**
     * Remove assessment subscription, so that the corresponding callback is no longer executed when the assessment of elements are changed.
     * @param subscriptionId subscription identifier
     */
    unsubscribeFromAssessmentChange(subscriptionId: number): void;
    /**
     * Register callback which is executed when the model changes
     * @param callback function which is called when the model changes
     * @return returns the subscription identifier which can be used to unsubscribe
     */
    subscribeToModelChange(callback: (model: UMLModel) => void): number;
    /**
     * Remove assessment subscription, so that the corresponding callback is no longer executed when the assessment of elements are changed.
     * @param subscriptionId subscription identifier
     */
    unsubscribeFromModelChange(subscriptionId: number): void;
    /**
     * Register callback which is executed at the end of each user action and ignores the changes during a user action
     * For example: moving of an element is ignored until user releases the element
     * @param callback function which is called when the model changes
     * @return returns the subscription identifier which can be used to unsubscribe
     */
    subscribeToModelDiscreteChange(callback: (model: UMLModel) => void): number;
    /**
     * Remove model change subscription, so that the corresponding callback is no longer executed when the model is changed.
     * @param subscriptionId subscription identifier
     */
    unsubscribeFromDiscreteModelChange(subscriptionId: number): void;
    /**
     * Register callback which is executed when the model changes, receiving the changes to the model
     * in [JSONPatch](http://jsonpatch.com/) format. This callback is only executed for discrete changes to the model.
     * Discrete changes are changes that should not be missed and are executed at the end of important user actions.
     * @param callback function which is called when the model changes
     * @returns the subscription identifier which can be used to unsubscribe
     */
    subscribeToModelChangePatches(callback: (patch: Patch) => void): number;
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
    subscribeToAllModelChangePatches(callback: (patch: Patch) => void): number;
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
    subscribeToModelContinuousChangePatches(callback: (patch: Patch) => void): number;
    /**
     * Remove model change subscription, so that the corresponding callback is no longer executed when the model is changed.
     * @param subscriptionId subscription identifier
     */
    unsubscribeFromModelChangePatches(subscriptionId: number): void;
    /**
     * Imports a patch into the current model.
     * @param patch changes to be applied to the model, in [JSONPatch](http://jsonpatch.com/) format.
     */
    importPatch(patch: Patch): void;
    /**
     * Register callback which is executed when an error occurs in the editor. Apollon will try to recreate the latest working state when an error occurs, so that it is less visible to user / less interrupting.
     * A registered callback would be called anyway, giving the full error, so that the application which uses Apollon can decide what to do next.
     * @param callback callback function which is called when an error occurs
     * @return returns the subscription identifier which can be used to unsubscribe
     */
    subscribeToApollonErrors(callback: (error: Error) => void): number;
    /**
     * Displays given elements and relationships as selected or deselected by
     * a given remote selector, identified by a name and a color.
     * @param selectorName name of the remote selector
     * @param selectorColor color of the remote selector
     * @param select ids of elements and relationships to be selected
     * @param deselect ids of elements and relationships to be deselected
     */
    remoteSelect(selectorName: string, selectorColor: string, select: string[], deselect?: string[]): void;
    /**
     * Allows a given set of remote selectors for remotely selecting and deselecting
     * elements and relationships, removing all other selectors. This won't have an effect
     * on future remote selections.
     * @param allowedSelectors allowed remote selectors
     */
    pruneRemoteSelectors(allowedSelectors: {
        name: string;
        color: string;
    }[]): void;
    /**
     * Removes error subscription, so that the corresponding callback is no longer executed when an error occurs.
     * @param subscriptionId subscription identifier
     */
    unsubscribeToApollonErrors(subscriptionId: number): void;
    /**
     * exports current model as svg
     * @param options options to change the export behavior (add margin, exclude element ...)
     */
    exportAsSVG(options?: Apollon.ExportOptions): Promise<Apollon.SVG>;
    /**
     * Returns current scale factor of the application
     */
    getScaleFactor(): number;
    private componentDidMount;
    /**
     * Triggered whenever an action is dispatched which potentially lead to a change in the store / state tree
     * Used to notify all the selection and assessment subscribers of Apollon
     */
    private onDispatch;
    /**
     * Triggered whenever an action is dispatched which potentially lead to a change in the store / state tree
     * Used to notify all the selection and assessment subscribers of Apollon if the action ends with END or DELETE
     */
    private notifyDiscreteModelSubscribers;
    private notifyModelSubscribers;
    private recreateEditor;
    private onErrorOccurred;
    private restoreEditor;
    private get store();
    /**
     * Returns a Promise that resolves when the current React render cycle is finished.
     * => this.store is be available and there should be no errors when trying to access some methods like this.model
     */
    get nextRender(): Promise<void>;
}
