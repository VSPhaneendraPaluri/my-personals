// Adapter: converts TIME_MACHINE_QUESTIONS (static schema) into the dynamic
// template shape that lib/pool.js and lib/question.js expect.
//
// All time-machine questions are compile-kind; their answer varies by standard
// (that IS the point — seeing the same code compile or fail across standards).
// The adapter's build() returns the correct expected value for the requested standard.

const RAW = require('../../time-machine');

module.exports = RAW.map((q) => ({
  id:       q.id,
  topic:    q.feature ? q.feature.replace(/_/g, ' ') : q.id,
  minStd:   '98',          // always include from C++98 upward
  kind:     'compile',
  timeMachine: true,       // flag for pool / goal logic

  build(_R, S, _ctx) {
    // Map standard key ('98','11','14','17') to schema key ('c++98', etc.)
    const schemaKey = 'c++' + S.key;
    const expected  = (q.answers_by_standard || {})[schemaKey] || 'error';
    return {
      kind:    'compile',
      code:    q.code,
      expected,
      explain: q.explanation,
      reference: q.reference || null,
    };
  },
}));
