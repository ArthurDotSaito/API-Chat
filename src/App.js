import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {MongoClient} from 'mongodb';
import { userSchema } from './tools/validation.js';
import { timeFormat } from './tools/getTimeInFormat.js'

const server = express();
const PORT = 5000;

// Server Configuration --------------------------------------------------------------------------- //

dotenv.config();
server.use(express.json);
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
}

db = mongoClient.db();

server.post('/participants', async (req, res) =>{
    const userdata = {...req.body, lastStatus: Date.now()};
    const {value: userRegister, error} = userSchema.validate(userdata.name);
    if(error) return res.status(422).send("Usuário não pode ser vazio e deve possuir caracteres de A-Z");
    try{
        const userNameExist = await db.collection('participants').findOne({name: userdata.name});
        if(!userNameExist){
            const entryMessageStatus = {
                from: userdata.name,
                to: 'Todos',
                text:'Entra na sala...',
                type:'status',
                time: timeFormat()
            };
            await db.collection('messages').insertOne(entryMessageStatus);
            await db.collection('participants').insertOne(userdata);
        }else{
            res.sendStatus(409);
        }
    }catch(error){
        console.log(error);
    }
});