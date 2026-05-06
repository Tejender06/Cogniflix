/*
FILE: embedding.js

PURPOSE:
Utility functions for computing vector cosine similarities and vector math.

FLOW:
Called natively as utility

USED BY:
embedding.service.js, recommendation.service.js

NEXT FLOW:
N/A

*/
export function generatePseudoEmbedding(title, genre, language) {
  const seed = (title || '') + (genre || '') + (language || '');
  const dims = 1536;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const vec = new Array(dims);
  for (let i = 0; i < dims; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) | 0;
    vec[i] = ((h >>> 0) / 0xFFFFFFFF) - 0.5;
  }
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return mag === 0 ? vec : vec.map(v => v / mag);
}
