const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const browserSync = require('browser-sync').create();
const del = require('del');
const wiredep = require('wiredep').stream;
const runSequence = require('run-sequence');
const fileinclude = require('gulp-file-include');
const autoprefixer = require('gulp-autoprefixer');

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

var dev = true;

var paths = {
  scripts: {
    input: 'app/scripts/**/*.js',
    tmp: '.tmp/scripts/',
    output: 'dist/scripts/'
  },
  styles: {
    input: 'app/styles/**/*.scss',
    tmp: '.tmp/styles/',
    output: 'dist/styles/'
  },
  html: {
    input: 'app/**/*.html',
    tmp: '.tmp/',
    output: 'dist/'
  },
  images: {
    input: 'app/images/**/*.{jpeg,jpg,png,svg,gif,ico}',
    tmp: '.tmp/images',
    output: 'dist/images/'
  },
  videos: {
    input: 'app/videos/**/*.{mp4,mov}',
    tmp: '.tmp/videos',
    output: 'dist/videos/'
  },
  fonts: {
    input: 'app/fonts/**/*.{ttf,woff,eof,svg}',
    tmp: '.tmp/fonts',
    output: 'dist/fonts/'
  },
  locales: {
    input: 'app/locales/**/*.{ftl}',
    tmp: '.tmp/locales',
    output: 'dist/locales/'
  },
  misc: {
    input: 'app/*.{ico,png,txt,xml,json}',
    tmp: '.tmp/',
    output: 'dist/'
  }
};

gulp.task('styles', () => {
  return gulp.src(paths.styles.input)
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.sass.sync({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', $.sass.logError))
    .pipe(autoprefixer({
      browsers: ['> 0.3%', 'last 4 versions'],
      cascade: false
    }))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest(paths.styles.tmp))
    .pipe(reload({stream: true}));
});

gulp.task('scripts', () => {
  return gulp.src(paths.scripts.input)
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.babel())
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest(paths.scripts.tmp))
    .pipe(reload({stream: true}));
});

gulp.task('fileinclude', () => {
  return gulp.src(paths.html.input)
    .pipe($.plumber())
    .pipe(fileinclude())
    .pipe(gulp.dest(paths.html.tmp))
    .pipe(browserSync.stream());
});

function lint(files, options) {
  return gulp.src(files)
    .pipe($.eslint({ fix: true }))
    .pipe(reload({stream: true, once: true}))
    .pipe($.eslint.format())
    .pipe($.if(!browserSync.active, $.eslint.failAfterError()));
}

gulp.task('lint', () => {
  return lint(paths.scripts.input)
    .pipe($.plumber())
    .pipe($.eslint({
      extends: "airbnb"
    }))
    .pipe($.eslint.format())
    .pipe(reload({stream: true}));
});
gulp.task('lint:test', () => {
  return lint(paths.scripts.input)
    .pipe(gulp.dest('test/spec'));
});

gulp.task('html', ['styles', 'scripts'], () => {
  return gulp.src(paths.html.input)
    .pipe($.useref({searchPath: ['.tmp', 'app', '.']}))
    .pipe($.if('*.js', $.uglify()))
    .pipe($.if('*.css', $.cssnano({safe: true, autoprefixer: false})))
    .pipe($.if('*.html', fileinclude()))
    .pipe($.if('*.html', $.htmlmin({collapseWhitespace: true})))
    .pipe(gulp.dest(paths.html.output));
});

gulp.task('images', () => {
  return gulp.src(paths.images.input)
    .pipe($.cache($.imagemin()))
    .pipe(gulp.dest(paths.images.output));
});

gulp.task('fonts', () => {
  return gulp.src(require('main-bower-files')('**/*.{eot,svg,ttf,woff,woff2}', function (err) {})
    .concat(paths.fonts.input))
    .pipe($.if(dev, gulp.dest(paths.fonts.tmp), gulp.dest(paths.fonts.output)));
});

gulp.task('extras', () => {
  return gulp.src([
    'app/*',
    '!app/**/*.html'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('serve', () => {
  runSequence(['clean', 'wiredep'], ['fileinclude', 'styles', 'scripts', 'fonts'], () => {
  browserSync.init({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['.tmp', 'app'],
      routes: {
        '/bower_components': 'bower_components'
      }
    }
  });

  gulp.watch(paths.html.input, ['fileinclude']);
  gulp.watch(paths.scripts.input, ['fileinclude', 'scripts']);

  gulp.watch([
    paths.html.input,
    paths.images.input,
    paths.fonts.input
  ]).on('change', reload);

  gulp.watch(paths.styles.input, ['styles']);
  gulp.watch(paths.fonts.input, ['fonts']);
  gulp.watch('bower.json', ['wiredep', 'fonts']);
});
});

gulp.task('serve:dist', ['default'], () => {
  browserSync.init({
  notify: false,
  port: 9000,
  server: {
    baseDir: ['dist']
  }
});
});

gulp.task('serve:test', ['scripts'], () => {
  browserSync.init({
  notify: false,
  port: 9000,
  ui: false,
  server: {
    baseDir: 'test',
    routes: {
      '/scripts': paths.scripts.tmp,
      '/bower_components': 'bower_components'
    }
  }
});

gulp.watch(paths.scripts.tmp, ['scripts']);
gulp.watch(['test/spec/**/*.js', 'test/index.html']).on('change', reload);
gulp.watch('test/spec/**/*.js', ['lint:test']);
});

// inject bower components
gulp.task('wiredep', () => {
  gulp.src(paths.styles.tmp)
  .pipe($.filter(file => file.stat && file.stat.size))
.pipe(wiredep({
  ignorePath: /^(\.\.\/)+/
}))
  .pipe(gulp.dest('app/styles'));

gulp.src(paths.html.input)
  .pipe(wiredep({
    exclude: ['bootstrap-sass'],
    ignorePath: /^(\.\.\/)*\.\./
  }))
  .pipe(gulp.dest('app'));
});

gulp.task('build', ['lint', 'html', 'images', 'fonts', 'extras'], () => {
  return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});

gulp.task('default', () => {
  return new Promise(resolve => {
    dev = false;
runSequence(['clean', 'wiredep'], 'build', resolve);
});
});
