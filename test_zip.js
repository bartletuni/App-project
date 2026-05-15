const fs = require('fs');

async function test() {
    const formData = new FormData();
    const blob = new Blob(['hello zip'], { type: 'application/zip' });
    formData.append('file', blob, 'test.zip');
    formData.append('quantity', '1');
    formData.append('dateNeeded', '2026-10-10');
    formData.append('phoneNumber', '123-456-7890');

    // Simulate what the backend sees
    const file = formData.get("file");

    if (typeof file === "string" || !file.name) {
      console.log("Invalid file");
    } else {
        console.log("File name:", file.name);
        console.log("Is zip?", file.name.toLowerCase().endsWith(".zip"));
    }
}
test();
