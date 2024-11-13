import { getDiagramData } from './utils';
console.log("generate_besser.ts is loaded");

// Fonction pour envoyer une requête au backend pour générer la sortie en fonction du générateur sélectionné
async function generateOutput(generatorType: string) {
  try {
    console.log("Generating output with generator type: ", generatorType);
    const editorInstance = (window as any).editor;

    if (!editorInstance || !editorInstance.model) {
      console.error("Editor is not properly initialized or doesn't have a model yet!");
      return;
    }

    const diagramData = getDiagramData(editorInstance);
    if (!diagramData) {
      console.error("Aucune donnée de diagramme disponible !");
      return;
    }

    console.log("Sending data to backend...");
    const response = await fetch('http://localhost:8000/generate-output', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        elements: diagramData,
        generator: generatorType,
      }),
    });

    if (response.ok) {
      console.log("Output generated successfully");
      const blob = await response.blob();
      
      // Déterminer le nom du fichier en fonction du générateur sélectionné
      let filename;
      switch (generatorType) {
        case 'python':
          filename = 'classes.py';
          break;
        case 'java':
          filename = 'Class.java';
          break;
        case 'json':
          filename = 'domain_model.json';
          break;
        case 'django':
          filename = 'models.py';
          break;
        case 'pydantic':
          filename = 'pydantic_classes.py';
          break;
        case 'sqlalchemy':
          filename = 'sql_alchemy.py';
          break;
        case 'sql':
          filename = 'tables.sql';
          break;
        default:
          filename = 'domain_model.py';
          break;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      console.error('Erreur lors de la génération du fichier:', response.statusText);
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Fonction pour gérer l'événement du bouton de génération
function setupGenerateButton() {
  console.log("Setting up generate button");
  const generateButton = document.getElementById('generateButton');
  const generatorSelect = document.getElementById('generatorSelect') as HTMLSelectElement;

  if (generateButton && generatorSelect) {
    console.log("Generate button and generator select found");
    generateButton.addEventListener('click', () => {
      console.log("Generate button clicked");
      const selectedGenerator = generatorSelect.value;

      // Appelle la fonction pour générer la sortie en fonction du générateur sélectionné
      generateOutput(selectedGenerator);
    });
  }
}

// Appel de la fonction pour initialiser l'écouteur d'événements sur le bouton
window.addEventListener('load', setupGenerateButton);
