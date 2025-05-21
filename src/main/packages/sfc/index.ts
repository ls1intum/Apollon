// Sequential Function Chart (Ablaufsprache, SFC)

export const SfcElementType = {
  PrototypeRectangle: 'PrototypeRectangle',
  PrototypeLabel: 'PrototypeLabel',
  SfcStep: 'SfcStep',
  SfcStart: 'SfcStart',
  SfcActionTable: 'SfcActionTable',
  SfcActionTableRow: 'SfcActionTableRow',
  SfcEnd: 'SfcEnd',
} as const;

export const SfcRelationshipType = {
  SfcTransition: 'SfcTransition',
} as const;
