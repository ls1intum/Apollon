import * as React from 'react';
import { render } from '@testing-library/react';
import { Point } from '../../../../main/utils/geometry/point';
import { UMLUseCaseAssociationComponent } from '../../../../main/packages/uml-use-case-diagram/uml-use-case-association/uml-use-case-association-component';
import { UMLUseCaseAssociation } from '../../../../main/packages/uml-use-case-diagram/uml-use-case-association/uml-use-case-association';

it('render the uml-use-case-extend-component', () => {
  const umlUseCaseAssociation: UMLUseCaseAssociation = new UMLUseCaseAssociation({
    id: "d37b8ce3-17d2-4432-8fff-6c38ff2a1334",
    path: [new Point(0, 0), new Point(100, 100)],
  });
  const { getByText, baseElement } = render(
    <svg>
      <UMLUseCaseAssociationComponent element={umlUseCaseAssociation} />
    </svg>,
  );
  // TODO: expect
  // expect(getByText('«extend»')).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
