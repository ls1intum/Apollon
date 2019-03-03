import React, { SFC } from 'react';
import { connect } from 'react-redux';
import AssociationSwitch from './AssociationSwitch';
import Relationship from '../../../domain/Relationship';
import { DiagramState, DiagramType } from '../../../domain/Diagram';
import { State } from '../../Store';

const AssociationPopup: SFC<Props> = ({ element, diagram }) => (
  <div>
    {diagram.type === DiagramType.ClassDiagram && (
      <AssociationSwitch relationship={element} />
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
