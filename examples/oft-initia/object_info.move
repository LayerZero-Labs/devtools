module oft::object_info {
    use initia_std::object;
    use std::debug;

    #[view]
    public fun check_object_info(addr: address): (bool, address) {
        let is_obj = object::is_object(addr);
        let owner = if (is_obj) {
            object::get_owner(addr)
        } else {
            @0x0
        };
        
        debug::print(&is_obj);
        debug::print(&owner);
        
        (is_obj, owner)
    }
} 