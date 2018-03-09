import * as React from "react";
import { RelationshipKind } from "../../../../../core/domain";
import { assertNever } from "../../../../../core/utils";

const kinds: RelationshipKind[] = [
    RelationshipKind.Aggregation,
    RelationshipKind.AssociationBidirectional,
    RelationshipKind.AssociationUnidirectional,
    RelationshipKind.Composition,
    RelationshipKind.Dependency,
    RelationshipKind.Inheritance,
    RelationshipKind.Realization
];

export default class RelationshipKindSelect extends React.Component<Props> {
    onChange = (e: React.FormEvent<HTMLSelectElement>) => {
        this.props.onRelationshipKindChange(e.currentTarget.value as RelationshipKind);
    };

    render() {
        return (
            <select value={this.props.kind} onChange={this.onChange}>
                {kinds.map(kind => (
                    <option key={kind} value={kind}>
                        {stringifyRelationshipKind(kind)}
                    </option>
                ))}
            </select>
        );
    }
}

function stringifyRelationshipKind(kind: RelationshipKind): string {
    switch (kind) {
        case RelationshipKind.Aggregation:
            return "Aggregation";

        case RelationshipKind.AssociationBidirectional:
            return "Association (bidirectional)";

        case RelationshipKind.AssociationUnidirectional:
            return "Association (unidirectional)";

        case RelationshipKind.Composition:
            return "Composition";

        case RelationshipKind.Dependency:
            return "Dependency";

        case RelationshipKind.Inheritance:
            return "Inheritance";

        case RelationshipKind.Realization:
            return "Realization";

        default:
            return assertNever(kind);
    }
}

interface Props {
    kind: RelationshipKind;
    onRelationshipKindChange: (kind: RelationshipKind) => void;
}
