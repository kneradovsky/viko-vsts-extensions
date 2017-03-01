import tl = require('vsts-task-lib/task');
import trm = require('vsts-task-lib/toolrunner');
import path = require('path');
import fs = require('fs');
import Q = require("q");

import * as vm from 'vso-node-api';
import * as bi from 'vso-node-api/interfaces/BuildInterfaces';
import * as ci from 'vso-node-api/interfaces/CoreInterfaces';
import * as ti from 'vso-node-api/interfaces/TestInterfaces';
import * as wi from 'vso-node-api/interfaces/WorkItemTrackingInterfaces';


async function run() {
    tl.setResourcePath(path.join(__dirname, 'task.json'));
    let projId = tl.getVariable("System.TeamProjectId");
    try {
    } catch(err) {
        console.log(err);
        console.log(err.stack);
        throw err;
    }
}

run()
.then(r => tl.setResult(tl.TaskResult.Succeeded,tl.loc("taskSucceeded")))
.catch(r => tl.setResult(tl.TaskResult.Failed,tl.loc("taskFailed")))
