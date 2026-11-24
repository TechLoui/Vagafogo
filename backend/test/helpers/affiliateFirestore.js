const nested = (value, key) => key.split('.').reduce((current, part) => current?.[part], value);
const copy = (value) => structuredClone(value);
exports.createAffiliateFirestore = (initial = {}) => {
  const records = new Map(Object.entries(initial).map(([key, value]) => [key, copy(value)]));
  let nextId = 1;
  const doc = (path) => ({
    path, id: path.split('/').at(-1),
    get: async () => ({ id: path.split('/').at(-1), ref: doc(path), exists: records.has(path), data: () => records.has(path) ? copy(records.get(path)) : undefined }),
    create: async (value) => { if (records.has(path)) throw new Error('already-exists'); records.set(path, copy(value)); },
    set: async (value, options = {}) => records.set(path, options.merge ? { ...records.get(path), ...copy(value) } : copy(value)),
    update: async (value) => { if (!records.has(path)) throw new Error('not-found'); records.set(path, { ...records.get(path), ...copy(value) }); },
    delete: async () => records.delete(path),
  });
  const query = (path, filters = [], cursor = '', limit = Infinity) => ({
    doc: (id = `generated_${nextId++}`) => doc(`${path}/${id}`),
    where: (key, op, value) => { if (op !== '==') throw new Error('test unsupported query'); return query(path, [...filters, [key, value]], cursor, limit); },
    orderBy: () => query(path, filters, cursor, limit),
    startAfter: (value) => query(path, filters, typeof value === 'string' ? value : value.id, limit),
    limit: (value) => query(path, filters, cursor, value),
    get: async () => {
      const rows = [...records].filter(([key, value]) => key.startsWith(`${path}/`) && key.slice(path.length + 1).split('/').length === 1
        && key.split('/').at(-1) > cursor && filters.every(([field, expected]) => nested(value, field) === expected))
        .sort(([left], [right]) => left.localeCompare(right)).slice(0, limit);
      const docs = await Promise.all(rows.map(([key]) => doc(key).get()));
      return { docs, size: docs.length, empty: docs.length === 0 };
    },
  });
  const db = {
    collection: (path) => query(path),
    runTransaction: async (callback) => {
      const pending = [];
      const tx = { get: (ref) => ref.get(), create: (ref, value) => pending.push(() => ref.create(value)),
        set: (ref, value, options) => pending.push(() => ref.set(value, options)), update: (ref, value) => pending.push(() => ref.update(value)) };
      const result = await callback(tx);
      for (const write of pending) await write();
      return result;
    },
  };
  return { db, records };
};
