import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Popups } from '../../packages/popups';
import { Element } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';
import { ApollonMode } from '../../typings';
import { Point } from '../../utils/geometry/point';
import { AssessmentPopup } from '../assessment-popup/assessment-popup';
import { CanvasContext, withCanvas } from '../canvas/canvas-context';
import { ModelState } from '../store/model-state';
import { Arrow, Container, Content } from './popup-styles';

class PopupComponent extends Component<Props> {
  render() {
    const position: Point = this.calculatePosition();
    let CustomPopupComponent = null;

    if (!this.props.enablePopups) return false;

    if (this.props.mode === ApollonMode.Assessment) {
      if (this.props.readonly) return null;
      CustomPopupComponent = AssessmentPopup;
    } else {
      CustomPopupComponent = Popups[this.props.element.type];
      if (!CustomPopupComponent) {
        return null;
      }
    }
    return (
      <Container {...position}>
        <Content>
          <CustomPopupComponent element={this.props.element} />
        </Content>
        <Arrow />
      </Container>
    );
  }
  private calculatePosition = (): Point => {
    const position = this.props.position;
    return this.props.coordinateSystem.pointToScreen(position.x, position.y);
  };
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
  readonly: boolean;
  enablePopups: boolean;
}

interface DispatchProps {
  update: typeof ElementRepository.update;
}

type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

const enhance = compose<ComponentClass<OwnProps>>(
  withCanvas,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({ mode: state.editor.mode, readonly: state.editor.readonly, enablePopups: state.editor.enablePopups }),
    { update: ElementRepository.update },
  ),
);

export const Popup = enhance(PopupComponent);
