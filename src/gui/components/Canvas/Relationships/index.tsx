import * as React from "react";
import Relationship from "./Relationship";
import { Size } from "../../../../geometry";
import RelationshipMarkers from "../../../../rendering/svg/defs/RelationshipMarkers";
import {
    EditorMode,
    ElementSelection,
    InteractiveElementsMode,
    LayoutedRelationship
} from "../../../../uml";
import { UUID } from "../../../../uuid";

export default class Relationships extends React.Component<Props> {
    render() {
        const {
            relationships,
            canvasSize,
            selection,
            editorMode,
            interactiveElementIds,
            interactiveElementsMode
        } = this.props;

        const style: React.CSSProperties = {
            position: "absolute",
            top: 0,
            left: 0
        };

        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={canvasSize.width}
                height={canvasSize.height}
                style={style}
            >
                <defs>
                    <RelationshipMarkers />
                </defs>

                {relationships.map(relationship => {
                    const relationshipId = relationship.relationship.id;
                    return (
                        <Relationship
                            key={relationshipId}
                            relationship={relationship}
                            editorMode={editorMode}
                            interactiveElementsMode={interactiveElementsMode}
                            isSelected={selection.relationshipIds.includes(relationshipId)}
                            onSelect={() => {
                                this.props.onSelectRelationship(relationshipId);
                            }}
                            onToggleSelection={() => {
                                this.props.onToggleRelationshipSelection(relationshipId);
                            }}
                            isInteractiveElement={interactiveElementIds.has(relationshipId)}
                            onToggleInteractiveElements={() => {
                                this.props.onToggleInteractiveElements(relationshipId);
                            }}
                            openDetailsPopup={() => {
                                this.props.openDetailsPopup(relationshipId);
                            }}
                        />
                    );
                })}
            </svg>
        );
    }
}

interface Props {
    relationships: LayoutedRelationship[];
    canvasSize: Size;
    editorMode: EditorMode;
    selection: ElementSelection;
    onSelectRelationship: (relationshipId: UUID) => void;
    onToggleRelationshipSelection: (relationshipId: UUID) => void;
    openDetailsPopup: (relationshipId: UUID) => void;
    interactiveElementIds: ReadonlySet<UUID>;
    interactiveElementsMode: InteractiveElementsMode;
    onToggleInteractiveElements: (...ids: UUID[]) => void;
}
