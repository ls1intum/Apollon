import React, { Component, ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { Container, Arrow, Content, Item } from './styles';
import { State as ReduxState } from './../Store';
import Element, { ElementRepository } from '../../domain/Element';
import { Point } from '../../domain/geo';
import { withCanvas, CanvasContext } from '../Canvas';
import Relationship, { LayoutedRelationship } from '../../domain/Relationship';
import RelationshipDetails from '../Popups/RelationshipDetailsPopup/RelationshipDetails';
import {
  updateRelationship,
  flipRelationship,
} from '../../domain/Relationship/actions';
import { DiagramType } from '../../domain/Diagram';

export class Popup extends Component<Props> {
  private calculatePosition = (): Point => {
    const { path } = this.props.element;
    const targetPoint = path[path.length - 2];
    return this.props.coordinateSystem.pointToScreen(targetPoint.x, targetPoint.y - 20);
  };

  private update = (relationship: Relationship) => {
    this.props.updateRelationship(relationship);
    this.forceUpdate();
  };

  render() {
    const position = this.calculatePosition();
    return (
      <Container {...position}>
        <Content style={{ padding: 0 }}>
          <RelationshipDetails
            diagramType={DiagramType.ClassDiagram}
            entities={this.props.entities}
            relationship={this.props.element}
            updateRelationship={this.update}
            flipRelationship={this.props.flipRelationship}
          />
        </Content>
        <Arrow />
      </Container>
    );
  }
}

interface OwnProps {
  element: LayoutedRelationship;
}

interface StateProps {
  entities: Element[];
}

interface DispatchProps {
  updateRelationship: typeof updateRelationship;
  flipRelationship: typeof flipRelationship;
}

type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

export default compose<ComponentClass<OwnProps>>(
  withCanvas,
  connect(
    (state: ReduxState): StateProps => ({
      entities: ElementRepository.read(state),
    }),
    { updateRelationship, flipRelationship }
  )
)(Popup);
