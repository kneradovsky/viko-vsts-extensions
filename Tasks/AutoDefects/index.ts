/// <reference path="../../definitions/restapi.d.ts" />

import tl = require('vsts-task-lib/task');
import trm = require('vsts-task-lib/toolrunner');
import ents = require('html-entities');
import path = require('path');
import fs = require('fs');

import * as vm from 'vso-node-api';
import {ApiHelper} from 'vsts-specflow/apihelper';
import {Feature,Scenario} from  'vsts-specflow/specflow';
import * as bi from 'vso-node-api/interfaces/BuildInterfaces';
import * as ci from 'vso-node-api/interfaces/CoreInterfaces';
import * as ti from 'vso-node-api/interfaces/TestInterfaces';
import * as wi from 'vso-node-api/interfaces/WorkItemTrackingInterfaces';

async function run() {
    try {
        tl.setVariable('system.culture','ru-RU');
        tl.setResourcePath(path.join( __dirname, 'task.json'));
        let apihelper = new ApiHelper();
        let api = apihelper.getApi();
        let buildId = Number.parseInt(tl.getVariable("Build.BuildId"));
        let projId  = tl.getVariable("System.TeamProjectId"); 
        let build:bi.Build = await api.getBuildApi().getBuild(buildId);
        let testRuns:ti.TestRun[] = await api.getTestApi().getTestRuns(projId,build.uri);
        let wids:number[] = [15978,15996];
        for(let i=0;i<testRuns.length;i++) {
            let results:ti.TestCaseResult[] = await api.getTestApi().getTestResults(projId,testRuns[i].id);
            for(let j=0;j<results.length;j++) {
                results[i].testCase.id=wids[j].toString();
                results[i].testCase.name=results[i].testCaseTitle;
            }
            console.log(results);
            let templateModel:ti.RunCreateModel=null;
            let createModel:ti.RunCreateModel = Object.assign(Object.create(templateModel),testRuns[i]);
            let newRun = await api.getTestApi().createTestRun(createModel,projId);
            await api.getTestApi().addTestResultsToTestRun(results,projId,newRun.id);
            
        }
        console.log('Task done! ');
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
        console.log(err);
    }
}

tl.setVariable("System.TeamProjectId","40e8bc90-32fa-48f4-b43a-446f8ec3f084");
tl.setVariable("Build.BuildId","7936");
run();