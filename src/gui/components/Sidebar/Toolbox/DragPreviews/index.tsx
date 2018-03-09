import * as React from "react";
import styled from "styled-components";
import EntityPreview from "./EntityPreview";
import { EntityKind } from "../../../../../core/domain";

const Container = styled.section`
    display: grid;
    grid-template-columns: repeat(auto-fill, 145px);
    grid-auto-rows: 90px;
    grid-gap: 20px;
`;

export default class DragPreviews extends React.Component {
    render() {
        return (
            <Container>
                <EntityPreview kind={EntityKind.Class} />
                <EntityPreview kind={EntityKind.AbstractClass} />
                <EntityPreview kind={EntityKind.Interface} />
                <EntityPreview kind={EntityKind.Enumeration} />
            </Container>
        );
    }
}
