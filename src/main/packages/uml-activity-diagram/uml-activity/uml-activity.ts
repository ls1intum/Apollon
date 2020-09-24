import { ActivityElementType, ActivityRelationshipType } from '..';
import { UMLPackage } from '../../common/uml-package/uml-package';

export class UMLActivity extends UMLPackage {
  static supportedRelationships = [ActivityRelationshipType.ActivityControlFlow];
  type = ActivityElementType.Activity;
}
