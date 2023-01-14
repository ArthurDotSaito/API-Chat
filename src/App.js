import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {MongoClient} from 'mongodb';
import { userSchema, messagesSchema } from './tools/validation.js';
import { timeFormat } from './tools/getTimeInFormat.js'

const server = express();
const PORT = 5000;

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
                from: userRegister.name,
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
    const { user } = req.header;
    const {value: messagesSentData, error} = userSchema.validate(messagesData);
    if(error) return res.sendStatus(422);
    try{
        const userNameExist = await db.collection('participants').findOne({name: user});
        if(userNameExist){
            const message = {
                ...messagesSentData,
                from: user,
                time: timeFormat()
            }
            await db.collection('messages').insertOne(message);
            return res.sendStatus(201);
        }else{
            return res.sendStatus(402);
        }
    }catch(error){
        console.log(error);
    }
})

// Messages GET ----------------------------------------------------------------------------------------------//

server.get('/messages', async (req,res) =>{
    const limit = res.query.limit ? parseInt(req.query.limit):false;
    const { user } = req.header;
    try{
        const messagesFilter = await db.collection('messages').find({
            $or:[
                {type: 'message'},
                {type: 'status'},
                {type:'private_message', from: user},
                {type:'private_message', to:user}
            ]
        }).toArray();

        if(limit){
            return res.send(messagesFilter.slice(-limit).reverse())
        }else{
            return res.send(messagesFilter.reverse());
        }
    }catch(error){
        console.log(error);
    }
})