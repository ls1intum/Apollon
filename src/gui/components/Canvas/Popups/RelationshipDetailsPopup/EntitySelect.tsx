import * as React from "react";
import { Entity } from "../../../../../uml";
import { UUID } from "../../../../../utils/uuid";

export default class EntitySelect extends React.Component<Props> {
    onChange = (e: React.FormEvent<HTMLSelectElement>) => {
        this.props.onSelectedEntityIdChange(e.currentTarget.value as UUID);
    };

    render() {
        return (
            <select value={this.props.selectedEntityId} onChange={this.onChange}>
                {this.props.entities.map(entity => (
                    <option key={entity.id} value={entity.id}>
                        {entity.name}
                    </option>
                ))}
            </select>
        );
    }
}

interface Props {
    entities: Entity[];
    selectedEntityId: UUID;
    onSelectedEntityIdChange: (entityId: UUID) => void;
}
