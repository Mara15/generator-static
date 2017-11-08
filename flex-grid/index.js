'use strict';
const Generator = require('yeoman-generator');
const commandExists = require('command-exists').sync;
const yosay = require('yosay');
const chalk = require('chalk');
const wiredep = require('wiredep');
const mkdirp = require('mkdirp');
const _s = require('underscore.string');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    this.option('skip-welcome-message', {
      desc: 'Skips the welcome message',
      type: Boolean
    });

    this.option('skip-install-message', {
      desc: 'Skips the message after the installation of dependencies',
      type: Boolean
    });

    this.option('test-framework', {
      desc: 'Test framework to be invoked',
      type: String,
      defaults: 'mocha'
    });
  }

  initializing() {
    this.pkg = require('../package.json');
    this.composeWith(
      require.resolve(`generator-${this.options['test-framework']}/generators/app`),
      { 'skip-install': this.options['skip-install'] }
    );
  }

  writing() {
    this._writingGulpfile();
    this._writingPackageJSON();
    this._writingBabel();
    this._writingGit();
    this._writingBower();
    this._writingEditorConfig();
    this._writingH5bp();
    this._copyStyles();
    this._writingScripts();
    this._writingHtml();
    this._writingMisc();
  }

  _writingGulpfile() {
    this.fs.copyTpl(
      this.templatePath('gulpfile.js'),
      this.destinationPath('gulpfile.js'),
      {
        date: (new Date).toISOString().split('T')[0],
        name: this.pkg.name,
        version: this.pkg.version,
        testFramework: this.options['test-framework']
      }
    );
  }

  _writingPackageJSON() {
    this.fs.copyTpl(
      this.templatePath('_package.json'),
      this.destinationPath('package.json')
    );
  }

  _writingBabel() {
    this.fs.copy(
      this.templatePath('babelrc'),
      this.destinationPath('.babelrc')
    );
  }

  _writingGit() {
    this.fs.copy(
      this.templatePath('gitignore'),
      this.destinationPath('.gitignore'));

    this.fs.copy(
      this.templatePath('gitattributes'),
      this.destinationPath('.gitattributes'));
  }

  _writingBower() {
    const bowerJson = {
      name: _s.slugify(this.appname),
      private: true,
      dependencies: {}
    };

    // Bootstrap 4
    bowerJson.dependencies = {
      'bootstrap': '4.0.0-beta',
      'popper.js-unpkg': 'https://unpkg.com/popper.js'
    };

    this.fs.writeJSON('bower.json', bowerJson);
    this.fs.copy(
      this.templatePath('bowerrc'),
      this.destinationPath('.bowerrc')
    );
  }

  _writingEditorConfig() {
    this.fs.copy(
      this.templatePath('editorconfig'),
      this.destinationPath('.editorconfig')
    );
  }

  _writingH5bp() {
    this.fs.copy(
      this.templatePath('favicon.ico'),
      this.destinationPath('app/favicon.ico')
    );

    this.fs.copy(
      this.templatePath('apple-touch-icon.png'),
      this.destinationPath('app/apple-touch-icon.png')
    );

    this.fs.copy(
      this.templatePath('robots.txt'),
      this.destinationPath('app/robots.txt'));
  }

  _copyStyles() {
    this.fs.copy(
      this.templatePath('styles'),
      this.destinationPath('app/styles')
    );
  }

  _writingScripts() {
    this.fs.copyTpl(
      this.templatePath('main.js'),
      this.destinationPath('app/scripts/main.js')
    );
  }

  _writingHtml() {
    let bsPath, bsPlugins;

    // Bootstrap 4
    bsPath = '/bower_components/bootstrap/js/dist/';
    bsPlugins = [
      'util',
      'alert',
      'button',
      'carousel',
      'collapse',
      'dropdown',
      'modal',
      'scrollspy',
      'tab',
      'tooltip',
      'popover'
    ];

    this.fs.copyTpl(
      this.templatePath('index.html'),
      this.destinationPath('app/index.html'),
      {
        appname: this.appname,
        bsPath: bsPath,
        bsPlugins: bsPlugins
      }
    );
  }

  _writingMisc() {
    mkdirp('app/images');
    mkdirp('app/fonts');
  }

  install() {
    const hasYarn = commandExists('yarn');
    this.installDependencies({
      npm: !hasYarn,
      bower: true,
      yarn: hasYarn,
      skipMessage: this.options['skip-install-message'],
      skipInstall: this.options['skip-install']
    });
  }

  end() {
    const bowerJson = this.fs.readJSON(this.destinationPath('bower.json'));
    const howToInstall = `
After running ${chalk.yellow.bold('npm install & bower install')}, inject your
front end dependencies by running ${chalk.yellow.bold('gulp wiredep')}.`;

    if (this.options['skip-install']) {
      this.log(howToInstall);
      return;
    }

    // wire Bower packages to .html
    wiredep({
      bowerJson: bowerJson,
      directory: 'bower_components',
      exclude: ['bootstrap-sass', 'bootstrap.js'],
      ignorePath: /^(\.\.\/)*\.\./,
      src: 'app/index.html'
    });

    wiredep({
      bowerJson: bowerJson,
      directory: 'bower_components',
      ignorePath: /^(\.\.\/)+/,
      src: 'app/styles/*.scss'
    });
  }
};
