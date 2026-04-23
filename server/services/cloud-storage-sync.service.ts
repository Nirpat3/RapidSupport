/**
 * Cloud Storage Sync Service
 * Implements real file synchronization from Google Drive, OneDrive, and Dropbox
 * into the Nova AI knowledge base.
 */

import { db } from "../db";
import {
  cloudStorageConnections,
  cloudStorageFolders,
  cloudStorageSyncRuns,
  knowledgeBase,
} from "../../shared/schema";
import { eq } from "drizzle-orm";

interface SyncResult {
  filesDiscovered: number;
  filesProcessed: number;
  filesImported: number;
  filesSkipped: number;
  errors: string[];
}

interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedAt?: string;
  downloadUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Refresh Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function refreshGoogleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await resp.json()) as any;
  if (!data.access_token) throw new Error("Failed to refresh Google token");
  return data.access_token as string;
}

async function refreshMicrosoftToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const resp = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "Files.Read User.Read offline_access",
      }),
    }
  );
  const data = (await resp.json()) as any;
  if (!data.access_token) throw new Error("Failed to refresh Microsoft token");
  return data.access_token as string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Drive
// ─────────────────────────────────────────────────────────────────────────────

const GOOGLE_EXPORTABLE_TYPES: Record<string, { mime: string; ext: string }> = {
  "application/vnd.google-apps.document": {
    mime: "text/plain",
    ext: ".txt",
  },
  "application/vnd.google-apps.spreadsheet": {
    mime: "text/csv",
    ext: ".csv",
  },
  "application/vnd.google-apps.presentation": {
    mime: "text/plain",
    ext: ".txt",
  },
};

async function listGoogleDriveFiles(
  accessToken: string,
  folderId: string
): Promise<FileItem[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent("files(id,name,mimeType,size,modifiedTime)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=100`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google Drive list error: ${resp.status} ${err}`);
  }

  const data = (await resp.json()) as { files: any[] };
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: parseInt(f.size || "0"),
    modifiedAt: f.modifiedTime,
  }));
}

async function downloadGoogleDriveFile(
  accessToken: string,
  file: FileItem
): Promise<string | null> {
  let url: string;

  const exportable = GOOGLE_EXPORTABLE_TYPES[file.mimeType];
  if (exportable) {
    url = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportable.mime)}`;
  } else if (
    file.mimeType === "text/plain" ||
    file.mimeType === "text/csv" ||
    file.mimeType === "application/json" ||
    file.mimeType === "application/pdf" ||
    file.mimeType.includes("word") ||
    file.mimeType.includes("office")
  ) {
    url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
  } else {
    return null; // Binary file, skip
  }

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) return null;
  return resp.text();
}

// ─────────────────────────────────────────────────────────────────────────────
// OneDrive (Microsoft Graph)
// ─────────────────────────────────────────────────────────────────────────────

async function listOneDriveFiles(
  accessToken: string,
  folderId: string
): Promise<FileItem[]> {
  const url = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$select=id,name,file,size,lastModifiedDateTime&$top=100`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OneDrive list error: ${resp.status} ${err}`);
  }

  const data = (await resp.json()) as { value: any[] };
  return (data.value || [])
    .filter((item: any) => item.file) // only files, not folders
    .map((item: any) => ({
      id: item.id,
      name: item.name,
      mimeType: item.file?.mimeType || "application/octet-stream",
      size: item.size,
      modifiedAt: item.lastModifiedDateTime,
    }));
}

async function downloadOneDriveFile(
  accessToken: string,
  fileId: string
): Promise<string | null> {
  // Get download URL
  const metaResp = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}?$select=@microsoft.graph.downloadUrl,name`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!metaResp.ok) return null;
  const meta = (await metaResp.json()) as any;
  const downloadUrl = meta["@microsoft.graph.downloadUrl"];
  if (!downloadUrl) return null;

  const fileResp = await fetch(downloadUrl, {
    signal: AbortSignal.timeout(30000),
  });
  if (!fileResp.ok) return null;
  return fileResp.text();
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropbox
// ─────────────────────────────────────────────────────────────────────────────

