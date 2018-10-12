import * as React from "react";
import styled, { withTheme } from "styled-components";
import { Theme } from "../../../theme";
import { EditorMode, InteractiveElementsMode } from "../../../types";
import { EntityMember } from "../../../../core/domain";
import { UUID } from "../../../../core/utils";
import { ENTITY_HORIZONTAL_PADDING, ENTITY_MEMBER_HEIGHT } from "../../../../rendering/layouters/entity";

const NameDisplay = styled.div`
    height: ${ENTITY_MEMBER_HEIGHT}px;
    line-height: ${ENTITY_MEMBER_HEIGHT}px;
    padding: 0 ${ENTITY_HORIZONTAL_PADDING}px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    user-select: none;
`;

class Member extends React.Component<Props, State> {
    state: State = {
        isMouseOver: false
    };

    toggleInteractiveElements = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        this.props.onToggleInteractiveElements();
    };

    render() {
        const {
            editorMode,
            canBeMadeInteractive,
            isInteractiveElement,
            interactiveElementsMode
        } = this.props;

        const visibility =
            isInteractiveElement && interactiveElementsMode === InteractiveElementsMode.Hidden
                ? "hidden"
                : undefined;

        const onClick =
            editorMode === EditorMode.InteractiveElementsView && canBeMadeInteractive
                ? this.toggleInteractiveElements
                : undefined;

        const containerStyles: React.CSSProperties = {
            display: "flex",
            visibility,
            alignItems: "center",
            backgroundColor: isInteractiveElement ? "white" : "transparent",
            backgroundImage: this.computeContainerBackgroundImage()
        };

        return (
            <div
                onClick={onClick}
                onMouseEnter={() => this.setState({ isMouseOver: true })}
                onMouseLeave={() => this.setState({ isMouseOver: false })}
                style={containerStyles}
            >
                <NameDisplay>{this.props.member.name}</NameDisplay>
            </div>
        );
    }

    computeContainerBackgroundImage() {
        const { editorMode, theme, isInteractiveElement, canBeMadeInteractive } = this.props;
        const { isMouseOver } = this.state;

        let backgroundColor: string | null = null;

        if (editorMode === EditorMode.InteractiveElementsView) {
            if (canBeMadeInteractive && isMouseOver) {
                backgroundColor = theme.interactiveAreaHoverColor;
            } else if (isInteractiveElement) {
                backgroundColor = theme.interactiveAreaColor;
            }
        }

        return backgroundColor === null
            ? "none"
            : `linear-gradient(${backgroundColor}, ${backgroundColor})`;
    }
}

interface Props {
    entityId: UUID;
    member: EntityMember;
    theme: Theme;
    editorMode: EditorMode;
    canBeMadeInteractive: boolean;
    isInteractiveElement: boolean;
    interactiveElementsMode: InteractiveElementsMode;
    onToggleInteractiveElements: () => void;
}

interface State {
    isMouseOver: boolean;
}

export default withTheme(Member);
