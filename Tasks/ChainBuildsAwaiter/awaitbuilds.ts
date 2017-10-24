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

let RPClient = require('reportportal-client');


let trx = require('node-trx');  

let RPTestItemTypes = {
    suite:"SUITE",
    test: "TEST",
    step :"STEP"
}



var buildList = [];
var buildDefinitions = [];

let apihelper = new ApiHelper();
let api = apihelper.getApi();
var projId = null;
let testPublisher  = new tl.TestPublisher("VSTest");
var passedTests=0,totalTests=0;
var hasFailedBuilds=false;
let jobsResult:ti.TestRun = Object.create(null);
let buildResults:ti.TestCaseResult[] = [];
var testrunIdx=0;
var rpconnect = null
var rpTempLaunchId = null;

function createTestReport(testRun:ti.TestRun,testResults:ti.TestCaseResult[]) {
    var run = new trx.TestRun({name: testRun.name,
        times: {creation: testRun.createdDate.toISOString(),
                start: testRun.startedDate.toISOString(),
                queuing: testRun.createdDate.toISOString(), 
                finish: testRun.completedDate.toISOString()
            }});
    for(var tres of testResults) {
        run.addResult({test: new trx.UnitTest({
                name: tres.testCase.name,
                methodName: tres.automatedTestName,
                methodCodeBase: tres.automatedTestStorage === undefined ? "(undefined)" : tres.automatedTestStorage,
                methodClassName: tres.automatedTestName,
                description: tres.comment            
            }),
            computerName: tres.computerName === undefined ? "(undefined)" : tres.computerName,
            outcome:tres.outcome,
            duration: new Date(tres.durationInMs).toTimeString(),
            errorMessage: tres.errorMessage,
            errorStackTrace: tres.stackTrace,
            startTime: tres.startedDate.toISOString(),
            endTime: tres.completedDate.toISOString()            
        });
    }
    
    var filepath = path.join(tl.getVariable("Agent.BuildDirectory"),`${testRun.name}${testrunIdx}.trx`);
    fs.writeFileSync(filepath,run.toXml());
    testPublisher.publish(filepath,"true",testRun.buildConfiguration.platform,testRun.buildConfiguration.flavor,testRun.name+testrunIdx,"false");
    testrunIdx++
}

async function createReportPortalResults(testRun:ti.TestRun,testResults:ti.TestCaseResult[]) : Promise<number> {

    if(rpconnect==null || rpTempLaunchId == null) {
        tl.debug("No report portal connection found. Skipping report portal results")
        return;
    }
    let suiteObj = rpconnect.startTestItem({
        description : testRun.name,
        name: testRun.name,
        //start_time: testRun.startedDate.valueOf(),
        start_time: Date.now().valueOf(),
        type: RPTestItemTypes.suite
    },rpTempLaunchId);
    for(var tres of testResults) {
        let testObj = rpconnect.startTestItem({
           description: tres.comment,
           name :  tres.testCase.name,
           //start_time : tres.startedDate.valueOf(),
           start_time: Date.now().valueOf(),
           type: RPTestItemTypes.test
        },rpTempLaunchId,suiteObj.tempId);
        let resOutcome = tres.outcome.toLowerCase()
        var outcome = "FAILED";
        if(resOutcome!="passed") {
            //add log for non-passed items
            let loglevel = resOutcome=="failed" ? "error" : "info";
            rpconnect.sendLog(testObj.tempId,{
                level: loglevel,
                //time: tres.completedDate.valueOf(),
                time: Date.now().valueOf(),
                message : tres.errorMessage+"\n"+tres.stackTrace
            });
        } else outcome = "PASSED";
        rpconnect.finishTestItem(testObj.tempId,{
            status: outcome,
            //end_time: tres.completedDate.valueOf()
            end_time: Date.now().valueOf()
        })
    }
    rpconnect.finishTestItem(suiteObj.tempId,{status: ""});
    let res = Q.defer<number>();
    rpconnect.getPromiseFinishAllItems(rpTempLaunchId).then(() => {
        res.resolve(1)
    })
    .catch(err => {
        tl.warning(err.message);
        tl.warning(err.stack);
        res.resolve(-1)
    })
    return res.promise;
}

async function processTestRun(testRun:ti.TestRun) {
    var testResults = await api.getTestApi().getTestResults(projId,testRun.id);
    createTestReport(testRun,testResults);
    await createReportPortalResults(testRun,testResults);
}

function createBuildRunResult(build:bi.Build) : ti.TestCaseResult {
    let result : ti.TestCaseResult = Object.create(null);
    var params = {jobname: "",operation: "",buildenv:""};
    try {
        params = JSON.parse(build.parameters);
    } catch(e) {} 
    result.testCase = Object.create(null);
    result.testCase.name=build.definition.name + "_"+ [params.jobname,params.operation,params.buildenv].join("_");
    result.automatedTestName=build.definition.name;
    result.automatedTestStorage = build.project.name;
    result.computerName = "(undefined)"
    if(build.queue.name !== undefined)
        result.computerName = build.queue.name;
    result.comment = build.parameters; 
    result.outcome = bi.BuildResult[build.result].toLowerCase().endsWith("succeeded") ? "Passed" : "Failed";
    result.startedDate = build.startTime;
    result.completedDate = new Date();
    result.durationInMs = result.completedDate.getTime()-result.startedDate.getTime(); 
    result.errorMessage = result.stackTrace = "";
    return result;
}


