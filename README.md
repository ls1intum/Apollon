# Apollon (BESSER Fork)

[![GitHub Actions Status](https://github.com/ls1intum/Apollon/workflows/Build/badge.svg)](https://github.com/ls1intum/Apollon/actions?query=branch%3Adevelop+workflow%3ABuild)
[![Latest version](https://img.shields.io/npm/v/@ls1intum/apollon)](https://www.npmjs.com/package/@ls1intum/apollon)

A UML modeling editor written in React and TypeScript, customized to support BESSER's B-UML modeling language and code generation capabilities.

## About this Fork

This fork of Apollon integrates with the [BESSER platform](https://github.com/BESSER-PEARL/BESSER), extending Apollon's capabilities to support B-UML while maintaining the original editor's user-friendly features.

## Key Features

### B-UML Modeling Support
- Visual modeling interface for BESSER's modeling language
- Seamless integration with BESSER's code generation pipeline

### Code Generation
Transform B-UML models into various implementations:
- Python code compatible with BESSER's framework
- Django models
- SQLAlchemy database structures
- Application layer code

Example:
```python
from besser.modeling import BesserModel

class UserEntity(BesserModel):
    def __init__(self):
        super().__init__()
```

## Core Features

### Editor Interface
- Intuitive drag-and-drop modeling
- Element text editing via double-click
- Dark/light themes
- German and English language support
- Export functionality for diagrams and elements

### Canvas Features
- Infinite canvas with grid system
- Flexible element positioning and resizing
- Automatic relationship routing with manual waypoint adjustments
- Standard keyboard shortcuts (copy, paste, delete, move)

### Supported Diagrams
- Class Diagram
- Object Diagram
- Activity Diagram
- Use Case Diagram
- Communication Diagram
- Component Diagram
- Deployment Diagram
- Petri Net Diagram
- Reachability Graph
- Syntax Tree
- Flowchart
- State Machine (experimental)

### BESSER Integration
- Automatic saving and backend synchronization with [BESSER platform](https://github.com/BESSER-PEARL/BESSER)
- Platform-specific features
- Collaborative editing capabilities

## Prerequisites

Before using this fork of Apollon, ensure you have:

1. Python 3.9+ installed
2. BESSER backend running locally:
```bash
# Clone BESSER repository
git clone https://github.com/BESSER-PEARL/BESSER.git
cd BESSER

# Set up the environment
python setup_environment.py

# Verify installation by running an example
cd besser_backend
python main.py
```

## Installation

Using yarn:
```sh
yarn add @besser/apollon
```

Using npm:
```sh
npm install @besser/apollon
```

## Usage

```js
import ApollonEditor from '@besser/apollon';

const container = document.getElementById("editor-container");
const editor = new ApollonEditor(container);

// Cleanup when needed
editor.destroy();
```

## Development

1. Clone the repository:
```bash
git clone https://github.com/besser/apollon.git
cd apollon
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run start
```

The server runs at [http://localhost:8888](http://localhost:8888)

### Documentation

Build the documentation:
```bash
npm run prepare
npm run docs:prepare
npm run docs:build
```

Serve documentation locally:
```bash
npm run docs:watch
```

Documentation is served at `localhost:8088`

## Contributing

Please ensure compatibility with BESSER backend services when contributing. For major changes, open an issue first to discuss proposed changes.
