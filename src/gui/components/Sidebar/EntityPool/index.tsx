import * as React from "react";
import styled from "styled-components";
import EntityPreview from "./EntityPreview";
import { EntityKind } from "../../../../core/domain";
import { DiagramType } from "../../../types";

const Container = styled.section`
    display: grid;
    grid-template-columns: repeat(auto-fill, 145px);
    grid-auto-rows: 90px;
    grid-gap: 20px;
`;

export default class EntityPool extends React.Component<Props> {
    render() {
        switch (this.props.diagramType) {
            case DiagramType.ClassDiagram:
                return (
                    <Container>
                        <EntityPreview kind={EntityKind.Class} />
                        <EntityPreview kind={EntityKind.AbstractClass} />
                        <EntityPreview kind={EntityKind.Interface} />
                        <EntityPreview kind={EntityKind.Enumeration} />
                    </Container>
                );
            case DiagramType.ActivityDiagram:
                return (
                    <Container>
                        <EntityPreview kind={EntityKind.ActivityControlInitialNode} />
                        <EntityPreview kind={EntityKind.ActivityControlFinalNode} />
                        <EntityPreview kind={EntityKind.ActivityActionNode} />
                    </Container>
                );
        }
    }
}

interface Props {
    diagramType: DiagramType;
}
