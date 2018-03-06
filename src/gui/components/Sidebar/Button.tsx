import * as React from "react";
import styled from "styled-components";

const StyledButton = styled("button")`
    padding: 10px 13px;
    background: ${props => props.theme.primaryColor};
    border: none;
    border-radius: 3px;
    color: white;
    font-size: 1rem;
    font-family: ${props => props.theme.fontFamily};
    cursor: pointer;
    user-select: none;

    :disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export default class Button extends React.Component<Props> {
    onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        this.props.onClick();
        e.currentTarget.blur();
    };

    render() {
        const { type = "button", disabled } = this.props;

        return (
            <StyledButton type={type} onClick={this.onClick} disabled={disabled}>
                {this.props.children}
            </StyledButton>
        );
    }
}

interface Props {
    children: string;
    onClick(): void;
    type?: "button" | "submit";
    disabled?: boolean;
}
