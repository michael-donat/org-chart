import URL from 'url-parse'
import {v4 as uuidv4} from 'uuid'

import Couch from "davenport";

export let KIND = {
    ORGANIZATION: 'ORGANIZATION',
    DEPARTMENT: 'DEPARTMENT',
    TRIBE: 'TRIBE',
    SQUAD: 'SQUAD',
    TEAM: 'TEAM',
    UNIT: 'UNIT'
}

export let TYPE = {
    EMPLOYEE: 'EMPLOYEE',
    TEMP: 'TEMP',
    CONTRACTOR: 'CONTRACTOR',
    AGENCY_CONTRACTOR: 'AGENCY_CONTRACTOR',
}

let STREAM = {}

class Employee {
    constructor({
                    id, name, title, reportsTo, memberOf,
                    stream, number, github, startDate, type, vacancy, backfill
                } = {}) {
        this.id = id
        this.name = name
        this.title = title
        this.reportsTo = reportsTo
        this.memberOf = memberOf
        this.stream = stream
        this.number = number
        this.github = github
        this.startDate = startDate || ""
        this.type = type || TYPE.EMPLOYEE
        this.vacancy = vacancy
        this.backfill = backfill
    }
}

class Lead {
    constructor({id, stream}) {
        this.id = id
        this.stream = stream
    }
}

class Team {
    constructor({id, name, kind, parent, leads, description} = {}) {
        this.id = id
        this.name = name
        this.kind = kind
        this.parent = parent
        this.leads = leads;
        this.description = description
    }
}

class Organisation {
    constructor(employees, teams) {
        this.employees = employees
        this.teams = teams
    }

    toLiteral() {
        return {
            employees: this.employees.map(e => Object.assign({}, e)).sort((a, b) => {
                if (a.name === b.name) return 0
                return (a.name > b.name) ? 1 : -1
            }),
            teams: this.teamHierarchy(),
            reporting: this.reportingHierarchy(),
            rootEmployee: this.rootEmployee,
            kinds: KIND,
            types: TYPE,
            streams: STREAM,
        }
    }

    teamsById() {
        const byId = {}

        this.teams.forEach(t => {
            byId[t.id] = t;
        })

        return byId
    }

    reportingHierarchy() {

        const root = this.rootEmployee;

        const teamsById = {}

        this.teams.forEach(t => {
            teamsById[t.id] = t
        })

        const employeesById = {}

        this.employees.forEach(e => {
            const employee = Object.assign({}, e)
            employee.children = []
            employeesById[e.id] = employee

            if (!employee.memberOf) { //no team assoc
                employee.reportsTo = root
                return
            }

            if (!employee.reportsTo) {
                let team = teamsById[employee.memberOf]

                for (const val of Object.keys(STREAM)) {
                    const kk = val.toLowerCase() + "Lead";
                    if (team[kk] === employee.id) {
                        team = teamsById[team.parent]
                        break
                    }
                }

                if (!team) {
                    employee.reportsTo = root
                } else {
                    employee.reportsTo = findLeadUpFromFor(team, teamsById, employee) || root
                }
            }
        })

        Object.values(employeesById).forEach(employee => {
            if (employee.id === root) return;

            const lead = employeesById[employee.reportsTo]

            lead.children.push(employee)
        })

        return employeesById[root]

    }

    teamHierarchy() {
        const hierarchy = {}
        this.teams.forEach(t => {
            hierarchy[t.id] = Object.assign({}, t)
            hierarchy[t.id].children = []
            hierarchy[t.id].members = []
        })

        const root = this.teams.filter(t => !t.parent)

        if (root.length === 0) {
            return null
            //throw new Error("Error while building team hierarchy, no root.")
        }

        if (root.length > 1) {
            throw new Error(`Error while building team hierarchy, more than one root defined [${root.map(t => t.id).join(', ')}].`)
        }

        const employeesById = {}

        this.employees.forEach(e => {
            employeesById[e.id] = e
        })

        const rootTeam = hierarchy[root[0].id]

        this.teams.forEach(t => {
            if (t.parent) {
                if (!hierarchy[t.parent]) {
                    throw new Error(`Error while building team hierarchy, parent ${t.parent} not found for team ${t.name}`)
                }

                hierarchy[t.parent].children.push(hierarchy[t.id])
            }

            // assign leads
            Object.keys(STREAM).forEach(val => {
                const kk = val.toLowerCase() + "Lead"
                if (t[kk] && employeesById[t[kk]]) {
                    hierarchy[t.id][kk] = Object.assign({}, employeesById[t[kk]])
                }
            })
        })

        this.employees.forEach(e => {

            if (e.memberOf) {

                if (!hierarchy[e.memberOf]) {
                    throw new Error(`Error while building team hierarchy, team ${e.memberOf} not found for employee ${e.name}`)
                }

                hierarchy[e.memberOf].members.push(Object.assign({}, e))
            }
        })

        return rootTeam
    }

