const fs = require('fs');

let code = fs.readFileSync('scripts/test_submit.js', 'utf8');
const adminCreds = JSON.parse(fs.readFileSync('dev-admin-credentials.json', 'utf8'));

code = code.replace(
  "document.execCommand('insertText', false, '${adminCreds.email}');",
  "document.execCommand('insertText', false, '" + adminCreds.email + "');"
);

code = code.replace(
  "document.execCommand('insertText', false, '${adminCreds.password}');",
  "document.execCommand('insertText', false, '" + adminCreds.password + "');"
);

fs.writeFileSync('scripts/test_submit.js', code, 'utf8');
console.log('Fixed interpolation in test_submit.js');
