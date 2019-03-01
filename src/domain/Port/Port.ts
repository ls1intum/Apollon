import Element from './../Element';

interface Port {
  element: string;
  location: 'N' | 'E' | 'S' | 'W';
}

class Port {
  static position(
    element: Element,
    location: Port['location']
  ): { x: number; y: number } {
    let { x, y, width, height } = element.bounds;
    switch (location) {
      case 'N':
        return { x: x + width / 2, y };
      case 'E':
        return { x: x + width, y: y + height / 2 };
      case 'S':
        return { x: x + width / 2, y: y + height };
      case 'W':
        return { x, y: y + height / 2 };
    }
  }
}

export default Port;
