import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

async function run() {
  try {
    const response = await drive.files.create({
      requestBody: {
        name: "test.txt",
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: "text/plain",
        body: "Hello world",
      },
      fields: "id",
      supportsAllDrives: true,
    });
    console.log("Success", response.data.id);
  } catch (err) {
    console.error("Error code:", err.code);
    console.error("Error message:", err.message);
    if (err.errors) console.error("Errors:", err.errors);
  }
}

run();
