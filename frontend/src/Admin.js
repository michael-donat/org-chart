import React from 'react'

import {Box, Flex} from 'reflexbox'
import {List, ListItem} from 'material-ui/List'
import {CardHeader} from 'material-ui/Card'
import Subheader from 'material-ui/Subheader';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import TextField from 'material-ui/TextField';
import Checkbox from 'material-ui/Checkbox';
import {RadioButton, RadioButtonGroup} from 'material-ui/RadioButton';
import RaisedButtom from 'material-ui/RaisedButton'
import FlatButton from 'material-ui/FlatButton'
import Dialog from 'material-ui/Dialog';
import IconButton from 'material-ui/IconButton';
import EditIcon from 'material-ui/svg-icons/editor/mode-edit';
import {Table, TableHeader, TableHeaderColumn} from 'material-ui/Table';

import {flattenTeamHierarchyExcluding, getEmployeeLabel, KIND, TYPE} from './state'
import {TableBody, TableRow, TableRowColumn} from "material-ui";

let STREAM = {}

function debounce(func, wait, immediate) {
    var timeout;
    return function () {
        var context = this, args = arguments;
        var later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

export default class Admin extends React.Component {

    constructor(props) {
        super(props)

        this.state = {
            team: null
        }
    }

    componentWillReceiveProps(props) {
        if (!this.state.team) {
            return
        }

        const teams = [props.data.get('teams').toJS()].reduce(flattenTeamHierarchyExcluding(), [])

        this.setState({team: teams.find(t => t.id === this.state.team.id)})
    }

    render() {

        if (!this.props.data.get('teams')) {
            return null
        }

        return (
            <Flex p={0} align='center'>
                <Box pb={0} w={1 / 3} style={{alignSelf: "flex-start"}}>
                    <TeamManager team={this.props.data.get('teams').toJS()} onSelect={(team) => {
                        this.setState({
                            team
                        })
                    }} addNewTeam={this.props.actions.addNewTeam}/>
                </Box>
                <Box pb={0} w={1 / 3} style={{alignSelf: "flex-start"}}>
                    <TeamDetails root={this.props.data.get('teams').toJS()} team={this.state.team}
                                 {...this.props.actions}
                                streams={this.props.data.get('streams')}
                                 employees={this.props.data.get('employees').toJS()}
                    />
                </Box>
                <Box pb={0} w={1 / 3} style={{alignSelf: "flex-start", maxHeight: "90vh", overflow: "auto"}}>
                    <EmployeeList
                        employees={this.props.data.get('employees').toJS()}
                        exclude={this.state.team ? this.state.team.id : null} addToTeam={(employee) => {
                            this.props.actions.addToTeam(employee, this.state.team.id)
                        }}
                        teams={[this.props.data.get('teams').toJS()].reduce(flattenTeamHierarchyExcluding(), [])}
                        addEmployee={this.props.actions.addEmployee}
                        editEmployee={this.props.actions.editEmployee}
                        removeEmployee={this.props.actions.removeEmployee}
                    />
                </Box>
            </Flex>
        )
    }
}


function collectUpstreamEmployees(collection, team) {

    if (team.members) {
        collection = collection.concat(team.members);
    }

    if (team.parent) {
        collection = collectUpstreamEmployees(collection, team.parent)
    }

    return collection
}


class TeamDetails extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            name: "",
            newLead: {
                stream: "",
                employee: "",
                team: "",
            }
        }

        this.debouncedChangeTeamName = debounce(props.changeTeamName, 500, false)
        this.debouncedChangeTeamDescription = debounce(props.changeTeamDescription, 500, false)
    }

    componentWillReceiveProps(props) {
        this.setState({
            name: props.team ? props.team.name : "",
            description: props.team && props.team.description ? props.team.description : "",
            newLead: {
                stream: "",
                employee: "",
                team: "",
            }
        })
    }

    onNameChange = (id, val) => {
        this.setState({
            name: val
        })

        this.debouncedChangeTeamName(id, val)
    }

    onDescriptionChange = (id, val) => {
        this.setState({
            description: val
        })

        this.debouncedChangeTeamDescription(id, val)
    }

    onLeadSelection = (id, val, a, b) => {
        this.setState({
            newLead: {
                employee: val,
                team: id,
                stream: this.state.newLead.stream
            }
        })
    }

    onLeadStreamChange = (id, val) => {
        this.setState({
            newLead: {
                stream: val,
                team: id,
                employee: this.state.newLead.employee
            }
        })
    }

    render() {
        let {root, team, reparentTeam, removeFromTeam, removeTeam, employees, setLead, removeLead, streams} = this.props

        if (!team) {
            return null
        }

        return (

            <div>
                <TextField
                    value={this.state.name}
                    floatingLabelText={"Name"}
                    fullWidth={true}
                    onChange={(_, val) => {
                        this.onNameChange(team.id, val)
                    }}
                />


                <SelectField
                    floatingLabelText="Member of"
                    fullWidth={true}
                    value={team.parent}
                    onChange={(_, __, i) => reparentTeam(team.id, i)}
                >
                    {[root].reduce(flattenTeamHierarchyExcluding(team.id), []).map(t => (
                        <MenuItem key={t.id} value={t.id} primaryText={t.name}/>
                    ))}
                </SelectField>

                <Subheader>Members</Subheader>
                <List>

                    {team.members.map(e => (
                        <ListItem onClick={() => removeFromTeam(e.id)} primaryText={e.name} key={e.id}
                                  secondaryText={e.title}/>
                    ))}
                </List>

                <Subheader>Leaders</Subheader>

                <List>
                    {(Object.entries(team.leads) || {}).map(entry => {

                        const [stream, employeeId] = entry

                        const employee = employees.find(e => e.id == employeeId)

                        if (!employee) return

                        return (
                            <ListItem onClick={() => removeLead(team.id, stream)} primaryText={getEmployeeLabel(employee)} key={stream+employeeId}
                                      secondaryText={stream}/>
                        )
                    })}
                </List>

                <Subheader>Add leaders</Subheader>

                <TextField
                    value={this.state.newLead.stream}
                    floatingLabelText={"Stream"}
                    fullWidth={false}
                    multiLine={false}
                    onChange={(_, val) => {
                        this.onLeadStreamChange(team.id, val)
                    }}
                />

                <SelectField
                    floatingLabelText="Lead"
                    fullWidth={false}
                    onChange={(_,__, i) => this.onLeadSelection(team.id, i)}
                    value={this.state.newLead.employee}
                >
                    <MenuItem key={"_leader_none"} value={""} primaryText={""}/>
                    {employees.map(e => (
                        <MenuItem primaryText={getEmployeeLabel(e)} key={e.id} value={e.id} />
                    ))}
                </SelectField>

                <FlatButton fullWidth={false} label={"Add Lead"} secondary onClick={() => {

                    if (!this.state.newLead.employee || !this.state.newLead.stream || !this.state.newLead.team) {
                        console.error("missing lead data for submit")
                        return false
                    }

                    setLead(this.state.newLead.team, this.state.newLead.employee, this.state.newLead.stream)

                    this.setState({newLead: {
                            stream: "",
                            employee: "",
                            team: "",
                        }})
                }}/>

                <TextField
                    value={this.state.description}
                    floatingLabelText={"Description"}
                    fullWidth={true}
                    multiLine={true}
                    rowsMax={6}
                    rows={3}
                    onChange={(_, val) => {
                        this.onDescriptionChange(team.id, val)
                    }}
                />

                <RaisedButtom fullWidth={true} label={"Delete"} secondary onClick={() => {
                    if (!window.confirm("Ya?\nAll employees who are part of this team will be unassigned.\nAll child teams will be assigned to parent.")) {
                        return
                    }
                    removeTeam(team.id)
                }}/>
            </div>
        )
    }
}

