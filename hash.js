import bcrypt from 'bcryptjs';

const password = '123456';
const hashedPassword = await bcrypt.hash(password, 12);
console.log('Senha hasheada:', hashedPassword);