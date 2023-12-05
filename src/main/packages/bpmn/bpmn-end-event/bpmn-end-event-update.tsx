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
import { Dropdown } from '../../../components/controls/dropdown/dropdown';
import { BPMNEndEvent, BPMNEndEventType } from './bpmn-end-event';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { StylePane } from '../../../components/style-pane/style-pane';

interface OwnProps {
  element: BPMNEndEvent;
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

type State = {
  colorOpen: boolean;
};

class BPMNEndEventUpdateComponent extends Component<Props, State> {
  state = { colorOpen: false };

  private toggleColor = () => {
    this.setState((state) => ({
      colorOpen: !state.colorOpen,
    }));
  };

  render() {
    const { element } = this.props;

    return (
      <div>
        <section>
          <Flex>
            <Textfield value={element.name} onChange={this.rename(element.id)} autoFocus />
            <ColorButton onClick={this.toggleColor} />
            <Button color="link" tabIndex={-1} onClick={this.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
        </section>
        <section>
          <StylePane
            open={this.state.colorOpen}
            element={element}
            onColorChange={this.props.update}
            lineColor
            textColor
            fillColor
          />
        </section>
        <section>
          <Divider />
          <Dropdown value={element.eventType} onChange={this.changeEventType(element.id)}>
            <Dropdown.Item value={'default'}>{this.props.translate('packages.BPMN.BPMNEndEvent')}</Dropdown.Item>
            <Dropdown.Item value={'message'}>{this.props.translate('packages.BPMN.BPMNMessageEndEvent')}</Dropdown.Item>
            <Dropdown.Item value={'escalation'}>
              {this.props.translate('packages.BPMN.BPMNEscalationEndEvent')}
            </Dropdown.Item>
            <Dropdown.Item value={'error'}>{this.props.translate('packages.BPMN.BPMNErrorEndEvent')}</Dropdown.Item>
            <Dropdown.Item value={'compensation'}>
              {this.props.translate('packages.BPMN.BPMNCompensationEndEvent')}
            </Dropdown.Item>
            <Dropdown.Item value={'signal'}>{this.props.translate('packages.BPMN.BPMNSignalEndEvent')}</Dropdown.Item>
            <Dropdown.Item value={'terminate'}>
              {this.props.translate('packages.BPMN.BPMNTerminateEndEvent')}
            </Dropdown.Item>
          </Dropdown>
        </section>
      </div>
    );
  }

  /**
   * Rename the event
   * @param id The ID of the event that should be renamed
   */
  private rename = (id: string) => (value: string) => {
    this.props.update(id, { name: value });
  };

  /**
   * Change the type of the event
   * @param id The ID of the event whose type should be changed
   */
  private changeEventType = (id: string) => (value: string) => {
    this.props.update<BPMNEndEvent>(id, { eventType: value as BPMNEndEventType });
  };

  /**
   * Delete an event
   * @param id The ID of the event that should be deleted
   */
  private delete = (id: string) => () => {
    this.props.delete(id);
  };
}

export const BPMNEndEventUpdate = enhance(BPMNEndEventUpdateComponent);
