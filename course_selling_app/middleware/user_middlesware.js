const jwt=require("jsonwebtoken");
const {jwt_user_secret}=require("../config")


function user_auth(req,res,next){
    const token=req.headers["token"];
    const verification=jwt.verify(token,jwt_user_secret)
    if(verification){
        console.log(verification.email)
        req.id=verification.id;
        next();
    }
    else{
        console.log("failed")
    }
}

module.exports={
    user_auth
    
}
