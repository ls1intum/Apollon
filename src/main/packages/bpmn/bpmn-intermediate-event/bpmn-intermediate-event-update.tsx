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
import { BPMNIntermediateEvent, BPMNIntermediateEventType } from './bpmn-intermediate-event';
import { StylePane } from '../../../components/style-pane/style-pane';
import { ColorButton } from '../../../components/controls/color-button/color-button';

interface OwnProps {
  element: BPMNIntermediateEvent;
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

type State = { colorOpen: boolean };

class BPMNIntermediateEventUpdateComponent extends Component<Props, State> {
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
            <Dropdown.Item value={'default'}>
              {this.props.translate('packages.BPMN.BPMNIntermediateEvent')}
            </Dropdown.Item>
            <Dropdown.Item value={'message-catch'}>
              {this.props.translate('packages.BPMN.BPMNMessageIntermediateCatchEvent')}
            </Dropdown.Item>
            <Dropdown.Item value={'message-throw'}>
              {this.props.translate('packages.BPMN.BPMNMessageIntermediateThrowEvent')}
            </Dropdown.Item>
            <Dropdown.Item value={'timer-catch'}>
              {this.props.translate('packages.BPMN.BPMNTimerIntermediateCatchEvent')}
            </Dropdown.Item>
            <Dropdown.Item value={'escalation-throw'}>
              {this.props.translate('packages.BPMN.BPMNEscalationIntermediateThrowEvent')}
            </Dropdown.Item>
            <Dropdown.Item value={'conditional-catch'}>
              {this.props.translate('packages.BPMN.BPMNConditionalIntermediateCatchEvent')}
            </Dropdown.Item>
            <Dropdown.Item value={'link-catch'}>
              {this.props.translate('packages.BPMN.BPMNLinkIntermediateCatchEvent')}
            </Dropdown.Item>
            <Dropdown.Item value={'link-throw'}>
              {this.props.translate('packages.BPMN.BPMNLinkIntermediateThrowEvent')}
            </Dropdown.Item>
            <Dropdown.Item value={'compensation-throw'}>
              {this.props.translate('packages.BPMN.BPMNCompensationIntermediateThrowEvent')}
            </Dropdown.Item>
            <Dropdown.Item value={'signal-catch'}>
              {this.props.translate('packages.BPMN.BPMNSignalIntermediateCatchEvent')}
            </Dropdown.Item>
            <Dropdown.Item value={'signal-throw'}>
              {this.props.translate('packages.BPMN.BPMNSignalIntermediateThrowEvent')}
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
    this.props.update<BPMNIntermediateEvent>(id, { eventType: value as BPMNIntermediateEventType });
  };

  /**
   * Delete an event
   * @param id The ID of the event that should be deleted
   */
  private delete = (id: string) => () => {
    this.props.delete(id);
  };
}

export const BPMNIntermediateEventUpdate = enhance(BPMNIntermediateEventUpdateComponent);
