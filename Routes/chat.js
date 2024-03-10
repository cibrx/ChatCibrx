const express = require('express')
const routes = express.Router()
const { MongoClient } = require('mongodb')
const internalFuncs = require('../external_modules/chatInternalFuncs.js')

//MongoDB
const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);
const dbName = 'chat';
client.connect();
const db = client.db(dbName);

const users_db = db.collection('users');
const messages_group_db = db.collection('messages_group')
const messages_private_db = db.collection('messages_private')
//MongoDB

routes.get('/chat', async function (req, res) {
    if (req.session.username) {
      res.render('chat.ejs', { username: req.session.username })
  
    } else res.status(403).redirect('/')
})
  
  
routes.get('/getGroupMessages', async function (req, res) {
    if (req.session.username) {
        const resultsBan = await users_db.find({ username: req.session.username }).project({ isBanned : 1}).toArray()
        if (resultsBan[0].isBanned == false) {
        const resultsDb = await messages_group_db.find({}).sort({ time: 1 }).toArray()
        let jsonData = {
            "messages": internalFuncs.xssForMsg(resultsDb),
        };

        res.json(jsonData)
        } else {
        const resultsBan = await users_db.find({ username: req.session.username }).project({ banReason: 1, banDate: 1, banCount: 1 }).toArray()

            const response = {
            error: true ,
            message: `Oops!, Your account has been banned ${resultsBan[0].banCount} times. Dont worry you'll be unbanned soon. Enjoy with your ban :=)`,
            reason: resultsBan[0].banReason,
            date: resultsBan[0].banDate,
            duration: "Permanent ☺️",
            contact: 'Chat Cibrx ~ admin',
            };

            res.status(200).json(response)

        }
    } else {
        res.status(401).send('Unauthorized')
    }
})



routes.get('/getPrivateMessages/:receiver', async function (req, res) {
    const username = req.session.username
    const receiver = req.params.receiver
    if (req.session.username) {
        const readStatus =  await internalFuncs.getReadStatus(username, receiver)
        const resultsDb = await messages_private_db.find({ $or: [{ sender: receiver, receiver: username }, { sender: username, receiver: receiver }] }).sort({ time: 1 }).toArray()
        res.json({
        "messages" : internalFuncs.xssForMsg(resultsDb),
        "readby" : readStatus
        })
    } else {
        res.status(401).send('Unauthorized')
    }
})


routes.get('/search-user/:username', async function (req, res) {
    if (req.session.username){
        const regex = new RegExp(`^${req.params.username}`, 'i')
        const resultsDb = await users_db.find({ username: regex }, { _id: 0, isBanned: 0, username: 1}).toArray()
        res.json(internalFuncs.xssForSearchUsers(resultsDb))
    }
    else {
        res.status(401).send('Unauthorized')    
    }
})


routes.get('/chat-history', async function (req, res) {
    if (req.session.username) {
        const username = req.session.username
        const resultsPrivate = await messages_private_db.find({ $or: [{ sender: username }, { receiver: username }] }).sort({ time: -1 }).toArray()
        const resultsGroup = await messages_group_db.find({}).sort({"time": -1}).limit(1).toArray()
        const uniqueUserPairs = internalFuncs.filterUniqueUserPairs(resultsPrivate, username);
        const jsonData = {
        "private" : internalFuncs.xssForMsg(uniqueUserPairs),
        "group" : internalFuncs.xssForMsg(resultsGroup)
        }
        res.json(jsonData)

    } else {
        res.status(401).send('Unauthorized')    
    }
})


module.exports = routes