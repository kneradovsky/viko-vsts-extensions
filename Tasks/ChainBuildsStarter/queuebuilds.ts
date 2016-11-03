import tl = require('vsts-task-lib/task');
import trm = require('vsts-task-lib/toolrunner');
import ents = require('html-entities');
import path = require('path');
import fs = require('fs');

import Q = require("q");

import * as vm from 'vso-node-api';
import {ApiHelper} from 'vsts-specflow/apihelper';
import {Feature,Scenario} from  'vsts-specflow/specflow';
import * as bi from 'vso-node-api/interfaces/BuildInterfaces';
import * as ci from 'vso-node-api/interfaces/CoreInterfaces';
import * as ti from 'vso-node-api/interfaces/TestInterfaces';
import * as wi from 'vso-node-api/interfaces/WorkItemTrackingInterfaces';

var buildList = [];
var buildDefinitions = [];

var apihelper = new ApiHelper();
let api = apihelper.getApi();


async function run() {
    let projId = tl.getVariable("System.TeamProjectId");
    let buildList = tl.getInput("buildList").split(",");
    let bapi = api.getBuildApi();
    //map buildname to build def numbers
    let defNumbers = (await bapi.getDefinitions(projId)).filter(bdr => buildList.findIndex(e => e==bdr.name)!=-1).map(bdr => bdr.id);
    let buildDefs = [];
    for(let id of defNumbers) {
        buildDefs.push(await bapi.getDefinition(id,projId));
    }
}

//tl.setVariable("System.TeamProjectId","40e8bc90-32fa-48f4-b43a-446f8ec3f084");
//tl.setVariable("Build.BuildId","10511");
run()
.then(r => tl.setResult(tl.TaskResult.Succeeded,"All Done"))
.catch(r => tl.setResult(tl.TaskResult.Failed,"Task failed"))
