import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Button } from '../../../components/controls/button/button';
import { Divider } from '../../../components/controls/divider/divider';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { ModelState } from '../../../components/store/model-state';
import { styled } from '../../../components/theme/styles';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { IUMLDeploymentNode, UMLDeploymentNode } from './uml-deployment-node';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

class DeploymentNodeUpdate extends Component<Props> {
  render() {
    const { element } = this.props;

    return (
      <div>
        <section>
          <Flex>
            <Textfield value={element.name} onChange={this.onRename} />
            <Button color="link" tabIndex={-1} onClick={() => this.props.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
        </section>
        <section>
          <Divider />
          <Flex>
            <Textfield value={element.stereotype} onChange={this.onUpdate} />
          </Flex>
        </section>
      </div>
    );
  }

  private onRename = (value: string) => {
    const { element, update } = this.props;
    update<IUMLDeploymentNode>(element.id, { name: value });
  };

  private onUpdate = (value: string) => {
    const { element, update } = this.props;
    update<IUMLDeploymentNode>(element.id, { stereotype: value });
  };
}

type OwnProps = {
  element: UMLDeploymentNode;
};

type StateProps = {};

type DispatchProps = {
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  null,
  {
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
  },
);

export const UMLDeploymentNodeUpdate = enhance(DeploymentNodeUpdate);
