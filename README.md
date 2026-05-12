# TakomoCo Request Management App

A web-based request management system for additive manufacturing custom parts.

## Setup Instructions

### 1. Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_secure_random_string_here" # Generate one using: openssl rand -base64 32

# Google Drive API Configuration
# Generate these from Google Cloud Console -> IAM & Admin -> Service Accounts
GOOGLE_CLIENT_EMAIL="your-service-account-email@your-project-id.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID="your_google_drive_folder_id_here"
```

### 2. Google Drive Setup
1. Go to Google Cloud Console and create a Service Account.
2. Enable the **Google Drive API** for your project.
3. Generate a JSON Key for the Service Account to get the `client_email` and `private_key`.
4. Create a folder in your personal or shared Google Drive.
5. **Share the folder** with the Service Account's email address (give it "Editor" permissions).
6. Copy the Folder ID from the URL (the part after `folders/`) and place it in your `.env`.

### 3. Initialize the Database
Install dependencies and sync the Prisma schema with your local SQLite database:
`npm install`
`npx prisma db push`

### 4. Admin Access Setup
The first time you log in, an account is automatically created. To make yourself an admin so you can view the Admin Dashboard:
1. Log in via the web interface.
2. Open Prisma Studio:
`npx prisma studio`
3. Find your user record and check the `isAdmin` boolean to `true`. Save the change.

### 5. Run the Application
Start the development server using your package manager run scripts.

Open `http://localhost:3000` in your browser.
