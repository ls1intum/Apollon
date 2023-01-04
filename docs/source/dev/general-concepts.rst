#################
General Concepts
#################

The ApollonEditor is a UML modeling editor which can be used to visualize and
modify UML Diagrams. It can load and
save diagrams. A Diagram consists of Elements, Containers and Relationships.

.. figure:: model.png
   :alt: Model
   :align: center

   Apollon Data Model

The above diagram illustrates the Data Model of an Apollon.
It consists of three interfaces: *IUMLElement, IUMLRelationship, and IUMLContainer*.

*IUMLElement* is an interface with attributes of id, name, type owner, and highlight.
*IUMLRelationship* inherits *IUMLElement* and has additional attributes of a path, source, and target.
Similarly, *IUMLRelationship* also inherits *IUMLElement* and has the additional attribute of ownedElements and method reorderChildren.

*UMLElement* implements *IUMLElement* and has additional methods of *serialize, deserialize, ports and render*.
It can be either *UMLRelationship* or *UMLContainer*.
Additionally, *UMLRelationship* implements *IUMLRelationship*, and *UMLContainer* implements *IUMLContainer*.
Both of them have an additional method render that is responsible for rendering the elements to the canvas.
The render method of *UMLRelationship* takes *canvas, source, and target* as its parameter while the one of UMLContainer takes *canvas and children* as its parameter.

**UMLElement**: The Element is part of a UML diagram. It has a unique identifier,
name, position, size and color.

**UMLContainer**: The Container logically combines multiple Elements and other Containers
together to enable a hierarchical structure.

**UMLRelationship**: The Relationship connects two Elements. It has a unique
identifier, name and the connected elements as source and target attributes.

**********************
UML Element Structure
**********************

UML elements (whether UML-Element, UML-Container or UML-Relationship) consist of 3 parts:

#. the model which stores the properties of the element (a subclass of a UMLElement, UMLRelationship or a UMLContainer)
   and its visual representation

#. the components which implement the user interaction with the element

#. the service which defines what is happening when a user interacts with a component

Functionality is split as follows:

* `src/main/components/uml-element` contains higher order components (`HOCs <https://reactjs.org/docs/higher-order-components.html>`_), which implement the user-interaction which will trigger a state update (redux action)

* `src/main/services` implements services which perform the actual state update e.g. hover -> element.id is inserted in modelstate.hovered (and thereby marked as hovered)

* `src/main/components/uml-element/canvas-element` describes the representation of uml-element states e.g. if an element is hovered it is highlighted

The Model and Visual Representation of an Element
=================================================

The properties of an element are described together with it's representation in the `src/main/packages` folder.
Every UMLElement extends the `IUMLElement` and `ILayoutable` interface.

The IUMLElement interface defines the properties which every UMLElement should have:

.. code-block:: typescript

    /** Interface of a `UMLElement` defining the properties persisted in the internal storage */
    export interface IUMLElement {
      /** Unique Identifier of the `UMLElement` */
      id: string;
      /** Visual name of the `UMLElement` */
      name: string;
      /** Distinct type to recreate the `UMLElement` */
      type: UMLElementType | UMLRelationshipType | UMLDiagramType;
      /** Optional owner of the `UMLElement` */
      owner: string | null;
      /** Position and sizing of the `UMLElement` */
      bounds: IBoundary;
      /** Highlight the element with a specified color */
      highlight?: string;
    }

The ILayoutable interface defines properties which are necessary to layout and element:

.. code-block::

    export interface ILayoutable {
      /** Position and sizing of the `UMLElement` */
      bounds: { x: number; y: number; width: number; height: number };

      render(layer: ILayer): ILayoutable[];
    }


Besides its properties for visual representation the model also describes the functionality which should be available to the user when interacting with the element.
Different element types (UML-Element or UML-Relationship) provide different functionality. The available functionality for UML-Elements and UML-Relationships is listed here:

**UML-Element features**:

* **hoverable** determines whether the element is hoverable or not

* **selectable** determines whether the element is selectable or not

* **movable** determines whether the element is movable or not

* **resizable** determines whether the element is resizable or not

* **connectable** determines whether the a relationship can be drawn from or to this element

* **updatable** determines whether the element is updatable or not (if a popup is opened on double click on element)

* **droppable** determines whether elements can be dropped into this element (for uml-containers)

* **alternativePortVisualization** determines if an alternative representation should be used for the places uml-elements can be connected to

