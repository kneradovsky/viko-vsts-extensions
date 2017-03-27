"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Controls = require("VSS/Controls");
class Export2XML extends Controls.BaseControl {
    constructor() {
        super();
    }
    initialize() {
        super.initialize();
        this._element.click(() => {
            this.exportResults();
        });
    }
    exportResults() {
        $(".exporter-query-results-messages").html("<b>clicked</b>");
    }
}
exports.Export2XML = Export2XML;
Export2XML.enhance(Export2XML, $(".xml-exporter-button"), {});
VSS.notifyLoadSucceeded();
//# sourceMappingURL=export.js.map