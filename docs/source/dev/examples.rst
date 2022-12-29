##########
Examples
##########


Example of Feature Definition of Element
-------------------------------------------

The available functionality of the abstract UMLClassifier class
which is the super method of all class like elements:

.. code-block:: typescript

    export abstract class UMLClassifier extends UMLContainer implements IUMLClassifier {
      static features: UMLElementFeatures = {
        ...UMLContainer.features,
        droppable: false,
        resizable: 'WIDTH',
      };

    ...

    }

We can see, that all UMLElementFeatures are copied to the features of UMLClassifier using the spread operator.
In addition to that some of the available features of UMLElements are overridden, such as droppable, and resizable.
Droppable is disabled and resizable is limited to width only. That means that the user cannot drop other elements into this element
and resizing can only be done in regard to the components width. For more information on how the code which defines
what happens on user interaction is added to the element, see :ref:`user-interaction-with-elements`.


.. _visual-representation-implementation-of-element:

Example of Visual Representation Implementation of Element
-------------------------------------------------------------

The representation is the defined in the corresponding component class, in our example `UMLClassifierComponent`.

.. code-block:: typescript

   export const UMLClassifierComponent: FunctionComponent<Props> = ({ element, children }) => (
      <g>
        <rect width="100%" height={element.stereotype ? 50 : 40} />
        <rect
          y={element.stereotype ? 50 : 40}
          width="100%"
          height={element.bounds.height - (element.stereotype ? 50 : 40)}
          fill="white"
        />
        {element.stereotype ? (
          <svg height={50}>
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontWeight="bold" pointerEvents="none">
              <tspan x="50%" dy={-8} textAnchor="middle" fontSize="85%">
                {`«${element.stereotype}»`}
              </tspan>
              <tspan
                x="50%"
                dy={18}
                textAnchor="middle"
                fontStyle={element.italic ? 'italic' : undefined}
                textDecoration={element.underline ? 'underline' : undefined}
              >
                {element.name}
              </tspan>
            </text>
          </svg>
        ) : (
          <svg height={40}>
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fontWeight="bold"
              fontStyle={element.italic ? 'italic' : undefined}
              textDecoration={element.underline ? 'underline' : undefined}
              pointerEvents="none"
            >
              {element.name}
            </text>
          </svg>
        )}
        {children}
        <rect width="100%" height="100%" stroke="black" fill="none" pointerEvents="none" />
        <path d={`M 0 ${element.headerHeight} H ${element.bounds.width}`} stroke="black" />
        <path d={`M 0 ${element.deviderPosition} H ${element.bounds.width}`} stroke="black" />
      </g>
   );

It implements the visual representation, which always made up of svg elements.

.. _user-interaction-hoc-decorator:

Example of a Higher Order Component Decorator
----------------------------------------------

The ability for a user to interact with components is implemented as HOCs in Apollon.
A HOC wraps a react component and adds extra functionality to the component. For example
the hoverable HOC (`src/main/components/uml-element/hoverable/hoverable.tsx`) which implement
MouseEventListeners to enable hovering when a user is actually hovering over an element with his mouse.

.. code-block:: typescript

    export const hoverable = (
      WrappedComponent: ComponentType<UMLElementComponentProps>,
    ): ConnectedComponent<ComponentType<Props>, OwnProps> => {
      class Hoverable extends Component<Props> {
        componentDidMount() {
          const node = findDOMNode(this) as HTMLElement;
          node.addEventListener('pointerenter', this.enter);
          node.addEventListener('pointerleave', this.leave);
        }

        componentWillUnmount() {
          const node = findDOMNode(this) as HTMLElement;
          node.removeEventListener('pointerenter', this.enter);
          node.removeEventListener('pointerleave', this.leave);
        }

        render() {
          const { hover, leave, moving, ...props } = this.props;
          return <WrappedComponent {...props} />;
        }

        private enter = () => {
          if (!this.props.moving) this.props.hover(this.props.id);
        };

        private leave = () => {
          if (!this.props.moving) this.props.leave(this.props.id);
        };
      }

      return enhance(Hoverable);
    };

You can see, that in the `componentDidMount` and `componentWillUnmount` the
MouseEventListeners are added/removed. The functionality of marking an element
as hovered (state update) is implemented in a service. The service is called in the enter()
and leave() method.

.. _react-redux-connecting-component-to-global-state:

Connecting a Component to the Global Application State
------------------------------------------------------

.. code-block:: typescript

    const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
      (state, props) => {
        const parents = getAllParents(props.id, state.elements);
        return {
          moving:
            Object.keys(state.moving).includes(props.id) ||
            Object.keys(state.moving).some((elementId) => parents.includes(elementId)),
        };
      },
      {
        hover: UMLElementRepository.hover,
        leave: UMLElementRepository.leave,
      },
    );

    export const hoverable = (
      WrappedComponent: ComponentType<UMLElementComponentProps>,
    ): ConnectedComponent<ComponentType<Props>, OwnProps> => {
      class Hoverable extends Component<Props> {
        componentDidMount() {
          const node = findDOMNode(this) as HTMLElement;
          node.addEventListener('pointerenter', this.enter);
          node.addEventListener('pointerleave', this.leave);
        }

        componentWillUnmount() {
          const node = findDOMNode(this) as HTMLElement;
          node.removeEventListener('pointerenter', this.enter);
          node.removeEventListener('pointerleave', this.leave);
        }

        render() {
          const { hover, leave, moving, ...props } = this.props;
          return <WrappedComponent {...props} />;
        }

        private enter = () => {
          if (!this.props.moving) this.props.hover(this.props.id);
        };

        private leave = () => {
          if (!this.props.moving) this.props.leave(this.props.id);
        };
      }

      return enhance(Hoverable);
    };

See `here <https://react-redux.js.org/api/connect>`_ for the React-Redux documentation on connect function.

In the example we can see in the enhance function, how the global applicatio state and extra functionality is merged into the component.
The parameter of the connect function, takes the global application state and the actual component properties that the component would receive.
It adds an additional property, in this case `moving` which determines if the component is moving or not.

The second parameter of the connect function makes service functionality available to the component. In this example add the hoverable-repository functions
for hovering and leaving to the component. When invoked, the by these functions create Redux Actions, are automatically dispatched on the Redux store
and thereby the reducers are invoked which then perform the state update.
