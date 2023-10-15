import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Button } from '../../../components/controls/button/button';
import { Divider } from '../../../components/controls/divider/divider';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { styled } from '../../../components/theme/styles';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { Switch } from '../../../components/controls/switch/switch';
import { BPMNConversation, BPMNConversationType } from './bpmn-conversation';
import { Dropdown } from '../../../components/controls/dropdown/dropdown';

interface OwnProps {
  element: BPMNConversation;
}

type StateProps = {};

interface DispatchProps {
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
}

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
  }),
);

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

class BPMNConversationUpdateComponent extends Component<Props> {
  render() {
    const { element } = this.props;

    return (
      <div>
        <section>
          <Flex>
            <Textfield value={element.name} onChange={this.rename(element.id)} autoFocus />
            <Button color="link" tabIndex={-1} onClick={this.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
          <Divider />
        </section>
        <section>
          <Dropdown value={element.conversationType} onChange={this.changeConversationType(element.id)} color="primary">
            <Dropdown.Item value={'default'}>{this.props.translate('packages.BPMN.BPMNConversation')}</Dropdown.Item>
            <Switch.Item value={'call'}>{this.props.translate('packages.BPMN.BPMNCallConversation')}</Switch.Item>
          </Dropdown>
        </section>
      </div>
    );
  }

  /**
   * Rename the conversation
   * @param id The ID of the conversation that should be renamed
   */
  private rename = (id: string) => (value: string) => {
    this.props.update(id, { name: value });
  };

  /**
   * Change the type of the conversation
   * @param id The ID of the conversation whose type should be changed
   */
  private changeConversationType = (id: string) => (value: string) => {
    this.props.update<BPMNConversation>(id, { conversationType: value as BPMNConversationType });
  };

  /**
   * Delete a conversation
   * @param id The ID of the conversation that should be deleted
   */
  private delete = (id: string) => () => {
    this.props.delete(id);
  };
}

export const BPMNConversationUpdate = enhance(BPMNConversationUpdateComponent);
