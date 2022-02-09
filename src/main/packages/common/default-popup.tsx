import React, { Component, ComponentType } from 'react';
import { connect, ConnectedComponent } from 'react-redux';
import { Button } from '../../components/controls/button/button.js';
import { ColorButton } from '../../components/controls/color-button/color-button.js';
import { TrashIcon } from '../../components/controls/icon/trash.js';
import { Textfield } from '../../components/controls/textfield/textfield.js';
import { ModelState } from '../../components/store/model-state.js';
import { StylePane } from '../../components/style-pane/style-pane.js';
import { styled } from '../../components/theme/styles.js';
import { UMLElement } from '../../services/uml-element/uml-element.js';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository.js';
import { AsyncDispatch } from '../../utils/actions/actions.js';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type State = { colorOpen: boolean };

class DefaultPopupComponent extends Component<Props, State> {
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
            <Textfield value={element.name} onChange={this.onUpdate} autoFocus />
            <ColorButton onClick={this.toggleColor} />
            <Button color="link" tabIndex={-1} onClick={() => this.props.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
        </section>
        <StylePane
          open={this.state.colorOpen}
          element={element}
          onColorChange={this.props.update}
          lineColor
          textColor
          fillColor
        />
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

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
  update: UMLElementRepository.update,
  delete: UMLElementRepository.delete,
});

export const DefaultPopup: ConnectedComponent<ComponentType<Props>, OwnProps> = enhance(DefaultPopupComponent);