async function processBuilds(buildList: number[]) : Promise<number[]>{
    let bapi = api.getBuildApi();
    var remainBuilds:number[] = []
    for(var buildId of buildList) {
        let build = await bapi.getBuild(buildId,projId);
        if(build.status!=bi.BuildStatus.Completed) {
            remainBuilds.push(buildId);
            continue;
        }
        buildResults.push(createBuildRunResult(build));
        //build completed store results
        console.log(tl.loc("processingBuild",build.definition.name));
        if(build.result==bi.BuildResult.Failed || build.result==bi.BuildResult.Canceled) hasFailedBuilds=true;
        var testRuns = await api.getTestApi().getTestRuns(projId,"vstfs:///Build/Build/"+buildId);
        for(var testRun of testRuns) {
            console.log(tl.loc("processingRun",testRun.name));
            var testRunDetailed = await api.getTestApi().getTestRunById(projId,testRun.id);
            await processTestRun(testRunDetailed);
            console.log(tl.loc("testRunOutcome",testRun.totalTests,testRun.passedTests));
            passedTests+=testRun.passedTests;
            totalTests+=testRun.totalTests;
        }
    }
 
    return remainBuilds;    
}

async function run() : Promise<number>{
    tl.setResourcePath(path.join(__dirname, 'task.json'));
    projId = tl.getVariable("System.TeamProjectId");
    let strBuildList = tl.getVariable("queuedBuilds");
    let selfBuildId = tl.getVariable("Build.BuildId") || "1";
    let sleepBetweenIters = Number.parseInt(tl.getInput("sleepBetweenIters"));

    let twoStateStatus = tl.getBoolInput("twoStateStatus")
    let rpuuid = tl.getInput("rpuuid",false);
    let rpurl = tl.getInput("rpurl",false);
    let rpprj = tl.getInput("rpproject",false);
    if(strBuildList==null) throw new Error("queuedBuilds initialization error. Check that Chain Builds Starter present in the build before the Awaiter");
    console.log(tl.loc("queuedBuilds",strBuildList));
    try {
        //try to connect to the report portal 
        if(rpuuid!=null && rpuuid!="") {
            rpconnect = new RPClient({token: rpuuid,endpoint : rpurl,project: rpprj, launch: rpprj+selfBuildId});
            try {
                let rpconnRes = await rpconnect.checkConnect();
                if(rpconnRes.full_name!==undefined) {
                    //start launch
                    let curdate = Date.now().valueOf();
                    let lobj = rpconnect.startLaunch({start_time: curdate});
                    rpTempLaunchId = lobj.tempId;
                }
            } catch(rperr) {
                tl.debug("ReportPortal connect error, the runs will not be reported to the rp");
                tl.debug(rperr.stack);
                rpconnect = null;
            }

        }
        //
        jobsResult.createdDate = new Date();
        jobsResult.startedDate = jobsResult.createdDate;
        jobsResult.name = "Builds";
        jobsResult.buildConfiguration = Object.create(null);
        var buildList = strBuildList.split(",").map(e => Number.parseInt(e)).filter(bid => !isNaN(bid));
        let bapi = api.getBuildApi();
        //generate .md file for the summary page
        var filepath = path.join(tl.getVariable("Agent.BuildDirectory"),`buildList.md`);
        var dataStr="";
        for(let bid of buildList) {
            let build = await bapi.getBuild(bid,projId);
            dataStr+=`[Build ${build.definition.name}](${build._links.web.href})<br>\n`;
        }
        fs.writeFileSync(filepath,dataStr);
        tl._writeLine("##vso[task.addattachment type=Distributedtask.Core.Summary;name=Original Builds;]"+filepath);
        while(buildList.length>0) {
            buildList = await processBuilds(buildList);
            console.log(tl.loc("buildsToWait",buildList.length));
            if(buildList.length>0) {
                console.log(tl.loc("sleeping",sleepBetweenIters));
                await new Promise(resolve => setTimeout(resolve,sleepBetweenIters*1000));
            }
        }
        jobsResult.completedDate = new Date();
        createTestReport(jobsResult,buildResults);
        //1 - passed, 2 - passed with issues, 3 - failed
        let result = hasFailedBuilds ? 3 : passedTests==totalTests || (twoStateStatus && passedTests>0) ? 1 : passedTests==0 ? 3 : 2;
        let res = Q.defer<number>();
        //finish test launch
        if(rpconnect!=null) 
        rpconnect.getPromiseFinishAllItems(rpTempLaunchId).then(()=> {
            rpconnect.finishLaunch(rpTempLaunchId)
            res.resolve(result);
        })
        else res.resolve(result);
        return res.promise;
    } catch (err) {
        console.log(err);
        tl.debug(err.stack);
        throw err;        
    }
}


 //tl.setVariable("System.TeamProjectId","40e8bc90-32fa-48f4-b43a-446f8ec3f084");
 //tl.setVariable("queuedBuilds","20545");//20545
 //tl.setVariable("Agent.BuildDirectory","/dev/temp/");

run()
.then(r => {switch(r) {
        case 1: tl.setResult(tl.TaskResult.Succeeded,tl.loc("taskSucceeded"));break;
        case 2: tl._writeLine("##vso[task.complete result=SucceededWithIssues;]");break;
        case 3: 
        default: tl.setResult(tl.TaskResult.Failed,tl.loc("taskFailed"));
    }  
})
.catch(r => {
    tl.setResult(tl.TaskResult.Failed,tl.loc("taskFailed"))
})

