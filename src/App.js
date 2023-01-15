import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { stripHtml } from 'string-strip-html';
import {MongoClient} from 'mongodb';
import { userSchema, messagesSchema, getMessageSchema } from './tools/validation.js';
import { timeFormat } from './tools/getTimeInFormat.js'

//General Constants ------------------------------------------------------------------------------ //

const server = express();
const PORT = 5000;
const MAXIMUM_INNACTIVE_TIME_IN_MS = 10000;
const UPTDATE_TIME_REMOVE_INNACTIVE_USERS_IN_MS = 15000;

// Server Configuration --------------------------------------------------------------------------- //

dotenv.config();
server.use(express.json());
server.use(cors());
server.listen(PORT, () => {console.log(`Server is listening on port ${PORT}`)});

// Database Configuration -------------------------------------------------------------------------- // 
const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;
try{
    await mongoClient.connect();
    console.log("DB Connected!");
}catch(error){
    console.log(error);
    console.log("DB Error");
}

db = mongoClient.db();

// Users POST ----------------------------------------------------------------------------------------------// 

server.post('/participants', async (req, res) =>{
    const userdata = req.body;
    const {value: userRegister, error} = userSchema.validate(userdata);
    if(error) return res.sendStatus(422);
    try{
        const userNameExist = await db.collection('participants').findOne({name: userRegister.name});
        if(!userNameExist){
            const entryMessageStatus = {
                from: stripHtml(userRegister.name).result,
                to: 'Todos',
                text:'Entra na sala...',
                type:'status',
                time: timeFormat()
            };
            await db.collection('messages').insertOne(entryMessageStatus);
            await db.collection('participants').insertOne({ ...userRegister, lastStatus: Date.now() });
            res.sendStatus(201);
        }else{
            res.sendStatus(409);
        }
    }catch(error){
        console.log(error);
    }
});

// Users GET ----------------------------------------------------------------------------------------------//

server.get('/participants', async (req, res) => {
    try{
        const currentUsers = await db.collection('participants').find({}).toArray();
        res.send(currentUsers);
    }catch(error){
        res.sendStatus(error);
    }
});

// Messages POST ----------------------------------------------------------------------------------------------//

server.post('/messages', async (req, res) =>{
    const messagesData = req.body;
    const {user} = req.headers;
    const {value: messagesSentData, error} = messagesSchema.validate(messagesData);
    if(error) return res.sendStatus(422);
    const userNameExist = await db.collection('participants').findOne({ name: user });
    try{
        if(userNameExist){
            const message = {
                ...messagesSentData,
                from: user,
                time: timeFormat()
            };
            const sanitizedMessage = {
                to:stripHtml(message.to).result,
                text:stripHtml(message.text).result,
                type:stripHtml(message.type).result,
                from:stripHtml(message.from).result,
                timeFormat:stripHtml(message.time).result
            }
            console.log(sanitizedMessage);
            await db.collection('messages').insertOne(sanitizedMessage);
            return res.sendStatus(201);
        }else{
            return res.sendStatus(422);
        }
    }catch(error){
        console.log(error);
    }
})

// Messages GET ----------------------------------------------------------------------------------------------//

server.get('/messages', async (req,res) =>{
    const limit = req.query.limit 
    const { user } = req.headers;
    const {value: limitValidation, error} = getMessageSchema.validate(limit)
    if(error) return res.sendStatus(422);
    try{
        const messagesFilter = await db.collection('messages').find({
            $or:[
                {type: 'message'},
                {type: 'status'},
                {type:'private_message', from: user},
                {type:'private_message', to: user}
            ]
        }).toArray();

        if(limitValidation){
            return res.send(messagesFilter.slice(-limitValidation).reverse())
        }else{
            return res.send(messagesFilter.reverse());
        }
    }catch(error){
        console.log(error);
    }
})

// Status POST ----------------------------------------------------------------------------------------------//

server.post('/status', async (req, res) =>{
    const { user } = req.headers;
    try{
        const userNameExist = await db.collection('participants').findOne({ name: user });
        if(!userNameExist) return res.sendStatus(404);
        await db.collection('participants').updateOne({ name: user}, {$set: { lastStatus: Date.now() }});
        return res.sendStatus(200);
    }catch(error){
        console.log(error);
    }
})

// Remove Innactive Users ------------------------------------------------------------------------------------ //

setInterval(removeInnactiveUsers, UPTDATE_TIME_REMOVE_INNACTIVE_USERS_IN_MS);
async function removeInnactiveUsers(){
    const timeLimit = Date.now() - MAXIMUM_INNACTIVE_TIME_IN_MS;
    try{
        const usersToRemove = await db.collection('participants').find({ lastStatus: {$lt: timeLimit}}).toArray();
        usersToRemove.forEach(async user => {
            const leaveMessageStatus ={
                from: user.name,
                to:'Todos',
                text:'sai da sala...',
                type: 'status',
                time: timeFormat()
            }
            await db.collection("messages").insertOne(leaveMessageStatus);
        });
        await db.collection('participants').deleteMany({ lastStatus: {$lt: timeLimit}});
        await db.collection('messages').deleteMany({ lastStatus: {$lt: timeLimit}});
    }catch(error){
        console.log(error);
    }
}
