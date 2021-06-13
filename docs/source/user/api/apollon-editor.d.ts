import 'pepjs';
import { DeepPartial } from 'redux';
import { Styles } from './components/theme/styles';
import { Locale } from './services/editor/editor-types';
import * as Apollon from './typings';
import { UMLDiagramType, UMLModel } from './typings';
export declare class ApollonEditor {
    private container;
    private options;
    /**
     * Returns the current model of the Apollon Editor
     */
    get model(): Apollon.UMLModel;
    /**
     * Sets a model as the current model of the Apollon Editor
     * @param model valid Apollon Editor Model
     */
    set model(model: Apollon.UMLModel);
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
    static exportModelAsSvg(model: Apollon.UMLModel, options?: Apollon.ExportOptions, theme?: DeepPartial<Styles>): Apollon.SVG;
    selection: Apollon.Selection;
    private currentModelState?;
    private assessments;
    private application;
    private selectionSubscribers;
    private assessmentSubscribers;
    private modelSubscribers;
    private discreteModelSubscribers;
    private errorSubscribers;
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
     * Register callback which is executed when an error occurs in the editor. Apollon will try to recreate the latest working state when an error occurs, so that it is less visible to user / less interrupting.
     * A registered callback would be called anyway, giving the full error, so that the application which uses Apollon can decide what to do next.
     * @param callback callback function which is called when an error occurs
     * @return returns the subscription identifier which can be used to unsubscribe
     */
    subscribeToApollonErrors(callback: (error: Error) => void): number;
    /**
     * Removes error subscription, so that the corresponding callback is no longer executed when an error occurs.
     * @param subscriptionId subscription identifier
     */
    unsubscribeToApollonErrors(subscriptionId: number): void;
    /**
     * exports current model as svg
     * @param options options to change the export behavior (add margin, exclude element ...)
     */
    exportAsSVG(options?: Apollon.ExportOptions): Apollon.SVG;
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
}
