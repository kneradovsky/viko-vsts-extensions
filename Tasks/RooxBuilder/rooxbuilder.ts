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

let trx = require('node-trx');  

let projId;
let apihelper = new ApiHelper();
let api = apihelper.getApi();
let proxyBuildDef : bi.BuildDefinition;


let BuildEnvironments = {
    dev : "roox",
    test: "whitewalkers",
    prod: "nightwatch"
};

function readPosition(source: String[],pos: number) {
    if(source.length<=pos) {
        tl.debug("Failed to read changes at position");
        tl.debug(`Position = ${pos}, Length = ${source.length}`);
        return null;
    }
    return source[pos];
}    


function createBuildSet(commit) : Set<String> {
    let git = tl.tool("git");
    git.arg(("diff-tree --no-commit-id --name-only -r "+commit).split(" "));
    let curdir = tl.getVariable("Build.Repository.LocalPath");
    let res = git.execSync({cwd: curdir,env :{},silent:false,failOnStdErr:false,ignoreReturnCode:false,outStream:undefined,errStream:undefined});
    if(res.error!=undefined) throw res.error;
    tl.debug(res.stdout);
    let changes : String[] = res.stdout.split("\n");
    let builds = new Set<String>();
    changes.map(v => v.split("/")).forEach(p => {
        var change;
        switch(p[0].toLowerCase()) {
            case "config" : 
                change = readPosition(p,4);
                if(change==null) change = "all" 
                builds.add(`env-config:${change}`);
                break;
            case "webapi":
                change=readPosition(p,1);
                if(change!=null) {
                    let part = readPosition(p,2);
                    if(part.endsWith("front")) builds.add(`microservice-front:${change}`)
                    else if(part.endsWith("back")) builds.add(`microservice-back:${change}`)
                    else {
                        builds.add(`microservice-front:${change}`)
                        builds.add(`microservice-back:${change}`)
                    }
                }
                break;
            case "widgets":
                change = readPosition(p,1)
                if(change!=null) builds.add(`widgets:${change}`);
                else builds.add('widgets:all');
                break;
            case "webbank": builds.add("webbank:all");break;                
            case "wrs-features": builds.add("widgets:wrs-features");break; 
        }
    });
    return builds;
}

function createBuildMap(buildSet : Set<String>) : Map<String,String[]> {
    let bmap = new Map<String,String[]>();
    buildSet.forEach( e => {
        let pp = e.split(":");
        if(!bmap.has(pp[0])) bmap.set(pp[0],[pp[1]]);
        else bmap.get(pp[0]).push(pp[1]); 
    })
    return bmap;
} 

async function startBuild(jobname: string,oper: string, benv: string,params:any) : Promise<number> {
    var build:bi.Build = Object.create(null);
    build.definition=Object.create(null);
    build.definition.id=proxyBuildDef.id;
    let jobparams = Object.keys(params).map(k => `${k}=${params[k]}`).join("\n");
    let bparams = {
        "jobname": jobname,
        "operation" : oper,
        "buildenv" : benv,
        "jobparams" : jobparams
    };
    let strparams = JSON.stringify(bparams);
    build.parameters=strparams;
    let bapi = api.getBuildApi();
    build = await bapi.queueBuild(build,projId);
    return build.id;
}

async function buildConfig(bmap : Map<String,String[]>,key: string, operation: string) : Promise<number[]> {
    let buildNums : number[] = [];
    for(let e in bmap.get(key)) {
        var component ="",benv;
        if(e.endsWith("_dev")) {
            component = e.replace("_dev","");
            benv=BuildEnvironments.dev;
        }
        else if(e.endsWith("_pre_prod")) {
            benv=BuildEnvironments.test
            component = e.replace("_pre_prod","")
        } else if(e.endsWith("_pre_prod")) {
            benv=BuildEnvironments.prod;
            component = e.replace("_prod","")
        } else return;
        buildNums.push(await startBuild("${key}-${component}",operation,benv,{}))
    }
    let res = Q.defer<number[]>();
    res.resolve(buildNums);
    return res.promise;
}

