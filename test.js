const { func } = require('joi');
const { MongoClient } = require('mongodb')


//MongoDB
const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);
const dbName = 'chat';
client.connect();
const db = client.db(dbName);

const users_db = db.collection('users');
//MongoDB

async function main() {
    const result = await users_db.find({username:'admin'}).toArray()
    console.log(result[0].user)
}
main()