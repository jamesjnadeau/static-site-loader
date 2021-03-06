# static-site-loader
A simple static site loader for webpack that you can customize to your liking.
It makes it easy to iterate over a file system, or interject content from any source you desire.
Then you control the output path of your generated files. I built this so I could easily hook
what I needed into the webpack build step.

## Example Usage

The following is an example use case, you can change and tweak it to your liking, or do something crazy on your own.

Let's say you have a project with a folder `content` that contains your sites files in markdown(or whatever you want to write your content in). These files happen to be structured how you would like your site to be structured.

#### House keeping
You will need to add a index.js file to content: `content/index.js`. What's in it is up to you, it just needs to be there so webpack can open the folder.

#### Code it up
Here's a basic setup that will recursively parse those files and dump them into the `built` directory as a static site to do with as you please... upload to s3, view with `webpack-dev-server --content-base public/`, the possibilites are endless :sailboat:

*webpack.config.js:*

```js
var pathUtil = require('path');
var marked = require('marked');
var jade = require('jade');

module.exports = {
  ...
  entry: {
    'site-generator': 'static-site-loader!./content',
    ...
  },
  output: {
    path: 'built',
    ...
  }
  ...
  //These are custom options used to configure your site generator instance
  //all of these function are called via .apply, so you will have this available to you
  //as you would with a normal loader
  staticSiteLoader: {
  //perform any preprocessing tasks you might need here.
  //compile a template to use, read some config settings from ./conten/index.js as source
    preProcess: function(source, path) {
      //watch the content directory for changes
      this.addContextDependency(path);
      //define the template file we'll use
      var template = 'template.jade';
      //watch the template for changes
      this.addDependency(template);
      //Compile the template and store it to this for later use
      this.template = jade.compileFile(template, { pretty: false });
    }
    //Test if a file should be processed or not, should return a Boolean;
    testToInclude: function(path, stats, absPath) {
      //only use files that have the markdown extentsion
      return pathUtil.extname(path) === '.md';
    },
    //Rewrite the url path used when written to output.path
    rewriteUrlPath: function(path, stats, absPath) {
      //strip out the extension
      var urlPath = path.slice(0, -3);
      //rewrite /index to be just /, making index.md files become the folder index properly
      urlPath = urlPath.replace('index', '');
      return urlPath;
    },
    processFile: function(file, content) {
      var content = marked(content.replace(picoCMSMetaPattern, ''));
      return this.template({content: content});
    }
    ....
    // or you can do the following for async content generation
    processFile: function(file, content, callback) {
      var content = marked(content.replace(picoCMSMetaPattern, ''));
      callback(this.template({content: content}));
    }
    ....
    postProcess: function(files) {
      // do something after all the files have been processed
      // ex. collect links in previous steps and output an rss feed or site map
    }
  }
};
