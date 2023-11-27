import { Assessment, UMLElement, UMLRelationship } from '../../typings';
import { v2RelationshipToV3Relationship, v3RelaionshipToV2Relationship } from './transform';
import { UMLModelV2 } from './typings';

/**
 *
 * Finds an element in the model by id
 *
 * @param {UMLModelV2} model the model to search
 * @param {string} id the id of the element to find
 * @returns {UMLElement | undefined} the element or undefined if not found
 */
export function findElement(model: UMLModelV2, id: string): UMLElement | undefined {
  return model.elements.find((element) => element.id === id);
}

/**
 *
 * Adds given element to given model. If element with same id already exists, it will be replaced.
 *
 * @param {UMLModelV2} model the model to update
 * @param {UMLElement} element the element to add or update
 */
export function addOrUpdateElement(model: UMLModelV2, element: UMLElement): void {
  const priorIndex = model.elements.findIndex((e) => e.id === element.id);
  if (priorIndex >= 0) {
    model.elements[priorIndex] = element;
  } else {
    model.elements.push(element);
  }
}

/**
 *
 * Finds a relationship in the model by id
 *
 * @param {UMLModelV2} model the model to search
 * @param {string} id the id of the relationship to find
 * @returns {UMLRelationship | undefined} the relationship or undefined if not found
 */
export function findRelationship(model: UMLModelV2, id: string): UMLRelationship | undefined {
  const candidate = model.relationships.find((relationship) => relationship.id === id);
  return candidate && v2RelationshipToV3Relationship(candidate);
}

/**
 *
 * Adds given relationship to given model. If relationship with same id already exists, it will be replaced.
 *
 * @param {UMLModelV2} model the model to update
 * @param {UMLRelationship} relationship the relationship to add or update
 */
export function addOrUpdateRelationship(model: UMLModelV2, relationship: UMLRelationship): void {
  const v2rel = v3RelaionshipToV2Relationship(relationship);
  const priorIndex = model.relationships.findIndex((r) => r.id === relationship.id);
  if (priorIndex >= 0) {
    model.relationships[priorIndex] = v2rel;
  } else {
    model.relationships.push(v2rel);
  }
}

/**
 *
 * Finds an assessment in the model by id
 *
 * @param {UMLModelV2} model the model to search
 * @param {string} id the id of the assessment to find
 * @returns {Assessment | undefined} the assessment or undefined if not found
 */
export function findAssessment(model: UMLModelV2, id: string): Assessment | undefined {
  return model.assessments.find((assessment) => assessment.modelElementId === id);
}

/**
 *
 * Adds given assessment to given model. If assessment with same id already exists, it will be replaced.
 *
 * @param {UMLModelV2} model the model to update
 * @param {Assessment} assessment the assessment to add or update
 */
export function addOrUpdateAssessment(model: UMLModelV2, assessment: Assessment): void {
  const priorIndex = model.assessments.findIndex((a) => a.modelElementId === assessment.modelElementId);
  if (priorIndex >= 0) {
    model.assessments[priorIndex] = assessment;
  } else {
    model.assessments.push(assessment);
  }
}

/**
 * @returns true if given element is interactive, false otherwise
 */
export function isInteractiveElement(model: UMLModelV2, id: string): boolean {
  return model.interactive.elements.includes(id);
}

/**
 *
 * Sets given element interactive state to given value.
 *
 * @param {UMLModelV2} model the model to update
 * @param {string} id the id of the element to update
 * @param {boolean} interactive the interactive state to set
 */
export function setInteractiveElement(model: UMLModelV2, id: string, interactive: boolean): void {
  if (interactive) {
    if (!isInteractiveElement(model, id)) {
      model.interactive.elements.push(id);
    }
  } else {
    const index = model.interactive.elements.indexOf(id);
    if (index >= 0) {
      model.interactive.elements.splice(index, 1);
    }
  }
}

/**
 * @returns true if given relationship is interactive, false otherwise
 */
export function isInteractiveRelationship(model: UMLModelV2, id: string): boolean {
  return model.interactive.relationships.includes(id);
}

/**
 *
 * Sets given relationship interactive state to given value.
 *
 * @param {UMLModelV2} model the model to update
 * @param {string} id the id of the relationship to update
 * @param {boolean} interactive the interactive state to set
 */
export function setInteractiveRelationship(model: UMLModelV2, id: string, interactive: boolean): void {
  if (interactive) {
    if (!isInteractiveRelationship(model, id)) {
      model.interactive.relationships.push(id);
    }
  } else {
    const index = model.interactive.relationships.indexOf(id);
    if (index >= 0) {
      model.interactive.relationships.splice(index, 1);
    }
  }
}
