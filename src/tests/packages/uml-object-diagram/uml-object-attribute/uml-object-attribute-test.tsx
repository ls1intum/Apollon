import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLDeploymentArtifact } from '../../../../main/packages/uml-deployment-diagram/uml-deployment-artifact/uml-deployment-artifact';
import { UMLDeploymentArtifactComponent } from '../../../../main/packages/uml-deployment-diagram/uml-deployment-artifact/uml-deployment-artifact-component';
import { UMLClassifierMemberComponent } from "../../../../main/packages/common/uml-classifier/uml-classifier-member-component";
import { UMLObjectAttribute } from "../../../../main/packages/uml-object-diagram/uml-object-attribute/uml-object-attribute";

it('render the uml-object-attribute-component', () => {
  const attribute: UMLObjectAttribute = new UMLObjectAttribute({ name: 'TestObjectComponent' });
  const { getByText } = render(
    <svg>
      <UMLClassifierMemberComponent element={attribute} />
  </svg>,
);
  expect(getByText(attribute.name)).toBeInTheDocument();
});
