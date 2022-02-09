import { Reconnectable } from './reconnectable/reconnectable-repository.js';
import { UMLRelationshipCommonRepository } from './uml-relationship-common-repository.js';

export const UMLRelationshipRepository = {
  ...UMLRelationshipCommonRepository,
  ...Reconnectable,
};
