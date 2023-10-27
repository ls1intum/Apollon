import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNConversationComponent } from '../../../../../main/packages/bpmn/bpmn-conversation/bpmn-conversation-component';
import { BPMNConversation } from '../../../../../main/packages/bpmn/bpmn-conversation/bpmn-conversation';

it('render the bpmn-conversation-component', () => {
  const conversation: BPMNConversation = new BPMNConversation({ name: 'Conversation' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNConversationComponent element={conversation} />
    </svg>,
  );
  expect(getByText(conversation.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
