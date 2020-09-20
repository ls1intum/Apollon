#################
General Concepts
#################

.. figure:: model.png
   :alt: Model
   :align: center

   Apollon Data Model

**Diagram**:  The Diagram represents a UML diagram which is visualized and
modified using the ApollonEditor. The ApollonEditor can load and
save diagrams. A Diagram consists of Elements, Containers and Relationships.
Each diagram type consists of individual subclasses of UMLContainer, UMLElement
and UMLRelationship.

**UMLElement**: The Element is part of a UML diagram. It has a unique identifier,
name, position, size and color.

**UMLContainer**: The Container logically combines multiple Elements and other Containers
together to enable a hierarchical structure.

**UMLRelationship**: The Relationship connects two Elements. It has a unique
identifier, name and the connected elements as source and target attributes.

**********************
UML Element Structure
**********************

UML elements consist of 3 parts:

#. the model which stores the properties of the element (a subclass of a UMLElement, UMLRelationship or a UMLContainer)
   and its visual representation

#. the interaction of the user with the element

#. the service which defines what is happening when a user interacts with a component

Functionality is split as follows:

* `src/main/components/uml-element` contains higher order components (HOCs), which describe the user-interaction which will trigger a state update (redux action)

* `src/main/services` implements services which perform the actual state update e.g. hover -> element.id is inserted in modelstate.hovered (and thereby marked as hovered)

* `src/main/components/uml-element/canvas-element` describes the representation of uml-element states e.g. if an element is hovered it is highlighted

The Model and Representation of an Element
___________________________________________

The properties of an element are described together with it's representation in the src/main/packages folder.
The model itself defines the functionality which should be available to the user. Different element types provide different functionality.

**UML-Element**:

* **hoverable** determines whether the element is hoverable or not

* **selectable** determines whether the element is selectable or not

* **movable** determines whether the element is movable or not

* **resizable** determines whether the element is resizable or not

* **connectable** determines whether the a relationship can be drawn from or to this element

* **updatable** determines whether the element is updatable or not (if a popup is opened on double click on element)

* **droppable** determines whether elements can be dropped into this element (for uml-containers)

* **alternativePortVisualization** determines if an alternative representation should be used for the places uml-elements can be connected to

**UML-Relationship**:

* additional features:

    * **reconnectable**: determines whether a relationship can be reconnected to a new connection point

    * **straight**: determines whether a relationship is drawn as straight (higher priority than variable)

    * **variable**: determines whether a relationship is drawn with corners

For example the abstract UMLClassifier class
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

We can see, that some of the available features of UMLElements are disabled, such as droppable, and resizable is limited to width only.
That means that the user will not be able to interact with the components in that way. For more information on how the code which defines
what happens on user interaction is added to the element, read the next paragraph.
The representation is the defined in the corresponding component class, in our example `UMLClassifierComponent`.

.. code-block:: typescript

   export const UMLClassifierComponent: SFC<Props> = ({ element, children }) => (
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

User Interaction with Elements
_______________________________

The user interaction is assembled based on the in the model class determined functionality.
Based on the functionality a React component with different higher order components (`HOC <https://reactjs.org/docs/higher-order-components.html>`_) is assembled.
The implementation of the HOCs for user interaction can be found in `src/main/components/uml-element`.
A HOC in this directory always describes how user interaction is mapped to a service, i.e. which then executes the state update.
Therefore the HOCs always add event listeners (e.g. MouseEventListeners) in the `componentDidMount`
and remove them in `componentDidUnmount` React lifecycle methods.

Service Structure
__________________
Service always perform the state update which must be done as a result of the user interaction. A typical service contains:

* a reducer

* a repository

* service type definitions

* (optional) additional classes for abstract concept of service

*******************************
Managing the Application State
*******************************
Redux is used for managing global application state. Redux provides a `Store` which represents the global application state,
`Actions` which can be dispatched to manipulate the application state and `Reducers` which are called in the event of an `Action` (they manipulate the global application state), for more information read up in the
`Redux Documentation <https://redux.js.org/introduction>`_.
Understanding the redux design guidelines is important to understand some design decisions of the application state in this application.
Here are some of the implications of sticking to these guidelines listed:

* normalized state, see `Normalizing State Shape <https://redux.js.org/recipes/structuring-reducers/normalizing-state-shape>`_ -> containers reference their children only by their id and do not have a reference to the full element, which can be cumbersome to cope with in some situations.

* the state is immutable, see `Immutable Data <https://redux.js.org/faq/immutable-data>`_ -> we always have to return the full state that a reducer manages. And even data which is not manipulated, should be copied.

* | for performance reasons, we only do shallow copies of the data, see `Performance <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-2.html#generic-spread-expressions-in-object-literals>`_ ->
  | in Apollon shallow copies are often created, using the `typescript spread expression <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-2.html#generic-spread-expressions-in-object-literals>`_.
  | Thereby we are loosing the prototype of the object itself. That means, that functions of this object will no longer be available and cannot be called anymore.
  | To deal with that there exists a map/dictionary which maps the uml-element types to their corresponding class. With that we can easily recreate a full object of the element in which the methods of the class will be available again.
  | For example:

    .. code-block:: typescript

        if (UMLElement.isUMLElement(element)) {
            const Classifier = UMLElements[element.type];

            return new Classifier(element);
        }

  | This snippet comes used from the `UMLElementCommonRepository` which already implements a method to return a UMLElement for exactly this use case.

The global application state definition can be found in `src/main/components/store/model-state.ts`. It looks like this:

.. code-block::

    export interface ModelState {
        editor: EditorState;
        diagram: UMLDiagramState;
        hovered: HoverableState;
        selected: SelectableState;
        moving: MovableState;
        resizing: ResizableState;
        connecting: ConnectableState;
        reconnecting: ReconnectableState;
        interactive: InteractableState;
        updating: UpdatableState;
        elements: UMLElementState;
        assessments: AssessmentState;
        copy: CopyState;
    }



To make the global application state accessible in the components, `React-Redux` is used. It provides functionality to 'connect' components to the global application state
and thereby making global application state properties available in the component props. It will also make sure that
components receive the state updates from the global application state just like normal react props. For example the `src/main/components/uml-element/uml-element-component.tsx`:

.. code-block:: typescript

    const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>((state, props) => ({
        features: state.editor.features,
        type: state.elements[props.id].type as UMLElementType | UMLRelationshipType,
        readonly: state.editor.readonly,
        view: state.editor.view,
        mode: state.editor.mode,
    }));

### redux-saga
Redux saga is a middleware, which is mostly used to execute asynchronous logic in actions.


## Abstractions
#### UMLDiagram
A UMLDiagram is a set of UMLElements

#### UMLElement
A UMLElement is a generic element type which can either be a concrete UMLElement, a UMLContainer or a UMLRelationship

#### UMLContainer
A UMLElement which can contain other UMLElements

#### UMLRelationship
A connection between two UMLElements

#### Idea behind the Architecture
Every diagram consists of a set of UMLElements. The application state manages these elements (Elementstate). The elements are
of a certain type e.g. a class of a UML class diagram. The types are defined in the packages structure. 
A type defines how the element looks like (mapping from type to component) and which features are available for the user when 
interacting with an component of this type. The elements are counterintuitively organized in a flat Map instead of a tree.
I could not find out why that is the case, the only thing I could think of was performance -> faster to access element by id
then finding an element inside a tree

Interaction of user with elements is separated from the datamodel -> selection of component is managed as an array
in the model state instead of the datamodel having a property isSelected: boolean. Maybe it would make sense to merge
that back together and in case of serialization only serialize necessary properties
