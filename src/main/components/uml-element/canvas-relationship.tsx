import React, { Component, ComponentClass, SVGProps } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Components } from '../../packages/components';
import { UMLRelationshipType } from '../../packages/uml-relationship-type';
import { ApollonMode, ApollonView } from '../../services/editor/editor-types';
import { IUMLRelationship } from '../../services/uml-relationship/uml-relationship';
import { UMLRelationshipRepository } from '../../services/uml-relationship/uml-relationship-repository';
import { Point } from '../../utils/geometry/point';
import { getClientEventCoordinates } from '../../utils/touch-event';
import { ModelState } from '../store/model-state';
import { withTheme, withThemeProps } from '../theme/styles';
import { UMLElementComponentProps } from './uml-element-component-props';

type OwnProps = UMLElementComponentProps & SVGProps<SVGSVGElement>;

type StateProps = {
  hovered: boolean;
  selected: boolean;
  interactive: boolean;
  interactable: boolean;
  reconnecting: boolean;
  disabled: boolean;
  relationship: IUMLRelationship;
  mode: ApollonMode;
  scale: number;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps & withThemeProps;

const initialState = {
  offset: new Point(),
  path: [{
    x: 0,
    y: 0,
  }],
};

type State = typeof initialState;

const enhance = compose<ComponentClass<OwnProps>>(
  withTheme,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state, props) => ({
      hovered: state.hovered[0] === props.id,
      selected: state.selected.includes(props.id),
      interactive: state.interactive.includes(props.id),
      interactable: state.editor.view === ApollonView.Exporting || state.editor.view === ApollonView.Highlight,
      reconnecting: !!state.reconnecting[props.id],
      disabled: !!Object.keys(state.reconnecting).length || !!Object.keys(state.connecting).length,
      relationship: state.elements[props.id] as IUMLRelationship,
      mode: state.editor.mode as ApollonMode,
      scale: state.editor.scale || 1.0,
    }),
    {},
  ),
);

export class CanvasRelationshipComponent extends Component<Props, State> {
  state = initialState;

  render() {
    const {
      hovered,
      selected,
      interactive,
      interactable,
      reconnecting,
      disabled,
      relationship,
      children,
      theme,
      mode,
      scale,
      ...props
    } = this.props;

    // increase relationship hit box in assessment mode
    const STROKE = mode === ApollonMode.Assessment ? 35 : 15;

    const ChildComponent = Components[relationship.type as UMLRelationshipType];

    const points = relationship.path.map((point) => `${point.x} ${point.y}`).join(',');

    const midPoints: { mpX: number; mpY: number }[] = [];
    relationship.path.map((point, index) => {
      const mpX = (relationship.path[index].x + relationship.path[index + 1]?.x) / 2;
      const mpY = (relationship.path[index].y + relationship.path[index + 1]?.y) / 2;
      if (!isNaN(mpX) && !isNaN(mpY)) midPoints.push({ mpX, mpY });
    });

    midPoints.pop();
    midPoints.shift();

    const highlight =
      interactable && interactive
        ? theme.interactive.normal
        : interactable && hovered
        ? theme.interactive.hovered
        : hovered || selected
        ? 'rgba(0, 100, 255, 0.2)'
        : relationship.highlight
        ? relationship.highlight
        : undefined;

    return (
      <svg
        {...props}
        {...relationship.bounds}
        visibility={reconnecting ? 'hidden' : undefined}
        pointerEvents={disabled ? 'none' : 'stroke'}
      >
        <polyline points={points} stroke={highlight} fill="none" strokeWidth={STROKE} />
        <ChildComponent scale={scale} element={UMLRelationshipRepository.get(relationship)} />
        {children}
        {midPoints.map((point, index) => {
          return (
            <circle
              pointerEvents={'all'}
              style={{ cursor: 'grab' }}
              key={props.id + '_' + point.mpX + '_' + point.mpY}
              cx={point.mpX}
              cy={point.mpY}
              r="10"
              onPointerDown={(e) => {
                this.onPointerDown(e, index, point);
              }}
              fill={'red'}
            />
          );
        })}
      </svg>
    );
  }

  onPointerDown = (event: any, handlerIndex: number, point: {mpX: number, mpY:number}) => {
    this.setState({ offset: new Point(event.clientX - point.mpX, event.clientY - point.mpY) });
    document.addEventListener('pointermove', this.onPointerMove);
    event.target.setAttribute('handlerIndex', String(handlerIndex));
    document.addEventListener('pointerup', this.onPointerUp, { once: true });
  };

  onPointerMove = (event: any) => {
    const handlerIndex = event.target.getAttribute('handlerIndex');
    const waypointDirection = (handlerIndex % 2) ? 'horizontal' : 'vertical';

    const clientEventCoordinates = getClientEventCoordinates(event);
    const x = clientEventCoordinates.clientX - this.state.offset.x;
    const y = clientEventCoordinates.clientY - this.state.offset.y;

    // Update relationship points here
    this.updateRelationshipPoints(waypointDirection, handlerIndex, x, y);
  };

  onPointerUp = (event: any) => {
    const element = event.currentTarget;
    element.removeEventListener('pointermove', this.onPointerMove);
  };

  updateRelationshipPoints = (waypointDirection: string, handlerIndex: string, x: number, y: number) => {
    const startPoint = Number(handlerIndex) + 1;
    const endPoint = Number(startPoint) + 1;

    if(waypointDirection === 'vertical') {
      this.props.relationship.path[startPoint].x = x;
      this.props.relationship.path[endPoint].x = x;
    }


    this.setState({path: this.props.relationship.path});

  };
}

export const CanvasRelationship = enhance(CanvasRelationshipComponent);
