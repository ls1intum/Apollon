import { Reconnectable } from './reconnectable/reconnectable-repository';
import { UMLRelationshipCommonRepository } from './uml-relationship-common-repository';

export const UMLRelationshipRepository = {
  ...UMLRelationshipCommonRepository,
  ...Reconnectable,
};
