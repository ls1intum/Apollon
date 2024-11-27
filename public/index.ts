import * as Apollon from '../src/main';
import * as themings from './themings.json';
import('./styles.css');
import { exportDiagram, importDiagram } from '../src/main/services/diagramExportImport/diagramExportService';
import { generateOutput, convertBumlToJson } from './generate_besser';

const container = document.getElementById('apollon')!;
let editor: Apollon.ApollonEditor | null = null;

// Define a union type for diagram types
type DiagramType = 
  | 'ClassDiagram'
  | 'ObjectDiagram'
  | 'ActivityDiagram'
  | 'UseCaseDiagram'
  | 'CommunicationDiagram'
  | 'ComponentDiagram'
  | 'DeploymentDiagram'
  | 'PetriNet'
  | 'ReachabilityGraph'
  | 'SyntaxTree'
  | 'Flowchart'
  | 'BPMN'
  | 'StateMachineDiagram';

// Define a type to store models for different diagram types
interface DiagramModels {
  ClassDiagram?: Apollon.UMLModel;
  ObjectDiagram?: Apollon.UMLModel;
  ActivityDiagram?: Apollon.UMLModel;
  UseCaseDiagram?: Apollon.UMLModel;
  CommunicationDiagram?: Apollon.UMLModel;
  ComponentDiagram?: Apollon.UMLModel;
  DeploymentDiagram?: Apollon.UMLModel;
  PetriNet?: Apollon.UMLModel;
  ReachabilityGraph?: Apollon.UMLModel;
  SyntaxTree?: Apollon.UMLModel;
  Flowchart?: Apollon.UMLModel;
  BPMN?: Apollon.UMLModel;
  StateMachineDiagram?: Apollon.UMLModel;
}

// Define a custom options type that extends ApollonOptions
interface CustomApollonOptions extends Apollon.ApollonOptions {
  savedModels?: DiagramModels;
}

// Modify options to use the custom type
let options: CustomApollonOptions = {
  colorEnabled: true,
  scale: 0.8,
  type: 'ClassDiagram' as DiagramType,
  savedModels: {}
};

// Set initial visibility of code generator section
const codeGeneratorSection = document.getElementById('codeGeneratorSection');
if (codeGeneratorSection) {
  codeGeneratorSection.style.display = 'block';
}

// Fonction called when the diagram type is changed
export const onChange = (event: MouseEvent) => {
  const { name, value } = event.target as HTMLSelectElement;
  
  console.log('onChange called:', { name, value }); // Debug log

  if (name === 'type') {
    // Save current model before switching
    if (editor) {
      save();
    }

    // Type assertion to ensure type safety
    const diagramType = value as DiagramType;

    // Load model for the new type
    const newModel = loadModelForType(diagramType);

    // Update options with new type and corresponding model
    options = { 
      ...options, 
      type: diagramType,
      model: newModel
    };

    // Update the code generator section visibility
    const codeGeneratorSection = document.getElementById('codeGeneratorSection');
    if (codeGeneratorSection) {
      codeGeneratorSection.style.display = diagramType === 'ClassDiagram' ? 'block' : 'none';
    }
  } else {
    options = { ...options, [name]: value };
  }

  render();
};

// Fonction called when a switch is toggled 
export const onSwitch = (event: MouseEvent) => {
  const { name, checked: value } = event.target as HTMLInputElement;
  options = { ...options, [name]: value };
  render();
};

// Updated save function to store models by type
export const save = () => {
  if (!editor) return;
  const currentModel: Apollon.UMLModel = editor.model;
  const currentType = options.type as DiagramType;

  // Save current model with type-specific key
  localStorage.setItem(`apollon_${currentType}`, JSON.stringify(currentModel));
  
  // Save current options
  const currentOptions = {
    colorEnabled: options.colorEnabled,
    scale: options.scale,
    type: currentType
  };
  localStorage.setItem('apollonOptions', JSON.stringify(currentOptions));

  options = { 
    ...options,
    model: currentModel 
  };

  return options;
};

