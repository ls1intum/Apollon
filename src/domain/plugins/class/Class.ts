import { Entity, EntityKind } from "./../../../core/domain";
import { Point, Size } from '../../../core/geometry';
import Element from './../../Element';

class Class extends Element implements Entity {
  kind = EntityKind.Class;
  attributes = [];
  methods = [];
  renderMode = { showAttributes: true, showMethods: true };

  constructor(public name: string, public position: Point, public size: Size) {
    super();
  }
}

export default Class;
