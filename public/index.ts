import * as Apollon from '../src/main';
import * as themings from './themings.json';
import('./styles.css');

const container = document.getElementById('apollon')!;
let editor: Apollon.ApollonEditor | null = null;
let options: Apollon.ApollonOptions = {
  model: JSON.parse(window.localStorage.getItem('apollon')!),
  colorEnabled: true,
  scale: 0.8,
};

export const onChange = (event: MouseEvent) => {
  console.log("Change event triggered");
  const { name, value } = event.target as HTMLSelectElement;
  options = { ...options, [name]: value };
  render();
};

export const onSwitch = (event: MouseEvent) => {
  console.log("Switch event triggered");
  const { name, checked: value } = event.target as HTMLInputElement;
  options = { ...options, [name]: value };
  render();
};

export const save = () => {
  if (!editor) return;

  console.log("Saving diagram data");
  const model: Apollon.UMLModel = editor.model;
  localStorage.setItem('apollon', JSON.stringify(model));
  options = { ...options, model };
  return options;
};

export const clear = () => {
  console.log("Clearing diagram data");
  localStorage.removeItem('apollon');
  options = { ...options, model: undefined };
};

export const setTheming = (theming: string) => {
  console.log(`Setting theming to ${theming}`);
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

export const draw = async (mode?: 'include' | 'exclude') => {
  if (!editor) return;

  console.log(`Drawing diagram with mode: ${mode}`);
  const filter: string[] = [
    ...Object.entries(editor.model.interactive.elements)
      .filter(([, value]) => value)
      .map(([key]) => key),
    ...Object.entries(editor.model.interactive.relationships)
      .filter(([, value]) => value)
      .map(([key]) => key),
  ];

  const exportParam = mode ? { [mode]: filter, scale: editor.getScaleFactor() } : { scale: editor.getScaleFactor() };

  const { svg }: Apollon.SVG = await editor.exportAsSVG(exportParam);
  const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
  const svgBlobURL = URL.createObjectURL(svgBlob);
  window.open(svgBlobURL);
};

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

const render = async () => {
  console.log("Rendering editor");
  save();
  if (editor) {
    editor.destroy();
  }
  editor = new Apollon.ApollonEditor(container, options);
  console.log("Editor instance:", editor);

  await awaitEditorInitialization();  // Attendre que l'éditeur soit entièrement initialisé

  if (editor) {
    console.log("Editor initialized successfully with application:", editor.application);
    (window as any).editor = editor;  // Attacher l'éditeur globalement après l'initialisation

    // Charger generate_besser.ts après l'initialisation de l'éditeur
    import('./generate_besser').then(() => {
      console.log("generate_besser.ts loaded successfully after editor initialization");
    }).catch(error => {
      console.error("Failed to load generate_besser.ts:", error);
    });
  } else {
    console.error("Editor failed to initialize");
  }
};

// Expose functions globally for HTML event handlers
(window as any).apollon = {
  onChange,
  onSwitch,
  draw,
  save,
  clear,
  setTheming,
};

render();
