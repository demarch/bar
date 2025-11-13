const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

const password = process.argv[2] || 'admin123';

hashPassword(password).then((hash) => {
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nUse este hash no arquivo init.sql');
}).catch(err => {
  console.error('Erro:', err);
});
