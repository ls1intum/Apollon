import { ApollonEditor } from '../../apollon-editor';
import { UMLModel } from '../../typings';

// Fonction d'exportation JSON
export const exportModelAsJSON = (editor: ApollonEditor, fileName: string = 'diagram.json') => {
    const modelData = { title: fileName, model: editor.model };
    const jsonContent = JSON.stringify(modelData);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};

// Fonction d'importation JSON
export const importModelFromJSON = (file: File, editor: ApollonEditor) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const jsonData = JSON.parse(event.target?.result as string);
        if (jsonData && jsonData.model) {
            editor.model = jsonData.model as UMLModel;
            console.log('Modèle importé avec succès depuis JSON');
        } else {
            console.error('Fichier JSON invalide');
        }
    };
    reader.readAsText(file);
};