const TeamManager = ({team, onSelect, addNewTeam}) => (
    <List>
        <ListItem onClick={() => onSelect(team)} primaryTogglesNestedList={false} initiallyOpen={true}
                  primaryText={team.name} key={team.id}
                  nestedItems={renderTeams(team.children, onSelect)}/>
        <ListItem>
            <AddTeamDialog parents={[team].reduce(flattenTeamHierarchyExcluding(), [])} addNewTeam={addNewTeam}/>
        </ListItem>
    </List>
)

const renderTeams = (teams, onSelect) => {
    if (!teams) {
        return null
    }
    return teams.map(t => (
        <ListItem onClick={() => onSelect(t)} primaryTogglesNestedList={true} primaryText={t.name} key={t.id}
                  nestedItems={renderTeams(t.children, onSelect)}/>
    ))
}

class EmployeeList extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            search: "",
            filter: false,
            addPersonOpen: false,
            editedPerson: null
        }
    }

    handleSearchChange = (event) => {
        this.setState({
            search: event.target.value,
        });
    };

    handleFilterChange = (_, isInputChecked) => {
        this.setState({
            filter: isInputChecked,
        });
    };


    render() {
        const {employees, exclude, addToTeam, teams} = this.props
        return (
            <div>
                <List style={{maxHeight: '100%', overflow: 'auto'}}>
                    <ListItem>
                        <RaisedButtom label={"Add"} fullWidth={true} onClick={() => {
                            this.setState({addPersonOpen: true, editedPerson: null})
                        }}/>
                        <TextField
                            fullWidth={true}
                            hintText="Search"
                            value={this.state.search}
                            onChange={this.handleSearchChange}
                        />
                        <Checkbox
                            label="unassigned only"
                            onCheck={this.handleFilterChange}
                        />
                    </ListItem>
                    {employees.filter(e => {
                        return e.memberOf !== exclude &&
                            (e.name || "").toLowerCase().search(this.state.search.toLowerCase()) !== -1 &&
                            (!this.state.filter || !e.memberOf)
                    }).map(e => {
                        const team = teams.find(t => t.id === e.memberOf)

                        let sub = e.title

                        if (e.github) {
                            sub = `${sub} [gh: ${e.github}]`
                        }

                        if (team) {
                            sub = `${sub} - ${team.name}`
                        }

                        if (e.type === "TEMP") {
                            sub = `[TMP] ${sub}`
                        }

                        if (e.type === "CONTRACTOR") {
                            sub = `[CON] ${sub}`
                        }

                        if (e.type === "AGENCY_CONTRACTOR") {
                            sub = `[AGN] ${sub}`
                        }

                        if (e.startDate) {
                            sub = `${e.startDate} - ${sub}`
                        }

                        let lab = e.name + ` #${e.number}`

                        if (!e.name) {
                            lab = `[HC] ` + e.title
                        }

                        return (<ListItem primaryText={lab} key={e.id} onClick={() => exclude && addToTeam(e.id)}
                                          secondaryText={sub}
                                          rightIconButton={<IconButton tooltip="edit" onClick={() => {
                                              this.setState({addPersonOpen: true, editedPerson: e})
                                          }}><EditIcon/></IconButton>}/>)
                    })}
                </List>
                <AddPersonDialog open={this.state.addPersonOpen} person={this.state.editedPerson} afterClose={() => {
                    this.setState({addPersonOpen: false, editedPerson: null} )
                }} addEmployee={this.props.addEmployee} editEmployee={this.props.editEmployee} removeEmployee={this.props.removeEmployee} employees={employees} />
            </div>
        )
    }
}

