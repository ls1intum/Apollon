export type UMLElementFeatures = {
  hoverable: boolean;
  selectable: boolean;
  movable: boolean;
  resizable: boolean | 'WIDTH' | 'HEIGHT';
  connectable: boolean;
  updatable: boolean;
  droppable: boolean;
  alternativePortVisualization: boolean;
};
