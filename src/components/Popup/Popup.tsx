import React, { Component, ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { Container, Arrow, Content } from './styles';
import Element, { ElementRepository } from '../../domain/Element';
import { Point } from '../../domain/geo';
import { withCanvas, CanvasContext } from '../Canvas';
import * as Plugins from '../../domain/plugins/Popups';

export class Popup extends Component<Props> {
  private calculatePosition = (): Point => {
    const position = this.props.position;
    return this.props.coordinateSystem.pointToScreen(position.x, position.y);
  };

  private onSaveName = (value: string) => {
    const { element, update } = this.props;
    element.name = value;
    update(element);
  };

  render() {
    const position = this.calculatePosition();
    const Component = (Plugins as any)[`${this.props.element.kind}Popup`];
    if (!Component) return null;
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

interface DispatchProps {
  update: typeof ElementRepository.update;
}

type Props = OwnProps & DispatchProps & CanvasContext;

export default compose<ComponentClass<OwnProps>>(
  withCanvas,
  connect(
    null,
    { update: ElementRepository.update }
  )
)(Popup);