class AddPersonDialog extends React.Component {

    state = {
        open: false,
        id: null,
        name: "",
        title: "",
        stream: Object.keys(STREAM)[0],
        reportsTo: null,
        github: "",
        number: "",
        type: TYPE.EMPLOYEE,
        startDate: "",
    }

    componentWillReceiveProps(nextProps) {
        if (this.props === nextProps) {
            return
        }

        this.setState({
            open: nextProps.open,
            id: null,
            name: "",
            title: "",
            github: "",
            number: "",
            stream: "",
            reportsTo: null,
            type: Object.keys(TYPE)[0],
            startDate: "",
            ...nextProps.person,
        })

    }

    handleClose = () => {
        //this.setState({open: false});
        this.props.afterClose()
    };

    submit = () => {
        const {id, name, title, stream, reportsTo, number, github, type, startDate, vacancy, backfill} = this.state

        if (!title || !stream || !type) {
            return
        }

        if (!name && !vacancy && !backfill) {
            // require name if not a backfil or vacancy
            return
        }

        if (id) {
            this.props.editEmployee(id, name, title, stream, reportsTo, number, github, startDate, type, vacancy, backfill);
        } else {
            this.props.addEmployee(name, title, stream, reportsTo, number, github, startDate, type, vacancy, backfill);
        }

        this.handleClose()
    }

    delete = () => {

        const {id} = this.state

        if (!id) {
            return this.handleClose()
        }

        const go = window.confirm("Really, but like... really really?")

        if (go) {
            this.props.removeEmployee(id)
        }

        return this.handleClose()

    }

