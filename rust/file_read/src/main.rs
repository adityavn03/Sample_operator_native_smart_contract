use std::fs;
fn main() {
    let  folder_name="hello.txt";
    let content=fs::read_to_string(folder_name);
    match content{
        Ok(contents)=>{
            print!("error handling---> {}",contents);
    }
        Err(error)=>{
            println!("it the errro -------> {}",error);
        }

    }
    
}
