import { merge } from '../../../../main/components/store/merge';
import { ModelState } from '../../../../main/components/store/model-state';
import diagram from '../../test-resources/class-diagram.json';
import diagram3 from '../../test-resources/class-diagram-3.json';
import diagram4 from '../../test-resources/class-diagram-4.json';

describe('merge', () => {
  const pkgId = 'c10b995a-036c-4e9e-aa67-0570ada5cb6a';
  const class1Id = '04d3509e-0dce-458b-bf62-f3555497a5a4';
  const class2Id = '9eadc4f6-caa0-4835-a24c-71c0c1ccbc39';

  test('merges two model states.', () => {
    const oldState = ModelState.fromModel(diagram as any) as ModelState;
    const newState = ModelState.fromModel(diagram3 as any) as ModelState;

    const merged = merge(oldState, newState);

    expect(merged.elements[pkgId]).not.toBeDefined();
    expect(merged.elements[class1Id]).toBeDefined();
    expect(merged.elements[class2Id]).toBeDefined();
    expect(merged.elements[class1Id].owner).toBeNull();
  });

  test('calculates the correct owned elements.', () => {
    const oldState = ModelState.fromModel(diagram as any) as ModelState;
    const newState = ModelState.fromModel(diagram4 as any) as ModelState;

    const merged = merge(oldState, newState);

    expect(merged.diagram.ownedElements).toContain(class1Id);
    expect(merged.diagram.ownedElements).toContain(class2Id);
    expect(merged.diagram.ownedElements).toContain(pkgId);
  });
});
