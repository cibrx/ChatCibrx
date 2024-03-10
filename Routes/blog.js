const express = require('express')
const routes = express.Router()
const { MongoClient } = require('mongodb')

//MongoDB
const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);
const dbName = 'chat';
client.connect();
const db = client.db(dbName);

const users_db = db.collection('users');
const messages_group_db = db.collection('messages_group')
const messages_private_db = db.collection('messages_private')
const writeups_db = db.collection('writeups')
//MongoDB

routes.get('/blog', (req, res) => {
    if(req.session.username){
      res.render('blog.ejs')
    } else {
      res.status(302).redirect('/')
    }
})

routes.get('/blog/new', (req, res) => {
    if(req.session.username){
    res.render('add-blog.ejs')
    } else {
    res.status(302).redirect('/')
    }
})

routes.get('/blog/filter/:filter', async (req, res) => {
    const filter = req.params.filter 
    const resultBlog = await writeups_db.find({topic: filter}).sort({ time: 1 }).toArray()
    res.json(resultBlog) 
})


routes.post('/blog/new', (req, res) => {
    if(req.session.username){
      const {title, topic, content} = req.body
      writeups_db.insertOne({time: Date.now(), title: title, topic: topic, author: req.session.username, content: content })
      res.json({success: true, message: 'Created Successfully'})
    } else {
      res.status(302).redirect('/')
    }
})
  



module.exports = routes