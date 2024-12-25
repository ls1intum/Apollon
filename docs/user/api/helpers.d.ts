import { Assessment, UMLElement, UMLRelationship } from '../typings';
import { UMLModelCompat } from './typings';
/**
 *
 * Finds an element in the model by id
 *
 * @param {UMLModelCompat} model the model to search
 * @param {string} id the id of the element to find
 * @returns {UMLElement | undefined} the element or undefined if not found
 */
export declare function findElement(model: UMLModelCompat, id: string): UMLElement | undefined;
/**
 *
 * Adds given element to given model. If element with same id already exists, it will be replaced.
 *
 * @param {UMLModelCompat} model the model to update
 * @param {UMLElement} element the element to add or update
 */
export declare function addOrUpdateElement(model: UMLModelCompat, element: UMLElement): void;
/**
 *
 * Finds a relationship in the model by id
 *
 * @param {UMLModelCompat} model the model to search
 * @param {string} id the id of the relationship to find
 * @returns {UMLRelationship | undefined} the relationship or undefined if not found
 */
export declare function findRelationship(model: UMLModelCompat, id: string): UMLRelationship | undefined;
/**
 *
 * Adds given relationship to given model. If relationship with same id already exists, it will be replaced.
 *
 * @param {UMLModelCompat} model the model to update
 * @param {UMLRelationship} relationship the relationship to add or update
 */
export declare function addOrUpdateRelationship(model: UMLModelCompat, relationship: UMLRelationship): void;
/**
 *
 * Finds an assessment in the model by id
 *
 * @param {UMLModelCompat} model the model to search
 * @param {string} id the id of the assessment to find
 * @returns {Assessment | undefined} the assessment or undefined if not found
 */
export declare function findAssessment(model: UMLModelCompat, id: string): Assessment | undefined;
/**
 *
 * Adds given assessment to given model. If assessment with same id already exists, it will be replaced.
 *
 * @param {UMLModelCompat} model the model to update
 * @param {Assessment} assessment the assessment to add or update
 */
export declare function addOrUpdateAssessment(model: UMLModelCompat, assessment: Assessment): void;
/**
 * @returns true if the element is interactive, false otherwise.
 */
export declare function isInteractiveElement(model: UMLModelCompat, id: string): boolean;
/**
 * Sets the interactive state of the element.
 *
 * @param {UMLModelCompat} model the model to update
 * @param {string} id the id of the element to set interactive state
 * @param {boolean} interactive the interactive state to set
 */
export declare function setInteractiveElement(model: UMLModelCompat, id: string, interactive: boolean): void;
/**
 * @returns true if the relationship is interactive, false otherwise.
 */
export declare function isInteractiveRelationship(model: UMLModelCompat, id: string): boolean;
/**
 * Sets the interactive state of the relationship.
 *
 * @param {UMLModelCompat} model the model to update
 * @param {string} id the id of the relationship to set interactive state
 * @param {boolean} interactive the interactive state to set
 */
export declare function setInteractiveRelationship(model: UMLModelCompat, id: string, interactive: boolean): void;
