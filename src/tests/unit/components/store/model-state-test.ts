import { ModelState } from '../../../../main/components/store/model-state';
import { UMLRelationship } from '../../../../main/services/uml-relationship/uml-relationship';
import { computeBoundingBoxForElements } from '../../../../main/utils/geometry/boundary';
import diagram from '../../test-resources/class-diagram.json';

describe('model state.', () => {
  it('does not center the model when imported.', () => {
    const state = ModelState.fromModel(diagram as any);
    const bounds = computeBoundingBoxForElements(Object.values(state.elements as any));

    expect(bounds.x).toBe(0);
  });

  it('deos not put model on 0,0 when exporting.', () => {
    const state = ModelState.fromModel(diagram as any);
    expect(state.elements).toBeDefined();
    state.elements &&
      Object.values(state.elements).forEach((element) => {
        if (UMLRelationship.isUMLRelationship(element)) {
          element.path.forEach((point) => {
            point.x += 100;
            point.y += 100;
          });
        }

        element.bounds.x += 100;
        element.bounds.y += 100;
      });

    const exp = ModelState.toModel(state as any);
    const bounds = computeBoundingBoxForElements([...Object.values(exp.elements), ...Object.values(exp.relationships)]);

    expect(bounds.x).not.toBe(0);
    expect(bounds.y).not.toBe(0);
  });
});
