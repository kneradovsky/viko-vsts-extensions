"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Controls = require("VSS/Controls");
class ExporterAction extends Controls.BaseControl {
    constructor() {
        super();
    }
    initialize() {
        super.initialize();
    }
    execute(context) {
        alert("BTN Clicked");
    }
}
exports.ExporterAction = ExporterAction;
//# sourceMappingURL=action.js.map