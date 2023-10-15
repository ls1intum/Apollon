import { UMLActivityComponent } from '../../../../../main/packages/uml-activity-diagram/uml-activity/uml-activity-component';
import { UMLActivity } from '../../../../../main/packages/uml-activity-diagram/uml-activity/uml-activity';
import * as React from 'react';
import { wrappedRender } from '../../../test-utils/render';

it('render the uml-activity-component', () => {
  const activity: UMLActivity = new UMLActivity({ name: 'TestActivityComponent' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLActivityComponent element={activity} />
    </svg>,
  );
  expect(getByText(activity.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