    reparentTeam(team, to) {
        this.teams.find(t => t.id === team).parent = to
    }

    removeFromTeam(employee) {
        this.employees.find(e => e.id === employee).memberOf = null
    }

    addToTeam(employee, team) {
        this.employees.find(e => e.id === employee).memberOf = team
    }

    toJSON() {
        return JSON.stringify({
            employees: this.employees.sort((a, b) => {
                if (a.name === b.name) return 0
                return (a.name > b.name) ? 1 : -1
            }),
            teams: this.teams.sort((a, b) => {
                if (a.name === b.name) return 0
                return (a.name > b.name) ? 1 : -1
            }),
            rootEmployee: this.rootEmployee,
            streams: Object.values(STREAM),
            types: Object.values(TYPE),
            kinds: Object.values(KIND),
        }, null, 2)
    }

    fromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString)

            this.parseData(data)
        } catch (err) {
            alert("JSON.parse error, check console")
        }
    }

    parseData(data) {

        if (!data) {
            data = {}
            const org = new Team({
                id: "org",
                kind: KIND.ORGANIZATION,
                description: "New Organization",
                name: "New Organization",
                "parent": null
            })
            const root = new Employee({
                id: "ceo",
                name: "CEO",
                title: "CEO",
                type: TYPE.EMPLOYEE,
                stream: "Management",
                memberOf: org.id,
                children: []
            })
            data.employees = [root]
            data.teams = [org]
        }

        this.employees = data.employees.map(e => Object.assign(new Employee(), e))
        this.teams = data.teams.map(e => {
            const o = Object.assign(new Team(), e)
            if (o.leads) {
                const leads = [];
                o.leads.forEach(l => {
                    leads.push(Object.assign(new Lead(), l))
                })
                o.leads = leads;
            }
            return o
        })
        this.rootEmployee = data.rootEmployee || "ceo";
    }

    addNewTeam(name, kind, parent, description) {
        this.teams.push(new Team({
            id: makeTeamId(name, kind), name, kind, parent, description
        }))
    }

    changeTeamName(team, newName) {
        this.teams.find(t => t.id === team).name = newName
    }

    changeTeamDescription(team, newDescription) {
        this.teams.find(t => t.id === team).description = newDescription
    }

    async saveData(url) {

        const parsedURL = new URL(url);



        const chartData = {
            employees: this.employees,
            teams: this.teams,
            streams: Object.values(STREAM),
            kinds: Object.values(KIND),
            types: Object.values(TYPE),
            rootEmployee: this.rootEmployee,
        }

        if (parsedURL.protocol.startsWith("couchdbs")) {
            parsedURL.protocol = "https:"

            const couch = new Couch(parsedURL.protocol + "//" + parsedURL.host, parsedURL.pathname.substr(1))

            await couch.put(
                "chart",
                chartData,
                this.documentRevision,
            )
                .then(res => {
                    this.documentRevision = res.rev
                })
                .catch(err => {
                    alert("failed to save data: " + err.message)
                })

        } else {

            fetch('url', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(chartData)
            }).then(res => {
                console.log("saved to ", url)
            })
            .catch(err => {
                alert("failed to save data: " + err.message)
            });

        }


    }

    async loadData(url) {

        try {

            const parsedURL = new URL(url);

            let data;
            let dataURL;
            let persistURL = undefined;

            // couchdb://user:pass@0.0.0.0:5984/it-org-chart

            if (parsedURL.protocol.startsWith("couch")) {
                // couch URL

                persistURL = url

                const loadURL = new URL(url);

                loadURL.auth = ""
                loadURL.password = ""
                loadURL.username = ""

                dataURL = loadURL.toString()


                if (parsedURL.protocol.startsWith("couchdbs")) {
                    parsedURL.protocol = "https:"
                } else {
                    parsedURL.protocol = "http:"
                }

                const couch = new Couch(parsedURL.protocol + "//" + parsedURL.host, parsedURL.pathname.substr(1))

                data = await couch.get("chart").then(data => {
                    this.documentRevision = data._rev
                    return {employees: [], teams: [], ...data}
                }).catch(err => {
                    alert("failed to load data: " + err.message)
                    return data = {"employees": [], "teams": []}
                })


            } else {
                const response = await fetch(url)
                data = await response.json()

                dataURL = url
            }

            localStorage.setItem("dataURL", dataURL)
            localStorage.setItem("persistURL", persistURL)

            return this.parseData(data)

        } catch (err) {
            alert("failed to load: " + err.message)
        }

    }

    removeTeam(team) {
        const teamToRemove = this.teams.find(t => t.id === team)

        this.employees.forEach(e => {
            if (e.memberOf === team) {
                e.memberOf = undefined
            }
        })

        const parentTeamId = teamToRemove.parent

        this.teams.forEach(e => {
            if (e.parent === team) {
                e.parent = parentTeamId
            }
        })

        this.teams = this.teams.filter(t => t.id !== team)
    }

    addEmployee(name, title, stream, reportsTo, employee, github, startDate, type, vacancy, backfill) {
        const emp = new Employee({
            id: makeEmployeeId(name), name, title, reportsTo,
            stream, employee, github, startDate: startDate === "" ? null : startDate, type,
            vacancy, backfill
        })
        this.employees.push(emp)
    }

    editEmployee(id, name, title, stream, reportsTo, employeeNumber, github, startDate, type, vacancy, backfill) {
        const employee = this.employees.find(e => e.id === id)

        employee.name = name
        employee.title = title
        employee.stream = stream
        employee.reportsTo = reportsTo
        employee.number = employeeNumber
        employee.github = github
        employee.startDate = startDate === "" ? null : startDate
        employee.type = type
        employee.vacancy = vacancy
        employee.backfill = backfill
    }

    removeEmployee(id) {

        this.employees.filter(e => e.reportsTo === id).forEach(e => {
            e.reportsTo = undefined
        })

        this.teams.filter(t => t.techLead === id).forEach(t => {
            t.techLead = undefined
        })

        this.teams.filter(t => t.productLead === id).forEach(t => {
            t.productLead = undefined
        })

        this.employees = this.employees.filter(e => e.id !== id)
    }

    setLead(team, lead, stream) {
        this.teams.find(t => t.id === team)[stream] = lead
    }
}

