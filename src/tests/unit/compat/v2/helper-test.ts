import { deepClone } from 'fast-json-patch';

import {
  addOrUpdateAssessment,
  addOrUpdateElement,
  addOrUpdateRelationship,
  findAssessment,
  findElement,
  findRelationship,
  isInteractiveElement,
  isInteractiveRelationship,
  setInteractiveElement,
  setInteractiveRelationship,
  UMLModelCompat,
} from '../../../../main/compat';
import { Assessment, UMLElement, UMLModel, UMLRelationship } from '../../../../main';

import diagram from '../../test-resources/class-diagram-2.json';
import diagramV2 from '../../test-resources/class-diagram-2-v2.json';
import { Direction } from '../../../../main/services/uml-element/uml-element-port';

describe('test compat helpers for modifying diagrams.', () => {
  let model: UMLModel;
  let modelV2: UMLModelCompat;

  const packageId = 'c10b995a-036c-4e9e-aa67-0570ada5cb6a';
  const class1Id = '04d3509e-0dce-458b-bf62-f3555497a5a4';
  const class2Id = '9eadc4f6-caa0-4835-a24c-71c0c1ccbc39';
  const relId = 'f5c4e20d-8347-4136-bc02-b7a016e017f5';

  beforeEach(() => {
    model = deepClone(diagram);
    modelV2 = deepClone(diagramV2);
  });

  test('can find elements.', () => {
    expect(findElement(model, class1Id)?.owner).toEqual(packageId);
    expect(findElement(modelV2, class1Id)?.owner).toEqual(packageId);
    expect(findElement(model, 'non-existing-id')).toBeUndefined();
    expect(findElement(modelV2, 'non-existing-id')).toBeUndefined();
  });

  test('can find relationships.', () => {
    expect(findRelationship(model, relId)?.source.element).toEqual(class2Id);
    expect(findRelationship(modelV2, relId)?.target.element).toEqual(class1Id);
    expect(findRelationship(model, 'non-existing-id')).toBeUndefined();
    expect(findRelationship(modelV2, 'non-existing-id')).toBeUndefined();
  });

  test('can find assessments.', () => {
    expect(findAssessment(model, class1Id)?.score).toBe(10);
    expect(findAssessment(modelV2, class1Id)?.score).toBe(10);
    expect(findAssessment(model, 'non-existing-id')).toBeUndefined();
    expect(findAssessment(modelV2, 'non-existing-id')).toBeUndefined();
  });

  test('can update existing elements or add new elements.', () => {
    const newClass: UMLElement = {
      id: 'new-class-id',
      type: 'Class',
      name: 'New Class',
      owner: packageId,
      bounds: { x: 0, y: 0, width: 100, height: 100 },
    };
    const newClass2: UMLElement = {
      id: 'new-class-id',
      type: 'Class',
      name: 'New Class 2',
      owner: packageId,
      bounds: { x: 100, y: 100, width: 100, height: 100 },
    };

    addOrUpdateElement(model, newClass);
    addOrUpdateElement(modelV2, newClass);

    expect(findElement(model, newClass.id)).toEqual(newClass);
    expect(findElement(modelV2, newClass.id)).toEqual(newClass);

    addOrUpdateElement(model, newClass2);
    addOrUpdateElement(modelV2, newClass2);

    expect(findElement(model, newClass.id)).toEqual(newClass2);
    expect(findElement(modelV2, newClass.id)).toEqual(newClass2);
  });

  test('can update existing relationships or add new relationships.', () => {
    const newRel: UMLRelationship = {
      id: 'new-rel-id',
      owner: null,
      type: 'ClassBidirectional',
      source: { element: class1Id, direction: Direction.Up },
      target: { element: class2Id, direction: Direction.Down },
      path: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      name: 'New Relationship',
    };
    const newRel2: UMLRelationship = {
      id: 'new-rel-id',
      owner: null,
      type: 'ClassBidirectional',
      source: { element: class2Id, direction: Direction.Up },
      target: { element: packageId, direction: Direction.Down },
      path: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      name: 'New Relationship 2',
    };

    addOrUpdateRelationship(model, newRel);
    addOrUpdateRelationship(modelV2, newRel);

    expect(findRelationship(model, newRel.id)).toEqual(newRel);
    expect(findRelationship(modelV2, newRel.id)).toEqual(newRel);

    addOrUpdateRelationship(model, newRel2);
    addOrUpdateRelationship(modelV2, newRel2);

    expect(findRelationship(model, newRel.id)).toEqual(newRel2);
    expect(findRelationship(modelV2, newRel.id)).toEqual(newRel2);
  });

  test('can update existing assessments or add new assessments.', () => {
    const newAssessment: Assessment = {
      modelElementId: class1Id,
      elementType: 'Class',
      score: 20,
    };

    addOrUpdateAssessment(model, newAssessment);
    addOrUpdateAssessment(modelV2, newAssessment);

    expect(findAssessment(model, class1Id)?.score).toBe(20);
    expect(findAssessment(modelV2, class1Id)?.score).toBe(20);

    const newAssessment2: Assessment = {
      modelElementId: class2Id,
      elementType: 'Class',
      score: 30,
    };

    addOrUpdateAssessment(model, newAssessment2);
    addOrUpdateAssessment(modelV2, newAssessment2);

    expect(findAssessment(model, class2Id)?.score).toBe(30);
    expect(findAssessment(modelV2, class2Id)?.score).toBe(30);
  });

  test('can check and set element and relationship interactive state.', () => {
    expect(isInteractiveElement(model, packageId)).toBe(true);
    expect(isInteractiveElement(modelV2, packageId)).toBe(true);
    expect(isInteractiveElement(model, class1Id)).toBe(false);
    expect(isInteractiveElement(modelV2, class1Id)).toBe(false);
    expect(isInteractiveElement(model, 'non-existing-id')).toBe(false);
    expect(isInteractiveElement(modelV2, 'non-existing-id')).toBe(false);
    expect(isInteractiveRelationship(model, relId)).toBe(false);
    expect(isInteractiveRelationship(modelV2, relId)).toBe(false);

    setInteractiveElement(model, packageId, false);
    setInteractiveElement(modelV2, packageId, false);
    setInteractiveElement(model, class1Id, true);
    setInteractiveElement(modelV2, class1Id, true);
    setInteractiveRelationship(model, relId, true);
    setInteractiveRelationship(modelV2, relId, true);

    expect(isInteractiveElement(model, packageId)).toBe(false);
    expect(isInteractiveElement(modelV2, packageId)).toBe(false);
    expect(isInteractiveElement(model, class1Id)).toBe(true);
    expect(isInteractiveElement(modelV2, class1Id)).toBe(true);
    expect(isInteractiveRelationship(model, relId)).toBe(true);
    expect(isInteractiveRelationship(modelV2, relId)).toBe(true);

    setInteractiveRelationship(model, relId, false);
    setInteractiveRelationship(modelV2, relId, false);

    expect(isInteractiveElement(model, relId)).toBe(false);
    expect(isInteractiveElement(modelV2, relId)).toBe(false);
  });
});
