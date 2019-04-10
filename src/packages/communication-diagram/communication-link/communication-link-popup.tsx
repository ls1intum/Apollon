import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { CommunicationMessage } from '..';
import { Divider } from '../../../components/controls/divider/divider';
import { MinusIcon } from '../../../components/controls/icon/minus';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { Header } from '../../../components/controls/typography/typography';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { Element } from '../../../services/element/element';
import { ElementRepository } from '../../../services/element/element-repository';
import { RelationshipRepository } from '../../../services/relationship/relationship-repository';
import { CommunicationLink } from './communication-link';

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Flip = styled.span.attrs({ width: 20 })`
  margin-left: 0.5rem;
`;

const Trash = styled(MinusIcon).attrs({ width: 20 })`
  margin-left: 0.5rem;
`;

const NewMessage = styled(Textfield)`
  &:not(:focus) {
    border-style: dashed;
  }

  &:not(:focus):not(:hover) {
    background: rgba(255, 255, 255, 0.5);
  }
`;

class CommunactionLinkPopupComponent extends Component<Props> {
  render() {
    const { element, getById } = this.props;
    const source = getById(element.source.element);
    const target = getById(element.target.element);
    if (!source || !target) return null;

    return (
      <div>
        <section>
          <Flex>
            <Header>{this.props.translate('packages.communicationDiagram.communicationLink')}</Header>
          </Flex>
          <Divider />
        </section>
        <section>
          <Header>
            {this.props.translate('popup.messages')} (
            <small>
              {source.name} ⟶ {target.name}
            </small>
            )
          </Header>
          {element.messages.map((message, i) => (
            <Flex key={i}>
              <Textfield value={message.name} onChange={this.rename(message)} />
              <Flip onClick={this.flip(message)}>{message.direction === 'source' ? '⟶' : '⟵'}</Flip>
              <Trash onClick={this.delete(message)} />
            </Flex>
          ))}
          <NewMessage value="" onSubmit={this.create} />
        </section>
      </div>
    );
  }

  private create = (value: string) => {
    const { element, update } = this.props;
    if (!element.messages.find(message => message.name === value)) {
      update(element.id, { messages: [...element.messages, { name: value, direction: 'target' }] });
    }
  };

  private rename = (value: CommunicationMessage) => (name: string) => {
    const { element, update } = this.props;
    const messages: CommunicationMessage[] = [...element.messages];
    const index = messages.findIndex(message => message.name === value.name);
    messages[index].name = name;
    update(element.id, { messages });
  };

  private flip = (value: CommunicationMessage) => () => {
    const { element, update } = this.props;
    const messages: CommunicationMessage[] = [...element.messages];
    const index = messages.findIndex(message => message.name === value.name);
    messages[index].direction = messages[index].direction === 'source' ? 'target' : 'source';
    update(element.id, { messages });
  };

  private delete = (value: CommunicationMessage) => () => {
    const { element, update } = this.props;
    update(element.id, { messages: element.messages.filter(message => message.name !== value.name) });
  };
}

type OwnProps = {
  element: CommunicationLink;
};

type StateProps = {
  getById: (id: string) => Element | null;
};

type DispatchProps = {
  update: typeof ElementRepository.update;
  flip: typeof RelationshipRepository.flip;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({ getById: ElementRepository.getById(state.elements) }),
    {
      update: ElementRepository.update,
      flip: RelationshipRepository.flip,
    },
  ),
);

export const CommunicationLinkPopup = enhance(CommunactionLinkPopupComponent);
