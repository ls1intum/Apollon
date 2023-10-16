import * as React from 'react';
import { render } from '@testing-library/react';
import { Point } from '../../../../../main/utils/geometry/point';
import { UMLDeploymentInterfaceRequired } from '../../../../../main/packages/uml-deployment-diagram/uml-deployment-interface-required/uml-deployment-interface-required';
import { UMLInterfaceRequiredComponent } from '../../../../../main/packages/common/uml-interface-required/uml-interface-required-component';
import { StoreProvider } from '../../../../../main/components/store/model-store';
import { Theme } from '../../../../../main/components/theme/theme';

it('render the uml-deplyoment-required-interface-component', () => {
  const umlDeploymentInterfaceRequired: UMLDeploymentInterfaceRequired = new UMLDeploymentInterfaceRequired({
    id: '05a6f05d-404a-4f38-ade1-d46c9f02902b',
    path: [new Point(0, 0), new Point(100, 100)],
  });
  const { getByText, baseElement } = render(
    <svg>
      <StoreProvider
        initialState={{ elements: { [umlDeploymentInterfaceRequired.id]: { ...umlDeploymentInterfaceRequired } } }}
      >
        <Theme styles={undefined}>
          <UMLInterfaceRequiredComponent element={umlDeploymentInterfaceRequired} />
        </Theme>
      </StoreProvider>
    </svg>,
  );
  // TODO: expect
  // expect(getByText(umlDeploymentInterfaceRequired.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
