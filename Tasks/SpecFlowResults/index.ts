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


async function closeRuns() {
    let apihelper = new ApiHelper();
    let api = apihelper.getApi();
    let results = await api.getTestApi().getTestRuns(tl.getVariable("System.TeamProjectId"),null,"74c3dee1-5cfa-4ccd-96e3-4fe0e93cc4db");
    let templateUpdateModel:ti.RunUpdateModel=null;
    let updateModel:ti.RunUpdateModel = Object.create(templateUpdateModel);
    updateModel.state="Completed";    
    results.filter(tr => tr.state=="InProgress").filter(tr=>tr.name.startsWith("VSTest")).forEach( tr =>
        api.getTestApi().updateTestRun(updateModel,tl.getVariable("System.TeamProjectId"),tr.id)
    )    
}

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
        let testpoints = [16534,16538]; 
        for(let i=0;i<testRuns.length;i++) {
            let results:ti.TestCaseResult[] = await api.getTestApi().getTestResults(projId,testRuns[i].id);
            for(let j=0;j<results.length;j++) {
                let tcname:string = results[j].testCaseTitle;
                let curres = results[j];   
                curres.testCase.id=tcname.substring(1,tcname.indexOf("_",1)); //skip first _
                curres.testCase.name=tcname.substring(tcname.indexOf("_",1)+1);
                curres.testRun=undefined;
                curres.failureType=undefined;
                curres.automatedTestName=curres.automatedTestId=curres.automatedTestStorage=curres.automatedTestType=curres.automatedTestTypeId=undefined;
                curres.testCaseTitle=undefined;
                curres.id=undefined;
                curres.testPoint={id:testpoints[j].toString(),name:undefined,url:undefined};
            }
            let templateCreateModel:ti.RunCreateModel=null;
            let templateUpdateModel:ti.RunUpdateModel=null;
            let createModel:ti.RunCreateModel = Object.create(templateCreateModel);
            createModel.name=testRuns[i].name+"_specflow";
            createModel.state="InProgress";
            createModel.automated=false;
            createModel.plan={id:"15974",name:"SpecFlow1",url:undefined};
            createModel.pointIds=[0,1];
            createModel.startDate=new Date().toISOString();
            let newRun = await api.getTestApi().createTestRun(createModel,projId);
            console.log("Add results");
            await api.getTestApi().addTestResultsToTestRun(results,projId,newRun.id);
            let updateModel:ti.RunUpdateModel = Object.create(templateUpdateModel);
            updateModel.substate=ti.TestRunSubstate.Analyzed;
            updateModel.state="Completed";
            updateModel.completedDate=new Date().toISOString();
            await api.getTestApi().updateTestRun(updateModel,projId,newRun.id);
        }
        console.log('Task done! ');
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
        console.log(err);
    }
}

tl.setVariable("System.TeamProjectId","40e8bc90-32fa-48f4-b43a-446f8ec3f084");
tl.setVariable("Build.BuildId","8205");
//closeRuns();
run();