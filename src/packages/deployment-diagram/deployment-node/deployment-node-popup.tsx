import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Button } from '../../../components/controls/button/button';
import { Divider } from '../../../components/controls/divider/divider';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { ModelState } from '../../../components/store/model-state';
import { styled } from '../../../components/theme/styles';
import { ElementRepository } from '../../../services/element/element-repository';
import { DeploymentNode } from './deployment-node';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

class DeploymentNodePopupComponent extends Component<Props> {
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
    const { element, rename } = this.props;
    rename(element.id, value);
  };

  private onUpdate = (value: string) => {
    const { element, update } = this.props;
    update(element.id, { stereotype: value });
  };
}

type OwnProps = {
  element: DeploymentNode;
};

type StateProps = {};

type DispatchProps = {
  rename: typeof ElementRepository.rename;
  update: typeof ElementRepository.update;
  delete: typeof ElementRepository.delete;
};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  null,
  {
    rename: ElementRepository.rename,
    update: ElementRepository.update,
    delete: ElementRepository.delete,
  },
);

export const DeploymentNodePopup = enhance(DeploymentNodePopupComponent);
