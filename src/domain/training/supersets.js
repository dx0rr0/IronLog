// Optional entry metadata: old routines/sessions remain ordinary exercises.
// A superset is a contiguous block. Its first entry owns the shared rests:
// restSeconds after each full round, transitionSeconds (optional) between
// one member's set and the next member's.
export function normalizeSupersets(entries = []) {
  const positions = new Map();
  entries.forEach((entry, index) => {
    if (typeof entry.supersetId !== 'string' || !entry.supersetId) return;
    const indices = positions.get(entry.supersetId) || [];
    indices.push(index);
    positions.set(entry.supersetId, indices);
  });
  return entries.map(entry => {
    if (!Object.hasOwn(entry, 'supersetId')) return entry;
    const indices = positions.get(entry.supersetId);
    const { supersetId, transitionSeconds, ...plain } = entry;
    if (!indices || indices.length < 2 || indices.at(-1) - indices[0] + 1 !== indices.length) return plain;
    return withTransition({ ...plain, supersetId, restSeconds: entries[indices[0]].restSeconds || 0 },
      entries[indices[0]].transitionSeconds);
  });
}

const withTransition = (entry, seconds) => {
  const { transitionSeconds, ...rest } = entry;
  return seconds > 0 ? { ...rest, transitionSeconds: seconds } : rest;
};

export function supersetInfo(entries, index) {
  const id = entries[index]?.supersetId;
  if (!id) return null;
  const indices = entries.flatMap((entry, i) => entry.supersetId === id ? [i] : []);
  if (indices.length < 2 || indices.at(-1) - indices[0] + 1 !== indices.length) return null;
  const start = indices[0], end = indices.at(-1);
  const ids = [...new Set(entries.slice(0, start + 1).map(e => e.supersetId).filter(Boolean))];
  return { id, start, end, number: ids.length, position: index - start + 1,
    size: indices.length, restSeconds: entries[start].restSeconds || 0,
    transitionSeconds: entries[start].transitionSeconds || 0 };
}

export function joinSuperset(entries, index, id) {
  const clean = normalizeSupersets(entries);
  const left = supersetInfo(clean, index);
  const start = left?.start ?? index, end = left?.end ?? index;
  if (!clean[index] || end + 1 >= clean.length) return clean;
  const right = supersetInfo(clean, end + 1);
  const last = right?.end ?? end + 1;
  const members = clean.slice(start, last + 1);
  const restSeconds = Math.max(...members.map(e => e.restSeconds || 0));
  const transitionSeconds = Math.max(...members.map(e => e.transitionSeconds || 0));
  return clean.map((entry, i) => i < start || i > last ? entry :
    withTransition({ ...entry, supersetId: left?.id || right?.id || id, restSeconds }, transitionSeconds));
}

export function splitSuperset(entries, index) {
  const group = supersetInfo(entries, index);
  return entries.map((entry, i) => {
    if (!group || i < group.start || i > group.end) return entry;
    const { supersetId, transitionSeconds, ...plain } = entry;
    return plain;
  });
}

export function moveTrainingEntry(entries, index, direction) {
  const clean = normalizeSupersets(entries);
  const group = supersetInfo(clean, index);
  const start = group?.start ?? index, end = group?.end ?? index;
  const adjacent = direction < 0 ? start - 1 : end + 1;
  if (adjacent < 0 || adjacent >= clean.length) return clean;
  const neighbor = supersetInfo(clean, adjacent);
  const otherStart = neighbor?.start ?? adjacent, otherEnd = neighbor?.end ?? adjacent;
  const block = clean.slice(start, end + 1), other = clean.slice(otherStart, otherEnd + 1);
  return direction < 0
    ? [...clean.slice(0, otherStart), ...block, ...other, ...clean.slice(end + 1)]
    : [...clean.slice(0, start), ...other, ...block, ...clean.slice(otherEnd + 1)];
}

// Rest settings are shared by the whole superset.
const SHARED_REST = ['restSeconds', 'transitionSeconds'];
export function updateTrainingEntry(entries, index, patch) {
  const group = supersetInfo(entries, index);
  const shared = Object.fromEntries(SHARED_REST.filter(key => Object.hasOwn(patch, key)).map(key => [key, patch[key]]));
  return entries.map((entry, i) => {
    const inGroup = group && i >= group.start && i <= group.end;
    if (i !== index && !(inGroup && Object.keys(shared).length)) return entry;
    const next = i === index ? { ...entry, ...patch } : { ...entry, ...shared };
    if (!Object.hasOwn(shared, 'transitionSeconds')) return next;
    return inGroup ? withTransition(next, shared.transitionSeconds) : next;
  });
}

// A round contains the same set index in every member that has that set.
// Unequal set counts are supported; completing out of order never rests early.
// Mid-round, the optional transition rest applies instead of the round rest.
export function restAfterSet(entries, entryIndex, setIndex) {
  return restDetailAfterSet(entries, entryIndex, setIndex).seconds;
}

export function restDetailAfterSet(entries, entryIndex, setIndex) {
  const entry = entries[entryIndex];
  if (!entry?.sets[setIndex]?.done) return { seconds: 0, transition: false };
  const group = supersetInfo(entries, entryIndex);
  if (!group) return { seconds: entry.restSeconds || 0, transition: false };
  const members = entries.slice(group.start, group.end + 1);
  const round = members.flatMap(member => member.sets[setIndex] ? [member.sets[setIndex]] : []);
  return round.every(set => set.done === true)
    ? { seconds: group.restSeconds, transition: false }
    : { seconds: group.transitionSeconds, transition: true };
}

export function nextSupersetSet(entries, index) {
  const group = supersetInfo(entries, index);
  if (!group) return null;
  const rounds = Math.max(...entries.slice(group.start, group.end + 1).map(e => e.sets.length));
  for (let setIndex = 0; setIndex < rounds; setIndex++) {
    for (let entryIndex = group.start; entryIndex <= group.end; entryIndex++) {
      const set = entries[entryIndex].sets[setIndex];
      if (set && !set.done) return { entryIndex, setIndex };
    }
  }
  return null;
}

// Drag-to-reorder works on blocks: a superset always travels as one unit.
export function trainingBlocks(entries = []) {
  const blocks = [];
  for (let i = 0; i < entries.length;) {
    const end = supersetInfo(entries, i)?.end ?? i;
    blocks.push({ start: i, end });
    i = end + 1;
  }
  return blocks;
}

export function moveTrainingBlock(entries, from, to) {
  const clean = normalizeSupersets(entries);
  const blocks = trainingBlocks(clean);
  if (from === to || !blocks[from] || !blocks[to]) return clean;
  const order = blocks.map(block => clean.slice(block.start, block.end + 1));
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);
  return order.flat();
}
