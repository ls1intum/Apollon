import * as React from "react";
import { connect } from "react-redux";
import RelationshipDetails from "./RelationshipDetails";
import Popup from "../Popup";
import { flipRelationship, getAllEntities, updateRelationship } from "./../../../gui/redux";
import { LayoutedRelationship } from "./../../../core/domain";
import Element from './../../../domain/Element';
import { Point } from "./../../../core/geometry";
import { DiagramType } from "./../../../domain/Options/types";
import { State as ReduxState } from './../../Store';

class RelationshipDetailsPopup extends React.Component<Props> {
    render() {
        const { path } = this.props.relationship;

        // The popup opens to the right with an arrow point to the left.
        // We place the popup next to the second-to-last point on the path
        // in order not to cover the end of the path too much.
        const targetPoint = path[path.length - 2];

        const position: Point = {
            x: targetPoint.x + 20,
            y: targetPoint.y - 43
        };

        return (
            <Popup position={position} onRequestClose={this.props.onRequestClose} canvasScrollContainer={this.props.canvasScrollContainer}>
                <RelationshipDetails
                    diagramType={this.props.diagramType}
                    entities={this.props.entities}
                    relationship={this.props.relationship}
                    updateRelationship={this.props.updateRelationship}
                    flipRelationship={this.props.flipRelationship}
                />
            </Popup>
        );
    }
}

interface OwnProps {
    diagramType: DiagramType;
    relationship: LayoutedRelationship;
    onRequestClose: () => void;
    canvasScrollContainer: HTMLDivElement | null;
}

interface StateProps {
    entities: Element[];
}

interface DispatchProps {
    updateRelationship: typeof updateRelationship;
    flipRelationship: typeof flipRelationship;
}

type Props = OwnProps & StateProps & DispatchProps;

function mapStateToProps(state: ReduxState): StateProps {
    return {
        // TODO
        entities: getAllEntities(state)
    };
}

export default connect(mapStateToProps, { updateRelationship, flipRelationship })(RelationshipDetailsPopup);
