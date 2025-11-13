import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

// Para executar: ts-node src/utils/hashPassword.ts
const password = process.argv[2] || 'admin123';

hashPassword(password).then((hash) => {
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nUse este hash no arquivo init.sql');
});
