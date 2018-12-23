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
        const find = (elements: Element[], id: string): Element | null => {
            if (!elements.length) return null;

            const element = elements.find(e => e.id === id);
            if (element) return element;

            const children = elements.reduce<Element[]>((a, e) => [ ...a, ...e.ownedElements], []);
            return find(children, id);
        }
        const source = find(entities, relationship.source.entityId);
        const target = find(entities, relationship.target.entityId);

        if (!source || !target) {
            return {
                relationship,
                source,
                target,
                path: [],
            } as LayoutedRelationship;
        }

        const sourceRect = { ...source.bounds };
        const targetRect = { ...target.bounds };

        let owner = source.owner;
        while (owner) {
          sourceRect.x += owner.bounds.x;
          sourceRect.y += owner.bounds.y;
          owner = owner.owner;
        }
        owner = target.owner;
        while (owner) {
          targetRect.x += owner.bounds.x;
          targetRect.y += owner.bounds.y;
          owner = owner.owner;
        }

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
