import Element from './../Element';

abstract class Container extends Element {
  ownedElements: string[] = [];
}

export default Container;
