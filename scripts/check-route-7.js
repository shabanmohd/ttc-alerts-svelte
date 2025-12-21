import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./static/data/ttc-stops.json', 'utf8'));
const stops = data.filter(s => s.routes && s.routes.includes('7'));

console.log('Route 7 stop counts:');
console.log('  Northbound:', stops.filter(s => s.dir === 'Northbound').length);
console.log('  Southbound:', stops.filter(s => s.dir === 'Southbound').length);
console.log('  No direction:', stops.filter(s => !s.dir).length);
console.log('  Total:', stops.length);

// Check stops with sequence
const withSeq = stops.filter(s => s.seq && s.seq['7']);
const hasMain = withSeq.filter(s => s.seq['7'].main !== undefined);
const hasReverse = withSeq.filter(s => s.seq['7'].reverse !== undefined);
console.log('\nSequence breakdown:');
console.log('  Has main key:', hasMain.length);
console.log('  Has reverse key:', hasReverse.length);
console.log('  Total with seq:', withSeq.length);

// Cross reference - what dir do main/reverse correspond to?
console.log('\nSample with main key:');
hasMain.slice(0, 3).forEach(s => console.log('  ', s.name, '- dir:', s.dir));
console.log('\nSample with reverse key:');
hasReverse.slice(0, 3).forEach(s => console.log('  ', s.name, '- dir:', s.dir));

// Check shared stops (no dir)
const shared = stops.filter(s => !s.dir && s.seq && s.seq['7']);
console.log('\nShared stops (no dir) with sequence:');
shared.slice(0, 10).forEach(s => console.log('  ', s.name, '- seq:', JSON.stringify(s.seq['7'])));
