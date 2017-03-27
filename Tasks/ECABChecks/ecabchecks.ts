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
import {ApiHelper} from 'vsts-specflow/apihelper';
let trx = require('node-trx');  
let testPublisher  = new tl.TestPublisher("VSTest");


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
                methodCodeBase: tres.automatedTestStorage,
                methodClassName: tres.automatedTestName,
                description: tres.comment            
            }),
            computerName: tres.computerName,
            outcome:tres.outcome,
            duration: new Date(tres.durationInMs).toTimeString(),
            errorMessage: tres.errorMessage,
            errorStackTrace: tres.stackTrace,
            startTime: tres.startedDate.toISOString(),
            endTime: tres.completedDate.toISOString()            
        });
    }
    var filepath = path.join(tl.getVariable("Agent.BuildDirectory"),`${testRun.name}.trx`);
    fs.writeFileSync(filepath,run.toXml());
    testPublisher.publish(filepath,"false",testRun.buildConfiguration.platform,testRun.buildConfiguration.flavor,testRun.name,"false");
}


function createFieldResult(name:string,comment:string,outcome:string) : ti.TestCaseResult {
    let result : ti.TestCaseResult = Object.create(null);
    result.testCase = Object.create(null);
    result.testCase.name=name;
    result.automatedTestName=name;
    result.automatedTestStorage = name;
    result.computerName = name;
    result.comment = comment; 
    result.outcome = outcome;
    result.startedDate = new Date();
    result.completedDate = new Date();
    result.durationInMs = result.completedDate.getTime()-result.startedDate.getTime(); 
    result.errorMessage = comment;
    result.stackTrace = "";
    return result;    

}
function checkTask(task : wi.WorkItem,fields: any[]) : boolean {
    let taskResult : ti.TestRun = Object.create(null);
    taskResult.createdDate = new Date();
    taskResult.startedDate = taskResult.createdDate;
    taskResult.name = task.fields["System.Title"];
    taskResult.buildConfiguration = Object.create(null);
    let fieldResults : ti.TestCaseResult[] = [];
    let isFailed=false;
    for(let field of fields) {
        let fieldValue = task.fields[field.name];
        let comment = "",name = field.name,outcome = "Failed";
        if(fieldValue!=field.value) {
            comment = `Expected ${field.value}, actual ${fieldValue}`;
            outcome = "Failed";
            isFailed = true;
        } else {
            outcome = "Passed";
        }
        fieldResults.push(createFieldResult(name,comment,outcome));
    }
    createTestReport(taskResult,fieldResults);
    return !isFailed;
}


function getTaksIds() : number[] {
        let git = tl.tool(tl.getVariable("GIT_PATH") || "git");
        git.arg(("log -1").split(" ")); //default format
        let curdir = tl.getVariable("Build.Repository.LocalPath");
        let res = git.execSync({cwd: curdir,env :{},silent:false,failOnStdErr:false,ignoreReturnCode:false,outStream:undefined,errStream:undefined});
        if(res.error!=undefined) throw res.error;
        tl.debug(res.stdout);
        let loglines : String[] = res.stdout.split("\n");
        let taskIds = loglines.filter(s => s.match("\s*@[0-9]+\s*")!=null).map(s=> s.replace(/\s*@([0-9]+)\s*/,"$1")).map( s => Number.parseInt(s))
        tl.debug(taskIds.join("\n"));
        return taskIds;
}
async function run() {
    tl.setResourcePath(path.join(__dirname, 'task.json'));
    let projId = tl.getVariable("System.TeamProjectId");
    try {
        let reqFieldsFile = tl.getPathInput("reqfields");
        let reqFields = JSON.parse(fs.readFileSync(reqFieldsFile).toString());
        let api = new ApiHelper().getApi();
        let wapi = api.getWorkItemTrackingApi()
        let tasksInCommit = getTaksIds();
        let tasks :wi.WorkItem[] = await wapi.getWorkItems(tasksInCommit)
        let checkedTaskCount = 0;
        for(let t of tasks)
            if(checkTask(t,reqFields)) checkedTaskCount++;
        //1 - passed, 2 - passed with issues, 3 - failed
        let result = checkedTaskCount==tasksInCommit.length ? 1 : 2;
        let res = Q.defer<number>();
        res.resolve(result);
        return res.promise;
    } catch(err) {
        console.log(err);
        console.log(err.stack);
        throw err;
    }
}

tl.setVariable("System.TeamProjectId","40e8bc90-32fa-48f4-b43a-446f8ec3f084");
tl.setVariable("Build.Repository.LocalPath","/dev/temp/ecbtest");
run()
.then(r => {switch(r) {
    case 1: tl.setResult(tl.TaskResult.Succeeded,tl.loc("taskSucceeded"));break;
    case 2: tl._writeLine("##vso[task.complete result=SucceededWithIssues;]");break;
    case 3: 
    default: tl.setResult(tl.TaskResult.Failed,tl.loc("taskFailed"));
}})
.catch(r => tl.setResult(tl.TaskResult.Failed,tl.loc("taskFailed")))
