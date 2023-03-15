import * as React from 'react';
import { act, fireEvent } from '@testing-library/react';
import { UMLElement } from '../../../../../../main';
import { UMLDeploymentNode } from '../../../../../../main/packages/uml-deployment-diagram/uml-deployment-node/uml-deployment-node';
import { getRealStore } from '../../../../test-utils/test-utils';
import { wrappedRender } from '../../../../test-utils/render';
import { UMLDeploymentNodeUpdate } from '../../../../../../main/packages/uml-deployment-diagram/uml-deployment-node/uml-deployment-node-update';

describe('test deployment node popup', () => {
  let elements: UMLElement[] = [];
  let deploymentNode: UMLDeploymentNode;

  beforeEach(() => {
    // initialize  objects
    deploymentNode = new UMLDeploymentNode({ id: 'source-test-id' });
    elements.push(deploymentNode);
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<UMLDeploymentNodeUpdate element={deploymentNode} />, { store });
    expect(baseElement).toMatchSnapshot();
  });

  it('delete', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<UMLDeploymentNodeUpdate element={deploymentNode} />, { store: store });
    const buttons = getAllByRole('button');
    act(() => {
      fireEvent.click(buttons[0]);
    });

    expect(store.getState().elements).not.toContain(deploymentNode.id);
  });

  it('rename', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<UMLDeploymentNodeUpdate element={deploymentNode} />, { store: store });
    const textboxes = getAllByRole('textbox');
    const newName = 'UpdatedName';
    act(() => {
      fireEvent.change(textboxes[0], { target: { value: newName } });
    });

    expect(store.getState().elements[deploymentNode.id].name).toEqual(newName);
  });

  it('rename stereotype', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<UMLDeploymentNodeUpdate element={deploymentNode} />, {
      store: store,
    });
    const textboxes = getAllByRole('textbox');
    const updatedStereotype = 'UpdatedStereotype';
    act(() => {
      fireEvent.change(textboxes[1], { target: { value: updatedStereotype } });
    });
    const updatedElement = store.getState().elements[deploymentNode.id] as UMLDeploymentNode;

    expect(updatedElement.stereotype).toEqual(updatedStereotype);
  });
});
