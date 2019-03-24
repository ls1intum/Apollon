import Classifier from '../Classifier';
import { ElementKind, UMLClassifier } from '../..';
import Element from '../../../../Element';

class Enumeration extends Classifier {
  kind = ElementKind.Enumeration;

  static toUMLElement(
    element: Classifier,
    children: Element[]
  ): { element: UMLClassifier; children: Element[] } {
    return Classifier.toUMLElement(element, children);
  }

  static fromUMLElement(umlElement: UMLClassifier): Element {
    return Classifier.fromUMLElement(umlElement);
  }
}

export default Enumeration;
