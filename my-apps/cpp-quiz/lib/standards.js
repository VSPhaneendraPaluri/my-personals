// The C++ standards offered in the drop-down. `flag` is what is passed to g++.
// Ranks follow the real standard order. C++20 and C++23 are switched off for now
// (set `enabled: true` to bring them back; their templates are already written).
const ALL = [
  { key: '98', label: 'C++98', flag: 'c++98' },
  { key: '11', label: 'C++11', flag: 'c++11' },
  { key: '14', label: 'C++14', flag: 'c++14' },
  { key: '17', label: 'C++17', flag: 'c++17', enabled: false },
  { key: '20', label: 'C++20', flag: 'c++20', enabled: false },
  { key: '23', label: 'C++23', flag: 'c++23', enabled: false },
  { key: '26', label: 'C++26', flag: 'c++2c' },
].map((s, rank) => ({ enabled: true, ...s, rank }));

const byKey = Object.fromEntries(ALL.map((s) => [s.key, s]));
const rankOf = (key) => byKey[key].rank;

// Attach helper: S.ge('17') -> is this standard at least C++17?
for (const s of ALL) s.ge = (k) => s.rank >= rankOf(k);

const LIST = ALL.filter((s) => s.enabled);

module.exports = { STANDARDS: LIST, byKey, rankOf };
