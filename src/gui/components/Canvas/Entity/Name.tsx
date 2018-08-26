import * as React from "react";
import styled from "styled-components";
import * as UML from "../../../../core/domain";
import {
    computeEntityHeaderHeight,
    ENTITY_HORIZONTAL_PADDING,
    getEntityKindDescriptionOrNull
} from "../../../../rendering/layouters/entity";

const Container = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    overflow: hidden;
`;

const EntityNameDisplay: any = styled.div`
    overflow: hidden;
    user-select: none;
    font-weight: bold;
    font-style: ${(props: any) =>
        props.entityKind === UML.EntityKind.AbstractClass ? "italic" : "normal"};
`;

const EntityKindDisplay = styled.div`
    font-size: 85%;
`;

export default class Name extends React.Component<Props> {
    render() {
        const { entity, onMouseEnter, onMouseLeave } = this.props;
        const entityKindDescription = getEntityKindDescriptionOrNull(entity.kind);

        let entityNameDisplayStyle: React.CSSProperties = {
            width: entity.size.width - 2 * ENTITY_HORIZONTAL_PADDING,
        };

        return (
            <Container
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                style={{
                    height: computeEntityHeaderHeight(entity.kind),
                }}
            >
                <div>
                    {entityKindDescription && (
                        <EntityKindDisplay>{entityKindDescription}</EntityKindDisplay>
                    )}

                    <EntityNameDisplay
                        entityKind={entity.kind}
                        style={entityNameDisplayStyle}
                    >
                        {entity.name}
                    </EntityNameDisplay>
                </div>
            </Container>
        );
    }
}

interface Props {
    entity: UML.Entity;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}
