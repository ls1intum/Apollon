import { Assessment, UMLElement, UMLRelationship } from '../typings';
import { UMLModelCompat } from './typings';
import {
  addOrUpdateAssessment as addOrUpdateAssessmentV2,
  addOrUpdateElement as addOrUpdateElementV2,
  addOrUpdateRelationship as addOrUpdateRelationshipV2,
  findAssessment as findAssessmentV2,
  findElement as findElementV2,
  findRelationship as findRelationshipV2,
  isInteractiveElement as isInteractiveElementV2,
  isInteractiveRelationship as isInteractiveRelationshipV2,
  isV2,
  setInteractiveElement as setInteractiveElementV2,
  setInteractiveRelationship as setInteractiveRelationshipV2,
} from './v2';

/**
 *
 * Finds an element in the model by id
 *
 * @param {UMLModelCompat} model the model to search
 * @param {string} id the id of the element to find
 * @returns {UMLElement | undefined} the element or undefined if not found
 */
export function findElement(model: UMLModelCompat, id: string): UMLElement | undefined {
  if (isV2(model)) {
    return findElementV2(model, id);
  } else {
    return model.elements[id];
  }
}

/**
 *
 * Adds given element to given model. If element with same id already exists, it will be replaced.
 *
 * @param {UMLModelCompat} model the model to update
 * @param {UMLElement} element the element to add or update
 */
export function addOrUpdateElement(model: UMLModelCompat, element: UMLElement): void {
  if (isV2(model)) {
    return addOrUpdateElementV2(model, element);
  } else {
    model.elements[element.id] = element;
  }
}

/**
 *
 * Finds a relationship in the model by id
 *
 * @param {UMLModelCompat} model the model to search
 * @param {string} id the id of the relationship to find
 * @returns {UMLRelationship | undefined} the relationship or undefined if not found
 */
export function findRelationship(model: UMLModelCompat, id: string): UMLRelationship | undefined {
  if (isV2(model)) {
    return findRelationshipV2(model, id);
  } else {
    return model.relationships[id];
  }
}

/**
 *
 * Adds given relationship to given model. If relationship with same id already exists, it will be replaced.
 *
 * @param {UMLModelCompat} model the model to update
 * @param {UMLRelationship} relationship the relationship to add or update
 */
export function addOrUpdateRelationship(model: UMLModelCompat, relationship: UMLRelationship): void {
  if (isV2(model)) {
    return addOrUpdateRelationshipV2(model, relationship);
  } else {
    model.relationships[relationship.id] = relationship;
  }
}

/**
 *
 * Finds an assessment in the model by id
 *
 * @param {UMLModelCompat} model the model to search
 * @param {string} id the id of the assessment to find
 * @returns {Assessment | undefined} the assessment or undefined if not found
 */
export function findAssessment(model: UMLModelCompat, id: string): Assessment | undefined {
  if (isV2(model)) {
    return findAssessmentV2(model, id);
  } else {
    return model.assessments[id];
  }
}

/**
 *
 * Adds given assessment to given model. If assessment with same id already exists, it will be replaced.
 *
 * @param {UMLModelCompat} model the model to update
 * @param {Assessment} assessment the assessment to add or update
 */
export function addOrUpdateAssessment(model: UMLModelCompat, assessment: Assessment): void {
  if (isV2(model)) {
    return addOrUpdateAssessmentV2(model, assessment);
  } else {
    model.assessments[assessment.modelElementId] = assessment;
  }
}

/**
 * @returns true if the element is interactive, false otherwise.
 */
export function isInteractiveElement(model: UMLModelCompat, id: string): boolean {
  if (isV2(model)) {
    return isInteractiveElementV2(model, id);
  } else {
    return !!model.interactive.elements[id];
  }
}

/**
 * Sets the interactive state of the element.
 *
 * @param {UMLModelCompat} model the model to update
 * @param {string} id the id of the element to set interactive state
 * @param {boolean} interactive the interactive state to set
 */
export function setInteractiveElement(model: UMLModelCompat, id: string, interactive: boolean): void {
  if (isV2(model)) {
    return setInteractiveElementV2(model, id, interactive);
  } else {
    model.interactive.elements[id] = interactive;
  }
}

/**
 * @returns true if the relationship is interactive, false otherwise.
 */
export function isInteractiveRelationship(model: UMLModelCompat, id: string): boolean {
  if (isV2(model)) {
    return isInteractiveRelationshipV2(model, id);
  } else {
    return !!model.interactive.relationships[id];
  }
}

/**
 * Sets the interactive state of the relationship.
 *
 * @param {UMLModelCompat} model the model to update
 * @param {string} id the id of the relationship to set interactive state
 * @param {boolean} interactive the interactive state to set
 */
export function setInteractiveRelationship(model: UMLModelCompat, id: string, interactive: boolean): void {
  if (isV2(model)) {
    return setInteractiveRelationshipV2(model, id, interactive);
  } else {
    model.interactive.relationships[id] = interactive;
  }
}
