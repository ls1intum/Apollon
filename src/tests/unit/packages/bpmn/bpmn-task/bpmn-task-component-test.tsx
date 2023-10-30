import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNTask } from '../../../../../main/packages/bpmn/bpmn-task/bpmn-task';
import { BPMNTaskComponent } from '../../../../../main/packages/bpmn/bpmn-task/bpmn-task-component';

it('render the bpmn-task-component', () => {
  const task: BPMNTask = new BPMNTask({ name: 'Task' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNTaskComponent element={task} />
    </svg>,
  );
  expect(getByText(task.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
