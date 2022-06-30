export const ActivityElementType = {
  Activity: 'Activity',
  ActivityActionNode: 'ActivityActionNode',
  ActivityFinalNode: 'ActivityFinalNode',
  ActivityForkNode: 'ActivityForkNode',
  ActivityForkNodeHorizontal: 'ActivityForkNodeHorizontal',
  ActivityInitialNode: 'ActivityInitialNode',
  ActivityMergeNode: 'ActivityMergeNode',
  ActivityObjectNode: 'ActivityObjectNode',
} as const;

export const ActivityRelationshipType = {
  ActivityControlFlow: 'ActivityControlFlow',
} as const;
