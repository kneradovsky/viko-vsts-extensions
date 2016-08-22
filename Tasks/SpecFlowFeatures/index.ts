/// <reference path="../../definitions/restapi.d.ts" />

import tl = require('vsts-task-lib/task');
import trm = require('vsts-task-lib/toolrunner');
import * as vm from 'vso-node-api';
import {ApiHelper} from 'restapi/helper'; 
import * as bi from 'vso-node-api/interfaces/BuildInterfaces';
import * as ci from 'vso-node-api/interfaces/CoreInterfaces';

async function run() {
    try {
        let apihelper = new ApiHelper();
        let api = apihelper.getApi();
        let projects = await api.getCoreApi().getProjects();
        console.log(projects);
        let project = projects.find(it => it.name=='Открытие');
        //if(tl.getVariable("System.TeamProject")===undefined) 
            tl.setVariable("System.TeamProject",project.id);
        console.log(project);
        let testCases = await apihelper.getTestCases("SpecFlow1/Suite1/suite2");
        console.log(testCases);
        testCases.forEach(tc => console.log(tc));
        console.log('Task done! ');
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
        console.log(err);
    }
}


run();