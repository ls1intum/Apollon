import * as Apollon from '../src/main';

export const getDiagramData = (editor: Apollon.ApollonEditor | null) => {
    if (!editor || !editor.model) {
        console.warn("Editor doesn't exist or is not fully initialized");
        return null;
    }
    console.log("Retrieving diagram data");
    
    // Get the current model and ensure type is set
    const model = editor.model;
    console.log("Current diagram type:", model.type);
    
    // Force refresh the type from the editor's current state
    const currentType = editor.model.type;
    
    return {
        ...model,
        type: currentType
    };
};