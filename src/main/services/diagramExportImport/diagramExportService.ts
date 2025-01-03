import { ApollonEditor } from '../../apollon-editor';

export const exportDiagram = async (editor: ApollonEditor | null) => {
    if (!editor) return;
    const model = editor.model;
    
    // Add OCL constraints to the model before export
    const oclConstraints = localStorage.getItem('diagramOCL');
    if (oclConstraints) {
        model.oclConstraints = oclConstraints;
    }
    
    const jsonString = JSON.stringify(model, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagram_${model.type}_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const importDiagram = async (file: File, editor: ApollonEditor | null) => {
    if (!editor || !file) return;
    try {
        const text = await file.text();
        const jsonModel = JSON.parse(text);
        
        // Handle OCL constraints if present in the imported model
        if (jsonModel.oclConstraints) {
            localStorage.setItem('diagramOCL', jsonModel.oclConstraints);
            delete jsonModel.oclConstraints; // Remove from model before setting
        }
        
        editor.model = jsonModel;
        return true;
    } catch (error) {
        console.error('Error importing diagram:', error);
        throw new Error('Error importing diagram. Please check if the file is valid JSON.');
    }
};