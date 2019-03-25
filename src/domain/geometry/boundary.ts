export interface Boundary {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Boundary {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number
  ) {}
}
