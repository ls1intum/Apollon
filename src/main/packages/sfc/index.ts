// Sequential Function Chart (Ablaufsprache, SFC)

export const SfcElementType = {
  PrototypeRectangle: 'PrototypeRectangle',
  PrototypeLabel: 'PrototypeLabel',
  SfcStep: 'SfcStep',
  SfcStart: 'SfcStart',
  SfcEnd: 'SfcEnd',
} as const;

export const SfcRelationshipType = {
  SfcLink: 'SfcLink',
} as const;
