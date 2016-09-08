import tl = require('vsts-task-lib/task');
import * as vm from 'vso-node-api';
import * as bi from 'vso-node-api/interfaces/BuildInterfaces';
import * as ci from 'vso-node-api/interfaces/CoreInterfaces';
import * as ti from 'vso-node-api/interfaces/TestInterfaces';
import {Feature,Scenario,EntityIds,SuiteTestCases} from  './specflow';
import Q = require('q');



export class ApiHelper {
    private webApi : vm.WebApi;
    constructor() {
        //inject certificates
        require('ssl-root-cas/latest').inject().addFile(__dirname + '/ssl/GeneralRootCA.cer');
        let authtype;
        console.log(tl.getInput("authtype"));
        switch(tl.getInput("authtype")) {
            case 'PAT' : authtype = vm.getPersonalAccessTokenHandler(tl.getInput("PAT"));break;
            case 'NTLM' : authtype = vm.getNtlmHandler(tl.getInput('Username'),tl.getInput('Password'));break;
            case 'Basic' :  authtype = vm.getBasicHandler(tl.getInput('Username'),tl.getInput('Password'));break;
            default: console.log("Using System.OAuth");authtype = vm.getBearerHandler(tl.getVariable("System.AccessToken")); 
            
        }
        let uri = tl.getVariable("System.TeamFoundationCollectionUri") || tl.getInput('apiurl'); 
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
}



 