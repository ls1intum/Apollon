import React, { Component, createRef, RefObject } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import LayoutedElement from './../LayoutedElement';
import LayoutedRelationship from './../LayoutedRelationship';
import Grid from './Grid';
import RelationshipMarkers from './../../rendering/renderers/svg/defs/RelationshipMarkers';
import Droppable from './../DragDrop/Droppable';

class Canvas extends Component<Props> {
  container: RefObject<HTMLDivElement> = createRef();

  render() {
    const { elements, relationships } = this.props;

    return (
      <div ref={this.container} tabIndex={0}>
        <Droppable container={this.container}>
          <Grid grid={10} width={1600} height={800}>
            <svg width={1600} height={800}>
              <defs>
                <RelationshipMarkers />
              </defs>

              {elements.map(element => (
                <LayoutedElement
                  key={element}
                  element={element}
                  container={this.container}
                />
              ))}
              {relationships.map(relationship => (
                <LayoutedRelationship
                  key={relationship}
                  relationship={relationship}
                  container={this.container}
                />
              ))}
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
