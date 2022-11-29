const express = require("express")
const app = express()
const cors = require('cors')

app.use(cors())
app.use(express.json())

//The Index Route
app.get("/org", (request, response) => {
    // send the posts array as a json response
    response.json(org)
})

app.post("/org", (request, response) => {
    console.log(request.body)
    response.end()
})

// Turn on the server
app.listen(4000, () => console.log("Server Listening on Port 4000"))



const org = {
  "employees": [
    {
      "id": "1",
      "name": "Bee #1",
      "title": "Worker Bee",
      "reportsTo": "2",
      "memberOf": "hive",
      "stream": "ENGINEERING",
      "number": "1",
      "github": "worker-bee",
      "startDate": "20th Oct 2020",
      "type": "EMPLOYEE"
    },
    {
      "id": "v1",
      "title": "Worker Bee",
      "reportsTo": "2",
      "memberOf": "hive",
      "stream": "ENGINEERING",
      "number": "1",
      "github": "worker-bee",
      "startDate": "20th Oct 2020",
      "type": "EMPLOYEE",
      "vacancy": true
    },
    {
      "id": "2",
      "name": "Bee #2",
      "title": "Queen Bee",
      "reportsTo": null,
      "memberOf": "hive",
      "stream": "PRODUCT",
      "number": "2",
      "github": "queen-bee",
      "startDate": "",
      "type": "EMPLOYEE",
      "backfill": true
    },
    {
      "id": "3",
      "name": "Bee #3",
      "title": "Mighty Bee",
      "reportsTo": null,
      "memberOf": "hive",
      "stream": "ENGINEERING",
      "number": "3",
      "github": "mighty-bee",
      "startDate": "",
      "type": "EMPLOYEE"
    },
    {
      "id": "4",
      "name": "Bee #4",
      "title": "Temp Bee",
      "reportsTo": null,
      "memberOf": "subhive_squad",
      "stream": "ENGINEERING",
      "number": "4",
      "github": "tempt-bee",
      "startDate": "",
      "type": "TEMP"
    },
    {
      "id": "5",
      "name": "Bee #5",
      "title": "Contract Bee",
      "reportsTo": null,
      "memberOf": "hive",
      "stream": "ENGINEERING",
      "number": "5",
      "github": "contract-bee",
      "startDate": "",
      "type": "CONTRACTOR"
    },
    {
      "id": "6",
      "name": "Bee #6",
      "title": "Agency Bee",
      "reportsTo": null,
      "memberOf": "hive",
      "stream": "ENGINEERING",
      "number": "6",
      "github": "agency-bee",
      "startDate": "",
      "type": "AGENCY_CONTRACTOR"
    },
    {
      "id": "7",
      "name": "Bee #7",
      "title": "Temp Bee 2",
      "reportsTo": null,
      "memberOf": "hive",
      "stream": "ENGINEERING",
      "number": "7",
      "github": "temp-bee-2",
      "startDate": "",
      "type": "TEMP"
    }
  ],
  "teams": [
    {
      "id": "hive",
      "name": "Hive",
      "kind": "DEPARTMENT",
      "parent": null,
      "description": "Honey's alright, right?"
    },
    {
      "id": "subhive_squad",
      "name": "SubHive",
      "kind": "SQUAD",
      "parent": "hive",
      "description": "."
    }
  ],
  "rootEmployee": "2",
  "types": [
    "EMPLOYEE",
    "TEMP",
    "CONTRACTOR",
    "AGENCY_CONTRACTOR",
    "VACANCY",
    "BACKFILL"
  ],
  "kinds": [
    "EMPLOYEE",
    "DEPARTMENT",
    "TEAM",
    "GROUP"
  ]
}