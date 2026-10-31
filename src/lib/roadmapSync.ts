import type { Phase, PhaseStep, ResourceLink } from '@/types';

// Keeps the English and Arabic phase lists structurally in sync while each
// language keeps its own text. Only the change just made is mirrored (what
// was added, removed or reordered), so existing differences between the two
// languages are never wiped out.

export type Language = 'en' | 'ar';

export const otherLanguage = (lang: Language): Language => (lang === 'en' ? 'ar' : 'en');

const ids = <T extends { id: string }>(items: T[] | undefined) => new Set((items || []).map((i) => i.id));

// Applies the additions and removals between prev and next to target,
// keeping target's own text for items it already has.
function mirrorListChange<T extends { id: string }>(
  prev: T[] | undefined,
  next: T[] | undefined,
  target: T[] | undefined,
): T[] | undefined {
  const prevIds = ids(prev);
  const nextIds = ids(next);
  const added = (next || []).filter((item) => !prevIds.has(item.id));
  const removed = new Set([...prevIds].filter((id) => !nextIds.has(id)));
  if (added.length === 0 && removed.size === 0) return target;

  const targetIds = ids(target);
  return [
    ...(target || []).filter((item) => !removed.has(item.id)),
    ...added.filter((item) => !targetIds.has(item.id)).map((item) => structuredClone(item)),
  ];
}

function syncSteps(prev: PhaseStep[] | undefined, next: PhaseStep[] | undefined, target: PhaseStep[] | undefined) {
  const mirrored = mirrorListChange(prev, next, target);
  if (!mirrored) return mirrored;

  const prevById = new Map((prev || []).map((s) => [s.id, s]));
  const nextById = new Map((next || []).map((s) => [s.id, s]));
  return mirrored.map((step) => {
    const before = prevById.get(step.id);
    const after = nextById.get(step.id);
    if (!before || !after) return step;
    return {
      ...step,
      order: before.order !== after.order ? after.order : step.order,
      resources: mirrorListChange<ResourceLink>(before.resources, after.resources, step.resources),
    };
  });
}

// Mirrors an edit of one phase (prev -> next) onto the other language's list.
export function syncPhaseUpdate(otherPhases: Phase[], prev: Phase, next: Phase): Phase[] {
  const otherIds = ids(otherPhases);
  return otherPhases.map((target) => {
    if (target.id !== next.id) return target;

    const synced: Phase = { ...target };
    if (prev.estimatedHours !== next.estimatedHours) synced.estimatedHours = next.estimatedHours;
    if (prev.order !== next.order) synced.order = next.order;
    if (JSON.stringify(prev.prerequisites) !== JSON.stringify(next.prerequisites)) {
      synced.prerequisites = next.prerequisites.filter((id) => otherIds.has(id));
    }
    synced.steps = syncSteps(prev.steps, next.steps, target.steps);
    synced.resources = mirrorListChange(prev.resources, next.resources, target.resources);
    return synced;
  });
}

// Adds a new phase to the other language with the same ID; its text starts
// as a copy to be translated.
export function syncPhaseAdd(otherPhases: Phase[], added: Phase): Phase[] {
  if (otherPhases.some((p) => p.id === added.id)) return otherPhases;
  return [...otherPhases, structuredClone(added)];
}

// Removes a phase (and references to it) from a language's list.
export function removePhase(phases: Phase[], phaseId: string): Phase[] {
  return phases
    .filter((p) => p.id !== phaseId)
    .map((p) => ({ ...p, prerequisites: p.prerequisites.filter((id) => id !== phaseId) }));
}
