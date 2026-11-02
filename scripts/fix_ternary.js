const fs = require('fs');
let code = fs.readFileSync('src/components/auth/AnimatedLampLogin.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Remove the misplaced )} in lamp-side
code = code.replace(
  '        </div>\n        )}\n      </section>',
  '        </div>\n      </section>'
);

// 2. Add )} before </section> in login-side
code = code.replace(
  '          </div>\n        </div>\n      </section>\n    </div>',
  '          </div>\n        </div>\n        )}\n      </section>\n    </div>'
);

fs.writeFileSync('src/components/auth/AnimatedLampLogin.tsx', code, 'utf8');
console.log('Fixed ternary location successfully');
