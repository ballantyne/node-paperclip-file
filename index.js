const os                      = require('os');
const path                    = require('path');
const fs                      = require('fs');
const klass                   = require('klass');
const crypto                  = require('crypto');
const _                       = require('underscore');

var assets                    = '/public';
var workingDirectory          = process.env.PWD

var fullPath                  = function(key) {
  return path.join(workingDirectory, assets, key);
}

var containingDirectory       = function(key) {
  return path.dirname(fullPath(key));
}

var mkdirp = function(targetDir, next) {
  targetDir
    .split(path.sep)
    .reduce((currentPath, folder) => {
      currentPath += folder + path.sep;
      if (!fs.existsSync(currentPath)){
	fs.mkdirSync(currentPath);
      }
      return currentPath;
    }, '');

  next(null);

}

var ensureDir                 = function(key, next) {
  fs.exists(containingDirectory(key), function(exists) {
    if (exists) {
      next(null);
    } else {
      mkdirp(containingDirectory(key), function(err) {
        next(err);
      })
    }
  });
}

var Storage                  = klass(function(options) {

  _.extend(this, options.file);

  if (this.assets) {
    assets = this.assets;
  }

  if (this.workingDirectory) {
    workingDirectory = this.workingDirectory;
  }

}).methods({

  stream: function(data, key, next) {
    if (typeof stream == 'string') stream = fs.createReadStream(data);
    var writeStream          = fs.createWriteStream(key); 
    writeStream.on('close', function() {
      if (next) {
        next();
      }
    })
    data.pipe(writeStream);
  },

  generateKey: function(fieldname, filename, next) {
    var now = new Date().getTime().toString();
    var extension            = filename.split('.').pop();
    const hash               = crypto.createHmac('sha256', fieldname+now)
      .update(filename)
      .digest('hex');

    var key                  = fieldname + "-" + hash + "." + extension;
    key                      = path.join(os.tmpdir(), key);
    

    return key;
  },

  put: function(key, body, next) {
    ensureDir(key, function(err) {
      fs.writeFile(fullPath(key), body, function(err, data){
        if (next) {
          next(err, data);
        }
      });
    });
  },

  get: function(key, next) {
    fs.readFile(fullPath(key), function(err, data) {
      var data               = data.Body.toString('utf-8'); 
      if (next) {
        next(err, data);
      }
    });
  },

  delete: function(key, next) {
    fs.unlink(fullPath(key), function (err, data) {
      fs.readdir(containingDirectory(key), function(err, items) {
        if (items && items.length == 0) {
          fs.rmdir(containingDirectory(key), function(err) {
            if (next) {
              next(err, key);
            }
          }) 
        } else {
          if (next) {
            next(err, key);
          }
        }
      })
    });
  },

  move: function(oldkey, key, next) {
    ensureDir(key, function(err) {
      fs.rename(oldkey, key, function(err) {
        if (next) {
          next(err);
        }
      })
    })
  }
})

module.exports          = Storage;


