const fs = require('fs');

// In AnimatedLampLogin.tsx
let lampCode = fs.readFileSync('src/components/auth/AnimatedLampLogin.tsx', 'utf8');
lampCode = lampCode.replace(
  'import type { AuthenticatedUser } from "@/lib/auth/guards";',
  'import type { AuthenticatedUser } from "@/lib/auth/session";'
);
fs.writeFileSync('src/components/auth/AnimatedLampLogin.tsx', lampCode, 'utf8');

// In guards.ts
let guardsCode = fs.readFileSync('src/lib/auth/guards.ts', 'utf8');
if (!guardsCode.includes('export type { AuthenticatedUser };')) {
  guardsCode = guardsCode.replace(
    'import {\n  verifySessionToken,\n  type AuthenticatedUser,\n}',
    'import {\n  verifySessionToken,\n  type AuthenticatedUser,\n}\nexport type { AuthenticatedUser };'
  );
  fs.writeFileSync('src/lib/auth/guards.ts', guardsCode, 'utf8');
}

console.log('Fixed imports for AuthenticatedUser');
