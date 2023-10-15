import * as React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { UMLUseCaseActor } from '../../../../../main/packages/uml-use-case-diagram/uml-use-case-actor/uml-use-case-actor';
import { UMLUseCaseActorComponent } from '../../../../../main/packages/uml-use-case-diagram/uml-use-case-actor/uml-use-case-actor-component';

it('render the uml-use-case-actor-component', () => {
  const actor: UMLUseCaseActor = new UMLUseCaseActor({ name: 'TestUseCaseComponent' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLUseCaseActorComponent element={actor} />
    </svg>,
  );
  expect(getByText(actor.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
