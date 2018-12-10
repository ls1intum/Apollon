import * as React from "react";
import { Entity } from "./../../../core/domain";
import { UUID } from './../../../domain/utils/uuid';
import styled from "styled-components";

const Select = styled.select`
    max-width: 187px;
`;

export default class EntitySelect extends React.Component<Props> {
    onChange = (e: React.FormEvent<HTMLSelectElement>) => {
        this.props.onSelectedEntityIdChange(e.currentTarget.value as UUID);
    };

    render() {
        return (
            <Select value={this.props.selectedEntityId} onChange={this.onChange}>
                {this.props.entities.map(entity => (
                    <option key={entity.id} value={entity.id}>
                        {entity.name}
                    </option>
                ))}
            </Select>
        );
    }
}

interface Props {
    entities: Entity[];
    selectedEntityId: UUID;
    onSelectedEntityIdChange: (entityId: UUID) => void;
}
