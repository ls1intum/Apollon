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

const oclConstraintsSection = document.getElementById('oclConstraintsSection');
if (oclConstraintsSection) {
  oclConstraintsSection.style.display = 'block';
}


// Set initial visibility of BUML section
const bumlSection = document.getElementById('bumlSection');
if (bumlSection) {
  bumlSection.style.display = options.type && ['ClassDiagram','ObjectDiagram', 'StateMachineDiagram'].includes(options.type) ? 'block' : 'none';
}

// Function called when the diagram type is changed
export const onChange = async (event: any) => {
  const { name, value } = event.target;

  if (name === 'type') {
    const previousType = options.type;
    const newType = value as DiagramType;
    
    options.type = newType;
    
    if (editor && previousType) {
      const currentModel = editor.model;
      
      if (options.useSingleStorage) {
        localStorage.setItem('apollon', JSON.stringify(currentModel));
        options.legacyModel = currentModel;
        
        editor.model = {
          ...currentModel,
          type: newType,
          version: '3.0.0',
          size: { width: 2000, height: 2000 },
          elements: currentModel.elements || {},
          relationships: currentModel.relationships || {},
          interactive: currentModel.interactive || { elements: {}, relationships: {} },
          assessments: currentModel.assessments || {}
        };
      } else {
        const savedModels: DiagramModels = JSON.parse(
          localStorage.getItem('apollonModels') || '{}'
        );
        savedModels[previousType] = currentModel;
        localStorage.setItem('apollonModels', JSON.stringify(savedModels));
        
        const existingModel = savedModels[newType];
        if (existingModel) {
          editor.model = existingModel;
        } else {
          editor.model = {
            type: newType,
            version: '3.0.0',
            size: { width: 2000, height: 2000 },
            elements: {},
            relationships: {},
            interactive: { elements: {}, relationships: {} },
            assessments: {}
          };
        }
      }

      // Update UI elements visibility
      const codeGeneratorSection = document.getElementById('codeGeneratorSection');
      if (codeGeneratorSection) {
        codeGeneratorSection.style.display = newType === 'ClassDiagram' ? 'block' : 'none';
      }

      const oclConstraintsSection = document.getElementById('oclConstraintsSection');
      if (oclConstraintsSection) {
        oclConstraintsSection.style.display = newType === 'ClassDiagram' ? 'block' : 'none';
      }
      
    }
  } else {
    options = { ...options, [name]: value };
  }

  await awaitEditorInitialization();
  save();
};

// Function called when a switch is toggled 
export const onSwitch = (event: MouseEvent) => {
  const { name, checked: value } = event.target as HTMLInputElement;
  options = { ...options, [name]: value };
  render();
};

// Updated save function to handle both storage modes
export const save = () => {
  if (!editor) return;
  const currentModel: Apollon.UMLModel = editor.model;
  
  if (options.useSingleStorage) {
    // In single storage mode, save everything in one place
    localStorage.setItem('apollon', JSON.stringify(currentModel));
    options.legacyModel = currentModel;
  } else {
    // Per-diagram storage mode
    const savedModels: DiagramModels = JSON.parse(
      localStorage.getItem('apollonModels') || '{}'
    );
    savedModels[options.type as DiagramType] = currentModel;
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
  const savedOptionsString = localStorage.getItem('apollonOptions');
  const savedOptions = savedOptionsString 
    ? JSON.parse(savedOptionsString) 
    : {};

  const currentType = options.type || 'ClassDiagram' as DiagramType;

  let modelToUse: Apollon.UMLModel | undefined;

  if (options.useSingleStorage) {
    // In single storage mode, use the legacy model
    modelToUse = JSON.parse(localStorage.getItem('apollon') || 'null');
    if (modelToUse) {
      // Update the type while preserving elements and relationships
      modelToUse = {
        ...modelToUse,
        type: currentType
      };
    }
  } else {
    // Per-diagram storage mode
    modelToUse = loadModelForType(currentType);
  }

  options = {
    ...options,
    colorEnabled: savedOptions.colorEnabled ?? options.colorEnabled,
    scale: savedOptions.scale ?? options.scale,
    type: currentType,
    model: modelToUse,
    legacyModel: options.useSingleStorage ? modelToUse : undefined
  };

  if (editor) {
    editor.destroy();
  }

  editor = new Apollon.ApollonEditor(container, {
    ...options,
    model: modelToUse
  });

  editor.subscribeToModelDiscreteChange(() => {
    save();
  });

  await awaitEditorInitialization();

  if (editor) {
    (window as any).editor = editor;
    setupGlobalApollon(editor);
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
  openOclPopup: () => void;
  saveOcl: () => void;
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
      await exportDiagram(editor);
    },
    importDiagram: async (file: File) => {
      try {
        await importDiagram(file, editor);
        save();
      } catch (error) {
        console.error('Error importing diagram:', error);
        alert('Error importing diagram. Please check if the file is valid JSON.');
      }
    },
    generateCode: window.apollon?.generateCode,
    convertBumlToJson: window.apollon?.convertBumlToJson,
    openOclPopup: () => {
      const popup = document.getElementById('oclPopup');
      const textarea = document.getElementById('oclText') as HTMLTextAreaElement;
      
      if (!popup || !textarea) {
        console.error('Required OCL popup elements not found');
        return;
      }

      // Load saved OCL
      const savedOcl = localStorage.getItem('diagramOCL') || '';
      textarea.value = savedOcl;
      
      // Show popup
      popup.style.display = 'flex';

      // Close on outside click
      const closeOnOutsideClick = (e: MouseEvent) => {
        if (e.target === popup) {
          popup.style.display = 'none';
          document.removeEventListener('click', closeOnOutsideClick);
        }
      };
      document.addEventListener('click', closeOnOutsideClick);
    },

    saveOcl: () => {
      const popup = document.getElementById('oclPopup') as HTMLElement;
      const textarea = document.getElementById('oclText') as HTMLTextAreaElement;
      
      if (!popup || !textarea) {
        console.error('Required OCL elements not found');
        return;
      }

      try {
        // Basic OCL validation could be added here
        const oclContent = textarea.value.trim();
        
        // Save OCL
        localStorage.setItem('diagramOCL', oclContent);
        
        // Hide popup
        popup.style.display = 'none';
      } catch (error) {
        console.error('Error saving OCL:', error);
        alert('Failed to save OCL constraints');
      }
    }
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
      await generateOutput(generatorType);
    },
    convertBumlToJson: async (file: File) => {
      if (!file) return;
      await convertBumlToJson(file);
    },
    exportBuml: async () => {
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

      
      // Debug logging
      // console.log("Checking diagram type:", {
      //   isStateMachine: diagramData.type === 'StateMachineDiagram',
      //   isClass: diagramData.type === 'ClassDiagram',
      //   actualType: diagramData.type
      // });
      
      if (diagramData.type === 'StateMachineDiagram' || diagramData.type === 'ClassDiagram') {
        try {
          await exportBuml(currentEditor);
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
