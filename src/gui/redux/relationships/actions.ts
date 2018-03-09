import { Relationship, RelationshipEnd, RelationshipKind } from "../../../uml";
import { newId, UUID } from "../../../uuid";

export type RelationshipsAction =
    | CreateRelationshipAction
    | DeleteRelationshipsAction
    | FlipRelationshipsAction
    | UpdateRelationshipAction;

interface CreateRelationshipAction {
    type: "CREATE_RELATIONSHIP";
    relationship: Relationship;
}

interface DeleteRelationshipsAction {
    type: "DELETE_RELATIONSHIPS";
    relationshipIds: UUID[];
}

interface FlipRelationshipsAction {
    type: "FLIP_RELATIONSHIPS";
    relationshipIds: UUID[];
}

interface UpdateRelationshipAction {
    type: "UPDATE_RELATIONSHIPS";
    relationship: Relationship;
}

export function createRelationship(
    kind: RelationshipKind,
    source: RelationshipEnd,
    target: RelationshipEnd
): CreateRelationshipAction {
    return {
        type: "CREATE_RELATIONSHIP",
        relationship: {
            id: newId(),
            kind,
            source,
            target,
            straightLine: false
        }
    };
}

export function deleteRelationships(relationshipIds: UUID[]): DeleteRelationshipsAction {
    return {
        type: "DELETE_RELATIONSHIPS",
        relationshipIds
    };
}

export function flipRelationships(relationshipIds: UUID[]): FlipRelationshipsAction {
    return {
        type: "FLIP_RELATIONSHIPS",
        relationshipIds
    };
}

export function updateRelationship(relationship: Relationship): UpdateRelationshipAction {
    return {
        type: "UPDATE_RELATIONSHIPS",
        relationship
    };
}
