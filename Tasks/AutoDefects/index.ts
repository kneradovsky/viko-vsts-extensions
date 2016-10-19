/// <reference path="../../definitions/restapi.d.ts" />

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

var assignees = {}
var roomUsers = []

async function getFailedTestRuns(apihelper:ApiHelper, build:bi.Build) : Promise<ti.TestRun[]> {
    let projId = tl.getVariable("System.TeamProjectId");
    let api = apihelper.getApi();
    let testRuns:ti.TestRun[] = await api.getTestApi().getTestRuns(projId,build.uri);
    let failedTestRuns = testRuns.filter(tr => tr.totalTests!=tr.passedTests)
    let result = Q.defer<ti.TestRun[]>()
    result.resolve(failedTestRuns);
    return result.promise;
}

async function getFailedTestResults(apihelper:ApiHelper, testRun:ti.TestRun) : Promise<ti.TestCaseResult[]> {
    let projId = tl.getVariable("System.TeamProjectId");
    let api = apihelper.getApi();
    let results:ti.TestCaseResult[] = await api.getTestApi().getTestResults(projId,testRun.id);
    let failedResult = results.filter(tr => tr.outcome=="Failed")
    let result = Q.defer<ti.TestCaseResult[]>()
    result.resolve(failedResult);
    return result.promise;
}

async function createBug(apihelper:ApiHelper, build:bi.Build, result:ti.TestCaseResult) : Promise<wi.WorkItem> {
    let projId = tl.getVariable("System.TeamProjectId");
    let api = apihelper.getApi();
    let wit = api.getWorkItemTrackingApi();
    let BugInfo = {
        "Build": build.buildNumber,
        "Name": result.testCaseTitle,
        "Severity": "AutoTestFailure",
        "Priority": "High"
    }
    let WorkItemFields = {
        //"System.AreaId":Number.parseInt(result.area.id),
        "System.TeamProject":result.project.name,
        "System.State" : "New",
        "System.AssignedTo": assignees[result.testRun.name] || assignees['default'],
        "System.Reason": "New",
        "System.Title": "Failed "+result.testCaseTitle,
        "System.Tags": "AutoTestFailure; AutoBug; "+build.buildNumber+"; "+result.testRun.name+";",
        "Microsoft.VSTS.TCM.ReproSteps" : JSON.stringify(BugInfo)+"\r\n<br/>" + result.errorMessage + " " + result.stackTrace
    }
    let WorkItemRelations = [
        {"rel": "ArtifactLink","url":build.uri,"attributes":{"name":"Build"}}
    ];
    let wriDoc = Object.keys(WorkItemFields).map(key => {return {"op":"add","path":"/fields/"+key,"value":WorkItemFields[key]}});
    let wriRels = Object.keys(WorkItemRelations).map(item => {return {"op":"add","path":"/relations/-","value":WorkItemRelations[item]}});
    wriDoc = wriDoc.concat(wriRels);
    console.log(wriDoc);
    return wit.createWorkItem({"Content-Type": "application/json-patch+json"},wriDoc,projId,"Bug");    
}

async function run() {
    try {
        tl.setVariable('system.culture','ru-RU');
        tl.setResourcePath(path.join( __dirname, 'task.json'));
        let assigneesFile = tl.getPathInput("Assignees");
        assignees = JSON.parse(fs.readFileSync(assigneesFile).toString());
        let apihelper = new ApiHelper();
        let api = apihelper.getApi();
        let buildId = Number.parseInt(tl.getVariable("Build.BuildId"));
        let projId  = tl.getVariable("System.TeamProjectId"); 
        let build:bi.Build = await api.getBuildApi().getBuild(buildId);
        
        let testRuns = await getFailedTestRuns(apihelper,build);
        for(let run of testRuns) {
            console.log("Creating bugs for run:"+run.name);
            let testResults = await getFailedTestResults(apihelper,run);
            for(let result of testResults) {
                console.log("Bug for test:"+result.testCaseTitle);
                let newbug = await createBug(apihelper,build,result);
                console.log(newbug);
            }

        }
        console.log('Task done! ');
    }
    catch (err) {
        console.log(err);
        throw err;
    }
}

tl.setVariable("System.TeamProjectId","40e8bc90-32fa-48f4-b43a-446f8ec3f084");
tl.setVariable("Build.BuildId","10042");
run()
.then(r => tl.setResult(tl.TaskResult.Succeeded,"All Done"))
.catch(r => tl.setResult(tl.TaskResult.Failed,"Task failed"))
