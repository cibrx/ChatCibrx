const crypto = require('crypto');
const bcrypt = require('bcrypt')


const SECRET_KEY = '000102060700b0c0d08090405060e0f0000300700a0b0c0d405102038090ae0f'; 
const algorithm = 'aes-256-cbc';

function encrypt(text) {
    const key = Buffer.from(SECRET_KEY, 'hex');
    const iv = crypto.randomBytes(16); 

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    const key = Buffer.from(SECRET_KEY, 'hex');
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

async function hashPassword(plaintextPassword) {
    const hash = await bcrypt.hash(plaintextPassword, 10);
    return hash
  }
  
async function comparePassword(plaintextPassword, hash) {
    const result = await bcrypt.compare(plaintextPassword, hash);
    return result;
}

module.exports = {
    encrypt,
    decrypt,
    hashPassword,
    comparePassword
}