const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'assets', 'cards');
const outputFile = path.join(__dirname, 'src', 'components', 'CardImages.ts');

let mapEntries = [];

fs.readdirSync(baseDir).forEach(setFolder => {
  const setPath = path.join(baseDir, setFolder);
  if (fs.statSync(setPath).isDirectory()) {
    fs.readdirSync(setPath).forEach(file => {
      if (file.endsWith('.webp')) {
        const cardId = file.replace('.webp', '');
        mapEntries.push(
          `  "${cardId}": require('../../assets/cards/${setFolder}/${file}'),`
        );
      }
    });
  }
});

const fileContent = `// AUTO-GENERATED FILE. Do not edit manually.
const cardImages: { [key: string]: any } = {
${mapEntries.join('\n')}
};

export default cardImages;
`;

fs.writeFileSync(outputFile, fileContent, 'utf8');
console.log('CardImages.ts generato con successo!');