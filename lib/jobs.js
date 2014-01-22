require('rootpath')();
var mongo = require('mongodb');
var path = require('path');
var git = require('lib/git');
dbName = git.repoName.replace(/\./, "-")

if ('development' === process.env.NODE_ENV) {
  	config = require('environments/development.json');
} else {
	config = require('environments/production.json');
}

var db = new mongo.Db("ciruela" + git.repoName, new mongo.Server(config.mongo.host, config.mongo.port, {
    auto_reconnect: true
}), {});

db.open(function(error) {
    if (error) {
        console.log('There was an error creating a connection with the Mongo database. Please check that MongoDB is properly installed and running.'.red);
        return process.exit(1);
    }
});


ObjectID = mongo.BSONPure.ObjectID;

jobs = module.exports = {
  	
    current: null,

  	addJob: function(target, next) {
    	db.collection('jobs', function(error, collection) {
      		var job = {
                project: target.repoName,
                branch: target.branch,
        		addedTime: new Date().getTime(),
                log: {},
                duration: '',
        		running: false,
        		finished: false
      		};
      		
            collection.insert(job);
            if (next) return next(job);
    	});
  	},

    get: function(id, next) {
        db.collection('jobs', function(error, collection) {
            collection.findOne({ _id: new ObjectID(id) }, function(error, job) {
                if (job) {
                    return next(job);
                } else {
                    return next("No job found with the id '" + id + "'");
                }
            });
        });
    },

    getAll: function(next) {
        return getJobs(null, next);
    },

    updateJob: function(id, string, next) {
        db.collection('jobs', function(error, collection) {
            collection.findOne({ _id: new ObjectID(id) }, function(error, job) {
                console.log(("Update log for job " + job._id).grey);
                if (!job) return false;
                job.log = (typeof string === 'object') ? string : {};
                if (string && string.stats && string.stats.duration ) {
                    job.duration = string.stats.duration;    
                } else {
                    job.duration = 'X';
                }
                collection.save(job);
                if (next) {
                    return next();
                }
            });
        });
    },

    currentComplete: function(success, next) {
        db.collection('jobs', function(error, collection) {
            collection.findOne({ _id: new ObjectID(jobs.current)}, function(error, job) {
                if (!job) return false;
                job.running = false;
                job.finished = true;
                job.failed = !success;
                job.finishedTime = new Date().getTime();
                jobs.current = null;
                collection.save(job);
                return next();
            });
        });
    },

    next: function(next) {
        db.collection('jobs', function(error, collection) {
            collection.findOne({ running: false, finished: false }, function(error, job) {
                if (!job) return false;
                job.running = true;
                job.startedTime = new Date().getTime();
                jobs.current = job._id.toString();
                collection.save(job);
                return next();
            });
        });
    }
};


getJobs = function(filter, next) {
    return db.collection('jobs', function(error, collection) {
        if (filter) {
            collection.find(filter).sort({ addedTime: 1 })
            .toArray(function(error, results) {
                return next(results);
            });
        } else {
            collection.find().sort({ addedTime: 1 })
            .toArray(function(error, results) {
                return next(results);
            });
        }
    });
};