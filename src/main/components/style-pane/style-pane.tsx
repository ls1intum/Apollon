import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { CanvasContext } from '../canvas/canvas-context';
import { withCanvas } from '../canvas/with-canvas';
import { I18nContext } from '../i18n/i18n-context';
import { localized } from '../i18n/localized';
import { ModelState } from '../store/model-state';
import { ColorSelector } from './color-selector';
import { Color, Container, Divider, Row } from './style-pane-styles';

type OwnProps = {
  open: boolean;
  element: IUMLElement;
  onColorChange: (id: string, values: { fillColor?: string; textColor?: string; strokeColor?: string }) => void;
  fillColor?: boolean;
  lineColor?: boolean;
  textColor?: boolean;
};

type StateProps = {};

type DispatchProps = {
  update: typeof UMLElementRepository.update;
  updateStart: typeof UMLElementRepository.updateStart;
  updateEnd: typeof UMLElementRepository.updateEnd;
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
      updateEnd: UMLElementRepository.updateEnd,
    },
  ),
);

class StylePaneComponent extends Component<Props, State> {
  state = getInitialState();

  handleFillColorChange = (color: string | undefined) => {
    const { element, onColorChange } = this.props;
    onColorChange(element.id, { fillColor: color });
  };
  handleLineColorChange = (color: string | undefined) => {
    const { element, onColorChange } = this.props;
    onColorChange(element.id, { strokeColor: color });
  };
  handleTextColorChange = (color: string | undefined) => {
    const { element, onColorChange } = this.props;
    onColorChange(element.id, { textColor: color });
  };

  toggleFillSelect = () => {
    this.setState((prevState) => ({
      fillSelectOpen: !prevState.fillSelectOpen,
      strokeSelectOpen: false,
      textSelectOpen: false,
    }));
  };

  toggleLineSelect = () => {
    this.setState((prevState) => ({
      strokeSelectOpen: !prevState.strokeSelectOpen,
      fillSelectOpen: false,
      textSelectOpen: false,
    }));
  };

  toggleTextSelect = () => {
    this.setState((prevState) => ({
      textSelectOpen: !prevState.textSelectOpen,
      strokeSelectOpen: false,
      fillSelectOpen: false,
    }));
  };

  render() {
    const { fillSelectOpen, strokeSelectOpen, textSelectOpen } = this.state;
    const { open, element, fillColor, lineColor, textColor } = this.props;
    const noneOpen = !fillSelectOpen && !strokeSelectOpen && !textSelectOpen;

    if (!open) return null;

    return (
      <Container>
        <ColorRow
          title="Fill Color"
          condition={fillColor && (fillSelectOpen || noneOpen)}
          color={element?.fillColor}
          open={fillSelectOpen}
          onToggle={this.toggleFillSelect}
          onColorChange={this.handleFillColorChange}
          noDivider={!textColor && !lineColor}
        />
        <ColorRow
          title="Line Color"
          condition={lineColor && (strokeSelectOpen || noneOpen)}
          color={element?.strokeColor}
          open={strokeSelectOpen}
          onToggle={this.toggleLineSelect}
          onColorChange={this.handleLineColorChange}
          noDivider={!textColor}
        />
        <ColorRow
          title="Text Color"
          condition={textColor && (textSelectOpen || noneOpen)}
          color={element?.textColor}
          open={textSelectOpen}
          onToggle={this.toggleTextSelect}
          onColorChange={this.handleTextColorChange}
          noDivider
        />
      </Container>
    );
  }
}

const ColorRow = ({ condition, title, open, onToggle, onColorChange, color, noDivider }: any) => {
  if (!condition) return null;

  return (
    <>
      <Row>
        <span>{title}</span>
        <Color color={color} selected={open} onClick={onToggle} />
      </Row>
      <ColorSelector open={open} color={color} onColorChange={onColorChange} key={title} />
      {!open && !noDivider ? <Divider /> : null}
    </>
  );
};

export const StylePane = enhance(StylePaneComponent);
