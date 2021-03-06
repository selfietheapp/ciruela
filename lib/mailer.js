require('rootpath')();

var nodemailer      = require("nodemailer"),
    path            = require('path'),
    fs              = require('fs'),
    templatesDir    = path.resolve('.', 'views', 'mail'),
    emailTemplates  = require('email-templates');
    colors          = require('colors')

mailer = module.exports = {

    processError: function (error, lint, results, target) {

        var subject = 'There was an error processing ' + target.repoName + '/' + target.branch;

        var locals = {
            err: error,
            commit: target.commit,
            organization: target.organization,
            branch: target.branch,
            repoName: target.repoName,
            repoUrl: target.repoUrl,
            failures: results.stats.failures || 0,
            pending: results.stats.pending || 0,
            totalTests: results.stats.tests,
            passes: results.stats.passes || 0,
            failureTitles: results.failures,
            lint: lint
        };

        emailTemplates(templatesDir, function (err, template) {
            if (err) console.log(err.red);

            // Send a single email
            template('processError', locals, function (err, html, text) {
                if (err) console.log(err.red);
                prepareTX(function(config, transport) {
                    transport.sendMail({
                        from: config.smtpOptions.from, // sender address
                        to: config.recipientList, // list of receivers
                        subject: subject,
                        html: html,
                        alternatives: [{
                            contentType: "text/html; charset=UTF-8"
                        }]
                    }, function(err, responseStatus) {
                        if (err) {
                            console.log(err.red);
                            return;
                        }
                        if (responseStatus) {
                            console.log((responseStatus.message).white);
                            return;
                        }
                    });
                });
            });
        });
    },

    sendBuildResult: function (buildResult) {

        var testStatus = buildResult.failures > 0 || buildResult.lint.length > 0 ? 'Failure' : 'Success';

        var locals = buildResult;

        var subject = buildResult.testStatus + ': ' +
                      buildResult.organization + '/' +
                      buildResult.repoName +' [' +
                      buildResult.branch + '] by ' +
                      buildResult.commit.author.username + ': ' +
                      buildResult.commit.message;

        emailTemplates(templatesDir, function(err, template) {
            if (err) console.log(err.red);

            // Send a single email
            template(config.emailTemplateDir, locals, function(err, html, text) {
                if (err) console.log(err.red);
                prepareTX(function(config, transport) {
                    transport.sendMail({
                        from: config.smtpOptions.from, // sender address
                        to: config.recipientList, // list of receivers
                        subject: subject,
                        html: html,
                        alternatives: [{
                            contentType: "text/html; charset=UTF-8"
                        }]
                    }, function (err, responseStatus) {
                        if (err) {
                            console.log("Email error: " + err + " - " + responseStatus);
                            return;
                        }
                        if (responseStatus) {
                            console.log(("Email sent " + responseStatus.message).white);
                            return;
                        }
                    });
                });
            });
        });
    },

    buildMail: function (target, lint_results, results, next) {
        buildResult = {};
        buildResult['commit'] = target.commit;
        buildResult['report'] = target.report;
        buildResult['branch'] = target.branch;
        buildResult['organization'] = target.organization;
        buildResult['repoUrl'] = target.repoUrl;
        buildResult['repoName'] = target.repoName;
        buildResult['duration'] = results.stats.duration;
        buildResult['decrease'] = results.decrease;
        buildResult['decreasePercentage'] = results.decreasePercentage;
        buildResult['totalTests'] = results.stats.tests;
        buildResult['failures'] = results.stats.failures || 0;
        buildResult['passes'] = results.stats.passes || 0;
        buildResult['pending'] = results.stats.pending || 0;
        buildResult['failureTitles'] = results.failures.map(function(failure){ return failure.fullTitle });
        buildResult['testStatus'] = buildResult.failures > 0 || lint_results.length > 0 ? 'Failure' : 'Success';
        buildResult['lint'] = lint_results;
        next(buildResult);
    }
}

prepareTX = function (callback) {
    var env = process.env.NODE_ENV || 'development';
    var config = require('config/environments/' + env + '.json');

    // Create a SMTP transport object

    var transportOptions = {
        host: config.smtpOptions.host,
        port: config.smtpOptions.port // port for secure SMTP
    };

    if (config.smtpOptions.auth !== undefined ){
        transportOptions.auth = config.smtpOptions.auth;
    };

    if ( config.smtpOptions.secureConnection ) {
        transportOptions.secureConnection = config.smtpOptions.secureConnection // use SSL
    };

    console.log(('SMTP ready').white);
    var transport = nodemailer.createTransport("SMTP", transportOptions);

    callback(config, transport);

}