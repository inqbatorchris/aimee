import bcrypt from 'bcrypt';

const password = 'test123';
const saltRounds = 10;

const hash = await bcrypt.hash(password, saltRounds);
console.log(hash);
