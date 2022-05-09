import * as React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { Point } from '../../../../../main/utils/geometry/point';
import { UMLUseCaseAssociationComponent } from '../../../../../main/packages/uml-use-case-diagram/uml-use-case-association/uml-use-case-association-component';
import { UMLUseCaseAssociation } from '../../../../../main/packages/uml-use-case-diagram/uml-use-case-association/uml-use-case-association';

it('render the uml-use-case-association', () => {
  const umlUseCaseAssociation: UMLUseCaseAssociation = new UMLUseCaseAssociation({
    id: 'd37b8ce3-17d2-4432-8fff-6c38ff2a1334',
    name: 'UseCaseAssociation',
    path: [new Point(0, 0), new Point(100, 100)],
  });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLUseCaseAssociationComponent element={umlUseCaseAssociation} />
    </svg>,
  );
  expect(getByText(umlUseCaseAssociation.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
