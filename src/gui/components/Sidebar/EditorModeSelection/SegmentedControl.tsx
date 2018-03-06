import * as React from "react";
import styled from "styled-components";

const Container = styled.div`
    display: flex;
    border-radius: 3px;
    overflow: hidden;
    user-select: none;
`;

const StyledSegment: any = styled.a`
    display: block;
    text-align: center;
    padding: 5px 10px;
    flex-grow: 1;
    text-decoration: none;
    border: 1px solid ${(props: any) => props.theme.primaryColor};
    border-left-width: 0;
    background: ${(props: any) => (props.selected ? props.theme.primaryColor : "white")};
    color: ${(props: any) => (props.selected ? "white" : props.theme.primaryColor)} !important;
    text-decoration: none !important;
    font-weight: normal !important;

    :first-child {
        border-left-width: 1px;
        border-top-left-radius: 3px;
        border-bottom-left-radius: 3px;
    }

    :last-child {
        border-top-right-radius: 3px;
        border-bottom-right-radius: 3px;
    }
`;

export default class SegmentedControl extends React.Component<Props> {
    selectSegment = (segmentId: string, e: any) => {
        e.preventDefault();
        this.props.onSelectSegment(segmentId);
    };

    render() {
        const { segments, selectedSegmentId } = this.props;

        return (
            <Container>
                {segments.map(segment => (
                    <StyledSegment
                        href="#"
                        key={segment.id}
                        onClick={(e: any) => this.selectSegment(segment.id, e)}
                        selected={segment.id === selectedSegmentId}
                    >
                        {segment.label}
                    </StyledSegment>
                ))}
            </Container>
        );
    }
}

interface Props {
    segments: Segment[];
    selectedSegmentId: string;
    onSelectSegment: (id: string) => void;
}

export interface Segment {
    id: string;
    label: string;
}
