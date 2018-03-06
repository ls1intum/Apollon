import * as React from "react";
import styled from "styled-components";
import { newId } from "../../../../uuid";

const FlexContainer = styled.div`
    display: flex;
    align-items: center;
    user-select: none;
`;

const Checkbox = styled.input`
    cursor: pointer;
`;

const Label = styled.label`
    cursor: pointer;
`;

export default class LabeledCheckbox extends React.Component<Props> {
    id = newId();

    onChange = (e: React.FormEvent<HTMLInputElement>) => {
        this.props.onChange(e.currentTarget.checked);
    };

    render() {
        const { label, checked, disabled, style } = this.props;
        const checkboxId = "Checkbox_" + this.id;

        return (
            <FlexContainer style={style}>
                <Checkbox
                    type="checkbox"
                    id={checkboxId}
                    checked={checked}
                    onChange={this.onChange}
                    disabled={disabled}
                />
                &nbsp;
                <Label htmlFor={checkboxId}>{label}</Label>
            </FlexContainer>
        );
    }
}

interface Props {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    style?: React.CSSProperties;
}
