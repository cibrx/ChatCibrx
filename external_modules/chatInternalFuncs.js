const he = require('he')
const xss = require('xss')
const { MongoClient } = require('mongodb')

//MongoDB
const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);
const dbName = 'chat';
client.connect();
const db = client.db(dbName);

const messages_group_db = db.collection('messages_group')
const messages_private_db = db.collection('messages_private')
const users_db = db.collection('users');

//MongoDB


// Internal Chat App Functions


function xssForMsg(docs) {
    return docs.map(doc => {
        return {
            sender: he.encode(xss(doc.sender)),
            msg: he.encode(xss(doc.msg)),
            receiver: he.encode(xss(doc.receiver)),
            time: doc.time,
            type: doc.type
        };
    });
}


function xssForSearchUsers(docs) {
    return docs.map(doc => {
        return {
            username: he.encode(xss(doc.username)),
            isBanned: doc.isBanned
        };
    });
}

function filterUniqueUserPairs(docs, username) {
    const uniquePairs = [];
    const addedPairs = new Set();

    docs.forEach(doc => {
        let otherUser;

        if (doc.sender === username) {
            otherUser = doc.receiver;
        } else {
            otherUser = doc.sender;
        }

        const pair = [username, otherUser].sort().join('_');

        if (!addedPairs.has(pair)) {
            addedPairs.add(pair);
            uniquePairs.push(doc);
        }
    });

    return uniquePairs
}

async function getReadStatus(sender, reader) {
    const query = { username: sender, [`readBy.${reader}`]: { $exists: true } };
    const projection = { _id: 0, [`readBy.${reader}`]: 1 };
    const readStatus = await users_db.findOne(query, { projection: projection })
    if (readStatus) {
        return readStatus['readBy'][reader]
    } else {
        return false
    }
}



async function updateReadStatus(sender, reader, time, read) {
    const readInfoField = `readBy.${reader}`;
    const readStatusField = `${readInfoField}.read`;

    const result = await users_db.updateOne(
        {
            "username": sender,
            [readStatusField]: { $ne: read } // `read` değeri mevcut değerden farklıysa güncelle
        },
        {
            $set: { [readInfoField]: { time: time, read: read } }
        }
    );

    return result;
}

async function getReadStatus(sender, reader) {
    const query = { username: sender, [`readBy.${reader}`]: { $exists: true } };
    const projection = { _id: 0, [`readBy.${reader}`]: 1 };
    const readStatus = await users_db.findOne(query, { projection: projection })
    if (readStatus) {
        return readStatus['readBy'][reader]
    } else {
        return false
    }
}



module.exports = {
    xssForMsg,
    xssForSearchUsers,
    filterUniqueUserPairs,
    getReadStatus,
    updateReadStatus,
    getReadStatus
}

