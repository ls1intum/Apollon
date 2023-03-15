import * as React from 'react';
import { getRealStore } from '../../../test-utils/test-utils';
import { Direction } from '../../../../../main/services/uml-element/uml-element-port';
import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { wrappedRender } from '../../../test-utils/render';
import { act, fireEvent } from '@testing-library/react';
import { UMLObjectName } from '../../../../../main/packages/uml-object-diagram/uml-object-name/uml-object-name';
import { UMLCommunicationLink } from '../../../../../main/packages/uml-communication-diagram/uml-communication-link/uml-communication-link';
import { UMLCommunicationLinkUpdate } from '../../../../../main/packages/uml-communication-diagram/uml-communication-link/uml-communication-link-update';
import { CommunicationLinkMessage } from '../../../../../main/packages/uml-communication-diagram/uml-communication-link/uml-communiction-link-message';

describe('test communication link popup', () => {
  let elements: UMLElement[] = [];
  let source: UMLObjectName;
  let target: UMLObjectName;
  let communicationLink: UMLCommunicationLink;
  let messages: CommunicationLinkMessage[] = [];

  beforeEach(() => {
    // initialize  objects
    source = new UMLObjectName({ id: 'source-test-id', bounds: { x: 0, y: 0, height: 100, width: 200 } });
    target = new UMLObjectName({ id: 'target-test-id', bounds: { x: 200, y: 0, height: 100, width: 200 } });

    for (let i = 0; i < 3; i++) {
      //  add source messages
      const message = new CommunicationLinkMessage({
        name: 'CommunicationSourceLinkMessage' + i,
        direction: 'source',
      });
      messages.push(message);
    }
    for (let i = 0; i < 3; i++) {
      //  add target messages
      const message = new CommunicationLinkMessage({
        name: 'CommunicationTargetLinkMessage' + i,
        direction: 'target',
      });
      messages.push(message);
    }

    communicationLink = new UMLCommunicationLink({
      id: 'test-id',
      source: { element: source.id, direction: Direction.Up },
      target: { element: target.id, direction: Direction.Up },
      messages,
    });
    elements.push(source, target, communicationLink, ...messages);
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement, unmount } = wrappedRender(<UMLCommunicationLinkUpdate element={communicationLink} />, {
      store,
    });
    expect(baseElement).toMatchSnapshot();
    unmount();
  });

  it('flip message', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole, unmount } = wrappedRender(<UMLCommunicationLinkUpdate element={communicationLink} />, {
      store,
    });
    const buttons = getAllByRole('button');

    // clicked flip button of message[0]
    act(() => {
      fireEvent.click(buttons[1]);
    });
    const element = store.getState().elements[communicationLink.id] as UMLCommunicationLink;

    // message at position 0 is with direction source -> after flip should be target
    expect(element.messages[0].direction).toEqual('target');
    unmount();
  });

  it('delete link', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole, unmount } = wrappedRender(<UMLCommunicationLinkUpdate element={communicationLink} />, {
      store,
    });
    const buttons = getAllByRole('button');
    act(() => {
      fireEvent.click(buttons[0]);
    });

    expect(store.getState().elements).not.toContain(communicationLink.id);
    messages.forEach((message) => {
      expect(store.getState().elements).not.toContain(message.id);
    });
    unmount();
  });

  it('create message', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole, unmount } = wrappedRender(<UMLCommunicationLinkUpdate element={communicationLink} />, {
      store: store,
    });
    const textboxes = getAllByRole('textbox');
    const textbox = textboxes[messages.length];
    const value = 'newElement';

    act(() => {
      fireEvent.change(textbox, { target: { value } });
      textbox.blur();
    });

    const updatedElement = store.getState().elements[communicationLink.id] as UMLCommunicationLink;

    expect(updatedElement.messages).toHaveLength(messages.length + 1);
    expect(updatedElement.messages[updatedElement.messages.length - 1].name).toEqual(value);
    unmount();
  });

  it('rename message', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole, unmount } = wrappedRender(<UMLCommunicationLinkUpdate element={communicationLink} />, {
      store: store,
    });
    const textboxes = getAllByRole('textbox');
    const messageIndex = 0;
    const textbox = textboxes[messageIndex];
    const value = 'updatedMessage';
    act(() => {
      fireEvent.change(textbox, { target: { value } });
    });

    const updatedElement = store.getState().elements[communicationLink.id] as UMLCommunicationLink;
    expect(updatedElement.messages[messageIndex].name).toEqual(value);
    unmount();
  });

  it('delete message', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole, unmount } = wrappedRender(<UMLCommunicationLinkUpdate element={communicationLink} />, {
      store: store,
    });
    const messageToDelete = messages[0];
    const buttons = getAllByRole('button');
    // first button is delete link button
    // second button is flip first message button
    // third button is delete first message button
    const deleteMessageButton = buttons[2];
    act(() => {
      fireEvent.click(deleteMessageButton);
    });

    const updatedElement = store.getState().elements[communicationLink.id] as UMLCommunicationLink;

    expect(updatedElement.messages).not.toContain(messageToDelete);
    unmount();
  });
});
