import React, { SFC } from 'react';
import { connect } from 'react-redux';
import AssociationSwitch from './AssociationSwitch';
import Relationship from '../../../domain/Relationship';
import { DiagramState, DiagramType } from '../../../domain/Diagram';
import RelationshipEnd from './RelationshipEnd';
import { State } from '../../Store';
import Element, { ElementRepository } from '../../../domain/Element';

const AssociationPopup: SFC<Props> = ({ element, diagram, getById }) => {
  const source = getById(element.source.element);
  const target = getById(element.target.element);
  return (
    <div>
      {diagram.type === DiagramType.ClassDiagram && (
        <>
          <AssociationSwitch relationship={element} />
          <div>
            <hr />
            <b>
              <small>{source.name}</small>
            </b>
            <br />
            <RelationshipEnd relationship={element} end="source" />
          </div>
          <div>
            <hr />
            <b>
              <small>{target.name}</small>
            </b>
            <br />
            <RelationshipEnd relationship={element} end="target" />
          </div>
        </>
      )}
    </div>
  );
};

interface OwnProps {
  element: Relationship;
}

interface StateProps {
  diagram: DiagramState;
  getById: (id: string) => Element;
}

interface DispatchProps {}

type Props = OwnProps & StateProps & DispatchProps;

export default connect<StateProps, DispatchProps, OwnProps, State>(state => ({
  diagram: state.diagram,
  getById: ElementRepository.getById(state.elements),
}))(AssociationPopup);
