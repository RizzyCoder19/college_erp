const fs = require('fs');
let code = fs.readFileSync('src/components/auth/AnimatedLampLogin.tsx', 'utf8');
code = code.replace(
  'const transitionDuration = prefersReducedMotion ? 400 : 1800;',
  'const transitionDuration = prefersReducedMotion ? 1200 : 2000;'
);
fs.writeFileSync('src/components/auth/AnimatedLampLogin.tsx', code, 'utf8');
console.log('Updated transitionDuration in AnimatedLampLogin.tsx');
