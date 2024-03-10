const express = require('express')
const routes = express.Router()
const http = require('http');
const app = express();
const { MongoClient } = require('mongodb')
const socketIO = require('socket.io');
const encrypt = require('../external_modules/encrypt.js')
const server = http.createServer(app);
const io = socketIO(server);
const fileUpload = require('express-fileupload')
const event = require('../server.js') 

routes.use(fileUpload({
    limits: { fileSize: 25 * 1024 * 1024 }, 
    abortOnLimit: true,
    responseOnLimit: 'Dosya boyutu limiti aşıldı!',
}));

//MongoDB
const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);
const dbName = 'chat';
client.connect();
const db = client.db(dbName);

const messages_group_db = db.collection('messages_group')
const messages_private_db = db.collection('messages_private')
//MongoDB


routes.get('/uploads', async (req, res) => {
    if (req.session.username) {
        const encryptedFileName = req.query.filename
        const fileName = encrypt.decrypt(encryptedFileName)
        const receiver = req.query.receiver
        const username = req.session.username

        const dbResult = await messages_private_db.find({ $or: [{ sender: receiver, receiver: username }, { sender: username, receiver: receiver }], type: 'image', msg: encryptedFileName }).toArray()
        if (dbResult.length > 0) {
            res.sendFile(`/home/legendman46/projects/js/chat/uploads/${fileName}`)
        } else {
            res.send('No such file')
        }
    } else {
        res.status(401).send('Unauthorized')
    }

})

routes.post('/upload/:receiverName', async (req, res) => {
    if (req.session.username) {
        const receiverName = req.params.receiverName
        const dateNow = Date.now()
        const username = req.session.username
        let fileNameForIo = ''
        let uploadPath = ''

        if (!req.params.receiverName) {
            return res.status(400).json({ success: false, message: 'invalid receiver name' })
        }

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ success: false, message: 'No such file' })
        }

        const uploadedImage = req.files.image
        const specialCharsAndSpaces = /[\/\?<>\\:\*\|":\+\&\%\$\#\@\!\,\;\=\(\)\[\]\{\}'`^~\s]/g;
        const filename = uploadedImage.name.replace(specialCharsAndSpaces, '_')

        if (!uploadedImage.mimetype.startsWith('image/')) {
            return res.status(400).json({ success: false, message: 'Please upload photos only.  ' })
        }

        if (receiverName == 'Group Chat') {
            uploadPath = `/home/legendman46/projects/js/chat/public/uploads-static/${filename}`
            fileNameForIo = filename
            messages_group_db.insertOne({
                'time': dateNow,
                'msg': filename,
                'sender': username,
                'receiver': receiverName,
                'type': 'image'
            })

        } else {
            uploadPath = `/home/legendman46/projects/js/chat/uploads/${filename}`
            fileNameForIo = encrypt.encrypt(filename)
            messages_private_db.insertOne({
                'time': dateNow,
                'msg': fileNameForIo,
                'sender': username,
                'receiver': receiverName,
                'type': 'image'
            })
        }

        uploadedImage.mv(uploadPath, function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: 'File upload failed' });
            }

            res.status(201).json({ success: true, message: 'File uploaded successfully' })

            event.newFileEvent(fileNameForIo, username, receiverName, Date.now())

        })
    }
});

module.exports = routes


