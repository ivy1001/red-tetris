import { Piece, COLOR_BY_TYPE } from '../src/game/entities/piece.entity';

describe('Piece', () => {
  it('initializes with default spawn x and y=0', () => {
    const p = new Piece('I');
    expect(p.type).toBe('I');
    expect(p.x).toBe(3);
    expect(p.y).toBe(0);
    expect(p.rotation).toBe(0);
  });

  it('O piece spawns at x=4', () => {
    expect(new Piece('O').x).toBe(4);
  });

  it('rotated returns a new piece with incremented rotation', () => {
    const p = new Piece('T');
    const r = p.rotated();
    expect(r.rotation).toBe(1);
    expect(p.rotation).toBe(0);
    expect(r).not.toBe(p);
  });

  it('rotation wraps at 4', () => {
    const p = new Piece('T', 3, 0, 3);
    expect(p.rotated().rotation).toBe(0);
  });

  it('moved returns a new piece with delta applied', () => {
    const p = new Piece('T', 3, 5);
    const m = p.moved(1, -2);
    expect(m.x).toBe(4);
    expect(m.y).toBe(3);
    expect(p.x).toBe(3);
    expect(p.y).toBe(5);
  });

  it('clone returns identical piece values', () => {
    const p = new Piece('L', 4, 6, 2);
    const c = p.clone();
    expect(c.type).toBe('L');
    expect(c.x).toBe(4);
    expect(c.y).toBe(6);
    expect(c.rotation).toBe(2);
    expect(c).not.toBe(p);
  });

  it('getMatrix returns a non-empty matrix', () => {
    const matrix = new Piece('I').getMatrix();
    expect(matrix.length).toBeGreaterThan(0);
    expect(matrix[0].length).toBeGreaterThan(0);
  });

  it('color is consistent regardless of rotation', () => {
    const p1 = new Piece('S', 3, 0, 0);
    const p2 = new Piece('S', 3, 0, 2);
    expect(p1.getColor()).toBe(p2.getColor());
    expect(p1.getColor()).toBe(COLOR_BY_TYPE.S);
  });

  it('randomType returns one of the 7 tetromino types', () => {
    const valid = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    for (let i = 0; i < 30; i++) {
      expect(valid).toContain(Piece.randomType());
    }
  });
});
