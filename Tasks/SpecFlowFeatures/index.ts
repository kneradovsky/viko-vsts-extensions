import tl = require('vsts-task-lib/task');
import trm = require('vsts-task-lib/toolrunner');

async function run() {
    try {
        let rc1: number = await tl.tool('cmd').arg("/c").arg("echo").arg(tl.getInput('samplestring', true)).exec();
        
        let rc2: number = -1;
        if (tl.getBoolInput('samplebool')) {
            rc2 = await tl.tool('cmd').arg("/c").arg("echo").arg(tl.getInput('samplepathinput', true)).exec();    
        }
        
        console.log('Task done! ' + rc1 + ',' + rc2);
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();