    render() {
        const actions = [
            <FlatButton
                label="Cancel"
                primary={true}
                onClick={this.handleClose}
            />,
            <RaisedButtom
                label="Submit"
                primary={true}
                onClick={this.submit}
            />,
        ];

        return (
            <Dialog
                title={this.props.person ? "Edit Employee" : "Add New Employee"}
                actions={actions}
                modal={false}
                open={this.state.open}
                onRequestClose={this.handleClose}
            >

                <TextField floatingLabelText={"Full Name"} onChange={(_, val) => {
                    this.setState({name: val})
                }} value={this.state.name || ""}/><br/>

                <TextField floatingLabelText={"Title"} onChange={(_, val) => {
                    this.setState({title: val})
                }} value={this.state.title || ""}/><br/>

                <TextField floatingLabelText={"Start Date"} onChange={(_, val) => {
                    this.setState({startDate: val})
                }} value={this.state.startDate || ""}/><br/>

                <TextField floatingLabelText={"GitHub"} onChange={(_, val) => {
                    this.setState({github: val})
                }} value={this.state.github || ""}/><br/>

                <TextField floatingLabelText={"Employee #"} onChange={(_, val) => {
                    this.setState({number: val})
                }} value={this.state.number || ""}/><br/>

                <TextField
                    value={this.state.stream || ""}
                    floatingLabelText={"Stream"}
                    onChange={(_, val) => {
                        this.setState({stream: val})
                    }}
                />

                <SelectField
                    onChange={(_, __, val) => {
                        this.setState({type: val})
                    }}
                    fullWidth={true}
                    value={this.state.type}
                    floatingLabelText={"Type"}
                >
                    {Object.keys(TYPE).map(val => (
                        <MenuItem key={val} value={val} primaryText={val}/>
                    ))}
                </SelectField>

                <Checkbox
                    label="vacancy"
                    checked={this.state.vacancy}
                    onCheck={(_, val) => {
                        this.setState({vacancy: val})
                    }}
                />

                <Checkbox
                    label="backfill"
                    checked={this.state.backfill}
                    onCheck={(_, val) => {
                        this.setState({backfill: val})
                    }}
                />

                <SelectField
                    onChange={(_, __, val) => {
                        this.setState({reportsTo: val === "--inherit--" ? undefined : val})
                    }}
                    fullWidth={true}
                    value={this.state.reportsTo}
                    floatingLabelText={"Reports to"}
                >
                    <MenuItem key={"_report-none"} value={"--inherit--"} primaryText={""}/>
                    {this.props.employees.map(t => (
                        <MenuItem key={t.id} value={t.id} primaryText={getEmployeeLabel(t)}/>
                    ))}
                </SelectField>

                <RaisedButtom
                    label="DELETE"
                    secondary={true}
                    onClick={this.delete}
                />

            </Dialog>
        )
    }
}

class AddTeamDialog extends React.Component {
    state = {
        open: false,
        name: "",
        kind: Object.keys(KIND)[0],
        parent: ""
    };

    handleOpen = () => {
        this.setState({open: true, name: "", kind: Object.keys(KIND)[0], parent: "", description: ""});
    };

    handleClose = () => {
        this.setState({open: false});
    };

    submit = () => {
        const {name, kind, parent, description} = this.state

        if (!name || !kind || !parent || !description) {
            return
        }

        this.props.addNewTeam(name, kind, parent, description);

        this.setState({open: false})
    }

    render() {
        const actions = [
            <FlatButton
                label="Cancel"
                primary={true}
                onClick={this.handleClose}
            />,
            <RaisedButtom
                label="Submit"
                primary={true}
                onClick={this.submit}
            />,
        ];

        return (
            <div>
                <RaisedButtom label={"Add"} fullWidth={true} onClick={this.handleOpen}/>
                <Dialog
                    title="Add New Team"
                    actions={actions}
                    modal={false}
                    open={this.state.open}
                    onRequestClose={this.handleClose}
                >
                    <TextField floatingLabelText={"Team name"} onChange={(_, val) => {
                        this.setState({name: val})
                    }} value={this.state.name}/>
                    <RadioButtonGroup name="kind" onChange={(_, val) => {
                        this.setState({kind: val})
                    }} labelPosition={"right"} valueSelected={this.state.kind}>
                        {Object.keys(KIND).map((s,i) => <RadioButton key={"team_add_kind_"+i} value={s} label={s} />)}
                    </RadioButtonGroup>
                    <SelectField
                        onChange={(_, __, val) => {
                            this.setState({parent: val})
                        }}
                        fullWidth={true}
                        value={this.state.parent}
                        floatingLabelText={"Member of"}
                    >
                        {this.props.parents.map(t => (
                            <MenuItem key={t.id} value={t.id} primaryText={t.name}/>
                        ))}
                    </SelectField>
                    <TextField floatingLabelText={"Description"} multiLine={true} rowsMax={6} rows={4}
                        onChange={(_, val) => {
                        this.setState({description: val})
                    }} value={this.state.description}/>
                </Dialog>
            </div>
        );
    }
}