function makeTeamId(name, kind) {
    return `${name}_${kind}`.toLowerCase().replace(/[^a-z0-9]+/, '_')
}

function makeEmployeeId(name) {
    // return `${name}`.toLowerCase().replace(/[^a-z0-9]+/, '_')
    return uuidv4()
}

const data = new Organisation([], [])

if (process.env.NODE_ENV === "development") {
    const d = true ? require("./fixtures/example.json") : null
    data.parseData(d)
}

export default data

export function _moveNodesToChildren(team, showMembers, showVacancies, notRecursive) {

    if (!notRecursive) {
        team.children = team.children.map(c => _moveNodesToChildren(c, showMembers, showVacancies))
    }

    if (showMembers) {
        let children = team.members
        if (!showVacancies) {
            children = children.filter(c => !c.vacancy && !c.backfill)
        }
        team.children = children
    }

    return team
}

const findLeadUpFromFor = (team, teams, employee) => {

    const searchKey = employee.stream.toLowerCase() + "Lead"

    let currentTeam = team

    if (currentTeam[searchKey]) {
        return currentTeam[searchKey]
    }

    while (currentTeam.parent && teams[currentTeam.parent]) {
        currentTeam = teams[currentTeam.parent]

        if (currentTeam[searchKey]) {
            return currentTeam[searchKey]
        }
    }

    return null
}

export const flattenTeamHierarchyExcluding = (teamId) => {
    function fn(r, a) {

        if (a.id === teamId) return r

        r.push(a);
        if (a.children && a.children.length > 0) {
            a.children.reduce(fn, r);
        }
        return r;
    }

    return fn
}
