export interface Entity {
  x: number,
  y: number,
  width: number,
  height: number,
  sprite: PIXI.Sprite,
  render: Function,
  update: Function
}
