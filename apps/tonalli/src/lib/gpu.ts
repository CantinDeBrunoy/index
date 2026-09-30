/** Le WebGL est-il là ? Vérifié une fois, sur une toile jetable. */
let support: boolean | null = null;
export function webglAvailable(): boolean {
  if (support !== null) return support;
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl');
    support = Boolean(gl);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    support = false;
  }
  return support;
}
