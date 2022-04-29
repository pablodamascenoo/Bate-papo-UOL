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

let db;

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const mongoClient = new MongoClient(process.env.MONGO_URI);

  const schema = Joi.object({
    username: Joi.string().alphanum().min(1).required(),
  });

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
      mongoClient.close();
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
  } catch (error) {
    console.log(chalk.bold.red(error));
    res.sendStatus(500);
    mongoClient.close();
  }
});

app.get("/participants", async (req, res) => {
  const mongoClient = new MongoClient(process.env.MONGO_URI);
  try {
    await mongoClient.connect();
    db = mongoClient.db("uol-data");

    const array = await db.collection("users").find({}).toArray();

    res.status(200).send(array);
    mongoClient.close();
  } catch (error) {
    console.log(chalk.bold.red(`${error} participants`));
    res.sendStatus(500);
    mongoClient.close();
  }
});

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;
  const mongoClient = new MongoClient(process.env.MONGO_URI);

  const schema = Joi.object({
    to: Joi.string().alphanum().min(1).required(),
    text: Joi.string().min(1).required(),
    type: Joi.string()
      .pattern(/^(message|private_message)$/)
      .required(),
    from: Joi.object().required(),
  });

  try {
    await mongoClient.connect();
    db = mongoClient.db("uol-data");

    const array = await db.collection("users").findOne({ name: user });

    const { value, error } = schema.validate({
      type,
      to,
      text,
      from: array,
    });

    if (error) {
      res.sendStatus(422);
      mongoClient.close();
      return;
    }

    await db.collection("messages").insertOne({
      type,
      to,
      text,
      from: user,
      time: dayjs().format("HH:mm:ss"),
    });

    res.sendStatus(201);
    mongoClient.close();
  } catch (error) {
    console.log(chalk.bold.red(error));
    res.sendStatus(500);
    mongoClient.close();
  }
});

app.get("/messages", async (req, res) => {
  const { limit } = req.query;
  const { user } = req.headers;
  const mongoClient = new MongoClient(process.env.MONGO_URI);
  try {
    await mongoClient.connect();
    db = mongoClient.db("uol-data");

    const array = await db.collection("messages").find({}).toArray();

    let filteredArray = array.filter((obj) =>
      obj.to === user ||
      obj.to.toLowerCase() === "todos" ||
      obj.from === user ||
      obj.type !== "private_message"
        ? true
        : false
    );

    res
      .status(200)
      .send(
        filteredArray.length < parseInt(limit) || limit === undefined
          ? filteredArray
          : filteredArray.slice(
              filteredArray.length - parseInt(limit),
              filteredArray.length
            )
      );
    mongoClient.close();
  } catch (error) {
    console.log(chalk.bold.red(error));
    res.sendStatus(500);
    mongoClient.close();
  }
});
