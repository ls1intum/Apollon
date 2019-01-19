import React, { SFC } from 'react';
import { connect } from 'react-redux';
import { State as ReduxState } from './../../../components/Store';
import Container from './../../Container';
import Method, { MethodComponent } from './Method';
import Attribute, { AttributeComponent } from './Attribute';
import Element, { ElementRepository } from '../../Element';

class Class extends Container {
  isAbstract: boolean = false;

  constructor(public name: string = 'Class') {
    super(name);
    this.bounds = { ...this.bounds, height: 36 };
  }

  addAttribute(name?: string): Attribute {
    const attribute = new Attribute(name);
    attribute.owner = this.id;
    this.ownedElements.push(attribute.id);
    this.bounds.height += attribute.bounds.height;
    attribute.bounds.y =
      (this.ownedElements.length - 1) * attribute.bounds.height + 35;
    return attribute;
  }

  addMethod(name?: string): Method {
    const method = new Method(name);
    method.owner = this.id;
    this.ownedElements.push(method.id);
    this.bounds.height += method.bounds.height;
    method.bounds.y =
      (this.ownedElements.length - 1) * method.bounds.height + 36;
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
      {ownedElements.filter(e => e instanceof Attribute).map(e => {
        currentY += e.bounds.height;
        return (
          <svg {...e.bounds} key={e.id}>
            <AttributeComponent element={e} />
          </svg>
        );
      })}
      <rect x="0" y={currentY} width="100%" height="1" fill="black" />
      {ownedElements.filter(e => e instanceof Method).map(e => {
        currentY += e.bounds.height;
        return (
          <svg {...e.bounds} key={e.id}>
            <MethodComponent element={e} />
          </svg>
        );
      })}
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
