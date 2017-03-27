import Controls = require("VSS/Controls");
import VSS_Service = require("VSS/Service");
import VSS_Search = require("VSS/Search")



export class Export2XML extends Controls.BaseControl {
    constructor() {
        super();
    }
    public initialize() : void {
        super.initialize();
        this._element.click(()=> {
            this.exportResults();
        })
    }


    public exportResults() : void {
        $(".exporter-query-results-messages").html("<b>clicked</b>");
    }
}

Export2XML.enhance(Export2XML,$(".xml-exporter-button"),{});
VSS.notifyLoadSucceeded();

