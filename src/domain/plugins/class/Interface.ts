import { Entity, EntityKind } from "./../../../core/domain";
import { Point, Size } from '../../../core/geometry';
import Element from './../../Element';

class Interface extends Element implements Entity {
  kind = EntityKind.Interface;
  attributes = [];
  methods = [];
  renderMode = { showAttributes: true, showMethods: true };

  constructor(public name: string, public position: Point, public size: Size) {
    super();
  }
}

export default Interface;
