const { Timestamp } = require("firebase-admin/firestore");

function reservationFlowFixture(seed) {
  const rows = new Map();
  const writes = [];
  const copy = (value) => {
    if (value instanceof Date) return Timestamp.fromDate(value);
    if (Array.isArray(value)) return value.map(copy);
    if (value && typeof value === "object" && value.constructor === Object) {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)]));
    }
    return value;
  };
  const apply = (ref, data, merge = true) => {
    const result = merge ? { ...rows.get(ref.path) } : {};
    for (const [key, item] of Object.entries(data)) {
      const transform = item?.constructor?.name;
      if (transform === "DeleteTransform") delete result[key];
      else if (transform === "NumericIncrementTransform") result[key] = Number(result[key] || 0) + item.operand;
      else if (transform === "ServerTimestampTransform") result[key] = Timestamp.now();
      else if (item !== undefined) result[key] = copy(item);
    }
    rows.set(ref.path, result);
    writes.push(ref.path);
  };
  const document = (path) => ({
    id: path.split("/").at(-1),
    path,
    async get() { return snapshot(this); },
    async set(data, options) { apply(this, data, options?.merge === true); },
    async update(data) { apply(this, data); },
    async delete() { rows.delete(path); writes.push(path); },
    collection(name) { return collection(path + "/" + name); },
  });
  const snapshot = (ref) => ({
    id: ref.id,
    ref,
    exists: rows.has(ref.path),
    data: () => copy(rows.get(ref.path)),
  });
  const collection = (path, filters = [], maximum = Infinity) => ({
    path,
    doc: (id) => document(path + "/" + id),
    where(field, operation, value) { return collection(path, [...filters, { field, operation, value }], maximum); },
    limit(value) { return collection(path, filters, value); },
    async get() {
      const docs = [...rows].filter(([key, data]) => key.startsWith(path + "/")
        && key.slice(path.length + 1).indexOf("/") === -1
        && filters.every(({ field, operation, value }) => {
          if (operation === "==") return data[field] === value;
          if (operation === ">=") return data[field] >= value;
          if (operation === "<") return data[field] < value;
          throw new Error("Unsupported query: " + operation);
        })).slice(0, maximum).map(([key]) => snapshot(document(key)));
      return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn) => docs.forEach(fn) };
    },
  });
  const batch = () => {
    const operations = [];
    const result = {
      set(ref, data, options) { operations.push(() => apply(ref, data, options?.merge === true)); return result; },
      update(ref, data) { operations.push(() => apply(ref, data)); return result; },
      delete(ref) { operations.push(() => rows.delete(ref.path)); return result; },
      async commit() { operations.forEach((operation) => operation()); },
    };
    return result;
  };
  let transactionTail = Promise.resolve();
  const db = {
    collection,
    batch,
    runTransaction(callback) {
      const next = transactionTail.then(async () => {
        const operations = [];
        const result = await callback({
          get: (ref) => ref.get(),
          create: (ref, data) => operations.push(() => {
            if (rows.has(ref.path)) throw new Error("ALREADY_EXISTS");
            apply(ref, data, false);
          }),
          update: (ref, data) => operations.push(() => apply(ref, data)),
          set: (ref, data, options) => operations.push(() => apply(ref, data, options?.merge === true)),
          delete: (ref) => operations.push(() => rows.delete(ref.path)),
        });
        operations.forEach((operation) => operation());
        return result;
      });
      transactionTail = next.catch(() => {});
      return next;
    },
  };
  Object.entries(seed).forEach(([path, data]) => rows.set(path, copy(data)));
  const clientSnapshot = (snap) => ({ ...snap, exists: () => snap.exists });
  const firestore = {
    Timestamp,
    collection: (_db, path) => collection(path),
    doc: (_db, path, id) => document(path + "/" + id),
    where: (field, operation, value) => ({ field, operation, value }),
    limit: (maximum) => ({ maximum }),
    query: (ref, ...constraints) => constraints.reduce((current, item) => item.maximum
      ? current.limit(item.maximum) : current.where(item.field, item.operation, item.value), ref),
    getDoc: async (ref) => clientSnapshot(await ref.get()),
    getDocs: async (ref) => {
      const snap = await ref.get();
      const docs = snap.docs.map(clientSnapshot);
      return { ...snap, docs, forEach: (fn) => docs.forEach(fn) };
    },
    setDoc: (ref, data, options) => ref.set(data, options),
    updateDoc: (ref, data) => ref.update(data),
    deleteDoc: (ref) => ref.delete(),
    deleteField: () => require("firebase-admin/firestore").FieldValue.delete(),
  };
  return { db, firestore, rows, writes, value: (path) => copy(rows.get(path)) };
}

module.exports = { reservationFlowFixture };
