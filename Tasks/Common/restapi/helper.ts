import tl = require('vsts-task-lib/task');
import * as vm from 'vso-node-api';
import * as bi from 'vso-node-api/interfaces/BuildInterfaces';
import * as ci from 'vso-node-api/interfaces/CoreInterfaces';
import * as ti from 'vso-node-api/interfaces/TestInterfaces';
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
            default: throw new Error(tl.loc('Unknown Authentication type'));
        }
        this.webApi =new vm.WebApi(tl.getInput('apiurl'),authtype); 
    }
    getApi() : vm.WebApi {
        return this.webApi;
    }
    async getTestCases(strtcpath:string) : Promise<ti.SuiteTestCase[]> {
        let tcpath = strtcpath.split("/");
        if(tcpath.length<1) throw new Error(tl.loc('Wrong testcase path format'));
        let planname=tcpath[0];
        let project = tl.getVariable("System.TeamProject");
        let testApi = this.webApi.getTestApi();
        let plans =await testApi.getPlans(project);
        let plan:ti.TestPlan = plans.filter(p=> p.name==planname)[0];
        let plansuites = await testApi.getTestSuitesForPlan(project,plan.id,true,null,null,true);
        console.log(plansuites);
        let lastsuite:ti.TestSuite = plansuites[0]; 
        if(tcpath.length>1) 
            for(let i=1;i<tcpath.length;i++) {
                lastsuite = lastsuite.children.filter(s => s.name==tcpath[i])[0];
            }
        if(lastsuite==null) throw new Error(tl.loc('TestCase path not found')+" "+strtcpath);
        return testApi.getTestCases(project,plan.id,lastsuite.id); 
    }
}



 