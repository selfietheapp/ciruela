require('rootpath')();
var colors    = require('colors');
var spawn     = require('child_process').spawn;

var env = process.env.NODE_ENV || 'development';
var config = require('config/environments/' + env + '.json');

var postHook = module.exports = {
    createDeployablePackage: function (target, lint_results, results, callback) {
        console.log("Running postHook for create deployable callback".white);
        process.chdir(target.projectRoot);
        var distDirectory = config.distDirectory;
        if (results && results.stats && results.stats.tests === results.stats.passes && results.stats.failures === 0 && lint_results && lint_results.length === 0) {
            deployablePackageCommand = spawn('npm', ['run', 'deployable-package', '--dist-directory=' + distDirectory, '--source-directory=' + target.projectRoot + '/tmp', '--project-name=' + target.repoName, '--branch=' + target.branch, '--commit=' + target.commit.id])

            deployablePackageCommand.stdout.on('data', function (data) {
                console.log(('' + data));
            });

            deployablePackageCommand.stderr.on('data', function (data) {
                console.log(('' + data));
            });

            deployablePackageCommand.on('close', function (code) {
                console.log('deployable-package exit code ' + code);
                callback(null);
            });
        } else {
            console.log("Error: Deployable package not created".yellow);
            console.log(("Tests: " + results.stats.tests).yellow);
            console.log(("Tests passes: " + results.stats.passes).yellow);
            console.log(("Tests failures: " + results.stats.failures).yellow);
            console.log(("Lint failures: " + lint_results.length).yellow);
            callback("Error: Deployable package not created");
        }
    }
}