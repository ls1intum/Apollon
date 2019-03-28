import React, { Component, ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { ModelState } from '../store/model-state';
import { Container, Arrow, Content } from './popup-styles';
import { Element } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';
import { Point } from '../../utils/geometry/point';
import { withCanvas, CanvasContext } from '../canvas/canvas-context';
import { AssessmentPopup } from './assessment-popup';
import { ApollonMode } from '../../typings';
import { Popups } from '../../packages/popups';

class PopupComponent extends Component<Props> {
  private calculatePosition = (): Point => {
    const position = this.props.position;
    return this.props.coordinateSystem.pointToScreen(position.x, position.y);
  };

  render() {
    const position: Point = this.calculatePosition();
    let Component = null;

    if (this.props.mode === ApollonMode.Assessment) {
      Component = AssessmentPopup;
    } else {
      Component = Popups[this.props.element.type];
      if (!Component) {
        return null;
      }
    }
    return (
      <Container {...position}>
        <Content>
          <Component element={this.props.element} />
        </Content>
        <Arrow />
      </Container>
    );
  }
}

interface OwnProps {
  element: Element;
  position: {
    x: number;
    y: number;
  };
}

interface StateProps {
  mode: ApollonMode;
}

interface DispatchProps {
  update: typeof ElementRepository.update;
}

type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

const enhance = compose<ComponentClass<OwnProps>>(
  withCanvas,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({ mode: state.editor.mode }),
    { update: ElementRepository.update }
  )
);

export const Popup = enhance(PopupComponent);
