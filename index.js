// take a folder and return a fully mapped array of it's contents
// this is currently geared towards markdown
var loaderUtil = require('loader-utils');
var filewalker = require('filewalker');
var async = require('async');
var fs = require('fs');
var pathUtil = require('path');




module.exports = function(source, map) {
  var self = this;
  if(typeof self.options.staticSiteLoader === 'undefined') {
    self.emitError('You must define the staticSiteLoader options object to use this loader.');
  }
  var myOptions = self.options.staticSiteLoader;

  //Pre-Processor function call
  if(typeof myOptions.preProcess === 'function') {
    myOptions.preProcess.apply(self, [source]);
  }

  //declare as cacheable
  self.cacheable();

  //declare as async and save function call for later
  var callback = self.async();

  var contentPath = pathUtil.dirname(self.resourcePath);

  //Assemble the paths
  async.waterfall([
    function(doneWithDirectory) {
      var files = [];
      filewalker(contentPath)
        .on('file', function(path, stats, absPath) {
        if(typeof myOptions.preProcess === 'function') {
          //test if we should include file
          if(myOptions.testToInclude.apply(self, [path, stats, absPath])) {
            //watch this file for changes
            self.addDependency(path);
            //rewrite URL path
            if(typeof myOptions.rewriteUrlPath === 'function') {
              var urlPath = myOptions.rewriteUrlPath.apply(self, [path, stats, absPath]);
            } else {
              var urlPath = path;
            }
            //push file to be processed
            files.push({
              urlPath: urlPath,
              path: path,
              absPath: absPath
            });
          }
        } else {
          self.emitError('You must set a function to staticSiteLoader.testToInclude in your webpack config to use this loader.')
        }
      })
      .on('done', function() {
        doneWithDirectory(null, files);
      })
      .walk();
    },
    function(files, filesDone) {
      async.each(files, function(file, fileEmitted){
        fs.readFile(file.absPath, 'utf8', function(err, content) {
          var outputFileName = pathUtil.join(file.urlPath, '/index.html')
            .replace(/^(\/|\\)/, ''); // Remove leading slashes for webpack-dev-server
          //rewrite files contents
          if(typeof myOptions.processFile === 'function') {
            content = myOptions.processFile.apply(self, [file, content]);
          }
          self.emitFile(outputFileName, content);
          fileEmitted();
        });
      }, filesDone);
    }
  ], function() {
    //console.log('Content Processing Done');
    callback(null, source);
  });
};