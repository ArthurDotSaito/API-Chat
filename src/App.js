import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {MongoClient} from 'mongodb';

const server = express();
const PORT = 5000;

// Server Configuration --------------------------------------------------------------------------- //

dotenv.config();
server.use(express.json);
server.use(cors());
server.listen(PORT, () => {console.log(`Servidor rodando na porta ${PORT}`)});

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

