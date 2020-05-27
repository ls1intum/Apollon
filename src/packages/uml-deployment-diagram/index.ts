export const DeploymentElementType = {
  DeploymentNode: 'DeploymentNode',
  DeploymentArtifact: 'DeploymentArtifact',
  DeploymentInterface: 'DeploymentInterface',
} as const;

export const DeploymentRelationshipType = {
  DeploymentAssociation: 'DeploymentAssociation',
  DeploymentInterfaceProvided: 'DeploymentInterfaceProvided',
  DeploymentInterfaceRequired: 'DeploymentInterfaceRequired',
  DeploymentDependency: 'DeploymentDependency',
} as const;
