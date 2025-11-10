const jwt=require("jsonwebtoken");
const {jwt_admin_secret}=require("../config")
function admin_auth(req,res,next){
    const token=req.headers["token"];
    const verification=jwt.verify(token,jwt_admin_secret)
    if(verification){
        req.id=verification.id;
        next();
    }
    else{
        console.log("failed")
    }
}
module.exports={
    admin_auth
}
