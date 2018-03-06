import { createSelector } from "reselect";
import { ReduxState } from "./state";
import { computeRelationshipPath } from "../layouting/relationship";
import { Entity, LayoutedRelationship, Relationship } from "../uml";
import { UUID } from "../uuid";

type LookupById<T> = { [id: string]: T };

export const getAllEntities = createSelector<ReduxState, UUID[], LookupById<Entity>, Entity[]>(
    state => state.entities.allIds,
    state => state.entities.byId,
    (allIds, byId) => allIds.map(id => byId[id])
);

export const getAllRelationships = createSelector<
    ReduxState,
    UUID[],
    LookupById<Relationship>,
    Relationship[]
>(
    state => state.relationships.allIds,
    state => state.relationships.byId,
    (allIds, byId) => allIds.map(id => byId[id])
);

export const getAllLayoutedRelationships = createSelector<
    ReduxState,
    Entity[],
    Relationship[],
    LayoutedRelationship[]
>(getAllEntities, getAllRelationships, (entities, relationships) =>
    relationships.map<LayoutedRelationship>(relationship => {
        const source = entities.find(entity => entity.id === relationship.source.entityId)!;
        const target = entities.find(entity => entity.id === relationship.target.entityId)!;

        const sourceRect = { ...source.position, ...source.size };
        const targetRect = { ...target.position, ...target.size };

        const path = computeRelationshipPath(
            sourceRect,
            relationship.source.edge,
            relationship.source.edgeOffset,
            targetRect,
            relationship.target.edge,
            relationship.target.edgeOffset,
            relationship.straightLine
        );

        return {
            relationship,
            source,
            target,
            path
        };
    })
);

export const getAllInteractiveElementIds = createSelector<
    ReduxState,
    ReduxState["interactiveElements"]["allIds"],
    ReadonlySet<UUID>
>(state => state.interactiveElements.allIds, allIds => new Set(allIds));
