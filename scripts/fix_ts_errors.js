const fs = require('fs');

// 1. Export AuthenticatedUser from auth.ts
let authCode = fs.readFileSync('src/lib/actions/auth.ts', 'utf8').replace(/\r\n/g, '\n');
if (!authCode.includes('export type { AuthenticatedUser };')) {
  authCode = authCode.replace(
    'import {\n  type Role,',
    'export type { AuthenticatedUser } from "@/lib/auth/guards";\nimport {\n  type Role,'
  );
  fs.writeFileSync('src/lib/actions/auth.ts', authCode, 'utf8');
  console.log('Exported AuthenticatedUser from auth.ts');
}

// 2. Fix (n: string) in AnimatedLampLogin.tsx
let lampCode = fs.readFileSync('src/components/auth/AnimatedLampLogin.tsx', 'utf8').replace(/\r\n/g, '\n');
lampCode = lampCode.replace(
  '.map((n) => n[0])',
  '.map((n: string) => n[0])'
);
fs.writeFileSync('src/components/auth/AnimatedLampLogin.tsx', lampCode, 'utf8');
console.log('Fixed (n: string) in AnimatedLampLogin.tsx');
