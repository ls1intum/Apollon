export const enum ActionTypes {
  UPDATE = '@@option/UPDATE',
}

export const enum ApollonMode {
  Full = 'FULL',
  ModelingOnly = 'MODELING_ONLY',
  ReadOnly = 'READ_ONLY',
}

export const enum EditorMode {
  ModelingView = 'MODELING_VIEW',
  InteractiveElementsView = 'INTERACTIVE_AREAS_VIEW',
}

export const enum InteractiveElementsMode {
  Hidden = 'HIDDEN',
  Highlighted = 'HIGHLIGHTED',
}

export interface EditorState {
  readonly gridSize: number;
  readonly mode: ApollonMode;
  readonly editorMode: EditorMode;
  readonly interactiveMode: InteractiveElementsMode;
}
