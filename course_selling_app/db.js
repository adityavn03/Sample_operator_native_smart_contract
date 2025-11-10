const mongoose=require("mongoose")
const Objectid=mongoose.ObjectId;
const sechema=mongoose.Schema
console.log("connected")

const userSchema=new sechema({
    email:{type:String,unique:true},
    password:String,
    firstname:String,
    lastname:String
})

const courseSchema=new sechema({
    title:{type:String,unique:true},
    description:String,
    price:String,
    imurl:String,
    createrId:Objectid

})
const adminSchema=new sechema({
    email:{type:String,unique:true},
    password:String,
    firstname:String,
    lastname:String

})
const purchaseSchema=new sechema({
    courseId:Objectid,
    userId:Objectid
})
const usermodal=mongoose.model("user",userSchema)
const coursemodal=mongoose.model("course",courseSchema)
const adminmodal=mongoose.model("admin",adminSchema)
const purchasemodal=mongoose.model("purchase",purchaseSchema)

module.exports={
    usermodal,
    coursemodal,
    adminmodal,
    purchasemodal
}