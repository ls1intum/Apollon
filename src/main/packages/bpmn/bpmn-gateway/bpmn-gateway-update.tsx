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
import { BPMNGateway, BPMNGatewayType } from './bpmn-gateway';
import { Switch } from '../../../components/controls/switch/switch';
import {Dropdown} from '../../../components/controls/dropdown/dropdown';
import {UseCaseRelationshipType} from '../../uml-use-case-diagram';

interface OwnProps {
  element: BPMNGateway;
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

class BPMNGatewayUpdateComponent extends Component<Props> {
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
          <Dropdown value={element.gatewayType} onChange={this.changeGatewayType(element.id)}>
            <Dropdown.Item value={'complex'}>
              {this.props.translate('packages.BPMN.BPMNComplexGateway')}
            </Dropdown.Item>
            <Dropdown.Item value={'event-based'}>
              {this.props.translate('packages.BPMN.BPMNEventBasedGateway')}
            </Dropdown.Item>
            <Dropdown.Item value={'exclusive'}>{this.props.translate('packages.BPMN.BPMNExclusiveGateway')}</Dropdown.Item>
            <Dropdown.Item value={'exclusive-event-based'}>{this.props.translate('packages.BPMN.BPMNExclusiveEventBasedGateway')}</Dropdown.Item>
            <Dropdown.Item value={'inclusive'}>{this.props.translate('packages.BPMN.BPMNInclusiveGateway')}</Dropdown.Item>
            <Dropdown.Item value={'parallel'}>{this.props.translate('packages.BPMN.BPMNParallelGateway')}</Dropdown.Item>
            <Dropdown.Item value={'parallel-event-based'}>{this.props.translate('packages.BPMN.BPMNParallelEventBasedGateway')}</Dropdown.Item>
          </Dropdown>
        </section>
      </div>
    );
  }

  /**
   * Rename the gateway
   * @param id The ID of the gateway that should be renamed
   */
  private rename = (id: string) => (value: string) => {
    this.props.update(id, { name: value });
  };

  /**
   * Change the type of the gateway
   * @param id The ID of the gateway whose type should be changed
   */
  private changeGatewayType = (id: string) => (value: string) => {
    this.props.update<BPMNGateway>(id, { gatewayType: value as BPMNGatewayType });
  };

  /**
   * Delete a gateway
   * @param id The ID of the gateway that should be deleted
   */
  private delete = (id: string) => () => {
    this.props.delete(id);
  };
}

export const BPMNGatewayUpdate = enhance(BPMNGatewayUpdateComponent);
