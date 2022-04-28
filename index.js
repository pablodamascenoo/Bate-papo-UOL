import express, { json } from "express";
import cors from "cors";
import chalk from "chalk";
import dayjs from "dayjs";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import Joi from "joi";
dotenv.config();

const app = express();
app.use(cors());
app.use(json());

app.listen(5000, console.log(chalk.bold.cyan("\nRunning server...\n")));

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

const schema = Joi.object({
  username: Joi.string().alphanum().min(1).required(),
});

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const { error } = schema.validate({ username: name });

  if (error) {
    res.sendStatus(422);
    return;
  }

  try {
    await mongoClient.connect();
    db = mongoClient.db("uol-data");

    if (
      await db.collection("users").findOne({
        name,
      })
    ) {
      res.sendStatus(409);
      return;
    }

    await db.collection("users").insertOne({
      name,
      lastStatus: Date.now(),
    });
    await db.collection("messages").insertOne({
      from: name,
      to: "todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
    mongoClient.close();
  } catch {
    res.sendStatus(500);
    mongoClient.close();
  }
});
