// Tiny random helpers shared by all question templates.
const R = {
  int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  sample: (arr, n) => R.shuffle(arr).slice(0, n),
  ints: (n, lo, hi) => Array.from({ length: n }, () => R.int(lo, hi)),
  distinct(n, lo, hi) {
    const s = new Set();
    while (s.size < n) s.add(R.int(lo, hi));
    return [...s];
  },
};
module.exports = R;
