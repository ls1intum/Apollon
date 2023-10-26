export const ComponentElementType = {
  Component: 'Component',
  Subsystem: 'Subsystem',
  ComponentInterface: 'ComponentInterface',
} as const;

export const ComponentRelationshipType = {
  ComponentInterfaceProvided: 'ComponentInterfaceProvided',
  ComponentInterfaceRequired: 'ComponentInterfaceRequired',
  ComponentDependency: 'ComponentDependency',
} as const;
