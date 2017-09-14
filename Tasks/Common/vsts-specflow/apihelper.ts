import tl = require('vsts-task-lib/task');
import * as vm from 'vso-node-api';
import * as bi from 'vso-node-api/interfaces/BuildInterfaces';
import * as ci from 'vso-node-api/interfaces/CoreInterfaces';
import * as ti from 'vso-node-api/interfaces/TestInterfaces';
import {Feature,Scenario,EntityIds,SuiteTestCases} from  './specflow';
import Q = require('q');
import path = require('path');



export class ApiHelper {
    private webApi : vm.WebApi;
    constructor() {
        //inject certificates
        require('ssl-root-cas').inject().addFile(__dirname + '/ssl/GeneralRootCA.cer');
        let authtype;
        var uri = tl.getVariable("System.TeamFoundationCollectionUri") || tl.getInput('apiurl');
        console.log(tl.getInput("authtype"));
        switch(tl.getInput("authtype")) {
            case 'PAT' : authtype = vm.getPersonalAccessTokenHandler(tl.getInput("PAT"));break;
            case 'NTLM' : authtype = vm.getNtlmHandler(tl.getInput('Username'),tl.getInput('Password'));break;
            case 'Basic' :  authtype = vm.getBasicHandler(tl.getInput('Username'),tl.getInput('Password'));break;
            default:                 
                console.log("using System VSS Connection");
                uri = tl.getEndpointUrl("SystemVssConnection",true) || tl.getEndpointUrl("SYSTEMVSSCONNECTION",false);
                let auth = tl.getEndpointAuthorization("SystemVssConnection", true) || tl.getEndpointAuthorization("SYSTEMVSSCONNECTION", false);;
                authtype = vm.getBearerHandler(auth.parameters["AccessToken"]);
        }
         
        this.webApi =new vm.WebApi(uri,authtype); 
    }
    getApi() : vm.WebApi {
        return this.webApi;
    }
    
    async getTestCases(strtcpath:string) : Promise<SuiteTestCases> {
        let tcpath = strtcpath.split("/");
        if(tcpath.length<1) throw new Error(tl.loc('Wrong testcase path format'));
        let planname=tcpath[0];
        let projectId = tl.getVariable("System.TeamProjectId");
        let testApi = this.webApi.getTestApi();
        let plans =await testApi.getPlans(projectId);
        let plan:ti.TestPlan = plans.filter(p=> p.name==planname)[0];
        let plansuites = await testApi.getTestSuitesForPlan(projectId,plan.id,true,null,null,true);
        let lastsuite:ti.TestSuite = plansuites[0];
        if(tcpath.length>1) 
            for(let i=1;i<tcpath.length;i++) {
                lastsuite = lastsuite.children.filter(s => s.name==tcpath[i])[0];
            }
        if(lastsuite==null) throw new Error(tl.loc('TestCase path not found')+" "+strtcpath);
        console.log(lastsuite);
        let cases:SuiteTestCases = {
            entids: {project:projectId,suite:lastsuite.id,plan:plan.id},
            testcases:await testApi.getTestCases(projectId,plan.id,lastsuite.id) 
        }
        let retval = Q.defer<SuiteTestCases>();
        retval.resolve(cases);
        return retval.promise;
    }

    async getBuildDefIdByName(projectId : string, buildList: BuildDefFullName[]) : Promise<number[]> {
        let bapi = this.webApi.getBuildApi();
        let buildNumbers = (await bapi.getDefinitions(projectId))
            .filter(bdr => buildList.findIndex(e => e.matchBuildDefinition(bdr))!=-1) //find build definitions that matches names from buildList
            .filter(bdr => bdr.quality==bi.DefinitionQuality.Definition).map(bdr => bdr.id); //filter out drafts
        let res = Q.defer<number[]>();
        res.resolve(buildNumbers);
        return res.promise;
    }
}



export class BuildDefFullName {
    path : string;
    name : string;
    origname: string;
    constructor(bdname : string) {
        let p = path.parse(bdname)
        this.path=p.dir
        this.name=p.name
        this.origname = bdname
        return this
    };
    matchBuildDefinition(bd : bi.BuildDefinitionReference) : boolean {
        tl.debug(`${bd.path}|${bd.name} === ${this.path}|${this.name}`);
        if((bd.path===undefined || this.path == "" ||bd.path==this.path) && bd.name == this.name) return true;
        return false;
    }
} 