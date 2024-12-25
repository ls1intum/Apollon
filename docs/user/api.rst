.. _apollon-editor-api:

################
Apollon API
################

Here you can see the typed API of the Apollon Editor and the corresponding types.

API:

.. literalinclude:: api/apollon-editor.d.ts
  :language: typescript

Types:

.. literalinclude:: api/typings.d.ts
  :language: typescript

It is recommended to NOT work with UML model objects directly, specifically if you need to process UML models created with older versions of Apollon. Instead, use `UMLModelCompat` type and use the :ref:`uml-model-helpers`, which provide
backwards compatibility out of the box.