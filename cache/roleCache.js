const Role = require("../models/Role");

let roleMap = {};

const loadRolesToCache = async () => {
  const roles = await Role.find();
  if (roles?.length > 0) {
    for (let index = 0; index < roles.length; index++) {
      roleMap[roles[index].key] = roles[index].name;
    }
  }
  // roleMap look like this
  // {
  //   '1': 'System Admin',
  //   '2': 'Manager',
  //   '3': 'Cinema Staff',
  //   '4': 'Customer'
  // }
};

const getRoleNameByKey = (key) => {
  return roleMap[key];
};

module.exports = { loadRolesToCache, getRoleNameByKey };
