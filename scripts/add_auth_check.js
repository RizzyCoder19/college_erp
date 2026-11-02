const fs = require('fs');

let code = fs.readFileSync('src/components/auth/AnimatedLampLogin.tsx', 'utf8');

// 1. Update import
code = code.replace(
  'import { loginAction } from "@/lib/actions/auth";',
  'import { loginAction, getCurrentUserAction } from "@/lib/actions/auth";'
);

// 2. Add mount auth check
const oldEffect = '  // Apply theme to documentElement';
const newEffect = `  // Check if session is already active when navigating directly to /login
  useEffect(() => {
    let isMounted = true;
    getCurrentUserAction().then((res) => {
      if (isMounted && res.success && res.data && !isWelcoming) {
        router.replace("/");
      }
    });
    return () => {
      isMounted = false;
    };
  }, [router, isWelcoming]);

  // Apply theme to documentElement`;

code = code.replace(oldEffect, newEffect);

fs.writeFileSync('src/components/auth/AnimatedLampLogin.tsx', code, 'utf8');
console.log('Added initial auth check to AnimatedLampLogin.tsx');
