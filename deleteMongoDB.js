
//MongoDB
const { MongoClient } = require('mongodb');
const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);
const dbName = 'chat';
client.connect();
const db = client.db(dbName);

const users_db = db.collection('users');
const messages_group_db = db.collection('messages_group')
const messages_private_db = db.collection('messages_private')
//MongoDB

async function main(){
    users_db.deleteMany({})
    messages_group_db.deleteMany({})
    messages_private_db.deleteMany({})
}

main()