const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(__dirname, '..', '.env.local');
let clientId = '""';
let clientSecret = '""';

if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  const idMatch = content.match(/^AUTH_GOOGLE_DESKTOP_ID=(.+)$/m);
  const secretMatch = content.match(/^AUTH_GOOGLE_DESKTOP_SECRET=(.+)$/m);
  
  if (idMatch) clientId = `"${idMatch[1].trim()}"`;
  if (secretMatch) clientSecret = `"${secretMatch[1].trim()}"`;
} else {
    // try to read from process.env for CI environments
    if (process.env.AUTH_GOOGLE_DESKTOP_ID) clientId = `"${process.env.AUTH_GOOGLE_DESKTOP_ID}"`;
    if (process.env.AUTH_GOOGLE_DESKTOP_SECRET) clientSecret = `"${process.env.AUTH_GOOGLE_DESKTOP_SECRET}"`;
}

// The desktop client secret ends up inside the shipped app, so it is not
// confidential. Google requires it for "Desktop app" clients anyway and treats
// it as public; PKCE protects the sign-in. Never put the Web client secret here.
const envTsContent = `// AUTO-GENERATED FILE. DO NOT COMMIT TO GIT.
export const CLIENT_ID = ${clientId};
export const CLIENT_SECRET = ${clientSecret};
`;

const desktopDir = path.join(__dirname, '..', 'desktop');
if (!fs.existsSync(desktopDir)) {
    fs.mkdirSync(desktopDir, { recursive: true });
}

fs.writeFileSync(path.join(desktopDir, 'env.ts'), envTsContent);
console.log('Generated desktop/env.ts successfully.');
