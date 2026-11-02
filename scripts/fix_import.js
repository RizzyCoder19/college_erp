const fs = require('fs');
let code = fs.readFileSync('src/components/auth/AnimatedLampLogin.tsx', 'utf8');
code = code.replace(
  'import type { AuthenticatedUser } from "@/lib/actions/auth";',
  'import type { AuthenticatedUser } from "@/lib/auth/guards";'
);
fs.writeFileSync('src/components/auth/AnimatedLampLogin.tsx', code, 'utf8');
console.log('Imported from guards directly');
