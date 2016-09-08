import * as ti from 'vso-node-api/interfaces/TestInterfaces';
import * as wi from 'vso-node-api/interfaces/WorkItemTrackingInterfaces';
import * as vm from 'vso-node-api';


import tl = require('vsts-task-lib/task');

let Entities = require('html-entities').AllHtmlEntities;

export class EntityIds {
    project:string;
    plan:number;
    suite:number;
    constructor() {};
}

export class SuiteTestCases {
    entids:EntityIds;
    testcases:ti.SuiteTestCase[];
}

export class Feature { 
    scenarios:Scenario[]=[];
    name:string;
    entids:EntityIds;
    constructor(suite:string,entids:EntityIds) {
        this.name=suite;
        this.entids=entids;
    }
    addScenario(it:wi.WorkItem) {
        this.scenarios.push(new Scenario(it));
    }
    toString() {
        return this.scenarios.map(s=>s.toString(this.entids)).join('\n');
    }
}

export class Scenario {
    item:wi.WorkItem;
    constructor(it:wi.WorkItem) {
        this.item = it;
    }
    stripTags(str:string) {
        let re = /<[^>]+\/*>|<\/[^>]+>/g;
        let prstr = str.replace(/<\/div>/g,"\r\n");
        prstr =prstr.replace(re,'');
        
        return Entities.decode(prstr); 
    }
    toString(entids:EntityIds) : string {
        let id=entids.plan+"_"+entids.suite+"_"+this.item.id.toString()
        let scenarioBody = tl.loc("ScenarioTemplate",id,this.item.fields['System.Title'],this.item.fields['System.Description']);
        scenarioBody = this.stripTags(scenarioBody);
        return scenarioBody;

    }


}