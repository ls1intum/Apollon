import * as React from "react";
import styled from "styled-components";
import { EntityKind } from "../../../../../core/domain";
import { assertNever } from "../../../../../core/utils";

const kinds: EntityKind[] = [
    EntityKind.AbstractClass,
    EntityKind.Class,
    EntityKind.Enumeration,
    EntityKind.Interface
];

const Container = styled.div`
    margin-top: 5px;
`;

export default class EntityKindSelect extends React.Component<Props> {
    onChange = (e: React.FormEvent<HTMLSelectElement>) => {
        this.props.updateEntityKind(e.currentTarget.value as EntityKind);
    };

    render() {
        return (
            <Container>
                <select value={this.props.entityKind} onChange={this.onChange}>
                    {kinds.map(kind => (
                        <option key={kind} value={kind}>
                            {stringifyEntityKind(kind)}
                        </option>
                    ))}
                </select>
            </Container>
        );
    }
}

function stringifyEntityKind(kind: EntityKind): string {
    switch (kind) {
        case EntityKind.AbstractClass:
            return "Class (abstract)";

        case EntityKind.Class:
            return "Class";

        case EntityKind.Enumeration:
            return "Enumeration";

        case EntityKind.Interface:
            return "Interface";

        case EntityKind.ActivityControlInitialNode:
            return "Intial Node";

        case EntityKind.ActivityControlFinalNode:
            return "Final Node";

        case EntityKind.ActivityActionNode:
            return "Action Node";

        case EntityKind.ActivityObject:
            return "Object";

        case EntityKind.ActivityMergeNode:
            return "Merge Node";

        case EntityKind.ActivityForkNode:
            return "Fork Node";

        case EntityKind.ActivityForkNodeHorizontal:
            return "Fork Node";
            
        default:
            return assertNever(kind);
    }
}

interface Props {
    entityKind: EntityKind;
    updateEntityKind: (kind: EntityKind) => void;
}
