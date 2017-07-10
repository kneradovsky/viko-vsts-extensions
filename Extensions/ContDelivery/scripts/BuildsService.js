
try { angular.module("ExecActions.services") } catch (err) { angular.module('ExecActions.services', []); }

angular.module("ExecActions.services").service("BuildsConfigurationService", function () {
    this.Builds = {
        "TIBCO BPM": {
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
        SugarCRM: {
            "User Story": {
                type: "jenkins",
                url: "url1",
                rollbackurl: "url1",
            },
            Task: {
                type: "tfs",
                buildDefinition: "SugarCRM_CD",
                url: "url1",
            }
        }
    }
    this.USBuilds = {
        install : {
            type: "jenkins",
            url: "url1",
            buildDefinition: "US_InstallCD"
        },
        rollback : {
            type: "jenkins",
            url: "url1",
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