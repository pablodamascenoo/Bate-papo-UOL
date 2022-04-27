import express, { json } from "express";
import cors from "cors";
import chalk from "chalk";
import { MongoClient } from "mongodb";

const app = express();
app.use(cors());
app.use(json());

app.listen(5000, console.log(chalk.bold.cyan("\nRunning server...\n")));

const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("test");
});
