const express = require('express')
const { MongoClient } = require('mongodb')
const routes = express.Router()
const encrypt = require('../external_modules/encrypt.js')
const cache = require('@rednexie/cache.db')


//MongoDB
const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);
const dbName = 'chat';
client.connect();
const db = client.db(dbName);

const users_db = db.collection('users');
//MongoDB

routes.get('/login', (req, res) => {
    res.render('login.ejs')
})
  
routes.get('/register', (req, res) => {
    res.render('register.ejs')
})

routes.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        res.send('Error logging out.');
      } else {
        cache.remove(req.ip.replace('::ffff:', '').replace('::1', 'localhost'))
        res.redirect('/');
      }
    });
})

routes.post('/login', async function (req, res) {
    const { username, password } = req.body
    const dbResult = await users_db.findOne({ 'username': username })
    if(dbResult !== null){
      const compare = await encrypt.comparePassword(password, dbResult['password'])
      if (compare) {
        req.session.isBanned = dbResult['isBanned']
        req.session.username = username
        cache.set(req.ip.replace('::ffff:', '').replace('::1', 'localhost'), username)
        cache.set(username, dbResult['isBanned'])
        res.json({ success: true, message: 'Login successful' });
      } else {
        res.json({ success: false, message: 'invalid username or password' });
      }
    } else {
      res.json({ success: false, message: 'invalid username or password' });
    }
})

routes.post('/register', async function (req, res) {
    const { username, password, token } = req.body;
    if (token === "samsulek") {
      try {
        const existResult = await users_db.findOne({ 'username': username });
        if (!existResult) {
  
          const hashedPassword = await encrypt.hashPassword(password)
  
          const result = await users_db.insertOne({
            'time': Date.now(),
            'username': username,
            'password': hashedPassword,
            'registered_ip': req.ip.replace('::ffff:', '').replace('::1', 'localhost'),
            'isBanned': false,
            'banReason': '',
            'banDate': 0,
            'banCount': 0,
          })
          res.json({ success: true, message: 'Register successful' });
        } else {
          res.json({ success: false, message: 'This username is already taken' });
        }
      } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'An error occurred' });
      }
    } else {
      res.json({ success: false, message: 'Invalid token' });
    }
});


module.exports = routes