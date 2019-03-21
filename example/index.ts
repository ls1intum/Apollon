import { ApollonEditor, ApollonOptions, ApollonExporter, DiagramType } from '../src';

const container = document.getElementById('apollon')!;
let editor: ApollonEditor | null = null;
let options: ApollonOptions = {
  type: DiagramType.ClassDiagram,
  model: JSON.parse(window.localStorage.getItem('apollon')!),
};

const render = (container: HTMLElement, options: ApollonOptions) => {
  editor && editor.destroy();
  editor = new ApollonEditor(container, options);
};
render(container, options);

export const onChange = (event: MouseEvent) => {
  const { name, value } = event.target as HTMLSelectElement;
  options = { ...options, [name]: value };
  render(container, options);
};

export const save = () => {
  if (!editor) return;

  localStorage.setItem('apollon', JSON.stringify(editor.model));
  options = { ...options, model: editor.model };
};

export const clear = () => {
  localStorage.removeItem('apollon');
  options = { ...options, model: undefined };
};

export const draw = () => {
  if (!editor) return;

  const exporter = new ApollonExporter(editor.model);
  const { svg } = exporter.exportAsSVG();
  const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
  const svgBlobURL = URL.createObjectURL(svgBlob);
  window.open(svgBlobURL);
};