**UML-Relationship features**:

in **addition** to the UML-Element features, the UML-Relationships have these other features:

* **reconnectable**: determines whether a relationship can be reconnected to a new connection point

* **straight**: determines whether a relationship is drawn as straight (higher priority than variable)

* **variable**: determines whether a relationship is drawn with corners

The current state of each element is stored in the global application state.

.. _user-interaction-with-elements:

User Interaction with Elements
================================

A component is assembled together with the classes which implement the user interaction,
based on the in the model class determined functionality. The implementation follows the decorator pattern:

.. image:: decorator_pattern.svg
   :target: dev/decorator_pattern.svg

Based on the functionality a React component with different higher order components (`HOC <https://reactjs.org/docs/higher-order-components.html>`_) is composed. The
HOCs are the `Decorators`, see :ref:`user-interaction-hoc-decorator`. The following code snippet shows the composition of a element with its decorators (can be found in `src/main/components/uml-element/uml-element-component.tsx`).

.. code-block:: typescript

    const features = { ...UMLElements, ...UMLRelationships }[props.type].features as UMLElementFeatures &
    UMLRelationshipFeatures;
    const component = props.type in UMLRelationshipType ? CanvasRelationship : CanvasElement;
    const decorators = [];

    if (props.mode === ApollonMode.Assessment) {
        decorators.push(assessable, updatable, selectable, hoverable);
    } else if (props.readonly) {
        decorators.push(selectable, hoverable);
    } else if (props.view === ApollonView.Exporting || props.view === ApollonView.Highlight) {
        decorators.push(interactable, hoverable);
    } else if (props.view === ApollonView.Modelling) {
        if (props.features.hoverable && features.hoverable) {
            decorators.push(hoverable);
        }
        if (features.reconnectable) {
            decorators.push(reconnectable);
        }
        if (props.features.selectable && features.selectable) {
            decorators.push(selectable);
        }
        if (props.features.movable && features.movable) {
            decorators.push(movable);
        }
        if (props.features.resizable && features.resizable) {
            const options = {
                preventY: features.resizable === 'WIDTH',
                preventX: features.resizable === 'HEIGHT',
            };
            decorators.push(resizable(options));
        }
        if (props.features.connectable && features.connectable) {
            decorators.push(connectable);
        }
        if (props.features.updatable && features.updatable) {
            decorators.push(updatable);
        }
        if (props.features.droppable && features.droppable) {
            decorators.push(droppable);
        }
    }

    type Compose = ConnectedComponent<
        ComponentType<
            UMLElementComponentProps & {
                child: React.ComponentClass<any>;
            }
        >,
        any
    >;

    // reverse, because compose creates one function by composing the given functions from right to left
    return {
        component: compose<Compose>(...decorators.reverse())(component),
    };

The resulting component has all the user interaction functionality of the applied decorators.

Service Structure
------------------

Service perform the state update which must be done to implement a user interaction, e.g. if a user hovers over a component, it must be marked as hovered
so that the user can the effect, i.e. highlighting of the component. A typical service contains:

* a repository, which defines methods to create actions which will trigger a global state update

* a reducer, which receives the action and returns a new state for the action

* service type definitions, which define the types of the actions, their payload and how the state which is managed by the reducer is defined

Side Effects of Actions
------------------------

In Apollon exist two libraries to manage side effects of actions. `Redux thunk <https://github.com/reduxjs/redux-thunk>`_ and `Redux-Saga <https://github.com/redux-saga/redux-saga>` are middlewares for Redux.
which is mostly used to execute asynchronous logic in actions.

*******************************
Managing the Application State
*******************************
Redux is used for managing global application state. Redux provides a `Store` which represents the global application state,
`Actions` which can be dispatched to manipulate the application state and `Reducers` which are called in the event of an `Action` (they manipulate the global application state), for more information read up in the
`Redux Documentation <https://redux.js.org/introduction>`_.

The global application state definition can be found in `src/main/components/store/model-state.ts`. It looks like this:

.. code-block:: typescript

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



Design Decisions
================

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

Connecting Global Application State to Components
=================================================

To make the global application state accessible in the components, `React-Redux <https://react-redux.js.org/introduction/quick-start>`_ is used. It provides functionality to 'connect' components to the global application state
and thereby making global application state properties available in the component props. It will also make sure that
components receive the state updates from the global application state just like normal react props. For more information see :ref:`react-redux-connecting-component-to-global-state`



