import React, { Component, createRef, RefObject } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import LayoutedRelationship from './../LayoutedRelationship';
import Grid from './Grid';
import RelationshipMarkers from './../../rendering/renderers/svg/defs/RelationshipMarkers';
import Droppable from './../DragDrop/Droppable';

import LayoutedElement from './../LayoutedElement/LayoutedElement';
import ConnectLayer from '../Connectable/ConnectLayer';

class Canvas extends Component<Props> {
  canvas: RefObject<HTMLDivElement> = createRef();

  render() {
    const { elements, relationships } = this.props;

    return (
      <div ref={this.canvas} tabIndex={0}>
        <Droppable container={this.canvas}>
          <Grid grid={10} width={1600} height={800}>
            <svg width={1600} height={800}>
              <defs>
                <RelationshipMarkers />
                <filter id="highlight">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <ConnectLayer>
                {elements.map(element => (
                  <LayoutedElement
                    key={element}
                    element={element}
                    canvas={this.canvas}
                  />
                ))}
                {relationships.map(relationship => (
                  <LayoutedRelationship
                    key={relationship}
                    relationship={relationship}
                    container={this.canvas}
                  />
                ))}
              </ConnectLayer>
            </svg>
          </Grid>
        </Droppable>
      </div>
    );
  }
}

interface OwnProps {}

interface StateProps {
  elements: string[];
  relationships: string[];
}

interface DispatchProps {}

type Props = OwnProps & StateProps & DispatchProps;

const mapStateToProps = (state: ReduxState): StateProps => ({
  elements: state.diagram.ownedElements,
  relationships: state.diagram.ownedRelationships,
});

export default connect<StateProps, DispatchProps, OwnProps, ReduxState>(
  mapStateToProps
)(Canvas);
