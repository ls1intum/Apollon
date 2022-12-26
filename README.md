# Apollon

[![GitHub Actions Status](https://github.com/ls1intum/Apollon/workflows/Build/badge.svg)](https://github.com/ls1intum/Apollon/actions?query=branch%3Adevelop+workflow%3ABuild)
[![Dependencies status](https://img.shields.io/david/ls1intum/Apollon)](package.json)
[![DevDependencies status](https://img.shields.io/david/dev/ls1intum/Apollon)](package.json)
[![Documentation Status](https://readthedocs.org/projects/apollon-library/badge/?version=latest)](https://apollon-library.readthedocs.io/en/latest/?badge=latest)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/ff48bab36a924471abcf61566563ffe6)](https://app.codacy.com/gh/ls1intum/Apollon?utm_source=github.com&utm_medium=referral&utm_content=ls1intum/Apollon&utm_campaign=Badge_Grade_Dashboard)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/9bbbff1e8475480d92c80615ac2eddf6)](https://www.codacy.com/gh/ls1intum/Apollon?utm_source=github.com&utm_medium=referral&utm_content=ls1intum/Apollon&utm_campaign=Badge_Coverage)

[![Latest version)](https://img.shields.io/npm/v/@ls1intum/apollon)](https://www.npmjs.com/package/@ls1intum/apollon)

A UML modeling editor written in React and TypeScript.

## Main Features

### Easy to use editor
The user interface of Apollon is simple to use. 
It works just like any other office and drawing tool that most users are familiar with. 

-   Select the diagram type you want to draw from the `Diagram Type` menu. This selection determines the availability of elements that the user can use while drawing their diagram, making it easier for users who are newly introduced to modeling.
-   Adding the element is as easy as dragging it from the elements menu and dropping it to the canvas. So is drawing the connection between them, simply drag and connect two or multiple elements.
-   The layout of the connection is drawn automatically by the editor. If you want to manually layout it, use the existing waypoints features.
-   Edit the text of any elements by double-clicking on them. An easy-to-use menu will allow you to do so.
-   Use keyboard shortcuts to copy, paste, delete and move the elements throughout the canvas.
-   Supports dark/light themes for the editor.
-   Supports two languages: `German` and `English`.
-   Supports exporting the entire diagram or just selected elements of it.

![Apollon features](/docs/images/features.gif "Apollon features")

### Wide range of UML diagrams
Apollon allows you to create a wide range of UML diagrams.
Currently, it supports creating 11 different UML diagrams.
The list of UML diagrams includes:
-   `Class Diagram`
-   `Object Diagram`
-   `Activity Diagram`
-   `Use Case Diagram`
-   `Communication Diagram`
-   `Component Diagram`
-   `Deployment Diagram`
-   `Petri Net Diagram`
-   `Reachability Graph`
-   `Syntax Tree`
-   `Flowchart`

### Integrate Apollon with other software
Apollon can be integrated to any other Javascript application.
It serves as the modeling editor for the widely used interactive learning platform called [Artemis](https://artemis.ase.in.tum.de/).  
It also provides the standalone version of the editor.
You can try the standalone version of Apollon completey free and without the necessity of creating any account. 
It is a web application that allows users to use Apollon editor directly from their browser with additional features, including but not limited to, sharing and exporting the diagram.
It can be accessed via https://apollon.ase.in.tum.de.

The GitHub repository of its Standalone version is

```
https://github.com/ls1intum/Apollon_standalone
```

## Usage

Install the `@ls1intum/apollon` npm package using either [yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/):

```sh
yarn add @ls1intum/apollon
```

Import the `ApollonEditor` class, which is the default export of the npm package:

```js
import ApollonEditor from '@ls1intum/apollon';
```

Get hold of a DOM node and mount a new instance of the Apollon editor into it:

```js
const container = document.getElementById("...");
const editor = new ApollonEditor(container);
```

To unmount the editor instance, call its `destroy()` method:

```js
editor.destroy();
```

For a complete overview of the API, please refer to the [lib/es6/index.d.ts] file.

### ESModules and CommonJs

Apollon provides both an ESModules, as well as CommonJS version to be included.
They lay in `lib/es6` and `lib/es5` and the correct version should be resolved automatically.

## Development Setup

Clone the repository and change into the `Apollon` directory:

```
git clone https://github.com/ls1intum/Apollon.git
cd Apollon
```

Install all node dependencies:

```
yarn install
```

Launch the webpack-dev-server:

```
yarn start
```

The webpack-dev-server is now listening on [http://localhost:8888](http://localhost:8888). If you change a TypeScript file, webpack will automatically compile the code, bundle the application, and refresh the page in your browser.
