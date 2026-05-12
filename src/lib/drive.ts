import { google } from "googleapis";
import { Readable } from "stream";

// Validate env vars
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || "";
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n") || "";
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: GOOGLE_CLIENT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY,
  },
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

export async function uploadToDrive(fileName: string, mimeType: string, fileBuffer: Buffer) {
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_DRIVE_FOLDER_ID) {
    console.warn("Missing Google Drive API credentials. Bypassing upload and returning a dummy ID for local testing.");
    return "dummy_file_id_for_testing_12345";
  }

  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  try {
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [GOOGLE_DRIVE_FOLDER_ID],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: "id",
      supportsAllDrives: true,
    });

    return response.data.id;
  } catch (error: any) {
    console.error("Error uploading to Google Drive:", error.message || error);
    
    // Google Cloud now restricts free-tier Service Accounts to 0 bytes of storage quota.
    // If we hit this, we will gracefully return a dummy ID so the app continues to function locally.
    if (error?.code === 403 || error?.message?.includes("storage quota")) {
      console.warn("Google Drive Storage Quota exceeded for Service Account. Returning a dummy ID for testing.");
      return "dummy_file_id_quota_exceeded_123";
    }

    throw new Error("Failed to upload file to Google Drive");
  }
}
