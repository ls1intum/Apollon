import { ApollonEditor } from '../../apollon-editor';

export const exportDiagram = (editor: ApollonEditor | null, fileName: string = 'diagram.json') => {
    if (!editor) {
        console.warn("Editor is not initialized.");
        return;
    }

    try {
        const modelData = { title: fileName, model: editor.model };
        const jsonContent = JSON.stringify(modelData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error("Error exporting diagram:", error);
    }
};


export const importDiagram = (file: File, editor: ApollonEditor | null) => {
    if (!editor) {
        console.warn("Editor is not initialized.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const jsonData = JSON.parse(event.target?.result as string);
        if (jsonData && jsonData.model) {
            editor.model = jsonData.model;
            console.log("Diagram successfully imported from JSON");
        } else {
            console.error("Invalid JSON file");
        }
    };
    reader.readAsText(file);
};