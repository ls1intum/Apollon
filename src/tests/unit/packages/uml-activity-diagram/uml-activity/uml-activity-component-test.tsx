import { UMLActivityComponent } from '../../../../../main/packages/uml-activity-diagram/uml-activity/uml-activity-component';
import { UMLActivity } from '../../../../../main/packages/uml-activity-diagram/uml-activity/uml-activity';
import * as React from 'react';
import { render } from '@testing-library/react';

it('render the uml-activity-component', () => {
  const activity: UMLActivity = new UMLActivity({ name: 'TestActivityComponent' });
  const { getByText, baseElement } = render(
    <svg>
      <UMLActivityComponent element={activity} scale={1.0} />
    </svg>,
  );
  expect(getByText(activity.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
