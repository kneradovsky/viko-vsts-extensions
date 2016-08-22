


declare module "restapi/helper" {

import * as vm from 'vso-node-api';
import * as bi from 'vso-node-api/interfaces/BuildInterfaces';
import * as ci from 'vso-node-api/interfaces/CoreInterfaces';
import * as ti from 'vso-node-api/interfaces/TestInterfaces';

    export class ApiHelper {
        constructor();
        getApi() : vm.WebApi;
        getTestCases(path:string) : ti.SuiteTestCase[];
    }
}
