import * as React from "react";
import RelationshipEndDetails from "./RelationshipEndDetails";
import RelationshipKindSelect from "./RelationshipKindSelect";
import RelationshipFlipIcon from "./RelationshipFlipIcon";
import { PopupSection } from "../PopupSection";
import { PopupSectionHeading } from "../PopupSectionHeading";
import Relationship, { LayoutedRelationship, RelationshipEnd, RelationshipKind } from "./../../../domain/Relationship";
import Element from './../../../domain/Element';
import Diagram, { DiagramType } from "./../../../domain/Diagram";

export default class RelationshipDetails extends React.Component<Props> {
    updateRelationshipKind = (kind: RelationshipKind) => {
        // this.props.updateRelationship({
        //     ...this.props.relationship.relationship,
        //     kind
        // });
    };

    updateRelationshipSource = (source: RelationshipEnd) => {
        // this.props.updateRelationship({
        //     ...this.props.relationship.relationship,
        //     source
        // });
    };

    updateRelationshipTarget = (target: RelationshipEnd) => {
        // this.props.updateRelationship({
        //     ...this.props.relationship.relationship,
        //     target
        // });
    };

    flipRelationship = () => {
        // this.props.flipRelationship(this.props.relationship.relationship);
    };

    render() {
        const { relationship } = this.props;
        return (
            <>
                <PopupSection>
                    {this.props.diagramType !== DiagramType.ActivityDiagram &&
                        <PopupSectionHeading>
                            Association
                          <RelationshipFlipIcon onClick={this.flipRelationship} />
                        </PopupSectionHeading>
                        ||
                        <PopupSectionHeading>Control Flow</PopupSectionHeading>
                    }
                    {/* {this.props.diagramType !== DiagramType.ActivityDiagram &&
                        <RelationshipKindSelect
                            kind={relationship.relationship.kind}
                            onRelationshipKindChange={this.updateRelationshipKind}
                        />
                    } */}

                    {/* <LabeledCheckbox
                        label="Straight line"
                        checked={relationship.relationship.straightLine}
                        onChange={straightLine => {
                            this.props.updateRelationship({
                                ...this.props.relationship.relationship,
                                straightLine
                            });
                        }}
                        style={{ marginTop: 10 }}
                    /> */}
                </PopupSection>

                <PopupSection>
                    {/* <RelationshipEndDetails
                        diagramType={this.props.diagramType}
                        heading="Source"
                        entity={relationship.source}
                        entities={this.props.entities}
                        relationshipEnd={relationship.relationship.source}
                        updateRelationshipEnd={this.updateRelationshipSource}
                    /> */}
                </PopupSection>

                <PopupSection>
                    {/* <RelationshipEndDetails
                        diagramType={this.props.diagramType}
                        heading="Target"
                        entity={relationship.target}
                        entities={this.props.entities}
                        relationshipEnd={relationship.relationship.target}
                        updateRelationshipEnd={this.updateRelationshipTarget}
                    /> */}
                </PopupSection>
            </>
        );
    }
}

interface Props {
    diagramType: DiagramType;
    entities: Element[];
    relationship: LayoutedRelationship;
    // updateRelationship: (relationship: Relationship) => void;
    // flipRelationship: (relationship: Relationship) => void;
}
