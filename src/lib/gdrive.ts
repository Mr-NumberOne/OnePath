const FILENAME = 'ConsultantRoadmapBackup.json';

export interface BackupFile {
  id: string;
  modifiedTime?: string; // ISO timestamp from Drive
}

// Finds the backup file if it exists. The drive.file scope only sees
// files this app created; if there are several, the newest one wins.
export async function findBackup(accessToken: string): Promise<BackupFile | null> {
  const params = new URLSearchParams({
    q: `name='${FILENAME}' and trashed=false`,
    spaces: 'drive',
    orderBy: 'modifiedTime desc',
    fields: 'files(id,modifiedTime)',
    pageSize: '1',
  });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to search for backup file in Google Drive: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return { id: data.files[0].id, modifiedTime: data.files[0].modifiedTime };
  }
  return null;
}

// Helper to find the file ID if it exists
export async function checkBackupExists(accessToken: string): Promise<string | null> {
  return (await findBackup(accessToken))?.id ?? null;
}

export async function backupToDrive(accessToken: string, data: unknown): Promise<void> {
  const fileId = await checkBackupExists(accessToken);
  const fileContent = JSON.stringify(data);
  const metadata = {
    name: FILENAME,
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'application/json' }));

  let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  let method = 'POST';

  if (fileId) {
    // Update existing file
    url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
    method = 'PATCH';
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload backup to Google Drive: ${response.status} ${errorText}`);
  }
}

// Downloads the backup without applying it, with the time Drive last saw it change
export async function downloadBackup(accessToken: string): Promise<{ data: unknown; modifiedTime?: string }> {
  const file = await findBackup(accessToken);
  if (!file) {
    throw new Error('No backup file found in Google Drive');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to download backup from Google Drive: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return { data, modifiedTime: file.modifiedTime };
}
