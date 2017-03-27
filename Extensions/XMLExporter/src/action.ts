import Controls = require("VSS/Controls");
import VSS_Service = require("VSS/Service");
import VSS_Search = require("VSS/Search")

export class ExporterAction extends Controls.BaseControl  {
    constructor() {
        super();
    }
    public initialize() : void {
        super.initialize();
    }
    public execute(context) : void {
        alert("BTN Clicked");
    }    
}


