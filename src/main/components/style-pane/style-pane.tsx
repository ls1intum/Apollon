import React, { Component, ComponentClass } from 'react';
import { CirclePicker } from 'react-color';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { CanvasContext } from '../canvas/canvas-context';
import { withCanvas } from '../canvas/with-canvas';
import { I18nContext } from '../i18n/i18n-context';
import { localized } from '../i18n/localized';
import { ModelState } from '../store/model-state';
import { Color, ColorPickerContainer, Row } from './style-pane-styles';
import { ColorSelector } from './color-selector';
import { UMLElement } from '../../typings';
import { UMLElementState } from '../../services/uml-element/uml-element-types';
type OwnProps = {};

type StateProps = {
  type: UMLDiagramType;
  selected?: string[];
  elements: UMLElementState;
};

type DispatchProps = {
  update: typeof UMLElementRepository.update;
  updateStart: typeof UMLElementRepository.updateStart;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext & CanvasContext;

const getInitialState = () => ({
  fillSelectOpen: false,
  strokeSelectOpen: false,
  textSelectOpen: false,
});

type State = ReturnType<typeof getInitialState>;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  withCanvas,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state) => ({
      type: state.diagram.type,
      selected: state.selected,
      elements: state.elements,
    }),
    {
      updateStart: UMLElementRepository.updateStart,
      update: UMLElementRepository.update,
    },
  ),
);

class StylePaneComponent extends Component<Props, State> {
  state = getInitialState();

  handleFillColorChange = (color: string) => {
    this.props.updateStart(this.props.selected!);
    this.props.update(this.props.selected!, { fillColor: color });
  };
  handleStrokeColorChange = (color: string) => {
    this.props.updateStart(this.props.selected!);
    this.props.update(this.props.selected!, { strokeColor: color });
  };
  handleTextColorChange = (color: string) => {
    this.props.updateStart(this.props.selected!);
    this.props.update(this.props.selected!, { textColor: color });
  };

  render() {
    const element = this.props.selected ? this.props.elements[this.props.selected[0]] : undefined;

    return (
      <div>
        <Row>
          <span>Fill</span>
          <ColorSelector color={element?.fillColor} onColorChange={this.handleFillColorChange} />
        </Row>

        <Row>
          <span>Stroke</span>
          <ColorSelector color={element?.strokeColor} onColorChange={this.handleStrokeColorChange} />
        </Row>
        <Row>
          <span>Text</span>
          <ColorSelector color={element?.textColor} onColorChange={this.handleTextColorChange} />
        </Row>
      </div>
    );
  }
}

export const StylePane = enhance(StylePaneComponent);
