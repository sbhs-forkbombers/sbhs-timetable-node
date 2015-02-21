var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var todoUserSchema = new Schema({
	uid: String,
	title: String,
	body: String,
	due: Date,
	type: String,
	lesson: String,
	duePeriod: String
});


