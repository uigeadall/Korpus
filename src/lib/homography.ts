/**
 * Перспектива по четири точки: правоъгълник → произволен четириъгълник.
 *
 * Снимката на стена е стената в перспектива. Щом човек посочи четирите
 * ъгъла ѝ, има точно едно проективно преобразуване, което носи равния
 * чертеж върху тях — и правите остават прави, а далечният край се свива,
 * както на самата снимка. Смята се с осем уравнения за осем неизвестни.
 */

export interface P {
  x: number;
  y: number;
}

export type Quad = [P, P, P, P];

/**
 * Матрицата 3×3 по редове, с последен елемент 1, или null, ако точките
 * не правят четириъгълник (три на една права, две на едно място).
 */
export function homography(src: Quad, dst: Quad): number[] | null {
  // Изроден или разбъркан четириъгълник има решение на хартия, но
  // картината от него е обърната или сплескана — по-добре никаква.
  if (!isConvex(src) || !isConvex(dst)) return null;
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solve(A, b);
  return h ? [...h, 1] : null;
}

/** Гаус с избор на главен елемент — осем уравнения не искат повече. */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    if (Math.abs(M[pivot][col]) < 1e-10) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/** Къде отива точка. */
export function applyHomography(H: number[], p: P): P {
  const w = H[6] * p.x + H[7] * p.y + H[8];
  return { x: (H[0] * p.x + H[1] * p.y + H[2]) / w, y: (H[3] * p.x + H[4] * p.y + H[5]) / w };
}

/**
 * Същото като CSS преобразуване. `matrix3d` е по колони; третата ос не
 * участва, затова на нейните места стои единичната матрица.
 */
export function cssMatrix3d(H: number[]): string {
  const [a, b, c, d, e, f, g, h, i] = H;
  const n = (v: number) => (v / i).toFixed(10);
  return `matrix3d(${n(a)},${n(d)},0,${n(g)},${n(b)},${n(e)},0,${n(h)},0,0,1,0,${n(c)},${n(f)},0,${n(i)})`;
}

/** Изпъкнал ли е четириъгълникът — иначе ъглите са посочени разбъркано. */
export function isConvex(q: Quad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const c = q[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-9) return false;
    const s = Math.sign(cross);
    if (sign && s !== sign) return false;
    sign = s;
  }
  return true;
}
