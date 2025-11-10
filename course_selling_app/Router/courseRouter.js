const {Router}=require("express")
const courseRouter=Router();
const {admin_auth}=require("../middleware/admin_middleware.js")

const {coursemodal,usermodal}=require("../db.js")

courseRouter.get("/purchased_user",admin_auth,async (req,res)=>{
    const user_course=await coursemodal.find({})
    
    res.json({
        message:"course purchase",
        user_course
    })
    
})


module.exports={
    courseRouter:courseRouter
}


