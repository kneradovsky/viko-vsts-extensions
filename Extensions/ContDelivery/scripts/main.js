var showPropertiesMenuProvider = (function () {
    "use strict";
    return {
        showPropertiesInDialog: function(properties, title) {
            
            VSS.getService("ms.vss-web.dialog-service").then(function (dialogSvc) {
                
                var extInfo = VSS.getExtensionContext();
                
                var dialogOptions = {
                    title: title || "Properties",
                    width: 800,
                    height: 600,
                    buttons: null
                };
                
                var contributionConfig = { 
                    properties: properties
                };
                
                dialogSvc.openDialog(extInfo.publisherId + "." + extInfo.extensionId + "." + "contextForm", dialogOptions, contributionConfig);
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
            var item = VSS.getContribution();
            console.log("--1---");
            console.log(item);
            console.log("--2---");
            console.log(actionContext);
            //this.showPropertiesInDialog(actionContext);
            this.properties.text = "aaaa";
        }
    };
}());

VSS.register("showTaskProperties", function (context) {
    return showPropertiesMenuProvider;
});