
try { angular.module("ExecActions.services") } catch (err) { angular.module('ExecActions.services', []); }

angular.module("ExecActions.services").service("BuildsConfigurationService", function () {
    this.docId = "7683c39d-da23-4fb2-83dc-2bc5bf2025dc";
    this.Builds = ""
    this.USBuilds = ""
    this.Doc = {}

    this.execute = function (progressCallback) {
        var deffered = $.Deferred();
        var srv = this;
        srv.progressCallback = progressCallback;
    }

    this.init = function (configutation) {
        var deffered = $.Deferred();
       var service = this;
        VSS.ready(function () {
            // Get the data service
            VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                service.dataService = dataService;
                service.loadOptions().then(function() {
                    deferred.resolve();
                })
            });
        })
       return deffered.promise()
    };

    this.fetchPermissions = function () {
        var deferred = $.Deferred();
        VSS.require(["VSS/Service", "VSS/Security/RestClient"], function (VSS_Service, Security_RestClient) {
            if (Security_RestClient.SecurityHttpClient2_3 != null) {
                //Checking so we got support for 2_3 (Tfs2015.2 doesnt )
                var client = VSS_Service.getCollectionClient(Security_RestClient.SecurityHttpClient2_3);
                client.hasPermissions("1f4179b3-6bac-4d01-b421-71ea09171400", 2 /* write */, "FrameworkGlobalSecurity", true).then(
                    function (response) {
                        deferred.resolve(response[0]);
                    },
                    function (err) {
                        console.log(err);
                        deferred.resolve(false);
                    });
            }
            else {
                //IF tfs2015.2 -without support for permissions - enable for everyone
                deferred.resolve(true);
            }
        });
        return deferred.promise()
    };

    this.getCollectionUrl = function(context,serviceName) {
        var root= "";
        if(vsoContext!=null){
            root=vsoContext.project.id + '-' ;
        }
        return root + serviceName;
    }

    this.loadOptions = function() {
        var deffered = $.Deferred();
        var service=this;
        var vsoContext = VSS.getWebContext();
        this.dataService.getDocument(this.getCollectionUrl(vsoContext),this.docId)
        .then(function(indoc) {
            service.Builds = doc.Task
            service.USBuilds = doc.UserStory
            deferred.resolve()
        },function(error) {deferred.reject(error)})
        return deferred.promise();
    }

    this.storeOptions = function(options) {
        var deffered = $.Deferred();
        this.Builds = JSON.parse(options.Task)
        this.USBuilds = JSON.parse(options.UserStory)
        var vsoContext = VSS.getWebContext();
        var service = this;
        var doc = {id:this.docId,Task:this.Builds,UserStory:this.USBuilds}
        this.dataService.setDocument(this.getCollectionUrl(vsoContext),doc)
        .then(function() {deferred.resolve()},function(error) {deffered.reject(error)})
        return deferred.promise()
    }

    this.getBuild = function(system) {
        return this.Builds[system]["Task"];
    }
    this.getUSBuild = function(type) {
        return this.USBuilds[type]
    }

    this.isSystemInCD = function(system) {
        return this.Builds.hasOwnProperty(system)
    }

    this.ProgressMessage = function (message) {
        if (this.progressCallback != null) {
            return this.progressCallback(message);

        }
        else {
            return true;
        }
    }
});