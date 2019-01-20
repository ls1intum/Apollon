import React, { Component, ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { Container } from './styles';
import Element, { ElementRepository } from '../../domain/Element';
import { Point } from '../../domain/geo';
import { withCanvas, CanvasContext } from '../Canvas';
import NameField from './NameField';

export class Popup extends Component<Props> {
  private calculatePosition = (): Point => {
    let { x, y, width } = this.props.element.bounds;
    return this.props.coordinateSystem.pointToScreen(x + width, y);
  };

  private onSaveName = (value: string) => {
    const { element, update } = this.props;
    element.name = value;
    update(element);
  };

  render() {
    const position = this.calculatePosition();
    return (
      <Container {...position}>
        <NameField initial={this.props.element.name} onSave={this.onSaveName} />
      </Container>
    );
  }
}

interface OwnProps {
  element: Element;
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
