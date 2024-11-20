import * as Apollon from '../src/main';
import * as themings from './themings.json';
import('./styles.css');
import { exportDiagram, importDiagram } from '../src/main/services/diagramExportImport/diagramExportService';
import { convertBumlToJson } from './generate_besser';

const container = document.getElementById('apollon')!;
let editor: Apollon.ApollonEditor | null = null;
let options: Apollon.ApollonOptions = {
  model: JSON.parse(window.localStorage.getItem('apollon')!),
  colorEnabled: true,
  scale: 0.8,
  type: 'ClassDiagram'
};

// Set initial visibility of code generator section
const codeGeneratorSection = document.getElementById('codeGeneratorSection');
if (codeGeneratorSection) {
  codeGeneratorSection.style.display = 'block';
}

// Fonction appelée pour modifier les options de l'éditeur
export const onChange = (event: MouseEvent) => {
  const { name, value } = event.target as HTMLSelectElement;
  options = { ...options, [name]: value };
  render();
  if (name === 'type') {
    const codeGeneratorSection = document.getElementById('codeGeneratorSection');
    if (codeGeneratorSection) {
      codeGeneratorSection.style.display = value === 'ClassDiagram' ? 'block' : 'none';
    }
  }
};

// Fonction pour activer/désactiver des options de l'éditeur
export const onSwitch = (event: MouseEvent) => {
  const { name, checked: value } = event.target as HTMLInputElement;
  options = { ...options, [name]: value };
  render();
};

// Sauvegarder le modèle de diagramme dans localStorage
export const save = () => {
  if (!editor) return;
  const model: Apollon.UMLModel = editor.model;
  localStorage.setItem('apollon', JSON.stringify(model));
  options = { ...options, model };
  return options;
};

// Supprimer les données de diagramme sauvegardées
export const clear = () => {
  localStorage.removeItem('apollon');
  options = { ...options, model: undefined };
};

// Appliquer un thème (clair ou sombre)
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

// Dessiner le diagramme en SVG et l'ouvrir dans une nouvelle fenêtre
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

// Attendre l'initialisation complète de l'éditeur
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

// 
const setupGlobalApollon = (editor: Apollon.ApollonEditor | null) => {
  (window as any).apollon = {
    onChange,
    onSwitch,
    draw,
    save,
    clear,
    setTheming,
    exportDiagram: () => {
      if (editor) {
        exportDiagram(editor);
      } else {
        console.warn("Editor is not initialized");
      }
    },
    importDiagram: (file: File) => {
      if (editor) {
        importDiagram(file, editor);
      } else {
        console.warn("Editor is not initialized");
      }
    },
    convertBumlToJson: () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.py';
      fileInput.style.display = 'none';
      
      fileInput.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          convertBumlToJson(target.files[0]);
        }
        document.body.removeChild(fileInput);
      });
      
      document.body.appendChild(fileInput);
      fileInput.click();
    }
  };
};

// Modifions la fonction render pour utiliser setupGlobalApollon
const render = async () => {
  console.log("Rendering editor");
  save();
  if (editor) {
    editor.destroy();
  }
  editor = new Apollon.ApollonEditor(container, options);
  
  // Add position change listener
  editor.subscribeToModelDiscreteChange(() => {
    save();
  });

  await awaitEditorInitialization();

  if (editor) {
    console.log("Editor initialized successfully");
    (window as any).editor = editor;
    setupGlobalApollon(editor);

    import('./generate_besser').then(() => {
      console.log("generate_besser.ts loaded successfully after editor initialization");
    }).catch(error => {
      console.error("Failed to load generate_besser.ts:", error);
    });
  } else {
    console.error("Editor failed to initialize");
  }
};

render();
