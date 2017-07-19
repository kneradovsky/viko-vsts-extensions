
try { angular.module("ExecActions.services") } catch (err) { angular.module('ExecActions.services', []); }

angular.module("ExecActions.services").service("BuildsConfigurationService", function () {
    this.docId = "7683c39d-da23-4fb2-83dc-2bc5bf2025dc";
    this.Builds = ""
    this.USBuilds = ""
    this.Doc = {}

    this.execute = function (progressCallback) {
        var deferred = $.Deferred();
        var srv = this;
        srv.progressCallback = progressCallback;
    }

    this.init = function (configutation) {
        var deferred = $.Deferred();
       var service = this;
        VSS.ready(function () {
            // Get the data service
            VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                service.dataService = dataService;
                service.loadOptions().then(function() {
                    deferred.resolve();
                },function(error) {deferred.reject(error)})
            });
        })
       return deferred.promise()
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
        if(serviceName==null) {
            serviceName="buildService"
        }
        if(context!=null){
            root=context.project.id + '-' ;
        }
        return root + serviceName;
    }

    this.loadOptions = function() {
        var deferred = $.Deferred();
        var service=this;
        var vsoContext = VSS.getWebContext();
        try {
            this.dataService.getDocument(this.getCollectionUrl(vsoContext),this.docId)
            .then(function(indoc) {
                service.Builds = indoc.Task
                service.USBuilds = indoc.UserStory
                deferred.resolve()
            },function(error) {deferred.reject(error)})
        } catch(error) {deferred.reject(error)}
        return deferred.promise();
    }

    this.saveDocument = function(url,document) {
        var deferred = $.Deferred();
        var service = this;
        this.dataService.setDocument(url,document)
        .then(function(doc) {deferred.resolve(doc)},function(error) {deferred.reject(error)})
        return deferred.promise();
    }

    this.storeOptions = function(options) {
        var deferred = $.Deferred();
        try {
            this.Builds = JSON.parse(options.Task)
            this.USBuilds = JSON.parse(options.UserStory)
            var vsoContext = VSS.getWebContext();
            var service = this;
            var doc = {id:this.docId,Task:this.Builds,UserStory:this.USBuilds}
            var docurl = this.getCollectionUrl(vsoContext)
            this.saveDocument(docurl,doc).then(function (indoc) {deferred.resolve(indoc)},
            function(error) {
                service.deleteDocument().then(function() {
                    service.saveDocument(docurl,doc).then(function(indoc) {deferred.resolve(indoc)},function(error) {deferred.reject(error)})
                },function(error) {deferred.reject(error)})
            })
        } catch(error) {deferred.reject(error)}
        return deferred.promise()
    }

    this.deleteDocument = function() {
        var deferred = $.Deferred();
        var vsoContext = VSS.getWebContext();
        var service = this;
        try {
            this.dataService.deleteDocument(this.getCollectionUrl(vsoContext),this.docId)
            .then(function() {deferred.resolve()},function(error) {deferred.reject(error)})
        } catch(error) {deferred.reject(error)}
        return deferred.promise()
    }

    this.getTaskBuild = function(system) {
        return this.Builds[system];
    }
    this.getUserStoryBuild = function(system,type) {
        if(this.USBuilds[system]==undefined) return undefined;
        return this.USBuilds[system][type]

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
    this.defaultUserStoryOptions = {
        "TIBCO BPM": {
            "install": {
                "type": "jenkins",
                "url": "url2"
            },
            "rollback": {
                "type": "jenkins",
                "url": "url2"
            }
        },
        "Открытие Online" : {
            "install": {
                "type": "jenkins",
                "url": "url4"
            },
            "rollback": {
                "type": "jenkins",
                "url": "url5"
            }
        },
        "SugarCRM": {
            "install": {
                "type": "tfs",
                "buildDefinition": "Sugar_CD",
                "url": "url3"
            },
            "rollback": {
                "type": "tfs",
                "buildDefinition": "Sugar_CD",
                "url": "url3"
            }
        }
    }
    this.defaultTaskOptions = {
        "TIBCO BPM": {
            "type": "jenkins",
            "url": "url2"
        },
        "SugarCRM": {
            "type": "tfs",
            "buildDefinition": "Sugar_CD",
            "url": "url3"
        }
    }
});