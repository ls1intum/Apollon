# Apollon

A UML modeling editor written in React and TypeScript.

## Usage

Install the `@ls1intum/apollon` npm package using either [yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/):

```
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

For a complete overview of the API, please refer to the [lib/index.d.ts](https://github.com/ls1intum/Apollon/blob/master/lib/index.d.ts) file.

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
