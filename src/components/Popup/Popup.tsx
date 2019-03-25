import React, { Component, ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { ModelState } from './../Store';
import { Container, Arrow, Content } from './styles';
import { Element, ElementRepository } from '../../domain/Element';
import { Point } from '../../domain/geo';
import { withCanvas, CanvasContext } from '../Canvas';
import * as Plugins from '../../domain/plugins/Popups';
import Relationship from '../../domain/Relationship';
import DefaultPopup from './DefaultPopup';
import AssessmentPopup from './AssessmentPopup';
import { ApollonMode } from '../..';

export class Popup extends Component<Props> {
  private calculatePosition = (): Point => {
    const position = this.props.position;
    return this.props.coordinateSystem.pointToScreen(position.x, position.y);
  };

  render() {
    const position = this.calculatePosition();
    let Component = null;

    if (this.props.mode === ApollonMode.Assessment) {
      Component = AssessmentPopup
    } else {
      Component = (Plugins as any)[`${this.props.element.type}Popup`];
      if (!Component) {
        if (this.props.element instanceof Relationship) {
          return null;
        } else {
          Component = DefaultPopup;
        }
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

export default compose<ComponentClass<OwnProps>>(
  withCanvas,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({ mode: state.editor.mode }),
    { update: ElementRepository.update }
  )
)(Popup);
