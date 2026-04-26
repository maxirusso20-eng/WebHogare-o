const fs = require('fs');
const lines = fs.readFileSync('src/App.jsx', 'utf8').split(/\r?\n/);
let newLines = [];

for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  
  if (lineNum === 38) {
    newLines.push(lines[i]);
    newLines.push("import { PantallaDashboard } from './components/PantallaDashboard';");
    newLines.push("import { PantallaRecorridos } from './components/PantallaRecorridos';");
    newLines.push("import { PantallaChoferes } from './components/PantallaChoferes';");
    newLines.push("import { PantallaClientes } from './components/PantallaClientes';");
    continue;
  }

  if (lineNum >= 2617 && lineNum <= 2625) {
    newLines.push(lines[i]);
    continue;
  }
  
  if (lineNum >= 2951 && lineNum <= 2952) {
    newLines.push(lines[i]);
    continue;
  }

  if (lineNum >= 897 && lineNum <= 2950) {
    continue; 
  }

  newLines.push(lines[i]);
}

fs.writeFileSync('src/App.jsx', newLines.join('\n'));
console.log('App.jsx refactored successfully.');
