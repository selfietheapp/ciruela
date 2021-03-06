require('rootpath')();
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('routes');
var http = require('http');
var path = require('path');
var stylus = require('stylus');
var runner = require('lib/runner');
var jobs = require('lib/jobs');
var fs = require('fs');

var winston = require('winston');

var app = express();

winston.remove(winston.transports.Console);

winston.add(winston.transports.File, {
    level: 'info',
    filename: './logs/app.log',
    handleExceptions: true,
    json: false,
    maxsize: 5242880, //5MB
    maxFiles: 5,
    colorize: false
});

var olog = console.log;
console.log = function () {
    winston.info(colors.stripColors(arguments[0]));
    olog.apply(console, arguments);
}

var setup = function () {
    // all environments
    var projectRoot = process.cwd();

    app.set('port', process.env.PORT || 3000);
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');

    // development only
    console.log("Env", app.get('env'));
    if ('development' == app.get('env')) {
        app.use(express.errorHandler());
        config = require('config/environments/development.json');
    } else {
        config = require('config/environments/' + app.get('env') + '.json');
    }
    var distDirectory = config.distDirectory;
    console.log("setting distDirectory to " + distDirectory);

    app.use(stylus.middleware({
        debug: false,
        src: __dirname + '/views',
        dest: __dirname + '/public',
        compile: function(str) {
            return stylus(str).set('compress', true);
        }
    }));

    app.use(express.logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));

    app.use("/reports", express.static(config.reportsDirectory));

    app.use("/", express.static(distDirectory));

    app.get('/', routes.index);

    app.get('/job/:jobId', routes.getJob);

    app.get('/projects/:projectName', routes.projectJobs);

    app.get('/projects/:projectName/:branchName', routes.projectJobsbyBranch);

    app.post('/', function(req, res) {
        var data;
        if (req.body.payload) data = JSON.parse(req.body.payload);
        data = data || req.body;
        if (!data.deleted) {
            result = data.ref.match(/^[A-z|\d]+\/[A-z|\d]+\/(.+)$/);
            branch = result[1];
            repoUrl = data.repository.url;
            repoName = data.repository.name;
            organization = data.repository.organization;
            targetUrl = 'git@github.com:' + organization + '/' + repoName;
            lastCommitInfo = data.commits[data.commits.length - 1];

            report = config.server.root + ':' + config.server.port + '/reports/' + data.repository.name + '/' + lastCommitInfo.id + '.html';
            target = {
                'branch': branch,
                'url': targetUrl,
                'organization': organization,
                'repoUrl': repoUrl,
                'repoName': repoName,
                'commit': lastCommitInfo,
                'report': report
            };

            console.log("Adding Job");
            jobs.addJob(target, function (job) {
                runner.build(target);
                res.json(200, job);
            });
        } else {
            res.json(204, {message: "Not commit information found"});
        }
    });


    http.createServer(app).listen(app.get('port'), function() {
        console.log('ciruela server listening on port ' + app.get('port'));
    });

}

fs.exists(path.join(__dirname, 'logs/app.log'), function (exists) {
    if (!exists) {
        fs.mkdir('logs', function (err) {
            if (err) console.log(err);
            fs.writeFile('logs/app.log', "", function (err) {
                if (err) console.log(err);
                setup();
            });
        });
    } else {
        setup();
    }
});