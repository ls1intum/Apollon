import Association, { AssociationComponent } from './Association';

class BidirectionalAssociation extends Association {
  readonly kind: string = 'BidirectionalAssociation';
}

export const BidirectionalAssociationComponent = AssociationComponent(null);

export default BidirectionalAssociation;
