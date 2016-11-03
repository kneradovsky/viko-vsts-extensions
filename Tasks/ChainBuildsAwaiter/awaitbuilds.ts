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

async function processBuilds(buildList: number[]) : number[]{
    
}

async function run() {
    let projId = tl.getVariable("System.TeamProjectId");
    let strBuildList = tl.getVariable("queuedBuilds");
    console.log("queuedBuilds : "+strBuildList);
    var buildList = strBuildList.split(",").map(e => Number.parseInt(e));
    let bapi = api.getBuildApi();
    while(buildList.length>0) 
        buildList = processBuilds(buildList);

}

//tl.setVariable("System.TeamProjectId","40e8bc90-32fa-48f4-b43a-446f8ec3f084");
//tl.setVariable("Build.BuildId","10511");
run()
.then(r => tl.setResult(tl.TaskResult.Succeeded,"All Done"))
.catch(r => tl.setResult(tl.TaskResult.Failed,"Task failed"))