async function buildWebApi(bmap : Map<String,String[]>,key: string, operation: string,benv:string) : Promise<number[]> {
    let buildNums : number[] = [];
    let paramName = "MICROSERVICE_NAME";
    for(let i in bmap.get(key)) {
        let serviceName = bmap.get(key)[i];
        let params = {}
        params[paramName]=serviceName;
        buildNums.push(await startBuild(key,operation,benv,params));
    }
    let res = Q.defer<number[]>();
    res.resolve(buildNums);
    return res.promise;
} 

async function startBuilds(bmap : Map<String,String[]>,operation: string, benv : string) : Promise<number[]> {
    let buildNums : number[] = []; 
    //webbank
    if(bmap.has("webbank")) buildNums.push(await startBuild("webbank",operation,benv,[]));
    //widgets
    if(bmap.has("widgets")) buildNums.push(await startBuild("widgets-all",operation,benv,[]));
    //config
    (await buildConfig(bmap,"env-config",operation)).forEach(e => buildNums.push(e));
    //webapi
    (await buildWebApi(bmap,"microservice-front",operation,benv)).forEach(e=> buildNums.push(e));
    (await buildWebApi(bmap,"microservice-back",operation,benv)).forEach(e=> buildNums.push(e));
    let res = Q.defer<number[]>();
    res.resolve(buildNums);
    return res.promise;
}

async function run() : Promise<number>{
    tl.setResourcePath(path.join(__dirname, 'task.json'));
    projId = tl.getVariable("System.TeamProjectId");
    let proxyJob  = tl.getInput("ProxyJob");
    try {
        let bapi = api.getBuildApi();
        //map buildname to build def numbers and filter out drafts
        let defNumbers = (await bapi.getDefinitions(projId))
                         .filter(bdr => proxyJob==bdr.name) //find build definitions that matches names from buildList
                         .filter(bdr => bdr.quality==bi.DefinitionQuality.Definition).map(bdr => bdr.id); //filter out drafts
        proxyBuildDef =  await bapi.getDefinition(defNumbers[0],projId);

        let buildMapFile = tl.getInput("artefactsFolder",true)+"/"+tl.getInput("buildMap");
        var BuildMap;
        var operation;
        if(!tl.exist(buildMapFile)) { 
            let buildSet = createBuildSet("b650f3c5c5048fb85d366bdff5e2b24b84e30333");
            BuildMap = createBuildMap(buildSet);
            operation = "publish";
        } else {
            let mapcontents = fs.readFileSync(buildMapFile,"UTF-8");
            BuildMap = JSON.parse(mapcontents);
            operation = "deploy";
        }
        let buildEnv = tl.getInput("Environment",true);
        let startedBuilds : number[] = await startBuilds(BuildMap,operation,buildEnv);
        let builds = startedBuilds.join(",");
        console.log(tl.loc("Builds",builds));
        tl.setVariable("queuedBuilds",builds);
        //1 - passed, 2 - passed with issues, 3 - failed
        let result = 1;
        let res = Q.defer<number>();
        res.resolve(result);
        return res.promise;
    } catch (err) {
        console.log(err);
        tl.debug(err.stack);
        throw err;        
    }


}

tl.setVariable("Build.Repository.LocalPath","/dev/tmp/roox");
tl.setVariable("System.TeamProjectId","40e8bc90-32fa-48f4-b43a-446f8ec3f084");
run()
.then(r => {switch(r) {
    case 1: tl.setResult(tl.TaskResult.Succeeded,tl.loc("taskSucceeded"));break;
    case 2: tl._writeLine("##vso[task.complete result=SucceededWithIssues;]");break;
    case 3: 
    default: tl.setResult(tl.TaskResult.Failed,tl.loc("taskFailed"));
}})
.catch(r => tl.setResult(tl.TaskResult.Failed,tl.loc("taskFailed")))
