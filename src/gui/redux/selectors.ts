import { createSelector } from "reselect";
import { State as ReduxState } from "./../../components/Store";
import { LayoutedRelationship, Relationship } from "../../core/domain";
import Element, { ElementRepository } from './../../domain/Element';
import { UUID } from './../../domain/utils/uuid';
import { computeRelationshipPath } from "../../rendering/layouters/relationship";

type LookupById<T> = { [id: string]: T };

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
    Element[],
    Relationship[],
    LayoutedRelationship[]
>(ElementRepository.read, getAllRelationships, (entities, relationships) =>
    relationships.map<LayoutedRelationship>(relationship => {
        const source = entities.find(entity => entity.id === relationship.source.entityId)!;
        const target = entities.find(entity => entity.id === relationship.target.entityId)!;

        const sourceRect = { ...source.bounds };
        const targetRect = { ...target.bounds };

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
