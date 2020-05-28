import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Button } from '../../components/controls/button/button';
import { TrashIcon } from '../../components/controls/icon/trash';
import { Textfield } from '../../components/controls/textfield/textfield';
import { ModelState } from '../../components/store/model-state';
import { styled } from '../../components/theme/styles';
import { UMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../utils/actions/actions';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

class DefaultPopupComponent extends Component<Props> {
  render() {
    const { element } = this.props;

    return (
      <div>
        <section>
          <Flex>
            <Textfield value={element.name} onChange={this.onUpdate} autoFocus />
            <Button color="link" tabIndex={-1} onClick={() => this.props.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
        </section>
      </div>
    );
  }
  private onUpdate = (name: string) => {
    const { element, update } = this.props;
    update(element.id, { name });
  };
}

type OwnProps = {
  element: UMLElement;
};

type StateProps = {};

type DispatchProps = {
  update: typeof UMLElementRepository.update;
  delete: AsyncDispatch<typeof UMLElementRepository.delete>;
};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  null,
  {
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
  },
);

export const DefaultPopup = enhance(DefaultPopupComponent);
