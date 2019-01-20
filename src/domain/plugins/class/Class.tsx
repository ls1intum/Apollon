import React, { SFC } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../../../components/Store';
import Container from './../../Container';
import Method, { MethodComponent } from './Method';
import Attribute, { AttributeComponent } from './Attribute';
import Element, { ElementRepository } from '../../Element';
import Boundary from '../../geo/Boundary';

interface ChildPosition {
  id: string;
  kind: string;
  bounds: Boundary;
}

const HEADER_HEIGHT = 35;

class Class extends Container {
  isAbstract: boolean = false;
  childPosition: ChildPosition[] = [];

  constructor(public name: string = 'Class') {
    super(name);
    this.bounds = { ...this.bounds, height: HEADER_HEIGHT };
  }

  addAttribute(attribute: Attribute): Attribute {
    const index = this.childPosition.reduce<number>((prev, cur) => {
      if (cur.kind === 'Attribute') {
        return prev + 1;
      }
      return prev;
    }, 0);
    console.log(attribute, index)
    this.bounds.height += attribute.bounds.height;
    attribute.bounds.y = HEADER_HEIGHT + index * attribute.bounds.height;
    attribute.owner = this.id;
    this.ownedElements.splice(index, 0, attribute.id);
    this.childPosition.splice(index, 0, {
      id: attribute.id,
      kind: attribute.kind,
      bounds: attribute.bounds,
    });
    console.log(this.childPosition);
    return attribute;
  }

  addMethod(method: Method): Method {
    const index = this.childPosition.reduce<number>((prev, cur) => {
      if (cur.kind === 'Attribute' || cur.kind === 'Method') {
        return prev + 1;
      }
      return prev;
    }, 0);
    console.log(method, index)
    method.owner = this.id;
    this.bounds.height += method.bounds.height;
    method.bounds.y = HEADER_HEIGHT + index * method.bounds.height;
    this.ownedElements.splice(index, 0, method.id);
    this.childPosition.splice(index, 0, {
      id: method.id,
      kind: method.kind,
      bounds: method.bounds,
    });
    return method;
  }
}

const UnconnectedClassComponent: SFC<Props> = ({
  element,
  children,
  getById,
}) => {
  const ownedElements = React.Children.map(children, (c: any) =>
    getById(c.props.element)
  );
  let currentY = 35;
  return (
    <g>
      <rect width="100%" height="100%" stroke="black" fill="white" />
      <svg height={35}>
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontStyle={element.isAbstract ? 'italic' : 'normal'}
        >
          {element.name}
        </text>
        <g transform="translate(0, -1)">
          <rect x="0" y="100%" width="100%" height="1" fill="black" />
        </g>
      </svg>
      {children}
      {/* {ownedElements.filter(e => e instanceof Attribute).map(e => {
        currentY += e.bounds.height;
        return (
          <svg {...e.bounds} y={currentY - e.bounds.height} key={e.id}>
            <AttributeComponent element={e} />
          </svg>
        );
      })}
      <rect x="0" y={currentY} width="100%" height="1" fill="black" />
      {ownedElements.filter(e => e instanceof Method).map(e => {
        currentY += e.bounds.height;
        return (
          <svg {...e.bounds} y={currentY - e.bounds.height} key={e.id}>
            <MethodComponent element={e} />
          </svg>
        );
      })} */}
    </g>
  );
};

interface OwnProps {
  element: Class;
}

interface StateProps {
  getById: (id: string) => Element;
}

type Props = OwnProps & StateProps;

const mapStateToProps = (state: ReduxState): StateProps => ({
  getById: ElementRepository.getById(state),
});

export const ClassComponent = connect(mapStateToProps)(
  UnconnectedClassComponent
);

export default Class;
