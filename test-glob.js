// 测试路径解析
const path = require('path');
const glob = require('glob');

const configDir = path.join(__dirname, 'dist', 'config');
const entitiesPattern = path.join(configDir, '..', 'models', '**', '*.js');

console.log('Config dir:', configDir);
console.log('Entities pattern:', entitiesPattern);
console.log('Resolved pattern:', path.resolve(entitiesPattern));

// 测试glob
const files = glob.sync(entitiesPattern);
console.log('\nFound files:', files.length);
files.forEach(f => console.log('  -', f));
