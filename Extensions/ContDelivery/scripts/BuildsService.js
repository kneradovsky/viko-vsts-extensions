
try { angular.module("ExecActions.services") } catch (err) { angular.module('ExecActions.services', []); }

angular.module("ExecActions.services").service("BuildsConfigurationService", function () {
    this.Builds = {
        Tibco: {
            "User Story": {
                type: "jenkins",
                url: "url1",
                rollbackurl: "url1",
            },
            Task: {
                type: "jenkins",
                url: "url1",
            }
        },
        Sugar: {
            "User Story": {
                type: "tfs",
                buildDefinition: "Sugar_CD",
                url: "url1",
                rollbackurl: "url1",
            },
            Task: {
                type: "tfs",
                buildDefinition: "Sugar_CD",
                url: "url1",
            }
        }
    }
    this.USBuilds = {
        install : {
            type: "tfs",
            buildDefinition: "US_InstallCD"
        },
        rollback : {
            type: "tfs",
            buildDefinition: "US_RevertCD"
        }
    }

    this.execute = function (progressCallback) {
        var deffered = $.Deferred();
        var srv = this;
        srv.progressCallback = progressCallback;
    }

    this.init = function (configutation) {
    };

    this.getBuild = function(system) {
        return this.Builds[system]["Task"];
    }
    this.getUSBuild = function(type) {
        return this.USBuilds[type]
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