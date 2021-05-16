import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { IUMLContainer, UMLContainer } from '../../services/uml-container/uml-container';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { UMLElementState } from '../../services/uml-element/uml-element-types';
import { CanvasContext } from '../canvas/canvas-context';
import { withCanvas } from '../canvas/with-canvas';
import { I18nContext } from '../i18n/i18n-context';
import { localized } from '../i18n/localized';
import { ModelState } from '../store/model-state';
import { ColorSelector } from './color-selector';
import { Row } from './style-pane-styles';
type OwnProps = {};

type StateProps = {
  type: UMLDiagramType;
  selected?: string[];
  elements: UMLElementState;
};

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

  getUpdateElements = () => {
    const allOwnedElements = Object.values(this.props.elements)
      .filter(
        (el) =>
          UMLContainer.isUMLContainer(el) &&
          el.type !== 'Package' &&
          el.type !== 'Activity' &&
          this.props.selected?.includes(el.id),
      )
      .reduce((acc, cur) => {
        return acc.concat((cur as IUMLContainer).ownedElements);
      }, [] as string[]);
    return [...this.props.selected!, ...allOwnedElements];
  };

  handleFillColorChange = (color: string | undefined) => {
    this.props.updateStart(this.getUpdateElements());
    this.props.update(this.getUpdateElements(), { fillColor: color });
    this.props.updateEnd(this.getUpdateElements());
  };
  handleStrokeColorChange = (color: string | undefined) => {
    this.props.updateStart(this.getUpdateElements());
    this.props.update(this.getUpdateElements(), { strokeColor: color });
    this.props.updateEnd(this.getUpdateElements());
  };
  handleTextColorChange = (color: string | undefined) => {
    this.props.updateStart(this.getUpdateElements());
    this.props.update(this.getUpdateElements(), { textColor: color });
    this.props.updateEnd(this.getUpdateElements());
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