// Load function to get model for specific type
const loadModelForType = (type: DiagramType): Apollon.UMLModel | undefined => {
  const modelString = localStorage.getItem(`apollon_${type}`);
  return modelString ? JSON.parse(modelString) : undefined;
};

// Updated render function to load models
const render = async () => {
  console.log("Rendering editor");
  
  // Load saved options
  const savedOptionsString = localStorage.getItem('apollonOptions');
  const savedOptions = savedOptionsString 
    ? JSON.parse(savedOptionsString) 
    : {};

  // Important: Use options.type instead of savedOptions.type
  const currentType = options.type || 'ClassDiagram' as DiagramType;

  // Load model for current type
  const currentModel = loadModelForType(currentType);

  // Update options
  options = {
    ...options,
    colorEnabled: savedOptions.colorEnabled ?? options.colorEnabled,
    scale: savedOptions.scale ?? options.scale,
    type: currentType,
    model: currentModel
  };

  // Update the diagram type dropdown
  const typeSelect = document.querySelector('select[name="type"]') as HTMLSelectElement;
  if (typeSelect) {
    typeSelect.value = currentType;
  }

  // Destroy existing editor if it exists
  if (editor) {
    editor.destroy();
  }

  // Create new editor with clean options
  editor = new Apollon.ApollonEditor(container, {
    ...options,
    model: options.model
  });

  // Add position change listener
  editor.subscribeToModelDiscreteChange(() => {
    save();
  });

  await awaitEditorInitialization();

  if (editor) {
    console.log("Editor initialized successfully");
    (window as any).editor = editor;
    setupGlobalApollon(editor);
  } else {
    console.error("Editor failed to initialize");
  }
};

// Updated clear function
export const clear = () => {
  const currentType = options.type as DiagramType;
  
  // Load existing models
  const savedModels: DiagramModels = JSON.parse(
    localStorage.getItem('apollonModels') || '{}'
  );

  // Remove the current type's model
  delete savedModels[currentType];

  // Update localStorage and options
  localStorage.setItem('apollonModels', JSON.stringify(savedModels));
  localStorage.removeItem('apollonOptions');

  options = {
    ...options,
    savedModels: savedModels,
    model: undefined
  };
};

// Set the theming of the editor
export const setTheming = (theming: string) => {
  const root = document.documentElement;
  const selectedButton = document.getElementById(
    theming === 'light' ? 'theming-light-mode-button' : 'theming-dark-mode-button',
  );
  const unselectedButton = document.getElementById(
    theming === 'light' ? 'theming-dark-mode-button' : 'theming-light-mode-button',
  );
  if (selectedButton && unselectedButton) {
    selectedButton.classList.add('selected');
    unselectedButton.classList.remove('selected');
  }
  for (const themingVar of Object.keys(themings[theming])) {
    root.style.setProperty(themingVar, themings[theming][themingVar]);
  }
};

// Draw the diagram as SVG and open it in a new window
export const draw = async (mode?: 'include' | 'exclude') => {
  if (!editor) return;
  const filter: string[] = [
    ...Object.entries(editor.model.interactive.elements)
      .filter(([, value]) => value)
      .map(([key]) => key),
    ...Object.entries(editor.model.interactive.relationships)
      .filter(([, value]) => value)
      .map(([key]) => key),
  ];

  const exportParam: Apollon.ExportOptions = mode ? { [mode]: filter, scale: editor.getScaleFactor() } as Apollon.ExportOptions : { scale: editor.getScaleFactor() } as Apollon.ExportOptions;
  const { svg }: Apollon.SVG = await editor.exportAsSVG(exportParam);
  const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
  const svgBlobURL = URL.createObjectURL(svgBlob);
  window.open(svgBlobURL);
};

