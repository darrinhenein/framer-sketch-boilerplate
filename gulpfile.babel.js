import gulp from 'gulp'
import gutil from 'gulp-util'
import watch from 'gulp-watch'
import coffee from 'gulp-coffee'
import webpack from 'gulp-webpack'
import sketch from 'gulp-sketch'
import browserSync from 'browser-sync'

gulp.task('build', ['copy', 'coffee', 'js', 'sketch'])
gulp.task('default', ['build', 'watch'])

gulp.task('watch', () => {
  gulp.watch('./src/*.coffee', ['coffee'])
  gulp.watch('./src/*.js', ['js'])
  gulp.watch('./src/*.sketch', ['sketch'])

  browserSync({
    server: {
      baseDir: 'build'
    },
    browser: 'google chrome',
    injectChanges: false,
    files: ['build/**/*.*'],
    notify: false
  })
})

gulp.task('coffee', () => {
  gulp.src('src/*.coffee')
    .pipe(coffee({bare: true}).on('error', gutil.log))
    .pipe(gulp.dest('build/'))
})

gulp.task('js', () => {
  const webpackConfig = {
    output: {
      filename: 'app.js'
    },
    module: {
      loaders: [
        { test: /\.js/, loader: 'babel-loader' },
        { test: /\.json/, loader: 'json-loader' }
      ]
    },
    resolve: {
      extensions: ['', '.js', '.jsx']
    }
  }

  return gulp.src('src/app.js')
    .pipe(webpack(webpackConfig))
    .pipe(gulp.dest('build/'))
})

gulp.task('sketch', () => {
  gulp.src('src/*.sketch')
    .pipe(sketch({
      export: 'slices',
      format: 'png',
      saveForWeb: true,
      scales: 1.0,
      trimmed: false
    }))
    .pipe(gulp.dest('build/images'))
})

gulp.task('copy', () => {
  gulp.src('src/*')
    .pipe(gulp.dest('build'))
})
