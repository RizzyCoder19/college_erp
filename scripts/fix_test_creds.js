const fs = require('fs');

let testCode = fs.readFileSync('scripts/run_full_verification.js', 'utf8');

// Replace the literal string with actual concatenated values
testCode = testCode.replace(
  "setV(document.querySelector('#login-email'), '${adminCreds.email}');",
  "setV(document.querySelector('#login-email'), '" + JSON.parse(fs.readFileSync('dev-admin-credentials.json', 'utf8')).email + "');"
);

testCode = testCode.replace(
  "setV(document.querySelector('#login-password'), '${adminCreds.password}');",
  "setV(document.querySelector('#login-password'), '" + JSON.parse(fs.readFileSync('dev-admin-credentials.json', 'utf8')).password + "');"
);

fs.writeFileSync('scripts/run_full_verification.js', testCode, 'utf8');
console.log('Fixed credential values in run_full_verification.js');
