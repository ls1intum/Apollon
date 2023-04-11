import React, { Component, ComponentType } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ApollonMode } from '../../services/editor/editor-types';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../utils/actions/actions';
import { ModelState } from '../store/model-state';
import { CanvasContext } from './canvas-context';
import { withCanvas } from './with-canvas';
import { UMLElementState } from '../../services/uml-element/uml-element-types';
import { IUMLElement } from '../../services/uml-element/uml-element';

type OwnProps = {};

type StateProps = {
    readonly: boolean;
    mode: ApollonMode;
    elements: UMLElementState
    resizingInProgress: boolean;
};

type DispatchProps = {
    select: AsyncDispatch<typeof UMLElementRepository.select>;
};

type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

type LocalState = {
    selectionStarted: boolean;
    selectionRectangle: SelectionRectangle;
};

type SelectionRectangle = {
    startX: number | undefined;
    startY: number | undefined;
    endX: number | undefined;
    endY: number | undefined;
};

const enhance = compose<ComponentType<OwnProps>>(
    withCanvas,
    connect<StateProps, DispatchProps, OwnProps, ModelState>(
        (state) => ({
            readonly: state.editor.readonly,
            mode: state.editor.mode,
            elements: state.elements,
            resizingInProgress: state.resizing.length > 0
        }),
        {
            select: UMLElementRepository.select,
        },
    ),
);

class MouseEventListenerComponent extends Component<Props, LocalState> {
    constructor(props: Props) {
        super(props);
        this.state = {
            selectionStarted: false,
            selectionRectangle: {
                startX: undefined,
                startY: undefined,
                endX: undefined,
                endY: undefined
            }
        };
    }

    componentDidMount() {
        const { layer } = this.props.canvas;
        if (!this.props.readonly && this.props.mode !== ApollonMode.Assessment) {
            layer.addEventListener('mousedown', this.mouseDown);
            layer.addEventListener('mousemove', this.mouseMove);
            layer.addEventListener('mouseup', this.mouseUp);
        }
    }

    render() {
        return this.state.selectionStarted && this.state.selectionRectangle.endX && <svg
            opacity={0.5}
            pointerEvents={'none'}
            style={{
                position: 'fixed',
                left: `${Math.min(this.state.selectionRectangle.startX!, this.state.selectionRectangle.endX!)}px`,
                width: `${Math.abs(this.state.selectionRectangle.startX! - this.state.selectionRectangle.endX!)}px`,
                top: `${Math.min(this.state.selectionRectangle.startY!, this.state.selectionRectangle.endY!)}px`,
                height: `${Math.abs(this.state.selectionRectangle.startY! - this.state.selectionRectangle.endY!)}px`,
                backgroundColor: '#1E90FF',
                borderStyle: 'solid',
                borderWidth: '1px',
                borderColor: 'blue'
            }}
        />;
    }

    private mouseDown = (event: MouseEvent) => {
        // if the cursor went out of the bounds of the canvas, then the selection box is still active
        // we want to continue with the selection box from where we left off
        if (this.state.selectionStarted) {
            this.setState((prevState) => {
                return {
                    ...prevState,
                    selectionRectangle: {
                        ...prevState.selectionRectangle,
                        endX: event.clientX,
                        endY: event.clientY
                    }
                };
            });

            return;
        }

        // the selection box will activate when clicking anywhere outside the bounds of an element
        // however, resizing an element can start when clicking slightly outside its bounds
        // in this case the selection box needs to be disabled
        if (this.props.resizingInProgress) {
            return;
        }

        // if clicking on an element of the canvas, the selection box will not activate
        const umlElements = Object.values(this.props.elements);
        const offset = this.props.canvas.origin();
        for (const umlElement of umlElements) {
            const mouseCanvasPositionX = event.clientX - offset.x;
            const mouseCanvasPositionY = event.clientY - offset.y;
            if (umlElement.bounds.x <= mouseCanvasPositionX && mouseCanvasPositionX <= umlElement.bounds.x + umlElement.bounds.width
                && umlElement.bounds.y <= mouseCanvasPositionY && mouseCanvasPositionY <= umlElement.bounds.y + umlElement.bounds.height) {
                return;
            }
        }

        this.setState( {
            selectionStarted: true,
            selectionRectangle: {
                startX: event.clientX,
                startY: event.clientY,
                endX: undefined,
                endY: undefined
            }
        });
    };

    private mouseMove = (event: MouseEvent) => {
        if (!this.state.selectionStarted) {
            return;
        }

        const elementsInSelectionBox = this.getElementsInSelectionBox();

        this.setState( (prevState) => {
            return {
                selectionStarted: prevState.selectionStarted,
                elementsInSelectionBox,
                selectionRectangle: {
                    ...prevState.selectionRectangle,
                    endX: event.clientX,
                    endY: event.clientY
                }
            };
        });
    };

    private isElementInSelectionBox = (element: IUMLElement): boolean => {
        const offset = this.props.canvas.origin();

        const selectionRectangleTopLeft = Math.min(this.state.selectionRectangle.startX!, this.state.selectionRectangle.endX!) - offset.x;
        const selectionRectangleTopRight = Math.max(this.state.selectionRectangle.startX!, this.state.selectionRectangle.endX!) - offset.x;
        const selectionRectangleBottomLeft = Math.min(this.state.selectionRectangle.startY!, this.state.selectionRectangle.endY!) - offset.y;
        const selectionRectangleBottomRight = Math.max(this.state.selectionRectangle.startY!, this.state.selectionRectangle.endY!) - offset.y;

        // check if element is within selection box
        return selectionRectangleTopLeft <= element.bounds.x
            && element.bounds.x + element.bounds.width <= selectionRectangleTopRight
            && selectionRectangleBottomLeft <= element.bounds.y
            && element.bounds.y + element.bounds.height <= selectionRectangleBottomRight;
    }

    private getElementsInSelectionBox = (): string[] => {
        return Object.entries(this.props.elements).map(([id, element]) => {
            // attributes and methods are also UMLElements
            // we do not want to be able to select them separately from the main UML component
            // if the owner field is null, then it is a main UML component
            if (element.owner !== null) {
                return '';
            }

            if (this.isElementInSelectionBox(element)) {
                return id;
            }

            return '';
        }).filter((x) => x.length > 0);
    }

    private mouseUp = () => {
        if (!this.state.selectionStarted) {
            return;
        }

        const selection = this.getElementsInSelectionBox();
        this.props.select(selection);

        this.setState({
            selectionStarted: false,
            selectionRectangle: {
                startX: undefined,
                startY: undefined,
                endX: undefined,
                endY: undefined
            }
        });
    };
}

export const MouseEventListener = enhance(MouseEventListenerComponent);
