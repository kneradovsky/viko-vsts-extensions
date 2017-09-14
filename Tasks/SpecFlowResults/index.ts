

import tl = require('vsts-task-lib/task');
import trm = require('vsts-task-lib/toolrunner');
import ents = require('html-entities');
import path = require('path');
import fs = require('fs');

import Q = require("q");

import * as vm from 'vso-node-api';
import {ApiHelper} from 'vsts-specflow/apihelper';
import {Feature,Scenario,EntityIds} from  'vsts-specflow/specflow';
import * as bi from 'vso-node-api/interfaces/BuildInterfaces';
import * as ci from 'vso-node-api/interfaces/CoreInterfaces';
import * as ti from 'vso-node-api/interfaces/TestInterfaces';
import * as wi from 'vso-node-api/interfaces/WorkItemTrackingInterfaces';




class SpecFlowResults {
    api:vm.WebApi;
    constructor(api:vm.WebApi) {
        this.api = api;
    };
    
    async createTestResult(entids: EntityIds,source:ti.TestCaseResult) : Promise<ti.TestCaseResult> {
        let tcname:string = source.testCaseTitle;
        let numparts:string[] = tcname.split("_");
        let tcId = Number.parseInt(numparts[3]);
        let newres:ti.TestCaseResult = null; 
        newres = Object.create(newres);
        Object.assign(newres,source);
        let points:ti.TestPoint[]=await this.api.getTestApi().getPoints(entids.project,entids.plan,entids.suite,null,null,tcId.toString());
        let point = points[0];
        newres.testPoint={id:point.id.toString(),name:undefined,url:undefined};
        //newres.testCaseTitle=null;
        newres.testRun=undefined;
        newres.testCase={id:numparts[3],name:undefined,url:undefined};
        newres.failureType=undefined;
        await this.updateTestPoint(entids,point.id.toString(),false,newres.outcome);
        let res = Q.defer<ti.TestCaseResult>();
        res.resolve(newres);
        return res.promise;
    }
    async updateTestPoint(entids:EntityIds,pointId:string,active:boolean,outcome:string)  {
        let newpoint:ti.PointUpdateModel = null;
        newpoint = Object.create(newpoint);
        newpoint.outcome=outcome;
        newpoint.resetToActive=active;
        await this.api.getTestApi().updateTestPoints(newpoint,entids.project,entids.plan,entids.suite,pointId);
    }
    async attachResults2TestCases(sourceRun:ti.TestRun) {
        let testApi = this.api.getTestApi();
        let projId = tl.getVariable("System.TeamProjectId");
        let CreateModel:ti.RunCreateModel=null;
        CreateModel = Object.create(CreateModel);
        let UpdateModel:ti.RunUpdateModel=null;
        UpdateModel = Object.create(UpdateModel);
        Object.assign(CreateModel,sourceRun);
        CreateModel.state="InProgress";
        let newrun = await testApi.createTestRun(CreateModel,projId);
        console.log(newrun);
        let results:ti.TestCaseResult[] = await testApi.getTestResults(projId,sourceRun.id);
        let newresults:ti.TestCaseResult[] = [];
        for(let i=0;i<results.length;i++) {
            let entids = new EntityIds();
            entids.project=projId;
            let numparts:string[] = results[i].testCaseTitle.split("_");
            entids.plan=Number.parseInt(numparts[1]);
            entids.suite=Number.parseInt(numparts[2]);
            let nres = await this.createTestResult(entids,results[i]);
            nres.testRun = {id:newrun.id.toString(),name:undefined,url:undefined};
            newresults.push(nres);
        }
        console.log(newresults);
        await testApi.addTestResultsToTestRun(newresults,projId,newrun.id);
        UpdateModel.state="Completed";
        await testApi.updateTestRun(UpdateModel,projId,newrun.id);
    }
}


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
        let projId = tl.getVariable("System.TeamProjectId");
        let apihelper = new ApiHelper();
        let api = apihelper.getApi();
        let testApi = api.getTestApi(); 
        let buildId = Number.parseInt(tl.getVariable("Build.BuildId"));
        let build:bi.Build = await api.getBuildApi().getBuild(buildId);
        let testRuns:ti.TestRun[] = await testApi.getTestRuns(projId,build.uri);
        let spRes:SpecFlowResults = new SpecFlowResults(api);
        let testpoints = [16534,16538]; 
        for(let i=0;i<testRuns.length;i++) {
            await spRes.attachResults2TestCases(testRuns[i]);
        }
        console.log('Task done! ');
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
        console.log(err);
    }
}

tl.setVariable("System.TeamProjectId","40e8bc90-32fa-48f4-b43a-446f8ec3f084");
//tl.setVariable("Build.BuildId","8764");
tl.setVariable("Build.BuildId","9141");
//closeRuns();
run().then(r => tl.setResult(tl.TaskResult.Succeeded,"Done"));