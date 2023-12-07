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
import { BPMNTask, BPMNTaskType } from './bpmn-task';
import { StylePane } from '../../../components/style-pane/style-pane';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { Switch } from '../../../components/controls/switch/switch';
import { BPMNMarkerType } from '../common/types';
import { BpmnLoopMarkerIcon } from '../common/markers/bpmn-loop-marker-icon';
import { BPMNParallelMarkerIcon } from '../common/markers/bpmn-parallel-marker-icon';
import { BPMNSequentialMarkerIcon } from '../common/markers/bpmn-sequential-marker-icon';

interface OwnProps {
  element: BPMNTask;
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

class BPMNTaskUpdateComponent extends Component<Props, State> {
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
        </section>
        <section>
          <Divider />
          <Dropdown value={element.taskType} onChange={this.changeTaskType(element.id)}>
            <Dropdown.Item value={'default'}>{this.props.translate('packages.BPMN.BPMNTask')}</Dropdown.Item>
            <Dropdown.Item value={'user'}>{this.props.translate('packages.BPMN.BPMNUserTask')}</Dropdown.Item>
            <Dropdown.Item value={'send'}>{this.props.translate('packages.BPMN.BPMNSendTask')}</Dropdown.Item>
            <Dropdown.Item value={'receive'}>{this.props.translate('packages.BPMN.BPMNReceiveTask')}</Dropdown.Item>
            <Dropdown.Item value={'manual'}>{this.props.translate('packages.BPMN.BPMNManualTask')}</Dropdown.Item>
            <Dropdown.Item value={'business-rule'}>
              {this.props.translate('packages.BPMN.BPMNBusinessRuleTask')}
            </Dropdown.Item>
            <Dropdown.Item value={'script'}>{this.props.translate('packages.BPMN.BPMNScriptTask')}</Dropdown.Item>
          </Dropdown>
        </section>
        <section>
          <Divider />
          <Switch value={element.marker as BPMNMarkerType} onChange={this.changeMarker(element.id)} color="primary">
            <Switch.Item value={'parallel multi instance'}>
              <BPMNParallelMarkerIcon stroke="currentColor" />
            </Switch.Item>
            <Switch.Item value={'sequential multi instance'}>
              <BPMNSequentialMarkerIcon stroke="currentColor" />
            </Switch.Item>
            <Switch.Item value={'loop'}>
              <BpmnLoopMarkerIcon stroke="currentColor" />
            </Switch.Item>
          </Switch>
        </section>
      </div>
    );
  }

  /**
   * Rename the task
   * @param id The ID of the task that should be renamed
   */
  private rename = (id: string) => (value: string) => {
    this.props.update(id, { name: value });
  };

  /**
   * Change the type of the task
   * @param id The ID of the task whose type should be changed
   */
  private changeTaskType = (id: string) => (value: string) => {
    this.props.update<BPMNTask>(id, { taskType: value as BPMNTaskType });
  };

  /**
   * Change the marker of the task
   * @param id The ID of the task whose marker should be changed
   */
  private changeMarker = (id: string) => (value: string) => {
    if (this.props.element.marker === value) {
      this.props.update<BPMNTask>(id, { marker: 'none' as BPMNMarkerType });
      return;
    }

    this.props.update<BPMNTask>(id, { marker: value as BPMNMarkerType });
  };

  /**
   * Delete a task
   * @param id The ID of the task that should be deleted
   */
  private delete = (id: string) => () => {
    this.props.delete(id);
  };
}

export const BPMNTaskUpdate = enhance(BPMNTaskUpdateComponent);
