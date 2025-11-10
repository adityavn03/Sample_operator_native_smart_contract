const jwt_admin_secret=process.env.jwt_admin_secret
const jwt_user_secret=process.env.jwt_user_secret

module.exports={
    jwt_admin_secret,
    jwt_user_secret
}

//npm install dotenv is used to take the information from .env file and put the information in the neccesary place  with help of process.env."name" . it is not depand on the any other depandence file so the valnarability will not be possible 
//.env will not push to git hub it is very safe and .env.example can be pushed to the git hub because user can have a blueprint but not the password. 
//.gitignore it will ignore the .env file to push to github
//include the require(dotenv).config() in the main js file
