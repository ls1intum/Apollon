####################
Repository Overview
####################

********************************
High Level Source Code Structure
********************************

The source code is separated in a `main` and a `tests` folder. `main` contains the actual source code and `tests` contains
only source code which is used to test the application.

src/main
=========

On the top level we have the separation between `components`, `i18n`, `packages`, `scenes`, `services` and `utils`.

#. `components` contains all non diagram type specific react components. It contains all the components the user uses to interact with.

#. `i18n` contains the json files with the translations of string keys in different languages

#. `packages` contains the code which is specific to UML diagram types. A package describes one UML diagram type (location: src/main/packages/) and has:

    * a component for each UML element type available in the specific UML diagram type, which describes the appearance of the elements. (Reference example)
For example in `src/main/packages/uml-object-diagram` exists

        * uml-object-attribute

        * uml-object-link

        * uml-object-method

        * uml-object-name

    * a xxx-preview.ts class which creates a preview of all available UML elements of the UML diagram. This preview is used in the side-panel, which the user can use to drag new elements onto the canvas.

    * a index.ts file which defines a enum for all diagram element and diagram relationship types

#. `scenes` contains classes which describe the application is build up and a svg class which is used for exporting the diagram as a svg

#. `services` contains the code which is responsible for the application state update

#. `utils` contains utility code

src/tests
=========

Right now the `tests` folder mirrors the main folder as of now only
unit tests exist. This can be changed in the future if a new kind of test gets added it might makes sense to separate them accordingly to the different kind of tests.

*****************************
Detailed Repository Structure
*****************************

This is an overview of the files and folders in the repository together with a short description to indicate what the file/folder is used for.

