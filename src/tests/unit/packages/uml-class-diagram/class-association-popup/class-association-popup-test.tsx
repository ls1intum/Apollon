import * as React from 'react';
import { getRealStore } from '../../../test-utils/test-utils';
import { UMLClassBidirectional } from '../../../../../main/packages/uml-class-diagram/uml-class-bidirectional/uml-class-bidirectional';
import { UMLClassAssociationUpdate } from '../../../../../main/packages/uml-class-diagram/uml-class-association/uml-class-association-update';
import { UMLClass } from '../../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { Direction } from '../../../../../main/services/uml-element/uml-element-port';
import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { wrappedRender } from '../../../test-utils/render';
import { ClassRelationshipType } from '../../../../../main/packages/uml-class-diagram';
import { act, fireEvent } from '@testing-library/react';

describe('test class association popup', () => {
  let elements: UMLElement[] = [];
  let source: UMLClass;
  let target: UMLClass;
  let classAssociation: UMLClassBidirectional;

  beforeEach(() => {
    // initialize  objects
    source = new UMLClass({ id: 'source-test-id' });
    target = new UMLClass({ id: 'target-test-id' });
    classAssociation = new UMLClassBidirectional({
      id: 'test-id',
      name: 'UMLClassBidirectional',
      source: { element: source.id, direction: Direction.Up },
      target: { element: target.id, direction: Direction.Up },
    });
    elements.push(source, target, classAssociation);
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<UMLClassAssociationUpdate element={classAssociation} />, { store });
    expect(baseElement).toMatchSnapshot();
  });

  it('flip', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<UMLClassAssociationUpdate element={classAssociation} />, { store: store });
    const buttons = getAllByRole('button');

    act(() => {
      fireEvent.click(buttons[0]);
    });
    const element = store.getState().elements[classAssociation.id] as UMLClassBidirectional;

    expect(element.target).toEqual(classAssociation.source);
    expect(element.source).toEqual(classAssociation.target);
  });

  it('delete', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<UMLClassAssociationUpdate element={classAssociation} />, { store: store });
    const buttons = getAllByRole('button');

    act(() => {
      fireEvent.click(buttons[1]);
    });

    expect(store.getState().elements).not.toContain(classAssociation.id);
  });

  it('change type to ClassAggregation', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<UMLClassAssociationUpdate element={classAssociation} />, { store: store });
    const buttons = getAllByRole('button');
    act(() => {
      fireEvent.click(buttons[2]);
    });

    const updatedButtons = getAllByRole('button');

    act(() => {
      fireEvent.click(updatedButtons[3]);
    });

    expect(store.getState().elements[classAssociation.id].type).toEqual(ClassRelationshipType.ClassAggregation);
  });

  it('change source multiplicity and role', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole, rerender } = wrappedRender(<UMLClassAssociationUpdate element={classAssociation} />, {
      store: store,
    });
    const textboxes = getAllByRole('textbox');
    const sourceMultiplicityValue = '1';
    const sourceRole = 'role';
    act(() => {
      fireEvent.change(textboxes[0], { target: { value: sourceMultiplicityValue } });
    });

    let updatedElement = store.getState().elements[classAssociation.id] as UMLClassBidirectional;
    rerender(<UMLClassAssociationUpdate element={updatedElement} />);

    act(() => {
      fireEvent.change(textboxes[1], { target: { value: sourceRole } });
    });

    updatedElement = store.getState().elements[classAssociation.id] as UMLClassBidirectional;

    expect(updatedElement.source.multiplicity).toEqual(sourceMultiplicityValue);
    expect(updatedElement.source.role).toEqual(sourceRole);
  });
});
