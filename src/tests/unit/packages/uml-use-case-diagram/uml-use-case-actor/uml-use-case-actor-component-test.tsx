import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLUseCaseActor } from '../../../../../main/packages/uml-use-case-diagram/uml-use-case-actor/uml-use-case-actor';
import { UMLUseCaseActorComponent } from '../../../../../main/packages/uml-use-case-diagram/uml-use-case-actor/uml-use-case-actor-component';

it('render the uml-use-case-actor-component', () => {
  const actor: UMLUseCaseActor = new UMLUseCaseActor({ name: 'TestUseCaseComponent' });
  const { getByText, baseElement } = render(
    <svg>
      <UMLUseCaseActorComponent element={actor} scale={1.0} />
    </svg>,
  );
  expect(getByText(actor.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
