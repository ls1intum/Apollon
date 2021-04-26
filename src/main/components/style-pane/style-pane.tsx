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
  selected?: string;
  elements: UMLElementState;
};

type DispatchProps = {
  update: typeof UMLElementRepository.update;
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
      selected: state.selected[0],
      elements: state.elements,
    }),
    {
      update: UMLElementRepository.update,
    },
  ),
);

class StylePaneComponent extends Component<Props, State> {
  state = getInitialState();

  handleFillColorChange = (color: string) => {
    const element = this.props.selected ? this.props.elements[this.props.selected] : undefined;
    this.props.update(this.props.selected!, { color: { ...element?.color, fill: color } });
  };
  handleStrokeColorChange = (color: string) => {
    const element = this.props.selected ? this.props.elements[this.props.selected] : undefined;
    this.props.update(this.props.selected!, { color: { ...element?.color, stroke: color } });
  };
  handleTextColorChange = (color: string) => {
    const element = this.props.selected ? this.props.elements[this.props.selected] : undefined;
    this.props.update(this.props.selected!, { color: { ...element?.color, text: color } });
  };

  render() {
    const element = this.props.selected ? this.props.elements[this.props.selected] : undefined;

    return (
      <div>
        <Row>
          <span>Fill</span>
          <ColorSelector color={element?.color?.fill} onColorChange={this.handleFillColorChange} />
        </Row>

        <Row>
          <span>Stroke</span>
          <ColorSelector color={element?.color?.stroke} onColorChange={this.handleStrokeColorChange} />
        </Row>
        <Row>
          <span>Text</span>
          <ColorSelector color={element?.color?.text} onColorChange={this.handleTextColorChange} />
        </Row>
      </div>
    );
  }
}

export const StylePane = enhance(StylePaneComponent);
