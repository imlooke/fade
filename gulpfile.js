const fs = require("fs");
const del = require("del");
const gulp = require("gulp");
const sass = require("gulp-sass");
const browserSync = require("browser-sync");
const cssnano = require("cssnano");
const htmlBeautify = require("gulp-html-beautify");
const sourcemaps = require("gulp-sourcemaps");
const autoprefixer = require("autoprefixer");
const babel = require("gulp-babel");
const fileInclude = require("gulp-file-include");
const imagemin = require('gulp-imagemin');
const postcss = require("gulp-postcss");
const rename = require("gulp-rename");
const size = require("gulp-size");
const uglify = require("gulp-uglify");

// global vars
const srcPath = "./src";
const outputPath = "./dist";
const htmlSrcPath = [`${srcPath}/**/*.html`, `!${srcPath}/include/**/*.html`];
const htmlOutputPath = outputPath;
const scssSrcPath = `${srcPath}/scss/**/*.scss`;
const cssOutputPath = `${outputPath}/css`;
const jsSrcPath = `${srcPath}/js/*.js`;
const jsOutputPath = `${outputPath}/js`;
const imagesSrcPath = `${srcPath}/images/**/*`;
const imagesOutputPath = `${outputPath}/images`;
const assetsPath = {
  fonts: {
    src: `${srcPath}/fonts/**/*`,
    output: `${outputPath}/fonts`,
  },
  videos: {
    src: `${srcPath}/videos/**/*`,
    output: `${outputPath}/videos`,
  },
  plugins: {
    src: `${srcPath}/plugins/**/*`,
    output: `${outputPath}/plugins`,
  },
  favicon: {
    src: `${srcPath}/favicon.ico`,
    output: outputPath,
  },
};

// create server
const server = browserSync.create();

// compile html
function html(cb) {
  gulp
    .src(htmlSrcPath)
    .pipe(fileInclude())
    .pipe(htmlBeautify())
    .pipe(gulp.dest(htmlOutputPath))
    .pipe(size({ title: "html:" }));
  cb();
}

// compile css
function css(cb) {
  gulp
    .src(scssSrcPath)
    .pipe(sourcemaps.init())
    .pipe(sass().on("error", sass.logError))
    .pipe(postcss([autoprefixer()]))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest(cssOutputPath))
    .pipe(server.stream());
  cb();
}

// compile & compress css
function mincss(cb) {
  gulp
    .src(scssSrcPath)
    .pipe(sourcemaps.init())
    .pipe(sass().on("error", sass.logError))
    .pipe(postcss([autoprefixer(), cssnano()]))
    .pipe(
      rename((path) => {
        path.basename += ".min";
      })
    )
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest(cssOutputPath))
    .pipe(size({ title: "css min:" }));
  cb();
}

// compile js
function js(cb) {
  gulp
    .src(jsSrcPath)
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest(jsOutputPath))
    .pipe(server.stream());
  cb();
}

// compile & compress js
function minjs(cb) {
  gulp
    .src(jsSrcPath)
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(uglify())
    .pipe(
      rename(function (path) {
        path.basename += ".min";
      })
    )
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest(jsOutputPath))
    .pipe(size({ title: "js min:" }));
  cb();
}

// copy images
function copyimages(cb) {
  if (fs.existsSync(imagesSrcPath)) {
    gulp.src(imagesSrcPath).pipe(gulp.dest(imagesOutputPath));
  }
  cb();
}

// compress images
function minimages(cb) {
  gulp
    .src(imagesSrcPath)
    .pipe(
      imagemin([
        imagemin.gifsicle({ interlaced: true }),
        imagemin.jpegtran({ progressive: true }),
        imagemin.optipng({ optimizationLevel: 5 }),
        imagemin.svgo({
          plugins: [
            {
              removeViewBox: true,
            },
            {
              cleanupIDs: false,
            },
          ],
        }),
      ])
    )
    .pipe(gulp.dest(imagesOutputPath))
    .pipe(size({ title: "images:" }));
  cb();
}

// copy static files
function copy(cb) {
  for (let key in assetsPath) {
    if (fs.existsSync(assetsPath[key].src)) {
      gulp.src(assetsPath[key].src).pipe(gulp.dest(assetsPath[key].output));
    }
  }
  cb();
}

// delete output path
function clean(cb) {
  del.sync([outputPath]);
  cb();
}

// start local server
function serve(cb) {
  server.init({
    server: {
      baseDir: outputPath,
    },
  });
  cb();
}

// reload local server
function __reload(cb) {
  server.reload();
  cb();
}

// watch files
function __watch(cb) {
  const copySrcPath = [];
  for (let key in assetsPath) {
    copySrcPath.push(assetsPath[key].src);
  }
  gulp.watch(htmlSrcPath[0], gulp.series(html, __reload));
  gulp.watch(copySrcPath, gulp.series(copy, __reload));
  gulp.watch(scssSrcPath, gulp.series(css));
  gulp.watch(jsSrcPath, gulp.series(js));
  gulp.watch(imagesSrcPath, gulp.series(copyimages));
  cb();
}

exports.html = html;
exports.css = css;
exports.mincss = mincss;
exports.js = js;
exports.minjs = minjs;
exports.copyimages = copyimages;
exports.minimages = minimages;
exports.copy = copy;
exports.clean = clean;
exports.serve = gulp.series(
  clean,
  gulp.parallel(css, js, html, copy, copyimages),
  serve,
  __watch
);
exports.build = gulp.series(
  clean,
  gulp.parallel(css, mincss, js, minjs, html, copy, minimages)
);
