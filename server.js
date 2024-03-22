const express = require('express');
const session = require('express-session');
const http = require('http');
const socketIO = require('socket.io')
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const ip = require('ip')
const colors = require('colors')
const { MongoClient } = require('mongodb')
const rateLimit = require('express-rate-limit');
const cache = require('@rednexie/cache.db')
const bot = require('./external_modules/bot.js')

const {updateReadStatus, getReadStatus} = require('./external_modules/chatInternalFuncs.js')

const port = 4049
let online = 0


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


// ***** Veriables ***** //

const sessionConfig = {
  secret: 'ASD4a6d494a65sd498q4d6sa4d8864dsa8d',
  name: 'Cibrx',
  resave: false,
  saveUninitialized: false,
  cookie : {
    sameSite: 'strict',
  }
};



const limiter = rateLimit({
  windowMs: 60 * 1000, // 15 minutes
  max: 90, // limit each IP to 100 requests per windowMs
  handler: (req,res,next) => {
    return
  }
});

// ******** Express Config ******** //

app.set('trust-proxy', 'loopback')
app.set('view engine', 'ejs')

app.disable('x-powered-by')
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))
app.use(session(sessionConfig))
app.use('/', limiter);

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
})


io.on('connection', async (socket) => {
  const ip = socket.handshake.address.replace('::ffff:', '').replace('::1', 'localhost')
  if(cache.get(ip)){  
    console.log(`${ip.yellow} connected`.blue)
    onlineAdd()
    const username = cache.get(ip)
    cache.set(username+'id', socket.id)
    const resultsDb = await users_db.find({ username: username }).toArray();
    socket.join(username)

    socket.on('group message', async function (msg, sender, receiver) {
      if (sender == username && resultsDb[0].isBanned == false ) {
        let dateNow = Date.now()
        messages_group_db.insertOne({
          'time': dateNow,
          'msg': msg,
          'sender': sender,
          'receiver': receiver,
          'type': 'message'
        })
        
        io.emit('group message', msg, sender, receiver, dateNow)
  
        //Bot
        if((msg.split(' '))[0].charAt(0) == '/'){
          const botAnswer = await bot.botMain(msg,sender)
          messages_group_db.insertOne({
            'time': dateNow,
            'msg': botAnswer[0],
            'sender': 'Jack (Bot 🤖)',
            'receiver': 'Group Chat',
            'type': 'message'
          })

          io.emit('group message', botAnswer[0], 'Jack (Bot 🤖)', 'Group Chat', dateNow)

          if(botAnswer[1] == 'kick'){
            try{
              io.sockets.sockets.get(cache.get(msg.split(' ')[1]+'id')).disconnect(true);
            } catch{
              return
            }
          }
        } //Bot
      }
    });
  
    socket.on('private message', (msg, sender, receiver) => {
      if (sender == username) {
        let dateNow = Date.now()
        messages_private_db.insertOne({
          'time': dateNow,
          'msg': msg,
          'sender': sender,
          'receiver': receiver,
          'type': 'message'
        })
        io.to(receiver).emit('private message', msg, sender, receiver, dateNow)
        io.to(username).emit('private message', msg, sender, receiver, dateNow)
      }
    })
    

    socket.on('typing', (chatType, sender, receiver, isTyping) => {
      if(sender == username){
        if (chatType == 'Pm'){
          io.to(receiver).emit('typing', chatType, sender, receiver, isTyping)
        } else {
          io.emit('typing', chatType, sender, receiver, isTyping)
        }
      }
    })
    
    socket.on('readAt', async (sender, reader, read) => {
      if(reader == username || sender == username){
        let dateNow = Date.now()

        await updateReadStatus(sender, reader, dateNow, read )
        const readStatus = await getReadStatus(sender, reader)
        io.to(sender).emit('readAt', reader, readStatus)
      }
    })

    socket.on('disconnect', () => { 
      onlineRemove()
      console.log(`${socket.handshake.address.replace('::ffff:', '').replace('::1', 'localhost').yellow} disconnected`.red);
    });    
  }

});

function newFileEvent(filename, sender, receiver, dateNow) {
  io.to(sender).emit('new file', filename, sender, receiver, dateNow)
  io.to(receiver).emit('new file', filename, sender, receiver, dateNow)
}


//Defined Functions

function onlineUpdate(onlineCount){
  io.emit('online',(onlineCount))
}

function onlineAdd(){
  online++
  cache.set('online', online)
  onlineUpdate(online)
}

function onlineRemove(){
  online--
  cache.set('online', online)
  onlineUpdate(online)
}



module.exports.newFileEvent = newFileEvent


server.listen(port, () => {
  const MyIp = ip.address().replace('::ffff:', '')
  console.log(`Server is running on http://localhost:${port} and http://${MyIp}:${port}`);
});


