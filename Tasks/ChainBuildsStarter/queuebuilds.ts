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
    tl.setResourcePath(path.join(__dirname, 'task.json'));
    let projId = tl.getVariable("System.TeamProjectId");
    let buildList = tl.getInput("buildList").split(",");
    try {
        let bapi = api.getBuildApi();
        //map buildname to build def numbers and filter out drafts
        let defNumbers = (await bapi.getDefinitions(projId))
                         .filter(bdr => buildList.findIndex(e => e==bdr.name)!=-1) //find build definitions that matches names from buildList
                         .filter(bdr => bdr.quality==bi.DefinitionQuality.Definition).map(bdr => bdr.id); //filter out drafts
        let buildNumbers = [];
        for(let bid of defNumbers) {
            let bDef =  await bapi.getDefinition(bid,projId);
            var build:bi.Build = Object.create(null);
            build.definition=Object.create(null);
            build.definition.id=bDef.id;
            build = await bapi.queueBuild(build,projId);
            console.log(tl.loc("queueBuild",bDef.name));
            buildNumbers.push(build.id);
        }
        let builds = buildNumbers.join(",");
        console.log(tl.loc("Builds",builds));
        tl.setVariable("queuedBuilds",builds);
    } catch(err) {
        console.log(err);
        console.log(err.stack);
        throw err;
    }
}

//tl.setVariable("System.TeamProjectId","40e8bc90-32fa-48f4-b43a-446f8ec3f084");
//tl.setVariable("Build.BuildId","10511");
run()
.then(r => tl.setResult(tl.TaskResult.Succeeded,tl.loc("taskSucceeded")))
.catch(r => tl.setResult(tl.TaskResult.Failed,tl.loc("taskFailed")))
