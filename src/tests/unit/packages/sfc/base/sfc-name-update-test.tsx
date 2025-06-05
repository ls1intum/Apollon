import * as React from 'react';
import { getRealStore } from '../../../test-utils/test-utils';
import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { wrappedRender } from '../../../test-utils/render';
import { act, fireEvent } from '@testing-library/react';
import { SfcNameUpdate } from '../../../../../main/packages/sfc/base/sfc-name-update';
import { ILayer } from '../../../../../main/services/layouter/layer';
import { ILayoutable } from '../../../../../main/services/layouter/layoutable';
import { UMLElementType } from '../../../../../main';

class TestSfcElement extends UMLElement {
  type = UMLElementType.SfcStart;

  render(canvas: ILayer): ILayoutable[];
  render(layer: ILayer): ILayoutable[];
  render(canvas: ILayer): ILayoutable[] {
    return [];
  }
}

describe('test sfc name update', () => {
  let elements: UMLElement[] = [];
  let testElement: TestSfcElement;

  beforeEach(() => {
    testElement = new TestSfcElement({
      id: 'test-element-id',
      name: 'Test Element',
    });
    elements = [testElement];
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<SfcNameUpdate element={testElement} />, { store });
    expect(baseElement).toMatchSnapshot();
  });

  it('change name', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<SfcNameUpdate element={testElement} />, { store });
    const textboxes = getAllByRole('textbox');
    const newValue = 'Updated Element Name';

    act(() => {
      fireEvent.change(textboxes[0], { target: { value: newValue } });
    });

    const updatedElement = store.getState().elements[testElement.id] as TestSfcElement;
    expect(updatedElement.name).toEqual(newValue);
  });
});