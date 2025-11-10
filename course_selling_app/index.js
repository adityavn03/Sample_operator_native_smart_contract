const express=require("express")
require("dotenv").config()
const mongoose=require("mongoose")
const app=express();
const {userRouter}=require("./Router/userRouter.js")
const {courseRouter}=require("./Router/courseRouter.js")
const{adminRouter}=require("./Router/admin.js")
app.use(express.json())

app.use("/course",courseRouter);
app.use("/user",userRouter);
app.use("/admin",adminRouter)

async function main(){
    app.listen(3001,()=>{
        console.log("successfull connected");
    })
       console.log(process.env.Mongo_url)
    await mongoose.connect(process.env.Mongo_url)
 
    console.log("Mongodb connected");
}
    
main();
