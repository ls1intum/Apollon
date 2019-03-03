import React, { Component, ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { Container, Arrow, Content, Item } from './styles';
import Element, { ElementRepository } from '../../domain/Element';
import Relationship from '../../domain/Relationship';
import { Point } from '../../domain/geo';
import { withCanvas, CanvasContext } from '../Canvas';
import NameField from './NameField';
import * as Plugins from './plugins';

export class Popup extends Component<Props> {
  private calculatePosition = (): Point => {
    const { x, y, width, height } = this.props.element.bounds;
    let position = { x: x + width, y };
    if (this.props.element instanceof Relationship) {
      position = { x: x + width / 2, y: y + height / 2 - 20 };
    }
    return this.props.coordinateSystem.pointToScreen(position.x, position.y);
  };

  private onSaveName = (value: string) => {
    const { element, update } = this.props;
    element.name = value;
    update(element);
  };

  render() {
    const position = this.calculatePosition();
    const Component =
      this.props.element.base === 'Relationship'
        ? Plugins.AssociationPopup
        : (Plugins as any)[`${this.props.element.kind}PopupComponent`];
    return (
      <Container {...position}>
        <Content>
          <Item>
            <NameField
              initial={this.props.element.name}
              onSave={this.onSaveName}
            />
          </Item>
          {Component && <Component element={this.props.element} />}
        </Content>
        <Arrow />
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
