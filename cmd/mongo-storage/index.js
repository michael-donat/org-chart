const express = require("express")
const app = express()
const cors = require('cors')
const { MongoClient } = require("mongodb");

app.use(cors())
app.use(express.json())

let mongoURI = process.env.MONGO_HOST
const mongoDB = "org-chart"
const mongoCollection = "chart"

mongoURI = "mongodb://"+mongoURI+":27017"

const mongo = new MongoClient(mongoURI);

//The Index Route
app.get("/", async (request, response) => {

  let chart = await mongo.db(mongoDB).collection(mongoCollection).find({}).sort({'_id': -1}).limit(1).next()

  if (!chart) {
    chart = {
      "employees": [
        {
          "id": "ceo",
          "title": "CEO",
          "memberOf": "company",
          "stream": "MANAGEMENT",
          "type": "EMPLOYEE",
          "vacancy": true,
        },
      ],
      "teams": [
        {
          "id": "company",
          "name": "Company",
          "kind": "DEPARTMENT",
          "parent": null,
          "description": "Company Name"
        },
      ],
      "rootEmployee": "ceo",
    }
  }

  response.json(chart)
})

app.post("/", async (request, response) => {

  const doc = {
    ...request.body,
    by: request.get("x-auth-user") || "unknown",
    on: new Date(),
  }

  await mongo.db(mongoDB).collection(mongoCollection).insertOne(doc)

  console.log("chart saved")

  response.end()
})

async function run() {

  await mongo.connect()
  await mongo.db(mongoDB).command({ping: 1})
  console.log("mongo connected, starting express")

  app.listen(4000, () => console.log("Server Listening on Port 4000"))
}

run().catch(console.dir);