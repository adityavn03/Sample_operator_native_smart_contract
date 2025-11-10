const {Router}=require("express")
const adminRouter=Router()
const {z}=require("zod");
const jwt=require("jsonwebtoken")
const {admin_auth}=require("../middleware/admin_middleware.js")
const {jwt_admin_secret}=require("../config")
const {adminmodal,coursemodal}=require("../db.js")
const bcrypt=require("bcrypt")
const mongoose=require("mongoose")
const { ObjectId } = mongoose.Types;




adminRouter.post("/signup",async(req,res)=>{
    const email=req.body.email;
    const password=req.body.password;
    const firstname=req.body.firstname;
    const lastname=req.body.lastname;
    const verify=await adminmodal.findOne({email:email})
    const verification=z.object({
        email:z.string().email(),
        password:z.string(),
        firstname:z.string(),
        lastname:z.string()

    })
    const {success,error}=verification.safeParse({email,password,firstname,lastname})
    if(!success){
        res.json({
            message:"fill correctly",
            error
        })
        return
    }
    const hashedpassword=await bcrypt.hash(password,5)
    console.log(hashedpassword)
    if(!verify){
            await adminmodal.create({
            email:email,
            password:hashedpassword,
            firstname:firstname,
            lastname:lastname,
    
    
        })
    res.json({
        message:"signup"
    })
}
   else{
    res.json({
        message:"use alternate email. Email present"
    })
   }

})

adminRouter.post("/signin",async (req,res)=>{
    const email=req.body.email;
    const password=req.body.password;
    const verify=await adminmodal.findOne({email:email})
    const verifypassword=bcrypt.compare(password,verify.password)
        if(verifypassword){
            const token=jwt.sign({id:verify._id.toString(),email},jwt_admin_secret);
            res.json({
            message:"signin",
            token
            })
            console.log(token);
        }
        else{
            res.json({
                message:"signin failed"
            })
        }
    
    
})

adminRouter.post("/course",admin_auth ,async(req,res)=>{
    const admin_id=req.id;
    const {title,description,price,imurl}=req.body
    const create_course=await coursemodal.create({
        title,description,price,imurl,
        createrId:admin_id
    })
    res.json({
        message:"course have successfully created ",
        createrId:create_course._id,
    })
})

adminRouter.get("/preveiw",async (req,res)=>{
    const preveiw_detail=await coursemodal.find({})
    res.json({
        preveiw_detail
    })
})



adminRouter.put("/courses",admin_auth ,async(req,res)=>{
    const admin_id=req.id;
    const {title,description,price,courseId}=req.body
    const create_course=await coursemodal.updateOne(
        { _id:courseId,createrId:admin_id},
        {$set:{description:description,price:price,title:title}}

    )
   
    
    res.json({
        message:"update is successfull completed  ",
        create_course
    })
}
)

adminRouter.delete("/courses",admin_auth,async (req,res)=>{
    const admin_id=req.id;
    const courseid=req.body.courseid;
     const course = await coursemodal.findOne({
        _id: courseid,
        createrId: admin_id,
    });
    if (!course) {
        return res.status(404).json({
            message: "Course not found!",
            courseid,
            admin_id:admin_id
        });
    }
    await coursemodal.deleteOne({
        _id:courseid,
        createrId:admin_id,
    })
    res.json({
        message:"course have deleted successfully"
    })

})


adminRouter.get("/purchase",admin_auth ,async(req,res)=>{
    const admin_id=req.id;
    const course_detail=await coursemodal.find({
        createrId:admin_id

    })

    res.json({
        course_detail
        
    })

})
module.exports={
    adminRouter:adminRouter
}