.. code-block:: shell

    |-- .github                                                     # github templates and workflows for github actions
    |-- docs                                                        # ReadTheDoc files to build the documentation
    |-- public                                                      # test application code
    |-- src                                                         # src of the apollon library
    |   |-- components                                              # all react components, also contains all components for interaction with the user
    |   |   |-- assessment                                          # assesment-component (content of assesment popup)
    |   |   |-- canvas                                              # canvas and functionality on canvas, e.g. key-event listener
    |   |   |-- connectable
    |   |   |   |-- connection-preview                              # generic connection-preview, handles user interaction with connection-preview elements
    |   |   |   |-- uml-relationship-preview                        # look of connection preview
    |   |   |-- controls                                            # generic controls components which are used throughout the application
    |   |   |-- create-pane                                         # create-pane on the side bar which can be used to create UML elements per drag and drop
    |   |   |-- draggable                                           # contains code for generic drag and drop concept + draggable layer, which is used to create
    |   |   |   |-- draggable                                       # defines user interaction with draggable components (only adds interaction listeners to component)
    |   |   |   |-- draggable-context                               # defines how the react context for drag and drop elements look like
    |   |   |   |-- draggable-layer                                 # defines conceptually a layer on which elements are dragged and then dropped. Updates the position of the ghost and creates the drop event
    |   |   |   |-- drop-event                                      # defines how the drop event looks like
    |   |   |   |-- droppable                                       # defines user interaction with droppable components (only adds interaction listeners to component)
    |   |   |   |-- ghost                                           # container which contains the dragged HTML-Element
    |   |   |   |-- with-draggable                                  # gives access to draggable-context properties
    |   |   |-- i18n                                                # takes care that components are localized
    |   |   |-- sidebar                                             # sidebar, containing create-pane and modeling/interactive tab
    |   |   |-- store                                               # manages application state
    |   |   |-- style-pane                                          # contains color selector implementation 
    |   |   |-- theme                                               # provides theme
    |   |   |-- uml-element                                         # HOCs which implement user interaction which then results in a service call to implement the effect
    |   |   |   |-- assessable                                      # HOC for styling components with assessments depending on their score
    |   |   |   |-- connectable                                     # HOC for connecting and reconnecting components, also adds the ports to a component which can be used as connection source and target
    |   |   |   |-- droppable                                       # HOC for making a component a drop container
    |   |   |   |-- hoverable                                       # HOC for making a component hoverable
    |   |   |   |-- interactable                                    # HOC for making a component interactable
    |   |   |   |-- movable                                         # HOC for making a component movable
    |   |   |   |-- reconnectable                                   # HOC for making a component reconnectable
    |   |   |   |-- resizable                                       # HOC for making a component resizable
    |   |   |   |-- selectable                                      # HOC for making a component selectable
    |   |   |   |-- updatable                                       # HOC for making a component updatable, that means they can open a popup, which displays mode specific content
    |   |   |   |-- canvas-element.tsx                              # generic canvas element (also implements the looks of hovering/select effect of elements)
    |   |   |   |-- canvas-relationship.tsx                         # generic canvas relationship (also implements the looks of hovering/select effect of relationships)
    |   |   |   |-- uml-element-component.tsx                       # decorates elements with features (implemented in HOC) depending on Apollon-Mode and element functionality, wrapper of every UML-Element
    |   |   |   |-- uml-element-component-props.tsx                 # UML-Element specific props
    |   |   |--update-pane                                          # popover which is opened when dbl clicking on an element
    |   |-- i18n                                                    # translations
    |   |-- packages                                                # describes appearance of available uml-diagram-type specific elements and which diagram types are available
    |   |   |--common                                               # common
    |   |   |--flowchart                                            # flowchart elements
    |   |   |--syntax-tree                                          # syntaxtree elements
    |   |   |--uml-activity-diagram                                 # activity diagram elements
    |   |   |--uml-class-diagram                                    # class diagram elements
    |   |   |--uml-communication-diagram                            # communication diagram elements
    |   |   |--uml-component-diagram                                # component diagram elements
    |   |   |--uml-deployment-diagram                               # deployment diagram elements
    |   |   |--uml-object-diagram                                   # object diagram elements
    |   |   |--uml-petri-net                                        # petri net elements
    |   |   |--uml-reachability-graph                               # reachability graph elements
    |   |   |--uml-use-case-diagram                                 # use-case diagram elements
    |   |   |--component.ts                                         # mapping of UML element/relationship type to UML element component
    |   |   |--compose-preview.ts                                   # type of preview compose-functions
    |   |   |--diagram-type.ts                                      # exports enum of all availabel diagram types
    |   |   |--popups.ts                                            # mapping of uml element types to popup content
    |   |   |--uml-element-selector-type.ts                         # UML element selector types
    |   |   |--uml-element-type.ts                                  # collection of all supported UML element types
    |   |   |--uml-elements.ts                                      # collection of all supported UML elements
    |   |   |--uml-relationship-type.ts                             # collection of all supporte UML relationship types
    |   |   |--uml-relationships.ts                                 # collection of all supported UML relationships
    |   |-- scenes
    |   |   |-- application.tsx                                     # provides application wide providers and apollon-editor component tree
    |   |   |-- application-styles.tsx                              # styles of the apollon editor layout
    |   |   |-- svg.tsx                                             # builds the svg, which can be exported
    |   |   |-- svg-styles.tsx                                      # styles of the svg
    |   |-- services                                                # provides services which interact with global application state, which is managed by redux
    |   |   |-- assessment                                          # functionality: adds/overwrites assessment + get assessment by id
    |   |   |-- copypaste                                           # functionality: copy and paste uml element
    |   |   |-- editor                                              # functionality: change view
    |   |   |-- last-action                                         # functionality: updates last action state
    |   |   |-- layouter                                            # functionality: layouts elements
    |   |   |-- uml-container                                       # functionality: get container, append element to container, remove element from container
    |   |   |-- uml-diagram                                         # functionality: get uml diagram, append element to uml diagram
    |   |   |-- uml-element                                         # functionality: see subfolders
    |   |   |   |-- connectable                                     # functionality: start, end + delete connection
    |   |   |   |-- hoverable                                       # functionality: adds / removes elements from global hovered elements
    |   |   |   |-- interactable                                    # functionality: adds / removes elements from global interaction elements
    |   |   |   |-- movable                                         # functionality: updates UML element position
    |   |   |   |-- resizable                                       # functionality: updates UML element bounds
    |   |   |   |-- selectable                                      # functionality: adds / removes elements from global selected elements
    |   |   |   |-- updatable                                       # functionality: adds / removes elements from global updating elements
    |   |   |   |-- uml-element.ts                                  # defines the uml-element model
    |   |   |   |-- uml-element-common-repository.ts                # provides creators for common actions of uml-elements
    |   |   |   |-- uml-element-features.ts                         # provides type for UMLElementFeatures
    |   |   |   |-- uml-element-ports.ts                            # provides IUMLElementPort, which is used as connection src and target
    |   |   |   |-- uml-element-reducer.ts                          # implements state update for uml-element functionality: create, update, remove elements
    |   |   |   |-- uml-element-repository.ts                       # unifies repositories of uml elements
    |   |   |   |-- uml-element-saga.ts                             # implementation of side effects of uml-element actions
    |   |   |   |-- uml-element-types.ts                            # types definition of uml-element-common functionality
    |   |   |-- uml-relationship
    |   |   |   |-- reconnectable                                   # functionality: adds / removes elements from global reconnected elements
    |   |   |   |-- connections.ts                                  # algorithm for path drawing
    |   |   |   |-- uml-relationship-centered-description.ts        # implements centered description in relationship functionality
    |   |   |   |-- uml-relationship-common-repository.ts           # defines common repository of uml-relationships
    |   |   |   |-- uml-relationship.ts                             # defines the uml-relationship model
    |   |   |   |-- uml-relationship-feature.ts                     # defines the features of uml-relationships
    |   |   |   |-- uml-relationship-reducer.ts                     # implements state update for uml-relationship functions
    |   |   |   |-- uml-relationship-repository.ts                  # unifies all repositories of uml-relationships
    |   |   |   |-- uml-relationship-saga.ts                        # implements side effects of uml-relationships
    |   |   |   |-- uml-relationship-types.ts                       # defines uml-relationship action types
    |   |   |-- undo                                                # functionality: undo / redo action
    |   |   |-- actions.ts                                          # export type for all actions
    |   |   |-- reducer.ts                                          # maps global state to reducers
    |   |   |-- saga.ts                                             # unifies all sagas
    |   |-- utils                                                   # provides utility code
    |   |-- apollon-editor.ts                                       # exports apollon-editor functionality to library using application
    |   |-- index.ts                                                # js module export
    |   |-- typings.ts                                              # exports typings to library using application
    |-- webpack                                                     # packaging config for apollon standalone
