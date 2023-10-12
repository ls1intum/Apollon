################
Getting started
################

Apollon is a UML modeling editor written in React and TypeScript.

************
Installation
************

Install the `@ls1intum/apollon` npm package using either `yarn <https://yarnpkg.com/>`_ or `npm <https://www.npmjs.com/>`_:

.. code-block:: bash

    yarn add @ls1intum/apollon

.. code-block:: bash

    npm install @ls1intum/apollon

*******
Usage
*******

Import the `ApollonEditor` class, which is the default export of the npm package:

.. code-block:: typescript

    import ApollonEditor from '@ls1intum/apollon';


Get hold of a DOM node and mount a new instance of the Apollon editor into it:

.. code-block:: typescript

    const container = document.getElementById("...");
    const editor = new ApollonEditor(container);

To unmount the editor instance, call its `destroy()` method:

.. code-block:: typescript

    editor.destroy();

For a complete overview of the API, please refer to the :ref:`apollon-editor-api`.
