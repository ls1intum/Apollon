import React, { Component, ComponentClass, SVGProps } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Components } from '../../packages/components';
import { UMLRelationshipType } from '../../packages/uml-relationship-type';
import { ApollonMode, ApollonView } from '../../services/editor/editor-types';
import { IUMLRelationship } from '../../services/uml-relationship/uml-relationship';
import { UMLRelationshipRepository } from '../../services/uml-relationship/uml-relationship-repository';
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

export class CanvasRelationshipComponent extends Component<Props> {
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
                this.onPointerDown(e, index);
              }}
              fill={'red'}
            />
          );
        })}
      </svg>
    );
  }

  onPointerDown = (event: React.PointerEvent<SVGElement>, handlerIndex: number) => {
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    element.addEventListener('pointermove', this.onPointerMove);
    event.currentTarget.setAttribute('handlerIndex', String(handlerIndex));
    element.addEventListener('pointerup', this.onPointerUp, { once: true });
  };

  onPointerMove = (event: any) => {
    console.log('onPointerMove');
    const handlerIndex = event.currentTarget.getAttribute('handlerIndex');
    const waypointDirection = (handlerIndex % 2) ? 'horizontal' : 'vertical';

    // Update relationship points here
    this.updateRelationshipPoints(waypointDirection, handlerIndex);
  };

  onPointerUp = (event: any) => {
    console.log('onPointerUp');
    const element = event.currentTarget;
    element.removeEventListener('pointermove', this.onPointerMove);
  };

  updateRelationshipPoints = (waypointDirection: string, handlerIndex: string) => {
    console.log(this.props.relationship.path);

    const startPoint = Number(handlerIndex) + 1;
    const endPoint = Number(startPoint) + 1;

    if(waypointDirection === 'vertical') {
      this.props.relationship.path[startPoint].x = this.props.relationship.path[startPoint].x + 5;
      this.props.relationship.path[endPoint].x = this.props.relationship.path[endPoint].x + 5;
    }

    // this.setState({path: this.props.relationship.path});

    // console.log(this.props.relationship.path);


    


  };
}

export const CanvasRelationship = enhance(CanvasRelationshipComponent);
