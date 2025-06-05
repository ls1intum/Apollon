// Sequential Function Chart (Ablaufsprache, SFC)

export const SfcElementType = {
  SfcStart: 'SfcStart',
  SfcStep: 'SfcStep',
  SfcActionTable: 'SfcActionTable',
  SfcActionTableRow: 'SfcActionTableRow',
  SfcTransitionBranch: 'SfcTransitionBranch',
  SfcJump: 'SfcJump',
} as const;

export const SfcRelationshipType = {
  SfcTransition: 'SfcTransition',
} as const;
