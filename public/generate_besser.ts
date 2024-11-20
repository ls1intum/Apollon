import { getDiagramData } from './utils';
console.log("generate_besser.ts is loaded");

// Fonction pour envoyer une requête au backend pour générer la sortie en fonction du générateur sélectionné
export async function generateOutput(generatorType: string) {
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
  const convertButton = document.getElementById('convertButton');
  const importBumlFile = document.getElementById('import-buml-file');

  if (generateButton && generatorSelect) {
    generateButton.addEventListener('click', () => {
      const selectedGenerator = generatorSelect.value;
      generateOutput(selectedGenerator);
    });
  }

  // Utiliser l'input file existant au lieu d'en créer un nouveau
  if (convertButton && importBumlFile) {
    convertButton.addEventListener('click', () => {
      (importBumlFile as HTMLInputElement).click();
    });
  }
}

// Extend the window.apollon object with our functions
declare global {
  interface Window {
    apollon: any;
  }
}

window.addEventListener('load', () => {
  setupGenerateButton();
  
  // Ajouter une seule fonction de conversion
  window.apollon = {
    ...window.apollon,
    generateCode: (generatorType: string) => {
      generateOutput(generatorType);
    },
    convertBumlToJson: async (file: File) => {
      if (!file) return;
      console.log("Converting file:", file.name);
      await convertBumlToJson(file);  // Une seule conversion
    }
  };
});

// Export the function
export async function convertBumlToJson(file: File) {
  try {
    console.log("Starting BUML to JSON conversion...");
    const formData = new FormData();
    formData.append('buml_file', file);

    const response = await fetch('http://localhost:8000/get-json-model', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const textData = await response.text();
      console.log("Raw response:", textData);
      const jsonData = JSON.parse(textData);
      
      const editorInstance = (window as any).editor;
      if (editorInstance && editorInstance.model) {
        console.log("Updating editor model...");
        try {
          editorInstance.model = jsonData.model;
          window.apollon.save();
          console.log("Editor model updated and saved to localStorage");
        } catch (editorError) {
          console.error("Failed to update editor:", editorError);
        }
      }
    }
  } catch (error) {
    console.error('Error during conversion:', error);
  }
}



// // Export the function
// export async function convertBumlToJsonDownload(file: File) {
//   try {
//     console.log("Starting BUML to JSON conversion...");
//     console.log("File being sent:", file);

//     const formData = new FormData();
//     formData.append('buml_file', file);

//     console.log("Sending request to backend...");
//     const response = await fetch('http://localhost:8000/get-json-model', {
//       method: 'POST',
//       body: formData
//     });

//     console.log("Response status:", response.status);
//     console.log("Response headers:", response.headers);

//     if (response.ok) {
//       let jsonData;
//       try {
//         const textData = await response.text();
//         console.log("Raw response:", textData);
//         jsonData = JSON.parse(textData);
//       } catch (parseError) {
//         console.error("Failed to parse response as JSON:", parseError);
//         return;
//       }

//       console.log("Parsed JSON data:", jsonData);
      
//       // Update the editor with the new JSON data
//       const editorInstance = (window as any).editor;
//       if (editorInstance && editorInstance.model) {
//         console.log("Updating editor model...");
//         try {
//           editorInstance.model.loadData(jsonData);
//           console.log("Editor model updated successfully");
//         } catch (editorError) {
//           console.error("Failed to update editor:", editorError);
//         }

//         // Create and trigger download of JSON file
//         try {
//           const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
//           const url = window.URL.createObjectURL(jsonBlob);
//           const a = document.createElement('a');
//           a.href = url;
//           a.download = 'converted_model.json';
//           document.body.appendChild(a);
//           a.click();
//           a.remove();
//           window.URL.revokeObjectURL(url);
//           console.log("JSON file download triggered");
//         } catch (downloadError) {
//           console.error("Failed to create download:", downloadError);
//         }
//       } else {
//         console.error("Editor is not properly initialized!", editorInstance);
//       }
//     } else {
//       const errorText = await response.text();
//       console.error('Error response from server:', errorText);
//     }
//   } catch (error) {
//     console.error('Error during conversion:', error);
//   }
// }