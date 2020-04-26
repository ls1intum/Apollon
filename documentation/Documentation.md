# 
```
.
|-- public                                          # apollon standalone
|-- src                                             # src of the apollon library
|   |-- components                                  # react components, include generic concepts of elements on canvas like connectable, draggable
|   |   |-- assessment                              # assesment-component (content of assesment popup)
|   |   |-- canvas                                  # canvas and functionality on canvas, like key-event listener
|   |   |-- connectable
|   |   |   |-- connection-preview                  # generic concept of connection-preview, handles mouse events
|   |   |   |-- uml-relationship-preview            # design of connection preview
|   |   |-- controls                                # generic controls components whch are used throughout the application
|   |   |-- create-pane                             # create-pane on the side bar with which UML-Elements can be created by drag and drop
|   |   |-- draggable                               # TODO
|   |   |-- i18n                                    # takes care that components are localized
|   |   |-- sidebar                                 # sidebar, containing create-pane and modeling/interactive tab
|   |   |-- store                                   # manages application state
|   |   |-- theme                                   # provides theme
|   |   |-- uml-element                             # TODO HOCs which describe user interaction to service mapping
|   |   |   |-- assessable                          # HOC for styling components with assessments depending on their score
|   |   |   |-- connectable                         # HOC for connecting and reconnecting components, also adds the ports to a component which can be used as connection source and target
|   |   |   |-- droppable                           # TODO
|   |   |   |-- hoverable                           # HOC for hovering components 
|   |   |   |-- interactable                        # HOC for marking components as interactable
|   |   |   |-- movable                             # HOC for making components movable
|   |   |   |-- reconnectable                       # HOC for making components reconnectable
|   |   |   |-- resizable                           # HOC for making components resizable
|   |   |   |-- selectable                          # HOC for making components selectable
|   |   |   |-- updatable                           # HOC for making components updatable, that means they can open a popup, which displays mode specific content
|   |   |   |-- canvas-element.tsx                  # generic canvas element which describes buildup of canvas element and also implements some behavior
|   |   |   |-- canvas-relationship.tsx             # generic canvas relationship which describes buildup of canvas relationship and also implements some behavior
|   |   |   |-- uml-element-component.tsx           # maps decides which features are available depending on Apollon-Mode and element functionality, wrapper of every UML-Element
|   |   |   |-- uml-element-component-props.tsx     # UML-Element specific props (currently only id)
|   |   |--update-pane                              # pane which describes what happens when a component is marked as updatable
|   |-- i18n                                        # translations
|   |-- packages                                    # describes appearance of available uml-diagram-type specific elements and which diagram types are available
|   |   |--common                                   # common
|   |   |--uml-activity-diagram                     # activity diagram elements
|   |   |--uml-class-diagram                        # class diagram elements
|   |   |--uml-communication-diagram                # communication diagram elements
|   |   |--uml-component-diagram                    # component diagram elements
|   |   |--uml-deployment-diagram                   # deployment diagram elements
|   |   |--uml-object-diagram                       # object diagram elements
|   |   |--uml-use-case-diagram                     # use-case diagram elements
|   |   |--component.ts                             # mapping of UML element/relationship type to UML element component
|   |   |--compose-preview.ts                       # type of preview compose-functions
|   |   |--diagram-type.ts                          # exports enum of all availabel diagram types
|   |   |--popups.ts                                # mapping of uml element types to popup content
|   |   |--uml-element-type.ts                      # collection of all supported UML element types
|   |   |--uml-elements.ts                          # collection of all supported UML elements  - TODO why mapping of types to elements and how is a element drawn, whats the connection of element to element-component
|   |   |--uml-relationship-type.ts                 # collection of all supporte UML relationship types
|   |   |--uml-relationships.ts                     # collection of all supported UML relationships - TODO
|   |-- scenes
|   |   |-- application.tsx                         # provides application wide providers and apollon-editor component tree
|   |   |-- application-styles.tsx                  # styles of the apollon editor layout
|   |   |-- svg.tsx                                 # builds the svg, which can be exported
|   |   |-- svg-styles.tsx                          # styles of the svg
|   |-- services                                    # provides services which interact with global application state, which is managed by redux
|   |   |-- assessment                              # functionality: adds/overwrites assessment + get assessment by id
|   |   |-- copypaste                               # functionality: copy and paste uml element
|   |   |-- editor                                  # functionality: change view, TODO: whats the difference between view and mode
|   |   |-- layouter                                # functionality: layouts elements, TODO: more specific, how is this done
|   |   |-- uml-container                           # functionality: get container, append element to container, remove element from container
|   |   |-- uml-diagram                             # functionality: get uml diagram, append element to uml diagram
|   |   |-- uml-element                             # functionality: see subfolders
|   |   |   |-- connectable                         # functionality: start, end + delete connection
|   |   |   |-- hoverable                           # functionality: adds / removes elements from global hovered elements
|   |   |   |-- interactable                        # functionality: adds / removes elements from global interaction elements
|   |   |   |-- movable                             # functionality: updates UML element position
|   |   |   |-- resizable                           # functionality: updates UML element bounds
|   |   |   |-- selectable                          # functionality: adds / removes elements from global selected elements
|   |   |   |-- updatable                           # functionality: adds / removes elements from global updating elements
|   |   |   |-- uml-element.ts                      # see documentation in class
|   |   |   |-- uml-element-common-repository.ts    # see documentation in class
|   |   |   |-- uml-element-features.ts             # provides type for UMLElementFeatures
|   |   |   |-- uml-element-ports.ts                # provides IUMLElementPort, which is used as connection src and target
|   |   |   |-- uml-element-reducer.ts              # functionality: create, update, remove elements from global state
|   |   |   |-- uml-element-repository.ts           # unifies repositories of uml elements
|   |   |   |-- uml-element-saga.ts                 # TODO
|   |   |   |-- uml-element-types.ts                # types definition of uml-element-common functionality
|   |   |-- uml-relationship
|   |   |   |-- reconnectable                       # TODO
|   |   |   |-- connections.ts                      # TODO
|   |   |   |-- uml-relationship.ts                 # TODO
|   |   |   |-- uml-relationship-feature.ts         # TODO
|   |   |   |-- uml-relationship-reducer.ts         # TODO
|   |   |   |-- uml-relationship-repository.ts      # TODO
|   |   |   |-- uml-relationship-saga.ts            # TODO
|   |   |   |-- uml-relationship-types.ts           # TODO                      
|   |   |-- undo                                    # functionality: undo / redo action
|   |   |-- actions.ts                              # export type for all actions
|   |   |-- reducer.ts                              # maps global state to reducers
|   |   |-- saga.ts                                 # TODO
|   |-- utils                                       # provides utility code
|   |-- apollon-editor.ts                           # exports apollon-editor functionality to library using application
|   |-- index.ts                                    # js module export 
|   |-- typings.ts                                  # exports typings to library using application
|-- webpack                                         # packaging config for apollon standalone
```

#General concepts

## components/uml-element
HOC always describe the user interaction to service mapping, therefore always add interaction listener in componentdidmount and removing them in unmount
Functionality is split as follows:
- components/uml-element HOC, describes user-interaction which will trigger a certain action
- services/uml-element mark the elements as outcome of the action e.g. hover -> element.id is inserted in modelstate.hovered
- components/uml-element canvas-element describes the actual functionality if e.g. an element is hovered

## package structure
a package describes one UML diagram type (location: src/packages/) and has:
- a component for each UML element type available in the  UML diagram, which describes the appearance of the elements
- a xxx-preview.ts class which creates a preview of all available UML elements of the UML diagram
- a index.ts file which defines a enum for all diagram element and diagram relationship types

## service structure
services always interact with the global application state, except for the layouter service. A typical service contains:
- a reducer
- a repository
- types definition
- (optional) additional classes for abstract concept of service

## managing application state
Redux is used for managing global application state. Redux provides a Store which represents the global application state,
Actions which can be dispatched to manipulate the application state and Reducers which are called in the event of an Action (they manipulate the global application state).
React-Redux provides functionality to map properties of the global application state and additional functions into the properties object of an React component. With that,
you can make components dependent on the global application state and React will rerender them when the state changes.

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
