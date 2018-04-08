import * as React from "react";
import BlockInput from "../BlockInput";
import { Entity, EntityKind } from "../../../../../core/domain";
import { newId, sanitizeWhiteSpace } from "../../../../../core/utils";

export default class EntityNameInput extends React.Component<Props, State> {
    state: State;

    readonly inputId = newId();
    input: HTMLInputElement | null = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            name: props.entity.name,
            isInEditMode: false
        };
    }

    componentWillReceiveProps(newProps: Props) {
        if (!this.state.isInEditMode) {
            this.setState({ name: newProps.entity.name });
        }
    }

    updateState = (e: React.FormEvent<HTMLInputElement>) => {
        this.setState({ name: e.currentTarget.value });
    };

    render() {
        const { entity } = this.props;

        return (
            <BlockInput
                innerRef={input => (this.input = input)}
                id={this.inputId}
                type="text"
                value={this.state.name}
                onFocus={() => {
                    this.setState({ isInEditMode: true });
                }}
                onChange={this.updateState}
                onKeyUp={e => {
                    if (e.key === "Enter") {
                        this.input!.blur();
                    } else if (e.key === "Escape") {
                        this.setState({ name: this.props.entity.name }, () => {
                            this.input!.blur();
                        });
                    }
                }}
                onBlur={() => {
                    const newName = sanitizeWhiteSpace(this.state.name);
                    if (newName !== entity.name) {
                        this.props.updateEntityName(newName);
                    }
                    this.setState({ isInEditMode: false, name: newName });
                }}
                autoComplete="off"
                style={{
                    fontStyle: entity.kind === EntityKind.AbstractClass ? "italic" : "normal",
                    fontWeight: "bold",
                    textAlign: "center"
                }}
            />
        );
    }
}

interface Props {
    entity: Entity;
    updateEntityName: (newName: string) => void;
}

interface State {
    name: string;
    isInEditMode: boolean;
}
