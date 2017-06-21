var executeCDActionsProvider = (function () {
    "use strict";
    return {
        showExecuteActionsDialog: function(properties, title) {
            
            VSS.getService("ms.vss-web.dialog-service").then(function (dialogSvc) {
                
                var extInfo = VSS.getExtensionContext();
                
                var dialogOptions = {
                    title: title || "Properties",
                    width: 600,
                    height: 400,
                    buttons: null
                };
                
                var contributionConfig = { 
                    properties: properties
                };
                dialogSvc.openDialog(extInfo.publisherId + "." + extInfo.extensionId + "." + "executeActions", dialogOptions, contributionConfig);
            });
        },
        properties : {
            text : "text changed"
        },
        contribution : {
            properties :{
                text: "text2"
            }
        },
        execute: function(actionContext) {
            this.showExecuteActionsDialog(actionContext);
        }
    };
}());

VSS.register("executeCDActions", function (context) {
    return executeCDActionsProvider;
});