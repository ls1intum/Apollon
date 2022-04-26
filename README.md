# Apollon

[![GitHub Actions Status](https://github.com/ls1intum/Apollon/workflows/Build/badge.svg)](https://github.com/ls1intum/Apollon/actions?query=branch%3Adevelop+workflow%3ABuild)
[![Dependencies status](https://img.shields.io/david/ls1intum/Apollon)](package.json)
[![DevDependencies status](https://img.shields.io/david/dev/ls1intum/Apollon)](package.json)
[![Documentation Status](https://readthedocs.org/projects/apollon-library/badge/?version=latest)](https://apollon-library.readthedocs.io/en/latest/?badge=latest)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/ff48bab36a924471abcf61566563ffe6)](https://app.codacy.com/gh/ls1intum/Apollon?utm_source=github.com&utm_medium=referral&utm_content=ls1intum/Apollon&utm_campaign=Badge_Grade_Dashboard)
[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/9bbbff1e8475480d92c80615ac2eddf6)](https://www.codacy.com/gh/ls1intum/Apollon?utm_source=github.com&utm_medium=referral&utm_content=ls1intum/Apollon&utm_campaign=Badge_Coverage)

[![Latest version)](https://img.shields.io/npm/v/@ls1intum/apollon)](https://www.npmjs.com/package/@ls1intum/apollon)

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
