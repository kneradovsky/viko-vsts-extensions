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

let rimraf = require('rimraf');

var features = {};



function addScenario(suite:string, wi:wi.WorkItem) {
    if(features[suite]==undefined) features[suite] = new Feature(suite);
    features[suite].addScenario(wi);
}

function storeFeature(name:string, feature:Feature) {
    let p1 = tl.getPathInput("destination");
    //make destination dir
    try {
        if(tl.getBoolInput("cleanDestination")) rimraf.sync(p1);
        fs.mkdirSync(p1);
    } catch(err) {
        if(err.code!='EEXIST') throw err; 
        console.log(err);
    }
    let filepath = path.join(p1,name+".feature");
    let contents = tl.loc("FeatureTemplate",name)+feature.toString();
    fs.writeFileSync(filepath,contents);
}

async function run() {
    try {
        tl.setVariable('system.culture','ru-RU');
        tl.setResourcePath(path.join( __dirname, 'task.json'));
        let apihelper = new ApiHelper();
        let api = apihelper.getApi();
        let projects = await api.getCoreApi().getProjects();
        let project = projects.find(it => it.name=='Открытие');
        //if(tl.getVariable("System.TeamProject")===undefined) 
            tl.setVariable("System.TeamProject",project.id);
        console.log(project);
        let testCases:ti.SuiteTestCase[] = await apihelper.getTestCases("SpecFlow1/Suite1/suite2");
        console.log("----------------------Test cases-----------------------");
        console.log(testCases);
        let workItemsPromises = testCases.map(stc => stc.testCase).map(wir => api.getWorkItemTrackingApi().getWorkItem(Number.parseInt(wir.id)));
        for(let i=0;i<workItemsPromises.length;i++) addScenario("Suite1", await workItemsPromises[i]); 
        //workItemsPromises.forEach(wip => wip.then(wi => addScenario("Suite1",wi)));
        for(let name in features) storeFeature(name,features[name])
  
        console.log(features);
        console.log('Task done! ');
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
        console.log(err);
    }
}


run();