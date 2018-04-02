var executeCDActionsProvider = (function () {
    "use strict";
    return {
        showExecuteActionsDialog: function(properties, title) {
            
            VSS.getService("ms.vss-web.dialog-service").then(function (dialogSvc) {
                
                var extInfo = VSS.getExtensionContext();
                
                var dialogOptions = {
                    title: title || "Continuous Deployment",
                    width: 600,
                    height: 600,
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
            var knownTypes = ["User Story","Task","Bug Prod"];
            if(knownTypes.indexOf(actionContext.workItemTypeName)!=-1)
                this.showExecuteActionsDialog(actionContext);
            else alert("CDActions button only works on the following types: "+knownTypes.join(","));
        }
    };
}());

VSS.register("executeCDActions", function (context) {
    return executeCDActionsProvider;
});