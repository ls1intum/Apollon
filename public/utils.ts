import * as Apollon from '../src/main';

export const getDiagramData = (editor: Apollon.ApollonEditor | null) => {
  if (!editor || !editor.model) {
    console.warn("Editor doesn't exist or is not fully initialized");
    return null;
  }

  console.log("Retrieving diagram data");  // Ajout d'un log pour vérifier que la fonction est appelée
  const model: Apollon.UMLModel = editor.model;
  return model;
};
