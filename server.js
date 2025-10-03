import {fileURLToPath} from 'url';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

// IMPORT MONGODB MONGOOSE SCHEMAS FROM Schemas.js
import {User, Game} from './Schemas.js';
import "./game_logic.js";

const app = express();

// serve static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'final-proj/dist')));

// middleware to parse requests as JSON bodies.
app.use(express.json());

// reads .env in project root
dotenv.config();

const PORT = process.env.PORT || 3000;

// mongoose MongoDB setup from the .env file.
const uri = process.env.MONGO_URL
// to get URL --> go to drivers --> mongoose --> URL below.

// copy-pasted directly from mongoDB's example for using mongoose w/ mongodb.
const clientOptions = {serverApi: {version: '1', strict: true, deprecationErrors: true}};

async function run() {
    // Create a Mongoose client with a MongoClientOptions object to set the Stable API version
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db.admin().command({ping: 1});
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
}
run().catch(console.dir);
//






app.listen(PORT, () => {
    console.log(`Server is listening at http://localhost:${PORT}`);
});
