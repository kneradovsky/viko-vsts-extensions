import * as ti from 'vso-node-api/interfaces/TestInterfaces';
import * as wi from 'vso-node-api/interfaces/WorkItemTrackingInterfaces';
import * as vm from 'vso-node-api';


import tl = require('vsts-task-lib/task');

let Entities = require('html-entities').AllHtmlEntities;

export class Feature { 
    scenarios:Scenario[]=[];
    name:string;
    constructor(suite:string) {
        this.name=suite;
    }
    addScenario(it:wi.WorkItem) {
        this.scenarios.push(new Scenario(it));
    }
    toString() {
        return this.scenarios.map(s=>s.toString()).join('\n');
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
    toString() {
        let scenarioBody = tl.loc("ScenarioTemplate",this.item.id.toString(),this.item.fields['System.Title'],this.item.fields['System.Description']);
        scenarioBody = this.stripTags(scenarioBody);
        return scenarioBody;
    }


}