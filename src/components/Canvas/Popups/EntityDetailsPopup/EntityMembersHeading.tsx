import * as React from "react";
import styled from "styled-components";
import newId from "./../../../../domain/utils/uuid";

const FlexContainer = styled.div`
    display: flex;
    align-items: center;
`;

const Label = styled.label`
    user-select: none;
    font-weight: bold;
    margin-left: 5px;
`;

export default class EntityMembersHeading extends React.Component<Props> {
    private readonly checkboxId: string;

    constructor(props: Props) {
        super(props);
        this.checkboxId = `${newId()}_Show${props.heading}`;
    }

    onRenderMembersChange = (e: React.FormEvent<HTMLInputElement>) => {
        this.props.onShowMembersChange(e.currentTarget.checked);
    };

    render() {
        return (
            <FlexContainer>
                <input
                    id={this.checkboxId}
                    type="checkbox"
                    checked={this.props.renderMembers}
                    onChange={this.onRenderMembersChange}
                />

                <Label htmlFor={this.checkboxId}>{this.props.heading}</Label>
            </FlexContainer>
        );
    }
}

interface Props {
    heading: "Attributes" | "Methods";
    renderMembers: boolean;
    onShowMembersChange: (shouldRenderMembers: boolean) => void;
}