async function listDropboxFiles(
  accessToken: string,
  folderPath: string
): Promise<FileItem[]> {
  const resp = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: folderPath || "",
      recursive: false,
      include_non_downloadable_files: false,
      limit: 100,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Dropbox list error: ${resp.status} ${err}`);
  }

  const data = (await resp.json()) as { entries: any[] };
  return (data.entries || [])
    .filter((e: any) => e[".tag"] === "file")
    .map((e: any) => ({
      id: e.id,
      name: e.name,
      mimeType: "application/octet-stream",
      size: e.size,
      modifiedAt: e.server_modified,
    }));
}

async function downloadDropboxFile(
  accessToken: string,
  filePath: string
): Promise<string | null> {
  const resp = await fetch(
    "https://content.dropboxapi.com/2/files/download",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Dropbox-API-Arg": JSON.stringify({ path: filePath }),
      },
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!resp.ok) return null;
  return resp.text();
}

// ─────────────────────────────────────────────────────────────────────────────
// Importable file types
// ─────────────────────────────────────────────────────────────────────────────

const IMPORTABLE_EXTENSIONS = [
  ".txt", ".md", ".csv", ".json", ".pdf", ".docx", ".doc",
  ".html", ".htm", ".rtf",
];

function isImportable(name: string): boolean {
  const lower = name.toLowerCase();
  return IMPORTABLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// ─────────────────────────────────────────────────────────────────────────────
// Create KB article from file content
// ─────────────────────────────────────────────────────────────────────────────

async function importContentToKB(
  content: string,
  fileName: string,
  organizationId: string,
  workspaceId: string
): Promise<boolean> {
  try {
    if (!content || content.trim().length < 50) return false;

    // Truncate to 50KB max
    const truncated = content.slice(0, 51200);

    await db.insert(knowledgeBase).values({
      title: fileName.replace(/\.[^.]+$/, ""), // strip extension
      content: truncated,
      category: "Cloud Import",
      organizationId,
      workspaceId,
      sourceType: "file",
      fileName,
    });

    return true;
  } catch (err) {
    console.error("KB import error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main sync function
// ─────────────────────────────────────────────────────────────────────────────

export async function runCloudStorageSync(
  connectionId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    filesDiscovered: 0,
    filesProcessed: 0,
    filesImported: 0,
    filesSkipped: 0,
    errors: [],
  };

  // Get connection
  const [connection] = await db
    .select()
    .from(cloudStorageConnections)
    .where(eq(cloudStorageConnections.id, connectionId))
    .limit(1);

  if (!connection) throw new Error("Connection not found");

  let accessToken = connection.accessToken;

  // Check token expiry and refresh if needed
  if (
    connection.tokenExpiresAt &&
    connection.tokenExpiresAt < new Date() &&
    connection.refreshToken
  ) {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID || "";
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET || "";

      if (connection.provider === "google_drive" && process.env.GOOGLE_CLIENT_ID) {
        accessToken = await refreshGoogleToken(
          connection.refreshToken,
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET || ""
        );
      } else if (connection.provider === "onedrive" && process.env.MICROSOFT_CLIENT_ID) {
        accessToken = await refreshMicrosoftToken(
          connection.refreshToken,
          process.env.MICROSOFT_CLIENT_ID,
          process.env.MICROSOFT_CLIENT_SECRET || ""
        );
      }
      // Update stored token
      await db
        .update(cloudStorageConnections)
        .set({ accessToken, updatedAt: new Date() })
        .where(eq(cloudStorageConnections.id, connectionId));
    } catch (err: any) {
      result.errors.push(`Token refresh failed: ${err.message}`);
    }
  }

  // Get linked folders
  const folders = await db
    .select()
    .from(cloudStorageFolders)
    .where(eq(cloudStorageFolders.connectionId, connectionId));

  if (folders.length === 0) {
    result.errors.push("No folders linked to this connection");
    return result;
  }

  for (const folder of folders) {
    try {
      let files: FileItem[] = [];

      // List files based on provider
      if (connection.provider === "google_drive") {
        files = await listGoogleDriveFiles(accessToken, folder.providerFolderId);
      } else if (connection.provider === "onedrive") {
        files = await listOneDriveFiles(accessToken, folder.providerFolderId);
      } else if (connection.provider === "dropbox") {
        files = await listDropboxFiles(accessToken, folder.folderPath || folder.providerFolderId);
      }

      result.filesDiscovered += files.length;

      for (const file of files) {
        if (!isImportable(file.name)) {
          result.filesSkipped++;
          continue;
        }

        result.filesProcessed++;

        try {
          let content: string | null = null;

          if (connection.provider === "google_drive") {
            content = await downloadGoogleDriveFile(accessToken, file);
          } else if (connection.provider === "onedrive") {
            content = await downloadOneDriveFile(accessToken, file.id);
          } else if (connection.provider === "dropbox") {
            content = await downloadDropboxFile(accessToken, file.id);
          }

          if (!content) {
            result.filesSkipped++;
            continue;
          }

          const imported = await importContentToKB(
            content,
            file.name,
            connection.organizationId,
            connection.workspaceId
          );

          if (imported) {
            result.filesImported++;
          } else {
            result.filesSkipped++;
          }
        } catch (fileErr: any) {
          result.errors.push(`File "${file.name}": ${fileErr.message}`);
          result.filesSkipped++;
        }
      }
    } catch (folderErr: any) {
      result.errors.push(`Folder "${folder.folderName}": ${folderErr.message}`);
    }
  }

  return result;
}
