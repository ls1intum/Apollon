import * as React from 'react';
import { UMLCommunicationLink } from '../../../../../main/packages/uml-communication-diagram/uml-communication-link/uml-communication-link';
import { UMLCommunicationLinkComponent } from '../../../../../main/packages/uml-communication-diagram/uml-communication-link/uml-communication-link-component';
import { wrappedRender } from '../../../test-utils/render';
import { getRealStore } from '../../../test-utils/test-utils';
import { UMLObjectName } from '../../../../../main/packages/uml-object-diagram/uml-object-name/uml-object-name';
import { Direction } from '../../../../../main/services/uml-element/uml-element-port';
import {
  CommunicationLinkMessage,
  ICommunicationLinkMessage,
} from '../../../../../main/packages/uml-communication-diagram/uml-communication-link/uml-communiction-link-message';

describe('test uml-communication-link component', () => {
  it('render', () => {
    const source: UMLObjectName = new UMLObjectName({ id: 'test-source-id' });
    const target: UMLObjectName = new UMLObjectName({ id: 'test-target-id' });
    const messages: ICommunicationLinkMessage[] = [];
    for (let i = 0; i < 3; i++) {
      //  add source messages
      const message = new CommunicationLinkMessage({ name: 'CommunicationSourceLinkMessage' + i, direction: 'source' });
      messages.push(message);
    }
    for (let i = 0; i < 3; i++) {
      //  add target messages
      const message = new CommunicationLinkMessage({ name: 'CommunicationTargetLinkMessage' + i, direction: 'target' });
      messages.push(message);
    }
    const communicationLink: UMLCommunicationLink = new UMLCommunicationLink({
      name: 'TestCommunicationLink',
      source: { element: source.id, direction: Direction.Up },
      target: { element: target.id, direction: Direction.Up },
      messages: messages,
    });

    const store = getRealStore(undefined, [communicationLink, source, target, ...messages]);
    const { getByText, baseElement } = wrappedRender(
      <svg>
        <UMLCommunicationLinkComponent element={communicationLink} />
      </svg>,
      { store },
    );
    messages.forEach((message) => {
      expect(getByText(message.name)).toBeInTheDocument();
    });
    expect(baseElement).toMatchSnapshot();
  });
});
