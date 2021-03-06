var child_process = require('child_process'),
    fs = require('fs'),
    util = require('util');

/* Non-wizard-friendly error message */
function Muggle(message, reason) {
	if (!(this instanceof Muggle))
		return new Muggle(message, reason);
	Error.call(this, message);
	Error.captureStackTrace(this, this.constructor);
	this.message = message;
	this.reason = reason;
}
util.inherits(Muggle, Error);
exports.Muggle = Muggle;

Muggle.prototype.most_precise_error_message = function () {
	var deepest = this.message;
	var muggle = this;
	var sanity = 10;
	while (muggle.reason && muggle.reason instanceof Muggle) {
		muggle = muggle.reason;
		if (muggle.message && typeof muggle.message == 'string')
			deepest = muggle.message;
		if (--sanity <= 0)
			break;
	}
	return deepest;
};

Muggle.prototype.deepest_reason = function () {
	if (this.reason && this.reason instanceof Muggle)
		return this.reason.deepest_reason();
	return this;
};

exports.move = function (src, dest, callback) {
	child_process.execFile('/bin/mv', ['--', src, dest],
				function (err, stdout, stderr) {
		if (err)
			callback(Muggle("Couldn't move file into place.",
					stderr || err));
		else
			callback(null);
	});
};

exports.movex = function (src, dest, callback) {
	child_process.execFile('/bin/mv', ['-n', '--', src, dest],
				function (err, stdout, stderr) {
		if (err)
			callback(Muggle("Couldn't move file into place.",
					stderr || err));
		else
			callback(null);
	});
};

exports.cpx = function (src, dest, callback) {
	child_process.execFile('/bin/cp', ['-n', '--', src, dest],
				function (err, stdout, stderr) {
		if (err)
			callback(Muggle("Couldn't copy file into place.",
					stderr || err));
		else
			callback(null);
	});
};

exports.checked_mkdir = function (dir, cb) {
	fs.mkdir(dir, function (err) {
		cb(err && err.code == 'EEXIST' ? null : err);
	});
};

// TEMP duplicated from common.js for imager daemon sanity
exports.random_id = function () {
	return Math.floor(Math.random() * 1e16) + 1;
};
