import * as React from "react";
import styled from "styled-components";
import * as UML from "../../../../core/domain";
import {
    computeEntityHeaderHeight,
    ENTITY_HORIZONTAL_PADDING,
    getEntityKindDescriptionOrNull
} from "../../../../rendering/layouters/entity";

const Container: any = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    overflow: hidden;
    font-weight: bold;

    ${(props: any) => props.special && `
        position: absolute;
        top: 40px;
        left: 50%;
        width: 100px;
        font-size: 70%;
        font-weight: normal;
        overflow: visible;
    `}
`;

const EntityNameDisplay: any = styled.div`
    overflow: hidden;
    user-select: none;
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
        const special = entity.kind === UML.EntityKind.ActivityMergeNode;

        let entityNameDisplayStyle: React.CSSProperties = !special ? {
            width: entity.size.width - 2 * ENTITY_HORIZONTAL_PADDING,
        } : {
            width: '100%'
        };

        return (
            <Container
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                style={{
                    height: computeEntityHeaderHeight(entity.kind),
                }}
                special={special}
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
