#![allow(dead_code)]
use borsh::{BorshSerialize,BorshDeserialize};
use solana_program::{
    account_info::{ AccountInfo, next_account_info, next_account_infos}, 
    entrypoint::{ ProgramResult}, 
    msg, 
    pubkey::Pubkey,
};
use solana_program::entrypoint;




entrypoint!(counter_contract);

#[derive(BorshDeserialize,BorshSerialize)]
enum Instrustion{
    increment(u32),
    decrement(u32),
}
#[derive(BorshDeserialize,BorshSerialize)]
struct Counter_storage{
    count:u32,
}
pub fn counter_contract(
    program_id:&Pubkey,
    accounts:&[AccountInfo],
    instruction_data:&[u8]
)->ProgramResult{
    let acc=next_account_info(&mut accounts.iter())?;
    match Instrustion::try_from_slice(instruction_data).unwrap(){
          Instrustion::increment(val)=>{
            let mut counter_data=Counter_storage::try_from_slice(&acc.data.borrow())?;
            counter_data.count+=val;
            counter_data.serialize(&mut *acc.data.borrow_mut())?;

            
          }
          Instrustion::decrement(val)=>{
            let mut counter_data=Counter_storage::try_from_slice(&acc.data.borrow())?;
            counter_data.count-=val;
            counter_data.serialize(&mut *acc.data.borrow_mut())?;

          }

    }

    Ok(())

}