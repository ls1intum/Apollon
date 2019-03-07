import React, { SFC } from 'react';
import { connect } from 'react-redux';
import AssociationSwitch from './AssociationSwitch';
import Relationship from '../../../domain/Relationship';
import { DiagramState, DiagramType } from '../../../domain/Diagram';
import RelationshipEnd from './RelationshipEnd';
import { State } from '../../Store';

const AssociationPopup: SFC<Props> = ({ element, diagram }) => (
  <div>
    {diagram.type === DiagramType.ClassDiagram && (
      <>
        <AssociationSwitch relationship={element} />
        <div>
          <hr />
          <b><small>Source</small></b><br />
          <RelationshipEnd relationship={element} end="source" />
        </div>
        <div>
          <hr />
          <b><small>Target</small></b><br />
          <RelationshipEnd relationship={element} end="target" />
        </div>
      </>
    )}
  </div>
);

interface OwnProps {
  element: Relationship;
}

interface StateProps {
  diagram: DiagramState;
}

interface DispatchProps {}

type Props = OwnProps & StateProps & DispatchProps;

export default connect<StateProps, DispatchProps, OwnProps, State>(state => ({
  diagram: state.diagram,
}))(AssociationPopup);
