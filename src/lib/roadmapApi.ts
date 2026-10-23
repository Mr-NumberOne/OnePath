import { RoadmapConfig } from '@/types';

// Replaces all stored roadmaps. Throws when the server rejects the save, so
// callers never report success for data that wasn't written.
export async function saveRoadmaps(roadmaps: RoadmapConfig[]): Promise<void> {
  const res = await fetch('/api/roadmaps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roadmaps),
  });

  if (!res.ok) {
    let message = `Saving roadmaps failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = `${message}: ${body.error}`;
    } catch {
      // Non-JSON error body; keep the status message
    }
    throw new Error(message);
  }
}
