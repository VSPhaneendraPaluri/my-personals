// The C++ standards offered in the UI. Scope is C++98/03 through C++17.
// `flag` is what is passed to g++.
//
// C++98 and C++03 are one bucket: C++03 was almost entirely a bug-fix release, so
// splitting it would starve the question pool. g++ treats -std=c++98 and -std=c++03
// identically.
//
// C++20 and newer are out of scope for this quiz. Their old question templates live in
// lib/templates/archive/ and are not loaded.
const ALL = [
  { key: '98', label: 'C++98/03', flag: 'c++98' },
  { key: '11', label: 'C++11', flag: 'c++11' },
  { key: '14', label: 'C++14', flag: 'c++14' },
  { key: '17', label: 'C++17', flag: 'c++17' },
].map((s, rank) => ({ enabled: true, ...s, rank }));

const byKey = Object.fromEntries(ALL.map((s) => [s.key, s]));
const rankOf = (key) => {
  if (!byKey[key]) throw new Error(`unknown standard "${key}" (supported: ${ALL.map((s) => s.key).join(', ')})`);
  return byKey[key].rank;
};

// Attach helper: S.ge('17') -> is this standard at least C++17?
for (const s of ALL) s.ge = (k) => s.rank >= rankOf(k);

const LIST = ALL.filter((s) => s.enabled);

module.exports = { STANDARDS: LIST, byKey, rankOf };
