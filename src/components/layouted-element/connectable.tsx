import React, { Component, ComponentClass, ComponentType } from 'react';
import { connect } from 'react-redux';
import { Direction } from '../../typings';
import { ModelState } from '../store/model-state';
import { styled } from '../theme/styles';
import { UMLElementComponentProps } from '../uml-element/uml-element-component';

type StateProps = {
  hovered: boolean;
  selected: boolean;
};

type DispatchProps = {};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(
  (state, props) => ({
    hovered: state.hovered[0] === props.id,
    selected: state.selected.includes(props.id),
  }),
  {},
);

const Handle = styled(props => (
  <svg {...props}>
    <path d="M -20 0 A 10 10 0 0 1 20 0" />
  </svg>
)).attrs<{ direction: Direction }>(props => {
  const options = {
    ...(props.direction === Direction.Left
      ? { x: 0, rotate: -90 }
      : props.direction === Direction.Right
      ? { x: 100, rotate: 90 }
      : { x: 50, rotate: 0 }),
    ...(props.direction === Direction.Up
      ? { y: 0, rotate: 0 }
      : props.direction === Direction.Down
      ? { y: 100, rotate: 180 }
      : { y: 50 }),
  };

  return {
    fill: '#0064ff',
    x: `${options.x}%`,
    y: `${options.y}%`,
    rotate: options.rotate,
  };
})<{ rotate: number }>`
  cursor: crosshair;
  pointer-events: all;

  path {
    transform: rotate(${props => props.rotate}deg);
  }
`;

export const connectable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ComponentClass<UMLElementComponentProps> => {
  class Connectable extends Component<Props> {
    render() {
      const { hovered, selected, ...props } = this.props;
      return (
        <WrappedComponent {...props}>
          {props.children}
          {(hovered || selected) && (
            <>
              <Handle direction={Direction.Up} onPointerDown={this.onPointerDown} />
              <Handle direction={Direction.Right} onPointerDown={this.onPointerDown} />
              <Handle direction={Direction.Down} onPointerDown={this.onPointerDown} />
              <Handle direction={Direction.Left} onPointerDown={this.onPointerDown} />
            </>
          )}
        </WrappedComponent>
      );
    }

    private onPointerDown = (event: React.PointerEvent) => {
      console.log('onPointerDown');
    };
  }

  return enhance(Connectable);
};

// export const connectable = (WrappedComponent: typeof ElementComponent): ComponentClass<OwnProps> => {
//   class Connectable extends Component<Props> {
//     render() {
//       return null;
//       // // const { element } = this.props;
//       // const ports: Port[] = [
//       //   {
//       //     element: this.props.id,
//       //     direction: Direction.Up,
//       //   },
//       //   {
//       //     element: this.props.id,
//       //     direction: Direction.Right,
//       //   },
//       //   {
//       //     element: this.props.id,
//       //     direction: Direction.Down,
//       //   },
//       //   {
//       //     element: this.props.id,
//       //     direction: Direction.Left,
//       //   },
//       // ];
//       // return (
//       //   <WrappedComponent {...this.props}>
//       //     {this.props.children}
//       //     <ConnectConsumer
//       //       children={context =>
//       //         context &&
//       //         ports.map(port => (
//       //           <Group
//       //             key={port.direction}
//       //             onPointerDown={this.onPointerDown(port, context)}
//       //             onPointerUp={this.onPointerUp(port, context)}
//       //             onPointerEnter={this.onPointerEnter}
//       //             onPointerLeave={this.onPointerLeave}
//       //             style={{
//       //               display: this.props.selected || context.isDragging ? 'block' : 'none',
//       //             }}
//       //           >
//       //             {context.isDragging && <path d={this.calculateInvisiblePath(port)} fill="none" />}
//       //             <Path d={this.calculateVisiblePath(port)} width={10} height={10} fill="#0064ff" fillOpacity="0.2" />
//       //           </Group>
//       //         ))
//       //       }
//       //     />
//       //   </WrappedComponent>
//       // );
//     }
//     private calculateInvisiblePath(port: Port): string {
//       // const { width, height } = this.props.element.bounds;
//       // const r = 20;
//       // const cirlce = `m ${-r}, 0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0 `;
//       // switch (port.direction) {
//       //   case Direction.Up:
//       //     return `M ${width / 2} 0 ${cirlce}`;
//       //   case Direction.Right:
//       //     return `M ${width} ${height / 2} ${cirlce}`;
//       //   case Direction.Down:
//       //     return `M ${width / 2} ${height} ${cirlce}`;
//       //   case Direction.Left:
//       //     return `M 0 ${height / 2} ${cirlce}`;
//       // }
//       return '';
//     }

//     // private onPointerEnter = (event: React.PointerEvent) => {
//     //   event.currentTarget.classList.add('hover');
//     // };

//     // private onPointerLeave = (event: React.PointerEvent) => {
//     //   event.currentTarget.classList.remove('hover');
//     // };

//     // private onPointerDown = (port: Port, context: ConnectContext) => async (event: React.PointerEvent) => {
//     //   try {
//     //     const endpoints = await context.onStartConnect(port)(event.nativeEvent);

//     //     const type: RelationshipType = DefaultRelationshipType[this.props.diagramType];
//     //     const RelationshipClazz = Relationships[type];
//     //     const relationship = new RelationshipClazz();
//     //     Object.assign(relationship, {
//     //       type,
//     //       source: { ...endpoints.source },
//     //       target: { ...endpoints.target },
//     //     });
//     //     this.props.create(relationship);
//     //   } catch (error) {}
//     // };

//     // private onPointerUp = (port: Port, context: ConnectContext) => async (event: React.PointerEvent) => {
//     //   this.onPointerLeave(event);
//     //   context.onEndConnect(port)(event.nativeEvent);
//     // };
//   }
// };
