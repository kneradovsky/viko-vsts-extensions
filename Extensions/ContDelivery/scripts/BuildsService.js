
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

    this.execute = function (progressCallback) {
        var deffered = $.Deferred();
        var srv = this;
        srv.progressCallback = progressCallback;
    }

    this.init = function (configutation) {
    };

    this.getBuild = function(system,type) {
        return this.Builds[system][type];
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