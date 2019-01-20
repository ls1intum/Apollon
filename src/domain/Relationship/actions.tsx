import { Relationship, RelationshipEnd, RelationshipKind } from ".";
import newId, { UUID } from '../utils/uuid';
import { AnyAction } from 'redux';

export type RelationshipsAction =
    | CreateRelationshipAction
    | FlipRelationshipAction
    | FlipRelationshipsAction
    | UpdateRelationshipAction;

export interface CreateRelationshipAction extends AnyAction {
    type: "CREATE_RELATIONSHIP";
    relationship: Relationship;
}

interface FlipRelationshipAction extends AnyAction {
    type: "FLIP_RELATIONSHIP";
    relationship: Relationship;
}

interface FlipRelationshipsAction extends AnyAction {
    type: "FLIP_RELATIONSHIPS";
    relationshipIds: UUID[];
}

interface UpdateRelationshipAction extends AnyAction {
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
            name: 'Relationship',
            selected: false,
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            kind,
            source,
            target,
            straightLine: false,
            owner: null,
        }
    };
}

export function flipRelationship(relationship: Relationship): FlipRelationshipAction {
    return {
        type: "FLIP_RELATIONSHIP",
        relationship
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
