// New JSON schema definition (Section 10 of cpp-quiz-organization.md).
//
// This file documents the schema and exports a validator. Question templates
// in lib/templates/ still produce questions dynamically; this schema is the
// target for any future static question bank (e.g. a questions.json file).
//
// Fields
// ─────────────────────────────────────────────────────────────────────────────
//   id                  Stable unique ID (string)
//   modes               Array — one or more of: learn | interview | language_lawyer | ub_hunter | time_machine
//   format              predict_output | compiles | find_bug | ub_classify | which_better | conceptual
//   domains             Array of domain tags (first is primary). See DOMAINS below.
//   feature             Short chip label shown on the card (e.g. "guaranteed_copy_elision")
//   difficulty          1 (beginner) | 2 (intermediate) | 3 (advanced)
//   code                C++ snippet (string)
//   options             Array of answer-choice strings (where applicable)
//   answers_by_standard Object: { "c++98": "ok"|"error"|<output>, "c++11": …, "c++14": …, "c++17": … }
//   explanation         Why the answer is right and why alternatives are wrong
//   reference           cppreference URL or ISO section
//   flags_independent   true if the answer is the same without -pedantic-errors
//   verified            Array of compiler/version strings the answer was tested against

const VALID_MODES   = ['learn', 'interview', 'language_lawyer', 'ub_hunter', 'time_machine'];
const VALID_FORMATS = ['predict_output', 'compiles', 'find_bug', 'ub_classify', 'which_better', 'conceptual'];
const VALID_DOMAINS = ['lifetime', 'move', 'classes', 'templates', 'constexpr', 'types', 'expressions', 'stl', 'lambdas', 'exceptions'];
const VALID_STDS    = ['c++98', 'c++11', 'c++14', 'c++17'];

function validate(q) {
  const errs = [];
  if (!q.id)                                              errs.push('missing id');
  if (!Array.isArray(q.modes) || !q.modes.length)        errs.push('modes must be a non-empty array');
  if (q.modes?.some((m) => !VALID_MODES.includes(m)))    errs.push('invalid mode: ' + q.modes.filter((m) => !VALID_MODES.includes(m)));
  if (!VALID_FORMATS.includes(q.format))                 errs.push('invalid format: ' + q.format);
  if (!Array.isArray(q.domains) || !q.domains.length)    errs.push('domains must be a non-empty array');
  if (q.domains?.some((d) => !VALID_DOMAINS.includes(d)))errs.push('invalid domain: ' + q.domains.filter((d) => !VALID_DOMAINS.includes(d)));
  if (![1, 2, 3].includes(q.difficulty))                 errs.push('difficulty must be 1, 2 or 3');
  if (typeof q.code !== 'string' && q.format !== 'conceptual') errs.push('code must be a string');
  if (!q.explanation)                                     errs.push('explanation is required');
  if (q.answers_by_standard) {
    for (const k of Object.keys(q.answers_by_standard)) {
      if (!VALID_STDS.includes(k)) errs.push('invalid standard key in answers_by_standard: ' + k);
    }
  }
  return errs;
}

// Example well-formed question (matches Section 10 example from the org doc)
const EXAMPLE = {
  id: 'copy-elision-deleted-copy-001',
  modes: ['learn', 'language_lawyer', 'time_machine'],
  format: 'compiles',
  domains: ['lifetime', 'classes'],
  feature: 'guaranteed_copy_elision',
  difficulty: 2,
  code: 'struct S { S() {} S(const S&) = delete; };\nS make() { return S(); }\nint main() { S s = make(); }',
  answers_by_standard: {
    'c++98': 'error',
    'c++11': 'error',
    'c++14': 'error',
    'c++17': 'ok',
  },
  explanation: 'Before C++17, returning by value required an accessible copy/move constructor even if elided. C++17 guarantees no copy happens for prvalues.',
  reference: 'https://en.cppreference.com/w/cpp/language/copy_elision',
  flags_independent: true,
  verified: ['gcc-13', 'clang-17'],
};

module.exports = { validate, VALID_MODES, VALID_FORMATS, VALID_DOMAINS, VALID_STDS, EXAMPLE };
