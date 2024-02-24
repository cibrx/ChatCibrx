const express = require('express');
const session = require('express-session')
const http = require('http');
const socketIO = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const ip = require('ip')
const colors = require('colors')
const he = require('he');
const xss = require('xss')
const rateLimit = require('express-rate-limit');
const cache = require('@rednexie/cache.db')
const bot = require('./bot.js')
const bcrypt = require('bcrypt')
const { MongoClient } = require('mongodb');
const { func, date } = require('joi');


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


app.set('trust-proxy', 'loopback')
app.set('view engine', 'ejs')

/*
const limiter = rateLimit({
  windowMs: 60 * 1000, // 15 minutes
  max: 90, // limit each IP to 100 requests per windowMs
  handler: (req,res,next) => {
    
    return
  }
});
app.use('/', limiter);*/

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))
app.use(session({
  secret: 'asddc6dbd03d11eb8a8f4a4a',
  resave: false,
  saveUninitialized: true
}));

//GET
app.get('/', (req, res) => {
  res.render('index.ejs')
})

app.get('/home', (req, res) => {
  if(req.session.username){
    res.render('home.ejs')
  } else {
    res.status(302).redirect('/')
  }
})

app.get('/blog', (req, res) => {
  if(req.session.username){
    res.render('blog.ejs')
  } else {
    res.status(302).redirect('/')
  }
})

app.get('/blog/new', (req, res) => {
  if(req.session.username){
    res.render('add-blog.ejs')
  } else {
    res.status(302).redirect('/')
  }
})

app.get('/login', (req, res) => {
  res.render('login.ejs')
})

app.get('/register', (req, res) => {
  res.render('register.ejs')
})


// APIs

app.get('/chat', async function (req, res) {
  if (req.session.username) {
    const resultsGroup = await messages_group_db.find({}, { time: 1, msg: 1, sender: 1 }).sort({ time: 1 })
    const resultsPrivate = await messages_private_db.find({ $or: [{ sender: req.session.username }, { receiver: req.session.username }] }).sort({ time: 1 })

    res.render('chat.ejs', { groupMessages: JSON.stringify(xssForMsg(resultsGroup)), username: req.session.username, privateMessages: JSON.stringify(xssForMsg(resultsPrivate)) })

  } else res.status(403).redirect('/')
})

app.get('/logout', (req, res) => {
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


app.get('/getGroupMessages', async function (req, res) {
  if (req.session.username) {
    const resultsBan = await users_db.find({ username: req.session.username }).project({ isBanned : 1}).toArray()
    if (resultsBan[0].isBanned == false) {
      const resultsDb = await messages_group_db.find({}).project({ time: 1, msg: 1, sender: 1 }).sort({ time: 1 }).toArray()
      let jsonData = {
        "messages": xssForMsg(resultsDb),
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



app.get('/getPrivateMessages/:receiver', async function (req, res) {
  const username = req.session.username
  const receiver = req.params.receiver
  if (req.session.username) {
    const readStatus =  await getReadStatus(username, receiver)
    const resultsDb = await messages_private_db.find({ $or: [{ sender: receiver, receiver: username }, { sender: username, receiver: receiver }] }).sort({ time: 1 }).toArray()
    res.json({
      "messages" : xssForMsg(resultsDb),
      "readby" : readStatus
    })
  } else {
    res.status(401).send('Unauthorized')
  }
})


app.get('/search-user/:username', async function (req, res) {
  if (req.session.username){
    const regex = new RegExp(`^${req.params.username}`, 'i')
    const resultsDb = await users_db.find({ username: regex }, { _id: 0, isBanned: 0, username: 1}).toArray()
    res.json(xssForSearchUsers(resultsDb))
  }
  else {
    res.status(401).send('Unauthorized')    
  }
})


app.get('/chat-history/:username', async function (req, res) {
  const username = req.params.username
  if (req.session.username == username) {
    const resultsPrivate = await messages_private_db.find({ $or: [{ sender: username }, { receiver: username }] }).sort({ time: -1 }).toArray()
    const resultsGroup = await messages_group_db.find({}).sort({"time": -1}).limit(1).toArray()
    const uniqueUserPairs = filterUniqueUserPairs(resultsPrivate, username);
    const jsonData = {
      "private" : xssForMsg(uniqueUserPairs),
      "global" : xssForMsg(resultsGroup)
    }
    res.json(jsonData)

  } else {
    res.status(401).send('Unauthorized')    
  }
})

app.get('/blog/filter/:filter', async (req, res) => {
  const filter = req.params.filter 
  const resultBlog = await writeups_db.find({topic: filter}).sort({ time: 1 }).toArray()
  res.json(resultBlog)
})

//POST
app.post('/login', async function (req, res) {
  const { username, password } = req.body
  const dbResult = await users_db.findOne({ 'username': username })
  if(dbResult !== null){
    const compare = await comparePassword(password, dbResult['password'])
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




app.post('/register', async function (req, res) {
  const { username, password, token } = req.body;
  if (token === "samsulek") {
    try {
      const existResult = await users_db.findOne({ 'username': username });
      if (!existResult) {

        const hashedPassword = await hashPassword(password)

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

app.post('/blog/new', (req, res) => {
  if(req.session.username){
    const {title, topic, content} = req.body
    writeups_db.insertOne({time: Date.now(), title: title, topic: topic, author: req.session.username, content: content })
    res.json({success: true, message: 'Created Successfully'})
  } else {
    res.status(302).redirect('/')
  }
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
      if (sender == username && resultsDb[0].isBanned == false ) { //cache.get(username) = isBanned
        let dateNow = Date.now()
        const resultsDb = await messages_group_db.insertOne({
          'time': dateNow,
          'msg': msg,
          'sender': sender,
          'receiver': receiver
        })
        
        io.emit('group message', msg, sender, receiver, dateNow)
  
        //Bot
        if((msg.split(' '))[0].charAt(0) == '/'){
          const botAnswer = await bot.botMain(msg,sender)
          messages_group_db.insertOne({
            'time': dateNow,
            'msg': botAnswer[0],
            'sender': 'Jack (Bot 🤖)',
            'receiver': 'Global Chat'
          })

          io.emit('group message', botAnswer[0], 'Jack (Bot 🤖)', 'Global Chat', dateNow)

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
          'receiver': receiver
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



//Defined Functions
function xssForMsg(docs) {
  return docs.map(doc => {
    return {
      sender: he.encode(xss(doc.sender)),
      msg: he.encode(xss(doc.msg)),
      receiver: he.encode(xss(doc.receiver)),
      time: doc.time,
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

  return uniquePairs;
}

// Password hashing
async function hashPassword(plaintextPassword) {
  const hash = await bcrypt.hash(plaintextPassword, 10);
  return hash
}

async function comparePassword(plaintextPassword, hash) {
  const result = await bcrypt.compare(plaintextPassword, hash);
  return result;
}

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

async function getReadStatus(sender, reader){
  const query = { username: sender, [`readBy.${reader}`]: { $exists: true } };
  const projection = { _id: 0, [`readBy.${reader}`]: 1 };
  const readStatus = await users_db.findOne(query, { projection: projection })
  if(readStatus){
    return readStatus['readBy'][reader]
  } else {
    return false
  }
}


server.listen(port, () => {
  const MyIp = ip.address().replace('::ffff:', '')
  console.log(`Server is running on http://localhost:${port} and http://${MyIp}:${port}`);
});
