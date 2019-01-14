import Element from './../Element';

interface Port {
  element: Element;
  location: 'N' | 'E' | 'S' | 'W';
}

export default Port;
