const all = [
  ...require('./t98'), ...require('./t11'), ...require('./t14'), ...require('./t17'),
  ...require('./tcompile'),
  ...require('./tpoly'), ...require('./toverload'), ...require('./tstr'),
  ...require('./adapters/time-machine'),
];
const ids = new Set();
for (const t of all) {
  if (ids.has(t.id)) throw new Error('duplicate template id ' + t.id);
  ids.add(t.id);
}
// Every template must carry explicit domains / difficulty / reference (see meta.js).
module.exports = require('./meta').apply(all);
