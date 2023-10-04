import * as React from 'react';
import { render } from '@testing-library/react';
import { Point } from '../../../../../main/utils/geometry/point';
import { UMLInterfaceRequiredComponent } from '../../../../../main/packages/common/uml-interface-required/uml-interface-required-component';
import { UMLComponentInterfaceRequired } from '../../../../../main/packages/uml-component-diagram/uml-component-interface-required/uml-component-interface-required';
import { StoreProvider } from '../../../../../main/components/store/model-store';
import { Theme } from '../../../../../main/components/theme/theme';

it('render the uml-component-required-interface-component', () => {
  const umlComponentInterfaceRequired: UMLComponentInterfaceRequired = new UMLComponentInterfaceRequired({
    id: 'a80638d5-7083-48be-b1c9-f6e9d64cde88',
    path: [new Point(0, 0), new Point(100, 100)],
  });
  const { getByText, baseElement } = render(
    <StoreProvider
      initialState={{ elements: { [umlComponentInterfaceRequired.id]: { ...umlComponentInterfaceRequired } } }}
    >
      <Theme styles={undefined}>
        <svg>
          <UMLInterfaceRequiredComponent element={umlComponentInterfaceRequired} />
        </svg>
      </Theme>
    </StoreProvider>,
  );
  // TODO: expect
  // expect(getByText(umlDeploymentInterfaceRequired.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
