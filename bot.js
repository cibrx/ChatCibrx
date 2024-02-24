//MongoDB
const { func } = require('joi');
const { MongoClient } = require('mongodb');
const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);
const dbName = 'chat';
client.connect();
const db = client.db(dbName);

const users_db = db.collection('users');
const messages_group_db = db.collection('messages_group')
//MongoDB



var botCommands = ['/help','/ban','/unban']
var botCommandsHelp = ['bos','-username- -ban_reason(opt)-','-username-']
let maxLength = Math.min(botCommands.length, botCommandsHelp.length);


async function botMain(message,sender){
    if(message.split(' ')[1] == undefined || message.split(' ')[0] == undefined){
        if(message.split(' ')[0] !== '/help'){
            return [`The command might be incomplete or incorrect; make sure it conforms to the syntax.`,'']
        }
    }
    const command = message.split(' ')[0]
    const arg1 = message.split(' ')[1]
    const forJoin = message.split(' ')
    const arg2 = forJoin.slice(2).join(' ')
    if(isCommand(command)){
        if (command == '/ban' ){
            if(sender == 'admin'){
                const result = await ban(arg1,arg2)
                return result
            } else {
                return [`${sender}, ${command} authority is restricted to administrators.`, '']
            }

        } else if(command == '/unban'){
            if(sender == 'admin'){
                const result = await unban(arg1,arg2)
                return result
            } else {
                return [`${sender}, ${command} authority is restricted to administrators.`, '']
            }
        } else if(command == '/help'){
            const result = getHelp()
            return result
        }
    } else return [`invalid command`, '']
}


async function ban(username, banReason){
    const resultBan = await users_db.updateOne({'username' : username}, {$set : {'isBanned': true, 'banReason': banReason , 'banDate': Date.now()}, $inc: { ['banCount']: 1 }})
    return [`It looks like someone else got banned! ${username} has been banned. Reason: ${banReason}`,'kick']
}

async function unban(username){
    const resultUnban = await users_db.updateOne({'username' : username}, {$set : {'isBanned' : false }} )
    return [`${username}, the ban has been lifted! You are now free to access the platform.`, '']
}

function getHelp(){
    var message = ''
    for (let i = 0; i < maxLength; i++) {
        message = message+botCommands[i]+' '+botCommandsHelp[i]+'<br>'
    }
    return [`${message}`,'']
    
}


function isCommand(command) {
    return botCommands.includes(command);
}


module.exports = {
    botMain
}

//botMain('/unban ibo ibo canim artik banlisin')