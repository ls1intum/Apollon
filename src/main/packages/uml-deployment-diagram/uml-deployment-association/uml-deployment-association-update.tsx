import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { Button } from '../../../components/controls/button/button';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { UMLRelationshipRepository } from '../../../services/uml-relationship/uml-relationship-repository';
import { UMLDeploymentAssociation } from './uml-deployment-association';
import { Header } from '../../../components/controls/typography/typography';
import { ExchangeIcon } from '../../../components/controls/icon/exchange';
import { Divider } from '../../../components/controls/divider/divider';
import { Dropdown } from '../../../components/controls/dropdown/dropdown';
import { UMLDeploymentInterfaceRequired } from '../uml-deployment-interface-required/uml-deployment-interface-required';
import { UMLDeploymentInterfaceProvided } from '../uml-deployment-interface-provided/uml-deployment-interface-provided';
import { DeploymentRelationshipType } from '../index';
import { UMLDeploymentDependency } from '../uml-deployment-dependency/uml-deployment-dependency';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { StylePane } from '../../../components/style-pane/style-pane';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type State = { colorOpen: boolean };

class DeploymentAssociationUpdate extends Component<Props, State> {
  state = { colorOpen: false };

  constructor(props: Props) {
    super(props);
    this.onChange = this.onChange.bind(this);
  }

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
            <Header gutter={false} style={{ flexGrow: 1 }}>
              {this.props.translate('popup.association')}
            </Header>
            <ColorButton onClick={this.toggleColor} />
            <Button color="link" onClick={() => this.props.flip(element.id)}>
              <ExchangeIcon />
            </Button>
            <Button color="link" tabIndex={-1} onClick={() => this.props.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
          <StylePane
            open={this.state.colorOpen}
            element={element}
            onColorChange={this.props.update}
            lineColor
            textColor={element.type === DeploymentRelationshipType.DeploymentAssociation}
          />
          <Divider />
        </section>
        <section>
          <Dropdown value={element.type as keyof typeof DeploymentRelationshipType} onChange={this.onChange}>
            <Dropdown.Item value={DeploymentRelationshipType.DeploymentAssociation}>
              {this.props.translate('packages.DeploymentDiagram.DeploymentAssociation')}
            </Dropdown.Item>
            <Dropdown.Item value={DeploymentRelationshipType.DeploymentDependency}>
              {this.props.translate('packages.DeploymentDiagram.DeploymentDependency')}
            </Dropdown.Item>
            <Dropdown.Item value={DeploymentRelationshipType.DeploymentInterfaceProvided}>
              {this.props.translate('packages.DeploymentDiagram.DeploymentInterfaceProvided')}
            </Dropdown.Item>
            <Dropdown.Item value={DeploymentRelationshipType.DeploymentInterfaceRequired}>
              {this.props.translate('packages.DeploymentDiagram.DeploymentInterfaceRequired')}
            </Dropdown.Item>
          </Dropdown>
        </section>
        {element.type === DeploymentRelationshipType.DeploymentAssociation && (
          <>
            <Divider />
            <section>
              <Flex>
                <Textfield value={element.name} onChange={this.rename} autoFocus />
                <Button color="link" onClick={() => this.props.delete(element.id)}>
                  <TrashIcon />
                </Button>
              </Flex>
            </section>
          </>
        )}
      </div>
    );
  }

  private onChange = (value: keyof typeof DeploymentRelationshipType) => {
    const { element, update } = this.props;
    update(element.id, { type: value });
  };

  private rename = (value: string) => {
    const { element, update } = this.props;
    update(element.id, { name: value });
  };
}

type OwnProps = {
  element:
    | UMLDeploymentAssociation
    | UMLDeploymentInterfaceRequired
    | UMLDeploymentInterfaceProvided
    | UMLDeploymentDependency;
};

type StateProps = {};

type DispatchProps = {
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
  flip: typeof UMLRelationshipRepository.flip;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
    flip: UMLRelationshipRepository.flip,
  }),
);

export const UMLDeploymentAssociationUpdate = enhance(DeploymentAssociationUpdate);
