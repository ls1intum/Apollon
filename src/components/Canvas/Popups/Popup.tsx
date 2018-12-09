import * as React from "react";
import styled from "styled-components";
import PopupArrowIcon from "./PopupArrowIcon";
import { Point } from "./../../../core/geometry";

const Container = styled.div`
    width: 275px;
    max-height: 650px;
    min-height: 65px;
    overflow-y: scroll;
    border: 1px solid #d0d0d0;
    border-radius: 5px;
    background: #efefef;
`;

export default class Popup extends React.Component<Props, State> {
    state: State = { isVisible: false };
    div: HTMLElement | null = null;

    closeWhenClickedOutside = (e: MouseEvent) => {
        if (this.div === null || !this.div.contains(e.target as any)) {
            this.props.onRequestClose();
        }
    };

    componentDidMount() {
        window.setTimeout(() => {
            this.setState({ isVisible: true });
        }, 0);

        window.addEventListener("click", this.closeWhenClickedOutside, { capture: true });
    }

    componentWillUnmount() {
        window.removeEventListener("click", this.closeWhenClickedOutside, { capture: true });
    }

    render() {
        const { isVisible } = this.state;

        const popupStyle: React.CSSProperties = {
            position: "absolute",
            left: this.props.position.x,
            top: this.props.position.y,
            transition: "all 300ms cubic-bezier(0.175, 0.885, 0.32, 1.175)",
            transform: isVisible
                ? "scale(1) translate3d(0, 0, 0) "
                : "scale(0) translate3d(0, 0, 0)",
            transformOrigin: "left center",
            opacity: isVisible ? 1 : 0,
            filter: "drop-shadow(0 2px 5px rgba(0, 0, 0, 0.2))",
            zIndex: 9000
        };

        const popupArrowStyle: React.CSSProperties = {
            position: "absolute",
            left: -18,
            top: 30
        };

        return (
            <div ref={ref => (this.div = ref)} style={popupStyle}>
                <Container>{this.props.children}</Container>

                <div style={popupArrowStyle}>
                    <PopupArrowIcon width={25} fill="none" stroke="#d0d0d0" />
                </div>

                <div style={popupArrowStyle}>
                    <PopupArrowIcon width={25} fill="#efefef" stroke="transparent" />
                </div>
            </div>
        );
    }
}

interface Props {
    position: Point;
    onRequestClose: () => void;
    children: JSX.Element | JSX.Element[];
    canvasScrollContainer: HTMLDivElement | null;
}

interface State {
    isVisible: boolean;
}
