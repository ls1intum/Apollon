import { areBoundsIntersecting, IBoundary } from '../../../../main/utils/geometry/boundary';

describe('test areBoundsIntersecting utility', () => {
  it('bounds entirely contained in intersecting bounds', () => {
    const bounds: IBoundary = { x: 10, y: 10, height: 90, width: 90 };
    const intersectingBounds: IBoundary = { x: 0, y: 0, height: 100, width: 100 };

    expect(areBoundsIntersecting(bounds, intersectingBounds)).toBeTruthy();
  });

  it('bounds not contained in intersecting bounds', () => {
    const bounds: IBoundary = { x: 0, y: 0, height: 100, width: 100 };
    const intersectingBounds: IBoundary = { x: 110, y: 0, height: 100, width: 100 };

    expect(areBoundsIntersecting(bounds, intersectingBounds)).toBeFalsy();
  });

  it('top left corner contained in intersecting bounds', () => {
    const bounds: IBoundary = { x: 0, y: 0, height: 100, width: 100 };
    const intersectingBounds: IBoundary = { x: -90, y: -90, height: 100, width: 100 };

    expect(areBoundsIntersecting(bounds, intersectingBounds)).toBeTruthy();
  });

  it('top right corner contained in intersecting bounds', () => {
    const bounds: IBoundary = { x: 90, y: -90, height: 100, width: 100 };
    const intersectingBounds: IBoundary = { x: 0, y: 0, height: 100, width: 100 };

    expect(areBoundsIntersecting(bounds, intersectingBounds)).toBeTruthy();
  });

  it('bottom left corner contained in intersecting bounds', () => {
    const bounds: IBoundary = { x: 0, y: 0, height: 100, width: 100 };
    const intersectingBounds: IBoundary = { x: -90, y: 90, height: 100, width: 100 };

    expect(areBoundsIntersecting(bounds, intersectingBounds)).toBeTruthy();
  });

  it('bottom right corner contained in intersecting bounds', () => {
    const bounds: IBoundary = { x: 0, y: 0, height: 100, width: 100 };
    const intersectingBounds: IBoundary = { x: 90, y: 90, height: 100, width: 100 };

    expect(areBoundsIntersecting(bounds, intersectingBounds)).toBeTruthy();
  });
});
