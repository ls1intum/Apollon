import React, { Component, ComponentClass, SVGProps } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Components } from '../../packages/components';
import { UMLElementType } from '../../packages/uml-element-type';
import { ApollonView } from '../../services/editor/editor-types';
import { UMLContainer } from '../../services/uml-container/uml-container';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { ModelState } from '../store/model-state';
import { withTheme, withThemeProps } from '../theme/styles';
import { UMLElementComponentProps } from './uml-element-component-props';

const STROKE = 5;

type OwnProps = { child?: ComponentClass<UMLElementComponentProps> } & UMLElementComponentProps &
  SVGProps<SVGSVGElement>;

type StateProps = {
  hovered: boolean;
  selected: boolean;
  moving: boolean;
  interactive: boolean;
  interactable: boolean;
  element: IUMLElement;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps & withThemeProps;

const enhance = compose<ComponentClass<OwnProps>>(
  withTheme,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state, props) => ({
      hovered: state.hovered[0] === props.id,
      selected: state.selected.includes(props.id),
      moving: state.moving.includes(props.id),
      interactive: state.interactive.includes(props.id),
      interactable: state.editor.view === ApollonView.Exporting || state.editor.view === ApollonView.Highlight,
      element: state.elements[props.id],
    }),
    {},
  ),
);

export class CanvasElementComponent extends Component<Props> {
  render() {
    const {
      hovered,
      selected,
      moving,
      interactive,
      interactable,
      element,
      child: ChildComponent,
      children,
      theme,
      ...props
    } = this.props;

    let elements = null;
    if (UMLContainer.isUMLContainer(element) && ChildComponent) {
      elements = element.ownedElements.map((id) => <ChildComponent key={id} id={id} />);
    }
    const ElementComponent = Components[element.type as UMLElementType];

    const highlight =
      interactable && interactive
        ? theme.interactive.normal
        : interactable && hovered
        ? theme.interactive.hovered
        : element.highlight
        ? element.highlight
        : 'white';

    return (
        <foreignObject width="400" height="400">
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            className="artemis-instruction-dropzone"
            onDrop={this.onDrop}
            onDragOver={this.onDragOver}
            onDragEnter={this.onDragEnter}
            onDragLeave={this.onDragLeave}
          >
            <svg
              {...props}
              {...element.bounds}
              pointerEvents={moving ? 'none' : undefined}
              fillOpacity={moving ? 0.7 : undefined}
              fill={highlight}
            >
              <ElementComponent element={UMLElementRepository.get(element)}>{elements}</ElementComponent>
              {children}
              {!interactable && (hovered || selected) && (
                <rect
                  x={-STROKE / 2}
                  y={-STROKE / 2}
                  width={element.bounds.width + STROKE}
                  height={element.bounds.height + STROKE}
                  fill="none"
                  stroke="#0064ff"
                  strokeOpacity="0.2"
                  strokeWidth={STROKE}
                  pointerEvents="none"
                />
              )}
            </svg>
          </div>
        </foreignObject>
    );
  }

  /**
   * implement so that elements can be dropped
   * @param ev DragEvent
   */
  private onDragOver = (ev: any) => {
    // prevent default to allow drop
    ev.preventDefault();
    // disable pointer events of children
    this.setState({ dragOver: true });
  };

  /**
   * implement so that elements can be dropped
   * @param ev DragEvent
   */
  private onDragEnter = (ev: any) => {
    if (ev.target.className.includes('artemis-instruction-dropzone')) {
      ev.target.style.border = 'solid';
    }
  };

  /**
   * implement so that elements can be dropped
   * @param ev DragEvent
   */
  private onDragLeave = (ev: any) => {
    if (ev.target.className.includes('artemis-instruction-dropzone')) {
      ev.target.style.border = '';
    }
    // enable pointer events of children
    this.setState({ dragOver: false });
  };

  /**
   * Artemis instruction object can be dropped on assessment sections to automatically fill assessment
   * @param ev DropEvent
   */
  private onDrop = (ev: any) => {
    // prevent default action (open as link for some elements)
    ev.preventDefault();
    if (ev.target.className.includes('artemis-instruction-dropzone')) {
      ev.target.style.border = '';
    }
    // enable pointer events of children
    this.setState({ dragOver: false });

    // const { element, assessment } = this.props;
    const data = ev.dataTransfer.getData('text');
    const instruction = JSON.parse(data);
    const score = instruction.credits;
    const feedback = instruction.feedback;
    // this.props.assess(element.id, { ...assessment, score, feedback });
    console.log(score);
    console.log(feedback);
  };
}

export const CanvasElement = enhance(CanvasElementComponent);
