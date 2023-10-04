import React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { UMLPetriNetPlace } from '../../../../../main/packages/uml-petri-net/uml-petri-net-place/uml-petri-net-place';
import { UMLPetriNetPlaceComponent } from '../../../../../main/packages/uml-petri-net/uml-petri-net-place/uml-petri-net-place-component';

describe('uml-petri-net-arc-component', () => {
  let element: UMLPetriNetPlace;
  beforeEach(() => {
    element = new UMLPetriNetPlace({});
  });

  it('render the uml-petri-net-arc-component', () => {
    const { baseElement } = wrappedRender(
      <svg>
        <UMLPetriNetPlaceComponent element={element} />
      </svg>,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('render with amountOfTokens 1', () => {
    element.amountOfTokens = 1;
    const { container } = wrappedRender(
      <svg>
        <UMLPetriNetPlaceComponent element={element} />
      </svg>,
    );
    // place has circle, and token has a circle
    expect(container.querySelectorAll('circle')).toHaveLength(2);
  });

  it('render with amountOfTokens 2', () => {
    element.amountOfTokens = 2;
    const { container } = wrappedRender(
      <svg>
        <UMLPetriNetPlaceComponent element={element} />
      </svg>,
    );
    // place has circle, and 2 tokens as circle
    expect(container.querySelectorAll('circle')).toHaveLength(3);
  });

  it('render with amountOfTokens 3', () => {
    element.amountOfTokens = 3;
    const { container } = wrappedRender(
      <svg>
        <UMLPetriNetPlaceComponent element={element} />
      </svg>,
    );
    // place has circle,  and 3 tokens as circle
    expect(container.querySelectorAll('circle')).toHaveLength(4);
  });

  it('render with amountOfTokens 4', () => {
    element.amountOfTokens = 4;
    const { container } = wrappedRender(
      <svg>
        <UMLPetriNetPlaceComponent element={element} />
      </svg>,
    );
    // place has circle and 4 tokens as circle
    expect(container.querySelectorAll('circle')).toHaveLength(5);
  });

  it('render with amountOfTokens 5', () => {
    element.amountOfTokens = 5;
    const { container } = wrappedRender(
      <svg>
        <UMLPetriNetPlaceComponent element={element} />
      </svg>,
    );
    // place has circle and 5 tokens as circle
    expect(container.querySelectorAll('circle')).toHaveLength(6);
  });

  it('render with amountOfTokens 6', () => {
    element.amountOfTokens = 6;
    const { container, getByText } = wrappedRender(
      <svg>
        <UMLPetriNetPlaceComponent element={element} />
      </svg>,
    );
    // 6 is displayed as number, not as token anymore
    expect(container.querySelectorAll('circle')).toHaveLength(1);
    expect(getByText(element.amountOfTokens.toString())).toBeInTheDocument();
  });
});
