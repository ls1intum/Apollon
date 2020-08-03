import { shallow } from 'enzyme';
import { UMLActivityComponent } from '../../../../main/packages/uml-activity-diagram/uml-activity/uml-activity-component';
import { UMLActivity } from '../../../../main/packages/uml-activity-diagram/uml-activity/uml-activity';
import * as React from 'react';

it('render the uml-activity-component', () => {
  const activity: UMLActivity = new UMLActivity({ name: 'TestActivityComponent' });
  const renderedComponent = shallow(<UMLActivityComponent element={activity} />);
  const name = renderedComponent.find('text').text()
  expect(name).toEqual(activity.name);
});
