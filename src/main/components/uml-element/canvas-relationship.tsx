import React, { Component, ComponentClass, SVGProps } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Components } from '../../packages/components';
import { UMLRelationshipType } from '../../packages/uml-relationship-type';
import { ApollonMode, ApollonView } from '../../services/editor/editor-types';
import { Direction } from '../../services/uml-element/uml-element-port';
import { IUMLRelationship } from '../../services/uml-relationship/uml-relationship';
import { UMLRelationshipRepository } from '../../services/uml-relationship/uml-relationship-repository';
import { AsyncDispatch } from '../../utils/actions/actions';
import { computeBoundingBox } from '../../utils/geometry/boundary';
import { Point } from '../../utils/geometry/point';
import { getClientEventCoordinates } from '../../utils/touch-event';
import { ModelState } from '../store/model-state';
import { withTheme, withThemeProps } from '../theme/styles';
import { UMLElementComponentProps } from './uml-element-component-props';
import { UMLElementSelectorType } from '../../packages/uml-element-selector-type';

type OwnProps = UMLElementComponentProps & SVGProps<SVGSVGElement>;

type StateProps = {
  hovered: boolean;
  selected: boolean;
  remoteSelectors: UMLElementSelectorType[];
  interactive: boolean;
  interactable: boolean;
  reconnecting: boolean;
  disabled: boolean;
  relationship: IUMLRelationship;
  mode: ApollonMode;
  readonly: boolean;
  selectionBoxActive: boolean;
};

type DispatchProps = {
  startwaypointslayout: AsyncDispatch<typeof UMLRelationshipRepository.startWaypointsLayout>;
  endwaypointslayout: AsyncDispatch<typeof UMLRelationshipRepository.endWaypointsLayout>;
};

type Props = OwnProps & StateProps & DispatchProps & withThemeProps;

const initialState = {
  offset: new Point(),
  handlerIndex: 0,
  path: [
    {
      x: 0,
      y: 0,
    },
  ],
};

type State = typeof initialState;

const enhance = compose<ComponentClass<OwnProps>>(
  withTheme,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state, props) => ({
      hovered: state.hovered[0] === props.id,
      selected: state.selected.includes(props.id),
      remoteSelectors: state.remoteSelection[props.id] || [],
      interactive: state.interactive.includes(props.id),
      interactable: state.editor.view === ApollonView.Exporting || state.editor.view === ApollonView.Highlight,
      reconnecting: !!state.reconnecting[props.id],
      disabled: !!Object.keys(state.reconnecting).length || !!Object.keys(state.connecting).length,
      relationship: state.elements[props.id] as IUMLRelationship,
      mode: state.editor.mode as ApollonMode,
      readonly: state.editor.readonly || false,
      selectionBoxActive: state.editor.selectionBoxActive,
    }),
    {
      startwaypointslayout: UMLRelationshipRepository.startWaypointsLayout,
      endwaypointslayout: UMLRelationshipRepository.endWaypointsLayout,
    },
  ),
);

export class CanvasRelationshipComponent extends Component<Props, State> {
  state = initialState;

  render() {
    const {
      hovered,
      selected,
      remoteSelectors,
      interactive,
      interactable,
      reconnecting,
      disabled,
      relationship,
      children,
      theme,
      mode,
      readonly,
      startwaypointslayout,
      endwaypointslayout,
      selectionBoxActive,
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
              : 'rgba(0, 100, 255, 0)';

    return (
      <svg
        {...props}
        {...relationship.bounds}
        visibility={reconnecting ? 'hidden' : undefined}
        pointerEvents={disabled ? 'none' : 'stroke'}
      >
        <polyline points={points} stroke={highlight} fill="none" strokeWidth={STROKE} />
        {remoteSelectors.length > 0 &&
          remoteSelectors.map((selector) => (
            <polyline
              key={selector.name}
              points={points}
              stroke={selector.color}
              strokeOpacity="0.2"
              strokeWidth={STROKE}
              fill="none"
            />
          ))}
        <ChildComponent element={UMLRelationshipRepository.get(relationship)} />
        {children}
        {midPoints.map((point, index) => {
          return (
            <circle
              visibility={selectionBoxActive || interactive || interactable || readonly ? 'hidden' : undefined}
              pointerEvents={selectionBoxActive || interactive || interactable || readonly ? 'none' : 'all'}
              style={{ cursor: 'grab' }}
              key={props.id + '_' + point.mpX + '_' + point.mpY}
              cx={point.mpX}
              cy={point.mpY}
              r="15"
              onPointerDown={(e) => {
                this.onPointerDown(e, index, point);
              }}
              fill={highlight}
            />
          );
        })}
      </svg>
    );
  }

  onPointerDown = (event: any, handlerIndex: number, point: { mpX: number; mpY: number }) => {
    this.setState({ handlerIndex, offset: new Point(event.clientX - point.mpX, event.clientY - point.mpY) });
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp, { once: true });
  };

  onPointerMove = (event: any) => {
    const handlerIndex = this.state.handlerIndex;
    const waypointDirection = handlerIndex % 2 ? 'horizontal' : 'vertical';

    const clientEventCoordinates = getClientEventCoordinates(event);
    const x = clientEventCoordinates.clientX - this.state.offset.x;
    const y = clientEventCoordinates.clientY - this.state.offset.y;

    // Update relationship points here
    this.updateRelationshipPoints(waypointDirection, handlerIndex, x, y);
  };

  onPointerUp = (event: any) => {
    this.props.endwaypointslayout(this.props.id);
    const element = event.currentTarget;
    element.removeEventListener('pointermove', this.onPointerMove);
  };

  updateRelationshipPoints = (waypointDirection: string, handlerIndex: number, x: number, y: number) => {
    const startPoint = handlerIndex + 1;
    const endPoint = Number(startPoint) + 1;
    const sourceDirection = this.props.relationship.source.direction;

    switch (waypointDirection) {
      case 'horizontal':
        sourceDirection === Direction.Up || sourceDirection === Direction.Down
          ? this.updateXCoordinate(startPoint, endPoint, x, y)
          : this.updateYCoordinate(startPoint, endPoint, x, y);
        break;

      case 'vertical':
        sourceDirection === Direction.Up || sourceDirection === Direction.Down
          ? this.updateYCoordinate(startPoint, endPoint, x, y)
          : this.updateXCoordinate(startPoint, endPoint, x, y);
        break;

      default:
        break;
    }

    const points = [new Point()];

    this.props.relationship.path.forEach((path) => {
      points.push(new Point(path.x, path.y));
    });

    const updatedBounds = computeBoundingBox(points);
    updatedBounds.x = this.props.relationship.bounds.x;
    updatedBounds.y = this.props.relationship.bounds.y;
    updatedBounds.width = Math.ceil(updatedBounds.width / 20) * 20;
    updatedBounds.height = Math.ceil(updatedBounds.height / 20) * 20;

    this.setState({ path: this.props.relationship.path });
    this.props.startwaypointslayout(this.props.id, this.props.relationship.path, updatedBounds);
  };

  updateXCoordinate = (startPoint: number, endPoint: number, x: number, y: number) => {
    this.props.relationship.path[startPoint].x = x;
    this.props.relationship.path[endPoint].x = x;
  };

  updateYCoordinate = (startPoint: number, endPoint: number, x: number, y: number) => {
    this.props.relationship.path[startPoint].y = y;
    this.props.relationship.path[endPoint].y = y;
  };
}

export const CanvasRelationship = enhance(CanvasRelationshipComponent);
