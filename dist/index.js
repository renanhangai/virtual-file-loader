'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = _interopDefault(require('path'));
var loaderUtils = require('loader-utils');

var NS = __filename;

/**
 * Patch the file system
 */
function patch(fs) {
	if (fs[NS]) return;

	var virtualFS = {
		files: {},

		add: function add(options) {
			var file = path.resolve(options.path);
			virtualFS.files[file] = {
				path: file,
				content: options.content
			};
		}
	};
	fs[NS] = virtualFS;

	createPatchFn(fs, 'readFile', function (orig, args, file, encoding, cb) {
		var rfile = path.resolve(file);
		var vfile = virtualFS.files[rfile];
		if (vfile) {
			if (typeof encoding === 'function') {
				cb = encoding;
				encoding = null;
			}

			var content = vfile.content;
			if (encoding != null) content = content.toString(encoding);

			cb(null, content);
			return;
		}
		return orig.apply(this, args);
	});
	createPatchFn(fs, 'readFileSync', function (orig, args, file, encoding) {
		var rfile = path.resolve(file);
		var vfile = virtualFS.files[rfile];
		if (vfile) {
			var content = vfile.content;
			if (encoding != null) content = content.toString(encoding);
			return content;
		}
		return orig.apply(this, args);
	});

	createPatchFn(fs, 'stat', function (orig, args, p, cb) {
		var rp = path.resolve(p);
		var vfile = virtualFS.files[rp];
		if (vfile) {
			var vstat = {
				dev: 8675309,
				nlink: 1,
				uid: 501,
				gid: 20,
				rdev: 0,
				blksize: 4096,
				ino: 44700000,
				mode: 33188,
				size: vfile.content.length,
				isFile: function isFile() {
					return true;
				},
				isDirectory: function isDirectory() {
					return false;
				},
				isBlockDevice: function isBlockDevice() {
					return false;
				},
				isCharacterDevice: function isCharacterDevice() {
					return false;
				},
				isSymbolicLink: function isSymbolicLink() {
					return false;
				},
				isFIFO: function isFIFO() {
					return false;
				},
				isSocket: function isSocket() {
					return false;
				}
			};
			cb(null, vstat);
			return;
		}
		return orig.apply(this, args);
	});
	createPatchFn(fs, 'statSync', function (orig, args, p) {
		var rp = path.resolve(p);
		var vfile = virtualFS.files[rp];
		if (vfile) {
			var vstat = {
				dev: 8675309,
				nlink: 1,
				uid: 501,
				gid: 20,
				rdev: 0,
				blksize: 4096,
				ino: 44700000,
				mode: 33188,
				size: vfile.content.length,
				isFile: function isFile() {
					return true;
				},
				isDirectory: function isDirectory() {
					return false;
				},
				isBlockDevice: function isBlockDevice() {
					return false;
				},
				isCharacterDevice: function isCharacterDevice() {
					return false;
				},
				isSymbolicLink: function isSymbolicLink() {
					return false;
				},
				isFIFO: function isFIFO() {
					return false;
				},
				isSocket: function isSocket() {
					return false;
				}
			};
			return vstat;
		}
		return orig.apply(this, args);
	});
}

function add(fs, options) {
	patch(fs);
	fs[NS].add(options);
}

function createPatchFn(obj, name, fn) {
	var origin = obj[name];
	obj[name] = function () {
		var args = Array.prototype.slice.call(arguments);
		return fn.apply(this, [origin, args].concat(args));
	};
}

function VirtualFileLoader() {
	var query = loaderUtils.parseQuery(this.query);
	if (!query.src) throw new Error("virtual-file-loader requires src param");
	if (!query.file) throw new Error("virtual-file-loader requires file param");

	var file = resolveFile(this, query.file);
	var encoding = query.encoding || 'hex';
	var src = new Buffer(query.src, encoding);

	add(this.fs, {
		path: file,
		content: src
	});

	return 'module.exports = require("' + file.replace(/\\/g, '/') + '");';
}

function resolveFile(ctx, file) {
	if (!ctx._module) return file;

	var context;
	var reason = ctx._module.reasons && ctx._module.reasons[ctx._module.reasons.length - 1];
	if (reason) {
		context = path.dirname(reason.module.resource);
	} else {
		var issuer = ctx._module.issuer.split("!");
		context = path.dirname(issuer[issuer.length - 1]);
	}

	return path.resolve(context, file);
}

module.exports = VirtualFileLoader;
