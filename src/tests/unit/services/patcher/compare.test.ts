import { compare } from '../../../../main/services/patcher/compare';

describe('compare models to extract patches.', () => {
  it('groups up relationship paths.', () => {
    const a = {
      relationships: {
        x: {
          path: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
          isManuallyLayouted: false,
          bounds: { x: 0, y: 0, width: 1, height: 1 },
        },
      },
    };

    const b = {
      relationships: {
        x: {
          path: [
            { x: 1, y: 0 },
            { x: 0, y: 2 },
          ],
          isManuallyLayouted: true,
          bounds: { x: 0, y: 0, width: 1, height: 2 },
        },
      },
    };

    const patches = compare(a, b);

    expect(patches.length).toBe(3);
    expect(patches[0].path).toBe('/relationships/x/isManuallyLayouted');
    expect(patches[1].path).toBe('/relationships/x/path');
    expect(patches[2].path).toBe('/relationships/x/bounds');
  });
});
