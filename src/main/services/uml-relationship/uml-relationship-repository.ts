import { Reconnectable } from './reconnectable/reconnectable-repository';
import { ConnectionLayoutableRepository } from './connectionlayoutable/connectionlayoutable-repository';
import { UMLRelationshipCommonRepository } from './uml-relationship-common-repository';

export const UMLRelationshipRepository = {
  ...UMLRelationshipCommonRepository,
  ...Reconnectable,
  ...ConnectionLayoutableRepository,
};