// Wait for the editor to fully initialize
const awaitEditorInitialization = async () => {
  if (editor && editor.nextRender) {
    try {
      await editor.nextRender;
      console.log("Editor fully initialized with application");
    } catch (error) {
      console.error("Failed to wait for editor to fully initialize:", error);
    }
  }
};

// Delete everything - diagram, options, and reset the editor
export const deleteEverything = () => {
  console.log('deleteEverything called');
  console.log('Current localStorage before deletion:', { ...localStorage });

  try {
    // List all keys in localStorage
    const allKeys = Object.keys(localStorage);
    console.log('All localStorage keys:', allKeys);

    // Filter keys related to Apollon
    const apollonKeys = allKeys.filter(key => key.startsWith('apollon_') || key === 'apollonOptions');
    console.log('Apollon-related keys to be deleted:', apollonKeys);

    // Remove each Apollon-related key
    apollonKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Removed key: ${key}`);
    });

    console.log('Current localStorage after deletion:', { ...localStorage });

    // Reset options to default state
    options = {
      model: undefined,
      colorEnabled: true,
      scale: 0.8,
      type: 'ClassDiagram' as DiagramType
    };

    // Destroy existing editor
    if (editor) {
      editor.destroy();
      editor = null;
    }

    // Re-render with clean state
    render();

    // Force a page reload to ensure clean state
    window.location.reload();

  } catch (error) {
    console.error('Error during deletion:', error);
    alert('An error occurred while deleting diagrams and settings');
  }
};


interface ApollonGlobal {
  onChange: (event: MouseEvent) => void;
  onSwitch: (event: MouseEvent) => void;
  draw: (mode?: 'include' | 'exclude') => Promise<void>;
  save: () => void;
  clear: () => void;
  deleteEverything: () => void;
  setTheming: (theming: string) => void;
  exportDiagram: () => Promise<void>;
  importDiagram: (file: File) => Promise<void>;
  generateCode?: (generatorType: string) => Promise<void>;
  convertBumlToJson?: (file: File) => Promise<void>;
}

// Then declare it as part of the global Window interface
declare global {
  var apollon: ApollonGlobal | undefined;
}

// Update the setupGlobalApollon function
const setupGlobalApollon = (editor: Apollon.ApollonEditor | null) => {
  const apollonGlobal: ApollonGlobal = {
    onChange,
    onSwitch,
    draw,
    save,
    clear,
    deleteEverything,
    setTheming,
    exportDiagram: async () => {
      if (!editor) return;
      const model = editor.model;
      const jsonString = JSON.stringify(model, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagram_${options.type}_${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    importDiagram: async (file: File) => {
      if (!editor || !file) return;
      try {
        const text = await file.text();
        const jsonModel = JSON.parse(text);
        editor.model = jsonModel;
        save();
      } catch (error) {
        console.error('Error importing diagram:', error);
        alert('Error importing diagram. Please check if the file is valid JSON.');
      }
    },
    generateCode: window.apollon?.generateCode,
    convertBumlToJson: window.apollon?.convertBumlToJson
  };

  window.apollon = apollonGlobal;
};

// Add this before the render() call, after all the function definitions
window.addEventListener('load', () => {
  // Initialize window.apollon if it doesn't exist
  if (!window.apollon) {
    window.apollon = {} as ApollonGlobal;
  }
  
  // Add the BESSER-specific functions
  const currentApollon = window.apollon;
  window.apollon = {
    ...currentApollon,
    generateCode: async (generatorType: string) => {
      console.log("Generating code with type:", generatorType);
      if (generatorType === 'buml') {
        await generateOutput('buml');
      } else {
        await generateOutput(generatorType);
      }
    },
    convertBumlToJson: async (file: File) => {
      if (!file) return;
      console.log("Converting file:", file.name);
      await convertBumlToJson(file);
    }
  } as ApollonGlobal;
});

// Then call render
render();
