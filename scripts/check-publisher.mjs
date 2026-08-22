import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

if (!pkg.publisher || pkg.publisher === 'publisher-id-not-set') {
  console.error(
    '\nRefusing to package: package.json "publisher" is still the placeholder.\n' +
      'Set it to the real VS Code Marketplace publisher id first.\n',
  );
  process.exit(1);
}
