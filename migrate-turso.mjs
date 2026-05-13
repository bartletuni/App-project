import * as readline from 'readline';
import { execSync } from 'child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("=== Turso Database Schema Migration ===");
console.log("This will apply the 'quantity' column fix to your production database.");

rl.question('Please enter your Turso Database URL (e.g., libsql://...): ', (url) => {
  rl.question('Please enter your Turso Auth Token: ', (token) => {
    console.log("\nRunning Prisma migration...");
    try {
      execSync(`npx prisma db push`, {
        env: {
          ...process.env,
          TURSO_DATABASE_URL: url.trim(),
          TURSO_AUTH_TOKEN: token.trim()
        },
        stdio: 'inherit'
      });
      console.log("\n✅ Success! The 'quantity' column has been added to your Turso database.");
      console.log("Your Vercel app should now accept requests without crashing.");
    } catch (err) {
      console.error("\n❌ Migration failed. Please check your credentials and try again.");
    }
    rl.close();
  });
});
