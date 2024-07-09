import React, { Component, ComponentType } from 'react';
import { connect, ConnectedComponent } from 'react-redux';
import { Button } from '../../../components/controls/button/button';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { ModelState } from '../../../components/store/model-state';
import { StylePane } from '../../../components/style-pane/style-pane';
import { styled } from '../../../components/theme/styles';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { IUMLComponent, UMLComponent } from './uml-component';
import { ToggleButton } from '../../../components/controls/stereotype-toggle/stereotype-toggle';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type State = { colorOpen: boolean };

class ComponentUpdate extends Component<Props, State> {
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
            <Textfield value={element.name} onChange={this.onRename} autoFocus />
            <ColorButton onClick={this.toggleColor} />
            <ToggleButton value={element.displayStereotype} onChange={this.onStereotypeVisibilityToggle} />
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

  private onRename = (value: string) => {
    const { element, update } = this.props;
    update<IUMLComponent>(element.id, { name: value });
  };

  private onStereotypeVisibilityToggle = () => {
    const { element, update } = this.props;
    const newVisibilityValue: boolean = !element.displayStereotype;
    update<IUMLComponent>(element.id, { displayStereotype: newVisibilityValue });
  };
}

type OwnProps = {
  element: UMLComponent;
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

export const UMLComponentUpdate: ConnectedComponent<ComponentType<Props>, OwnProps> = enhance(ComponentUpdate);
