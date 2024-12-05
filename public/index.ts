import * as Apollon from '../src/main';
import * as themings from './themings.json';
import('./styles.css');
import { exportDiagram, importDiagram } from '../src/main/services/diagramExportImport/diagramExportService';
import { generateOutput, convertBumlToJson, exportBuml } from './generate_besser';
import { getDiagramData } from './utils.ts';

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
  useSingleStorage: boolean;
  legacyModel?: Apollon.UMLModel; // For backwards compatibility
}

// Modify options to use the custom type
let options: CustomApollonOptions = {
  colorEnabled: true,
  scale: 0.8,
  type: 'ClassDiagram' as DiagramType,
  savedModels: {},
  useSingleStorage: false,
  legacyModel: JSON.parse(localStorage.getItem('apollon') || 'null')
};

// Set initial visibility of code generator section
const codeGeneratorSection = document.getElementById('codeGeneratorSection');
if (codeGeneratorSection) {
  codeGeneratorSection.style.display = 'block';
}

// Fonction called when the diagram type is changed
export const onChange = async (event: any) => {
  const { name, value } = event.target;
  console.log('onChange called:', { name, value });

  if (name === 'type') {
    // Update options
    options.type = value as DiagramType;
    
    // Update editor type and recreate it
    if (editor) {
      editor.type = value as DiagramType;
      
      // Debug logging
      console.log('Current diagram type after change:', {
        optionsType: options.type,
        editorType: editor.model.type,
        newType: value
      });

      // Update the code generator section visibility
      const codeGeneratorSection = document.getElementById('codeGeneratorSection');
      if (codeGeneratorSection) {
        codeGeneratorSection.style.display = value === 'ClassDiagram' ? 'block' : 'none';
      }
    }
  } else {
    options = { ...options, [name]: value };
  }

  // Wait for editor to be fully initialized after type change
  await awaitEditorInitialization();
  
  // Save the current state
  save();
};

// Fonction called when a switch is toggled 
export const onSwitch = (event: MouseEvent) => {
  const { name, checked: value } = event.target as HTMLInputElement;
  options = { ...options, [name]: value };
  render();
};

// Updated save function to handle both storage modes
export const save = () => {
  if (!editor) return;
  const currentModel: Apollon.UMLModel = editor.model;
  const currentType = options.type as DiagramType;

  if (options.useSingleStorage) {
    // Legacy single storage mode
    localStorage.setItem('apollon', JSON.stringify(currentModel));
    options.legacyModel = currentModel;
  } else {
    // Per-diagram storage mode
    const savedModels: DiagramModels = JSON.parse(
      localStorage.getItem('apollonModels') || '{}'
    );
    savedModels[currentType] = currentModel;
    localStorage.setItem('apollonModels', JSON.stringify(savedModels));
  }

  options = { 
    ...options,
    model: currentModel 
  };

  return options;
};

// Updated load function to handle both storage modes
const loadModelForType = (type: DiagramType): Apollon.UMLModel | undefined => {
  if (options.useSingleStorage) {
    // Single storage mode - load from combined storage
    const savedModels: DiagramModels = JSON.parse(
      localStorage.getItem('apollonModels') || '{}'
    );
    return savedModels[type];
  } else {
    // Per-diagram storage mode
    const modelString = localStorage.getItem(`apollon_${type}`);
    return modelString ? JSON.parse(modelString) : undefined;
  }
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

  let modelToUse: Apollon.UMLModel | undefined;

  if (options.useSingleStorage) {
    // Legacy single storage mode
    modelToUse = options.legacyModel;
  } else {
    // Per-diagram storage mode
    modelToUse = loadModelForType(options.type as DiagramType);
  }

  // Create new editor with clean options
  editor = new Apollon.ApollonEditor(container, {
    ...options,
    model: modelToUse
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

// Updated clear function to handle both storage modes
export const clear = () => {
  const currentType = options.type as DiagramType;
  
  if (options.useSingleStorage) {
    // Single storage mode - remove only current type from combined storage
    const savedModels: DiagramModels = JSON.parse(
      localStorage.getItem('apollonModels') || '{}'
    );
    delete savedModels[currentType];
    localStorage.setItem('apollonModels', JSON.stringify(savedModels));
  } else {
    // Per-diagram storage mode
    localStorage.removeItem(`apollon_${currentType}`);
  }

  options = {
    ...options,
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

// Updated deleteEverything function to handle both storage modes
export const deleteEverything = () => {
  try {
    if (options.useSingleStorage) {
      // Single storage mode - just remove the combined storage
      localStorage.removeItem('apollonModels');
    } else {
      // Per-diagram storage mode - remove all diagram-specific keys
      const allKeys = Object.keys(localStorage);
      const apollonKeys = allKeys.filter(key => key.startsWith('apollon_'));
      apollonKeys.forEach(key => localStorage.removeItem(key));
    }

    localStorage.removeItem('apollonOptions');

    options = {
      model: undefined,
      colorEnabled: true,
      scale: 0.8,
      type: 'ClassDiagram' as DiagramType,
      useSingleStorage: options.useSingleStorage
    };

    if (editor) {
      editor.destroy();
      editor = null;
    }

    render();
    window.location.reload();
  } catch (error) {
    console.error('Error during deletion:', error);
    alert('An error occurred while deleting diagrams and settings');
  }
};

// Add storage mode toggle function
export const toggleStorageMode = () => {
  if (!editor) return;
  
  const currentModel = editor.model;
  
  if (options.useSingleStorage) {
    // Converting from legacy to per-diagram
    const savedModels: DiagramModels = {};
    savedModels[options.type as DiagramType] = currentModel;
    localStorage.setItem('apollonModels', JSON.stringify(savedModels));
    localStorage.removeItem('apollon');
  } else {
    // Converting to legacy mode
    localStorage.setItem('apollon', JSON.stringify(currentModel));
    localStorage.removeItem('apollonModels');
  }
  
  options = {
    ...options,
    useSingleStorage: !options.useSingleStorage,
    legacyModel: options.useSingleStorage ? undefined : currentModel
  };
  
  render();
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
      await generateOutput(generatorType);
    },
    convertBumlToJson: async (file: File) => {
      if (!file) return;
      console.log("Converting file:", file.name);
      await convertBumlToJson(file);
    },
    exportBuml: async () => {
      console.log("Exporting BUML...");
      const currentEditor = (window as any).editor;
      if (!currentEditor) {
        console.error("Editor is not initialized");
        alert("Editor is not initialized. Please try refreshing the page.");
        return;
      }

      const diagramData = getDiagramData(currentEditor);
      if (!diagramData) {
        console.error("No diagram data available!");
        alert("No diagram data available to export!");
        return;
      }

      console.log("Diagram type:", diagramData.type);
      
      // Add debug logging
      console.log("Checking diagram type:", {
        isStateMachine: diagramData.type === 'StateMachineDiagram',
        isClass: diagramData.type === 'ClassDiagram',
        actualType: diagramData.type
      });
      
      if (diagramData.type === 'StateMachineDiagram' || diagramData.type === 'ClassDiagram') {
        try {
          await exportBuml(currentEditor);
          console.log("BUML export completed");
        } catch (error) {
          console.error("Error during BUML export:", error);
          alert(`Failed to export BUML: ${error.message}`);
        }
      } else {
        alert("BUML export is only supported for State Machine and Class diagrams.");
      }
    }
  } as ApollonGlobal;
});

// Then call render
render();
