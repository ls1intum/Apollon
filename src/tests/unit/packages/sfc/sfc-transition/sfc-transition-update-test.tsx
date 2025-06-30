import * as React from 'react';
import { getRealStore } from '../../../test-utils/test-utils';
import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { wrappedRender } from '../../../test-utils/render';
import { act, fireEvent } from '@testing-library/react';
import { SfcTransition } from '../../../../../main/packages/sfc/sfc-transition/sfc-transition';
import { SfcTransitionUpdate } from '../../../../../main/packages/sfc/sfc-transition/sfc-transition-update';
import { Point } from '../../../../../main/utils/geometry/point';
import { Direction } from '../../../../../main/services/uml-element/uml-element-port';
import { ILayer } from '../../../../../main/services/layouter/layer';
import { ILayoutable } from '../../../../../main/services/layouter/layoutable';
import { UMLElementType } from '../../../../../main';

class TestUMLElement extends UMLElement {
  type = UMLElementType.SfcStart;

  render(canvas: ILayer): ILayoutable[];
  render(layer: ILayer): ILayoutable[];
  render(canvas: ILayer): ILayoutable[] {
    return [];
  }
}

describe('test sfc transition update', () => {
  let elements: UMLElement[] = [];
  let transition: SfcTransition;
  let source: UMLElement;
  let target: UMLElement;

  beforeEach(() => {
    source = new TestUMLElement({ id: 'source-test-id' });
    target = new TestUMLElement({ id: 'target-test-id' });
    transition = new SfcTransition({
      id: 'transition-test-id',
      name: JSON.stringify({ isNegated: false, displayName: 'Transition' }),
      path: [new Point(0, 0), new Point(100, 100)],
      source: { element: source.id, direction: Direction.Up },
      target: { element: target.id, direction: Direction.Up },
    });
    elements = [source, target, transition];
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<SfcTransitionUpdate element={transition} />, { store });
    expect(baseElement).toMatchSnapshot();
  });

  it('change name', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<SfcTransitionUpdate element={transition} />, { store });
    const textboxes = getAllByRole('textbox');
    const newValue = 'Updated Transition';

    act(() => {
      fireEvent.change(textboxes[0], { target: { value: newValue } });
    });

    const updatedTransition = store.getState().elements[transition.id] as SfcTransition;
    const { isNegated, displayName } = JSON.parse(updatedTransition.name);
    expect(isNegated).toEqual(false);
    expect(displayName).toEqual(newValue);
  });

  it('toggle negation', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<SfcTransitionUpdate element={transition} />, { store });
    const buttons = getAllByRole('button');

    // Find the negation button (it has the text 'X')
    const negationButton = buttons.find((button) => button.textContent === 'X');

    act(() => {
      if (!negationButton) throw new Error('Negation button not found');
      fireEvent.click(negationButton);
    });

    const updatedTransition = store.getState().elements[transition.id] as SfcTransition;
    const { isNegated, displayName } = JSON.parse(updatedTransition.name);
    expect(isNegated).toEqual(true);
    expect(displayName).toEqual('Transition');
  });
});
