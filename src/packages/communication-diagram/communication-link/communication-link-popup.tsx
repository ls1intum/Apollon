import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { Divider } from '../../../components/popup/controls/divider';
import { Header } from '../../../components/popup/controls/header';
import { Section } from '../../../components/popup/controls/section';
import { TextField } from '../../../components/popup/controls/textfield';
import { TrashCanIcon } from '../../../components/popup/controls/trashcan';
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

const Trash = styled(TrashCanIcon).attrs({ width: 20 })`
  margin-left: 0.5rem;
`;

const NewMessage = styled(TextField)`
  &:not(:focus):not(:hover) {
    background: rgba(255, 255, 255, 0.5);
  }

  &:not(:focus) {
    border-style: dashed;
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
        <Section>
          <Flex>
            <Header>{this.props.translate('packages.communicationDiagram.objectLink')}</Header>
          </Flex>
          <Divider />
        </Section>
        <Section>
          <Header>{this.props.translate('popup.messages')}</Header>
          {element.messages.map((message, i) => (
            <Flex key={i}>
              <TextField value={message} />
              <Trash onClick={this.delete(message)} />
            </Flex>
          ))}
          <NewMessage value="" onCreate={this.create} />
        </Section>
      </div>
    );
  }

  private create = (value: string) => {
    const { element, update } = this.props;
    update(element.id, { messages: [...new Set([...element.messages, value])] });
    this.forceUpdate();
  };

  private delete = (value: string) => () => {
    const { element, update } = this.props;
    update(element.id, { messages: element.messages.filter(message => message !== value) });
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
