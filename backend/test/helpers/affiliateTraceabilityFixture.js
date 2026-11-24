const { randomUUID } = require('node:crypto');
const { reservationFlowFixture } = require('./reservationFlowFixture');

// Keep one shared store for the real services' Admin SDK and Web SDK calls.
// Extends the existing payment fixture without changing its other test users.
exports.affiliateTraceabilityFixture = (seed) => {
  const fixture = reservationFlowFixture(seed);
  const originalCollection = fixture.db.collection;
  const nested = (value, field) => String(field).split('.').reduce((current, key) => current?.[key], value);
  const document = (path) => {
    const parts = path.split('/');
    const id = parts.pop();
    const original = originalCollection(parts.join('/')).doc(id);
    const ref = {
      ...original,
      get: async () => ({ id, ref, exists: fixture.rows.has(path), data: () => fixture.value(path) }),
      create: async (value) => {
        if (fixture.rows.has(path)) throw new Error('ALREADY_EXISTS');
        await original.set(value);
      },
      collection: (name) => query(path + '/' + name),
    };
    return ref;
  };
  const query = (path, filters = [], maximum = Infinity, cursor = '') => ({
    path,
    doc: (id = randomUUID()) => document(path + '/' + id),
    where: (field, operation, value) => query(path, [...filters, { field, operation, value }], maximum, cursor),
    orderBy: () => query(path, filters, maximum, cursor),
    startAfter: (value) => query(path, filters, maximum, typeof value === 'string' ? value : value.id),
    limit: (value) => query(path, filters, value, cursor),
    get: async () => {
      const docs = [...fixture.rows].filter(([key, value]) => key.startsWith(path + '/')
        && !key.slice(path.length + 1).includes('/') && key.slice(path.length + 1) > cursor
        && filters.every(({ field, operation, value: expected }) => {
          const actual = nested(value, field);
          if (operation === '==') return actual === expected;
          if (operation === '>=') return actual >= expected;
          if (operation === '<') return actual < expected;
          if (operation === 'in') return expected.includes(actual);
          throw new Error('Unsupported fixture operation: ' + operation);
        })).map(([key]) => document(key)).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).slice(0, maximum);
      const snapshots = await Promise.all(docs.map((ref) => ref.get()));
      return { docs: snapshots, size: snapshots.length, empty: snapshots.length === 0, forEach: (fn) => snapshots.forEach(fn) };
    },
  });
  fixture.db.collection = query;
  fixture.firestore.collection = (_db, path) => query(path);
  fixture.firestore.doc = (...args) => args.length === 3 ? document(args[1] + '/' + args[2])
    : args[0]?.path ? document(args[0].path + '/' + args[1]) : document(args[1]);
  return fixture;
};
