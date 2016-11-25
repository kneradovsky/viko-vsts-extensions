# Parallel Builds extension

Parallel Builds extension provides tasks to start builds in parallel, wait for them to finish and consume their test results. It also contains AutoDefects task to automatically create defects from the failed test run results.

## Parallel Builds tasks
The extenstion provides two task to manage parallel/chain builds. Tasks use "internal" connection, so you dont't need to specify any auth parameters 


1. Chain Builds Starter
The task starts build from the buildList parameter. The __buildList__ is the comma-separated list of the build definitions to start. 
The __Starter__ queues builds using their default settings.

2. Chain Builds Awaiter. 
The task awaits all build to finish. Once a build is finished its test runs results (if any) are published to the current build with the same name. 
It adds the links to the original builds to the current build summary page. 

## Auto defects
The Auto Defects task loads all test runs of the curren build and creates defects in the current project using the following rules:

* Bug Project - current build's project
* State - New
* Title - Failed _[failed test name]_
* Tags - AutoTestFailure; AutoBug; _buildNumber_; _testRunName_ ;
* ReproSteps - _testCaseErrorMessage_ _testCaseStackTrace_ 
* AssignedTo - username for the currentTestRun from assignees file

Task parameters: 

* assignees file. The file contains the hash of the assignees - key is the name of the testRun, value - username to assign a Bug
```json
{
"Run1" : "User1",
"Run2": "User2",
"default": "User1"
}
``` 
If the hash doesn't have a key for the run being processed then the bug is assigned to the "default" username

* Authentication parameters to connect to the . Task accepts several authentication types. - OAuth, NTLM, Basic 
    * Authentication types
    * Username and Password for the Basic and NTLM authentication types.

