###########################
Adding another diagram type
###########################

Apollon currently has the following diagram types.

Diagram Types
--------------

.. literalinclude:: api/diagram-type.d.ts
  :language: typescript

To add a new diagram type, add the new diagram type inside *src/main/packages/diagram-type.ts*.

.. code-block:: typescript

    export type UMLDiagramType = keyof typeof UMLDiagramType;
    export const UMLDiagramType = {
        ...
        Flowchart: 'Flowchart',
        NewDiagramType: 'NewDiagramType'
    } as const;

Once we register the new diagram type in *diagram-type.ts*, we will now create a new folder inside *src/main/packages*,  
where all the elements of the new diagram type is defined.

Structure of new diagram type in the project
---------------------------------------------

The tree structure of the project with the new diagram type will have schema as follows:

.. code-block:: shell

    |-- .github                                         
    |-- docs                                            
    |-- public                                         
    |-- src                                             
    |   |-- main                                  
    |   |   |-- packages    
    |   |   |   |-- new-diagram-type                                        # newly created diagram   
    |   |   |   |   |-- index.ts                                            # defines an enum for all diagram element 
    |   |   |   |   |-- new-diagram-type-preview.tsx                        # xxx-preview.tsx class 
    |   |   |   |   |-- new-diagram-type-element-1                          # collection of UML Element 1 of Newly created diagram 
    |   |   |   |   |   |-- new-diagram-type-element-1.tsx                  # element 1 of Newly created diagram 
    |   |   |   |   |   |-- new-diagram-type-element-1-component.tsx        # visual representation of new-diagram-type-element-1 element  
    |   |   |   |   |   |-- new-diagram-type-element-1-update.tsx           # update logic for new-diagram-type-element-1 element
    |   |   |   |   |-- new-diagram-type-element-2                          # collection of UML Element 2 of Newly created diagram 
    |   |   |   |   |-- ...
    |   |   |   |-- common        
    |   |   |   |-- flowchart
    |   |   |   |-- syntax-tree
    ...        

The folder *new-diagram-type* contains all the elements of the new diagram type (*new-diagram-type-element-1*, *new-diagram-type-element-2*) along with *new-diagram-type-preview.tsx* class and *index.ts*.
In *index.ts* we define an enum for all diagram elements.

*new-diagram-type-preview.tsx* is a class which creates a preview of all available newly created diagrams. 
This preview is used in the side-panel, which the user can use to drag new elements onto the canvas. 

The visual representation of *new-diagram-type-element* is written in *new-diagram-type-element-1-component.tsx* (see :ref:`visual-representation-implementation-of-element`) 
and its update logic in *new-diagram-type-element-1-update.tsx*
*new-diagram-type-element-1.tsx* is a class extending *UMLElement*.

Once the above schema for new diagram is created, we will now import the created diagram elements type from *index.ts* to *uml-element-type.ts* (*src/main/packages/uml-element-type.ts*).
Newly created elements are then imported to *uml-elements.ts*

And finally, since Apollon supports two languages, English and German, the corresponding translation strings of elements are defined in *src/main/i18n* folder.
The German string is defined in *de.json* and English in *en.json*.

Translation of newly added diagram type
----------------------------------------
Following is the illustration of how translation strings of newly created diagram type and its elements are defined.

.. code-block:: json

    {
    "packages":{
        "NewDiagramType":{
            "NewDiagramTypeElement1":"NewDiagramTypeElement1",
            "NewDiagramTypeElement2":"NewDiagramTypeElement2",
            "NewDiagramTypeElementX":"NewDiagramTypeElementX",
            }
        }
    }
