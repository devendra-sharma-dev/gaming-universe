const mongoose = require('mongoose');
const schema = new mongoose.Schema({ userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, gameDate:{type:String,required:true}, countryCode:{type:String,required:true}, guesses:[{countryCode:String,round:Number,distance:Number,direction:String,createdAt:{type:Date,default:Date.now}}], currentRound:{type:Number,default:1,min:1,max:5}, status:{type:String,enum:['active','solved','failed'],default:'active'}, solvedRound:Number, xpEarned:{type:Number,default:0}, xpAwarded:{type:Boolean,default:false}, completedAt:Date },{timestamps:true});
schema.index({userId:1,gameDate:1},{unique:true});
module.exports=mongoose.models.MysteryCountryAttempt||mongoose.model('MysteryCountryAttempt',schema);
