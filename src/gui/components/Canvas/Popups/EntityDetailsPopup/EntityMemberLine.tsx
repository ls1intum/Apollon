import * as React from "react";
import styled from "styled-components";
import TrashCanIcon from "./TrashCanIcon";
import BlockInput from "../BlockInput";
import KeyCodes from "../../../../events/keyCodes";
import { EntityMember } from "../../../../../uml";
import { sanitizeWhiteSpace } from "../../../../../utils/strings";

const FlexContainer = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 5px;
`;

export default class EntityMemberInput extends React.Component<Props, State> {
    input: HTMLInputElement | null = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            isInEditMode: false,
            name: props.member.name
        };
    }

    componentWillReceiveProps(newProps: Props) {
        if (!this.state.isInEditMode && newProps.member.name !== this.state.name) {
            this.setState({ name: newProps.member.name });
        }
    }

    onFocus = () => {
        this.setState({
            isInEditMode: true,
            name: this.props.member.name
        });
    };

    updateState = (e: React.FormEvent<HTMLInputElement>) => {
        this.setState({ name: e.currentTarget.value });
    };

    updateMemberName = () => {
        const newName = sanitizeWhiteSpace(this.state.name);
        if (newName !== this.props.member.name) {
            this.props.updateMemberName(newName);
        }
        this.setState({ isInEditMode: false, name: newName });
    };

    render() {
        return (
            <FlexContainer>
                <BlockInput
                    innerRef={ref => (this.input = ref)}
                    type="text"
                    value={this.state.name}
                    onFocus={this.onFocus}
                    onChange={this.updateState}
                    onBlur={this.updateMemberName}
                    onKeyUp={e => {
                        if (e.keyCode === KeyCodes.Enter) {
                            this.input!.blur();
                        } else if (e.keyCode === KeyCodes.Escape) {
                            this.setState({ name: this.props.member.name }, () => {
                                this.input!.blur();
                            });
                        }
                    }}
                />
                <button
                    onClick={this.props.deleteMember}
                    title={this.props.deleteMemberButtonTitle}
                    style={{
                        display: "inline-block",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        marginLeft: 10,
                        fontSize: 0
                    }}
                >
                    <TrashCanIcon width={22} />
                </button>
            </FlexContainer>
        );
    }
}

interface Props {
    member: EntityMember;
    updateMemberName: (newName: string) => void;
    deleteMember: () => void;
    deleteMemberButtonTitle: "Delete attribute" | "Delete method";
}

interface State {
    isInEditMode: boolean;
    name: string;
}
