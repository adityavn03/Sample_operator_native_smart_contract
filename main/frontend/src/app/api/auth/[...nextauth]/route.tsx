import { Prisma } from "@prisma/client";
import NextAuth,{NextAuthOptions} from "next-auth";
import Google from "next-auth/providers/google";
import CredentialsProvider  from "next-auth/providers/credentials";
import SigninNotFound from "@/app/Notfoundpage/page";
import { Account } from "@solana/web3.js";

export const  authOptions:NextAuthOptions={
    providers:[
        CredentialsProvider({
            name:"main_projects",
            credentials:{
                username:{label:"username",placeholder:"username",type:"text"},
                password:{label:"password",placeholder:"password",type:"text"}
            },
            async authorize(credentials){
                if(credentials?.username && credentials?.password ) {
                    return null;
                }
               
                const user1:any=await Prisma.user.findOne({
                    where:{username:credentials?.username}
                });
                if(!user1){
                    <SigninNotFound/>
                }
                else{
                    Prisma.user.create({
                        username:credentials?.username,
                        password:credentials?.password
                    })
                }

            }
            
        }),
        Google({
            clientId:process.env.GOOGLECLIENTID as string,
            clientSecret:process.env.GOOGLECLIENTID as string,
        }),

    ],
    session:{
        strategy:"jwt",
        maxAge:10*60,
        updateAge:5*60,
    },
    jwt:{
        maxAge:4*60,
    },
    secret:process.env.NEXTAUTH_SECRET,



}
const handler=NextAuth(authOptions);
export {handler as GET,handler as POST}